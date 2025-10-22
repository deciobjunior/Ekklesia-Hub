
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  File,
  ListFilter,
  Link as LinkIcon,
  Loader2,
  Trash2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Member } from '@/lib/data';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MembersTable } from '@/components/members/members-table';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { EditMemberDialog } from '@/components/members/edit-member-dialog';
import { useUser } from '@/hooks/use-user';
import { Input } from '@/components/ui/input';

export type SortConfig = {
    key: keyof Member | null;
    direction: 'ascending' | 'descending';
} | null;

export type HistoryItem = {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details?: string;
    source: string;
};

export default function MembersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user, userRole, churchId, loading: userLoading } = useUser();
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  const supabase = createClient();

  const fetchMembersAndChurchId = async () => {
    if (!churchId) {
        if (!userLoading) setLoading(false);
        return;
    }
    setLoading(true);
    
    // Fetch all people from the central 'members' table
    const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .eq('church_id', churchId);

    if (membersError) {
        toast({ title: "Erro ao buscar membros", description: membersError.message, variant: 'destructive' });
        setLoading(false);
        return;
    }

    const memberIds = membersData.map(m => m.id);

    // Fetch roles and other details from related tables
    const [
        pastorsRes,
        volunteersRes,
        counselorsRes,
        ministriesRes,
        pendingRegsRes, // Fetch form_data from pending_registrations
    ] = await Promise.all([
        supabase.from('pastors_and_leaders').select('id, role').in('id', memberIds),
        supabase.from('volunteers').select('id, role, availability').in('id', memberIds),
        supabase.from('counselors').select('id, topics, availability').in('id', memberIds),
        supabase.from('pending_registrations').select('form_data').eq('church_id', churchId).eq('role', 'Ministério'),
        supabase.from('pending_registrations').select('id, form_data').in('id', memberIds),
    ]);
    
    const pastorsMap = new Map((pastorsRes.data || []).map(p => [p.id, p.role]));
    const volunteersMap = new Map((volunteersRes.data || []).map(v => [v.id, { role: v.role, availability: v.availability }]));
    const counselorsMap = new Map((counselorsRes.data || []).map(c => [c.id, { topics: c.topics, availability: c.availability }]));
    const pendingRegsMap = new Map((pendingRegsRes.data || []).map(p => [p.id, p.form_data]));
    
    const ministryVolunteerCounts = new Map<string, number>();
    if (ministriesRes.data) {
        ministriesRes.data.forEach(ministry => {
            const volunteerIds = ministry.form_data?.volunteer_ids || [];
            volunteerIds.forEach((id: string) => {
                ministryVolunteerCounts.set(id, (ministryVolunteerCounts.get(id) || 0) + 1);
            });
        });
    }

    const finalMembers: Member[] = membersData.map(person => {
        let finalRole = person.role || 'Membro'; // Default to role in members table
        let finalAvailability = person.availability || {};
        const pendingData = pendingRegsMap.get(person.id) || {};
        
        if (pastorsMap.has(person.id)) finalRole = pastorsMap.get(person.id) || finalRole;
        
        const volunteerInfo = volunteersMap.get(person.id);
        if (volunteerInfo) {
            finalRole = volunteerInfo.role || finalRole;
            finalAvailability = volunteerInfo.availability || finalAvailability;
        }

        const counselorInfo = counselorsMap.get(person.id);
        if (counselorInfo) {
            finalRole = 'Conselheiro';
            finalAvailability = counselorInfo.availability || finalAvailability;
        }

        return {
            id: person.id,
            name: person.name,
            email: person.email || 'N/A',
            phone: person.phone || 'N/A',
            role: finalRole,
            status: person.status || 'Ativo',
            lastSeen: person.created_at ? new Date(person.created_at).toLocaleDateString('pt-BR') : 'N/A',
            avatar: person.avatar_url || `https://placehold.co/40x40.png?text=${person.name?.charAt(0) || 'U'}`,
            gender: person.gender || 'Outro',
            birthdate: person.birthdate || null,
            maritalStatus: person.maritalStatus || 'Solteiro(a)',
            ministryCount: ministryVolunteerCounts.get(person.id) || 0,
            availability: finalAvailability,
            form_data: { 
                ...person, // Base data from 'members' table
                ...pendingData, // Richer data from 'pending_registrations' form_data
                role: finalRole,
                is_counselor: counselorsMap.has(person.id),
                counselor_topics: counselorInfo?.topics || [],
                counselor_availability: counselorInfo?.availability || {},
                availability: finalAvailability,
            },
        };
    });

    setMembers(finalMembers);
    setLoading(false);
  };
  
  useEffect(() => {
    if (churchId) {
      fetchMembersAndChurchId();

      const channel = supabase.channel('realtime-members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
          fetchMembersAndChurchId();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pastors_and_leaders' }, () => {
          fetchMembersAndChurchId();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, () => {
          fetchMembersAndChurchId();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'counselors' }, () => {
          fetchMembersAndChurchId();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations' }, () => {
          fetchMembersAndChurchId();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };

    } else if (!userLoading) {
        setLoading(false);
    }
  }, [churchId, userLoading, userRole]);

  const handleSendMessage = (member: Member) => {
    router.push(`/communications?newConversationWith=${member.id}`);
  };
  
  const handleEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: Member) => {
    setMemberToDelete(member);
  };

  const handleDeleteMember = async () => {
    if (memberToDelete) {
        // Since all profiles are in `members`, we primarily delete from there.
        // CASCADING deletes in Supabase should handle related tables.
        // If not, we'd need to delete from all possible role tables.
        const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
        
        if (error) {
            toast({ title: "Erro ao deletar", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Registro deletado!", description: `${memberToDelete.name} foi removido com sucesso.` });
            await fetchMembersAndChurchId();
        }

        setMemberToDelete(null);
    }
  };


  const handleDeleteSelected = async () => {
    if (selectedMemberIds.length === 0) return;
    
    // Primary deletion from the 'members' table.
    const { data, error } = await supabase.from('members').delete().in('id', selectedMemberIds);
    
    if (error) {
        toast({
            title: "Erro ao deletar registros",
            description: `Não foi possível excluir todos os selecionados: ${error.message}`
        });
    } else {
        toast({
            title: "Exclusão em Massa Concluída",
            description: `${selectedMemberIds.length} registros deletados com sucesso.`
        });
    }

    setSelectedMemberIds([]);
    await fetchMembersAndChurchId();
  }
  
  const handleExport = () => {
    const csvContent = [
      "ID,Nome,Email,Cargo,Status,Última Visita",
      ...members.map(m => `${m.id},"${m.name}","${m.email}",${m.role},${m.status},"${m.lastSeen}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "membros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleStatusFilterChange = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };
  
  const handleRoleFilterChange = (role: string) => {
    setRoleFilters(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
    setCurrentPage(1);
  };
  
  const handleSort = (key: keyof Member) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
        setSortConfig(null);
        return;
    }
    setSortConfig({ key, direction });
  };
  
  const uniqueRoles = Array.from(new Set(members.map(member => member.role))).filter(Boolean);
  const uniqueStatuses = ["Ativo", "Inativo", "Pendente", "Visitante"];
  
  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredMembers = useMemo(() => {
    let sortableItems = [...members];

    // Filtering
    sortableItems = sortableItems.filter(member => {
      const normalizedSearchTerm = normalizeString(searchTerm);
      const normalizedMemberName = normalizeString(member.name);
      
      const nameMatch = !searchTerm || normalizedMemberName.includes(normalizedSearchTerm);
      const statusMatch = statusFilters.length === 0 || statusFilters.includes(member.status);
      const roleMatch = roleFilters.length === 0 || roleFilters.includes(member.role);
      return nameMatch && statusMatch && roleMatch;
    });

    // Sorting
    if (sortConfig !== null && sortConfig.key) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];

            if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return sortableItems;
  }, [members, statusFilters, roleFilters, sortConfig, searchTerm]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const handleShareLink = (path: string, type: string) => {
    if (!churchId) {
        toast({
            title: "Erro ao gerar link",
            description: "Não foi possível identificar a sua igreja. Recarregue a página e tente novamente.",
            variant: "destructive",
        });
        return;
    }
    const signupUrl = `${window.location.origin}${path}?church_id=${churchId}`;
    navigator.clipboard.writeText(signupUrl);
    toast({
      title: "Link Copiado!",
      description: `O link de cadastro para ${type} foi copiado.`,
    });
  };
  
const handleSaveMember = async (updatedMember: Member) => {
    if (!churchId) return;

    setSaving(true);
    const { form_data, id: memberId, role: newRole } = updatedMember;
    
    try {
        // 1. Update the central 'members' table with all data
        const { error: memberUpdateError } = await supabase
            .from('members')
            .update({
                name: form_data.name,
                email: form_data.email,
                phone: form_data.phone || null,
                birthdate: form_data.birthdate || null,
                gender: form_data.gender,
                marital_status: form_data.maritalStatus,
                role: newRole, 
            })
            .eq('id', memberId);

        if (memberUpdateError) throw new Error(`Erro ao salvar na tabela 'members': ${memberUpdateError.message}`);
        
        // 2. Clear old role entries from specific tables to avoid conflicts
        const rolesToClearFrom = ['pastors_and_leaders', 'counselors', 'volunteers'];
        await Promise.all(
            rolesToClearFrom.map(table => supabase.from(table).delete().eq('id', memberId))
        );

        // 3. Insert into the correct new role table if needed
        const leadershipRoles = ['Pastor', 'Líder', 'Coordenador', 'Líder de Pequeno Grupo'];
        if (leadershipRoles.includes(newRole)) {
            await supabase.from('pastors_and_leaders').insert({ id: memberId, church_id: churchId, name: form_data.name, email: form_data.email, role: newRole });
        } else if (newRole === 'Voluntário' || newRole === 'Consolidador') {
            await supabase.from('volunteers').insert({ id: memberId, church_id: churchId, name: form_data.name, email: form_data.email, phone: form_data.phone, role: newRole, availability: form_data.availability });
        }
        
        // 4. Handle counselor logic specifically
        const isNowCounselor = newRole === 'Conselheiro' || (newRole === 'Pastor' && form_data.is_counselor);
        if (isNowCounselor) {
            await supabase.from('counselors').upsert({
                id: memberId, church_id: churchId, name: form_data.name,
                email: form_data.email, gender: form_data.gender, phone: form_data.phone,
                topics: form_data.counselor_topics || [],
                availability: JSON.stringify(form_data.counselor_availability) || '{}',
            }, { onConflict: 'id' });
        }
        
        toast({ title: "Membro Atualizado!", description: `${updatedMember.name} foi atualizado com sucesso.` });
        setIsEditDialogOpen(false);
        await fetchMembersAndChurchId();

    } catch (error: any) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
        setSaving(false);
    }
};


  const memberActions = {
    onEdit: handleEditMember,
    onSendMessage: handleSendMessage,
    onDelete: openDeleteDialog,
  };


  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
              <p className="text-muted-foreground">Gerencie os membros, líderes, voluntários e visitantes da sua igreja.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!churchId}>
                        {!churchId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {churchId && <LinkIcon className="h-3.5 w-3.5" />}
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Links Públicos
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Compartilhar Links de Cadastro</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleShareLink('/register-counselor', 'conselheiros')}>Link de Conselheiros</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleShareLink('/register-consolidator', 'consolidadores')}>Link de Consolidadores</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleShareLink('/register-volunteer', 'voluntários')}>Link de Voluntários</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleShareLink('/register-member', 'novos membros')}>Link de Membros</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleShareLink('/register-leadership', 'liderança')}>Link de Liderança</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <AddMemberDialog onMemberAdded={() => fetchMembersAndChurchId()} />
            </div>
        </div>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Membros ({filteredMembers.length})</CardTitle>
                    <CardDescription>
                    Gerencie os membros e visitantes da sua igreja.
                    </CardDescription>
                </div>
                {selectedMemberIds.length > 0 && userRole === 'Administrador' && (
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Selecionados ({selectedMemberIds.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente os ${"{"}selectedMemberIds.length} registros selecionados.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                            Sim, deletar selecionados
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                )}
                 <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Buscar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 sm:w-[300px]"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 gap-1">
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Filtrar
                            </span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueStatuses.map(status => (
                            <DropdownMenuCheckboxItem 
                                key={status} 
                                checked={statusFilters.includes(status)} 
                                onCheckedChange={() => handleStatusFilterChange(status)}>
                                {status}
                            </DropdownMenuCheckboxItem>
                        ))}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filtrar por Cargo</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueRoles.map(role => (
                            <DropdownMenuCheckboxItem key={role} checked={roleFilters.includes(role)} onCheckedChange={() => handleRoleFilterChange(role)}>
                                {role}
                            </DropdownMenuCheckboxItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" variant="outline" className="h-10 gap-1" onClick={handleExport}>
                        <File className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Exportar
                        </span>
                    </Button>
                </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <MembersTable 
                    members={paginatedMembers} 
                    actions={memberActions} 
                    canDelete={userRole === 'Administrador'}
                    selectedMemberIds={selectedMemberIds}
                    onSelectedMemberIdsChange={setSelectedMemberIds}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    />
                )}
            </CardContent>
            <CardFooter>
                <div className="text-xs text-muted-foreground">
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </div>
                <div className="ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-2"
                >
                    Próxima
                </Button>
                </div>
            </CardFooter>
            </Card>
      </div>

     <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso irá deletar permanentemente o registro de
              <span className="font-bold"> {memberToDelete?.name}</span> e todos os dados associados a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {memberToEdit && (
        <EditMemberDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            member={memberToEdit}
            onSave={handleSaveMember}
        />
      )}
    </>
  );
}

    
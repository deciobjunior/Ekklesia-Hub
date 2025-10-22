
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Handshake, MessageSquareWarning, Users, Loader2, Share2, Archive, ListFilter, Search, ArrowUpDown, CheckCircle } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NewBeginningsTable } from '@/components/acolhimento/new-beginnings-table';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export type FollowUp = {
    id: string;
    contact_date: string;
    notes: string;
    contacted_by: string;
};

export type Interest = {
    key: string;
    label: string;
};

type Activity = {
    id: string;
    timestamp: string;
    user: string;
    action: 'contact_registered' | 'sent_to_counseling' | 'status_change' | 'created' | 'ownership_taken' | 'sent_to_small_group' | 'sent_to_discipleship' | 'marked_as_baptized';
    details?: string;
};

export type NewBeginning = {
    id: string;
    name: string;
    phone: string;
    email: string;
    created_at: string;
    church_id: string;
    follower_id: string | null;
    follower_name?: string | null;
    follow_ups: FollowUp[];
    interests?: Interest[];
    activities?: Activity[];
    forwarded_to_counseling?: boolean;
    status: 'Pendente' | 'Sem resposta' | 'Número errado' | 'Em acolhimento' | 'Direcionado' | 'Concluído' | 'Arquivado' | null;
    request_details?: string;
};

type TeamMember = {
    id: string;
    name: string;
};

const statusOptions: (NewBeginning['status'])[] = ['Pendente', 'Em acolhimento', 'Direcionado', 'Sem resposta', 'Número errado', 'Concluído'];

export type SortConfig = {
    key: keyof NewBeginning | null;
    direction: 'ascending' | 'descending';
} | null;

export default function AcolhimentoPage() {
    const { toast } = useToast();
    const { user, churchId, userRole, loading: userLoading, refreshUserData } = useUser();
    const [loading, setLoading] = useState(true);
    const [allNewBeginnings, setAllNewBeginnings] = useState<NewBeginning[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [metrics, setMetrics] = useState({
        monthlyCount: 0,
        pendingCount: 0,
        inProgressCount: 0,
        concludedCount: 0,
    });
    const supabase = createClient();
    
    // Filter and Sort states
    const [nameFilter, setNameFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // State for the responsible filter modal
    const [isResponsibleModalOpen, setIsResponsibleModalOpen] = useState(false);
    const [tempResponsibleFilter, setTempResponsibleFilter] = useState<string[]>([]);
    const [isSavePreferenceOpen, setIsSavePreferenceOpen] = useState(false);

    // Advanced Filter State
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);
    const [tempGenderFilter, setTempGenderFilter] = useState('');
    const [tempMaritalStatusFilter, setTempMaritalStatusFilter] = useState('');
    const [tempMinAge, setTempMinAge] = useState('');
    const [tempMaxAge, setTempMaxAge] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [maritalStatusFilter, setMaritalStatusFilter] = useState('');
    const [minAge, setMinAge] = useState('');
    const [maxAge, setMaxAge] = useState('');


    const fetchData = useCallback(async (id: string, role: string, userId: string) => {
        setLoading(true);
        
        const { data, error } = await supabase
            .from('new_beginnings')
            .select('id, name, phone, email, created_at, church_id, follower_id, follower_name, follow_ups, interests, activities, forwarded_to_counseling, status, request_details')
            .eq('church_id', id)
            .neq('status', 'Arquivado')
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        } 
        
        const allData = data as NewBeginning[];
        setAllNewBeginnings(allData);
        
        const { data: churchOwner } = await supabase.from('churches').select('owner_id').eq('id', id).single();
        const ownerId = churchOwner?.owner_id;

        const [coordinatorsRes, consolidatorsRes] = await Promise.all([
            supabase.from('pastors_and_leaders').select('id, name').eq('church_id', id).eq('role', 'Coordenador'),
            supabase.from('volunteers').select('id, name').eq('church_id', id).eq('role', 'Consolidador'),
        ]);
        
        const combinedTeam = [
            ...(coordinatorsRes.data || []), 
            ...(consolidatorsRes.data || []),
        ];

        // Filter out the church owner/admin from the list
        const teamWithoutOwner = ownerId ? combinedTeam.filter(member => member.id !== ownerId) : combinedTeam;

        const uniqueTeam = Array.from(new Map(teamWithoutOwner.map(item => [item.id, item])).values());
        
        uniqueTeam.sort((a, b) => a.name.localeCompare(b.name));
        
        setTeam(uniqueTeam as TeamMember[]);

        setLoading(false);
    }, [toast, supabase]);

    useEffect(() => {
        if (user && user.user_metadata?.acolhimento_filter_responsible) {
            const savedFilter = user.user_metadata.acolhimento_filter_responsible;
            setResponsibleFilter(savedFilter);
            setTempResponsibleFilter(savedFilter);
        }
    }, [user]);

    useEffect(() => {
        if (churchId && user && userRole) {
            fetchData(churchId, userRole, user.id);

            const channel = supabase.channel('new_beginnings_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'new_beginnings', filter: `church_id=eq.${churchId}` }, payload => {
                    fetchData(churchId, userRole, user.id);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [churchId, user, userRole, userLoading, fetchData, supabase]);
    
    useEffect(() => {
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        setMetrics({
            monthlyCount: allNewBeginnings.filter(d => new Date(d.created_at) > thirtyDaysAgo).length,
            pendingCount: allNewBeginnings.filter(d => d.status === 'Pendente' || d.status === null).length,
            inProgressCount: allNewBeginnings.filter(d => d.status === 'Em acolhimento').length,
            concludedCount: allNewBeginnings.filter(d => d.status === 'Concluído').length,
        });
    }, [allNewBeginnings]);

    const handleShareLink = () => {
        if (!churchId) {
            toast({
                title: "Erro ao gerar link",
                description: "Não foi possível identificar a sua igreja. Recarregue a página.",
                variant: "destructive"
            });
            return;
        }
        const link = `${window.location.origin}/welcome?church_id=${churchId}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: "O link para o formulário de Acolhimento foi copiado.",
        });
    }

    const handleSort = (key: keyof NewBeginning) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
            setSortConfig(null);
            return;
        }
        setSortConfig({ key, direction });
    };

    const handleApplyResponsibleFilter = () => {
        setIsResponsibleModalOpen(false);
        setIsSavePreferenceOpen(true);
    };
    
    const applyFilterWithoutSaving = () => {
        setResponsibleFilter(tempResponsibleFilter);
        setCurrentPage(1);
        setIsSavePreferenceOpen(false);
    }
    
    const applyAndSaveFilter = async () => {
        if (!user) return;
        
        const { data, error } = await supabase.auth.updateUser({
            data: { ...user.user_metadata, acolhimento_filter_responsible: tempResponsibleFilter }
        });

        if (error) {
            toast({ title: 'Erro ao salvar preferência', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Filtro salvo!', description: 'Seu filtro padrão para esta tela foi atualizado.' });
            refreshUserData(); // Refresh user data in context
        }
        
        applyFilterWithoutSaving();
    };

    const handleApplyAdvancedFilters = () => {
        setStatusFilter(tempStatusFilter);
        setGenderFilter(tempGenderFilter);
        setMaritalStatusFilter(tempMaritalStatusFilter);
        setMinAge(tempMinAge);
        setMaxAge(tempMaxAge);
        setIsAdvancedFilterOpen(false);
        setCurrentPage(1);
    };
    
    const clearAllFilters = () => {
        setNameFilter('');
        setResponsibleFilter([]);
        setStatusFilter([]);
        setGenderFilter('');
        setMaritalStatusFilter('');
        setMinAge('');
        setMaxAge('');
        
        // Also clear temporary filters
        setTempResponsibleFilter([]);
        setTempStatusFilter([]);
        setTempGenderFilter('');
        setTempMaritalStatusFilter('');
        setTempMinAge('');
        setTempMaxAge('');
    };

    const filteredAndSortedData = useMemo(() => {
        let sortableItems = allNewBeginnings.filter(item => item.status !== 'Arquivado');

        // Filtering
        sortableItems = sortableItems.filter(item => {
            const nameMatch = !nameFilter || item.name.toLowerCase().includes(nameFilter.toLowerCase());
            const responsibleMatch = responsibleFilter.length === 0 || responsibleFilter.includes(item.follower_name || 'Ninguém');
            const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.status || 'Pendente');
            
            let details = {};
            if (typeof item.request_details === 'string' && item.request_details.startsWith('{')) {
                try {
                    details = JSON.parse(item.request_details);
                } catch(e) { /* ignore */ }
            } else if (typeof item.request_details === 'object' && item.request_details !== null) {
                details = item.request_details;
            }

            // @ts-ignore
            const genderMatch = !genderFilter || details.gender === genderFilter;
            // @ts-ignore
            const maritalStatusMatch = !maritalStatusFilter || details.maritalStatus === maritalStatusFilter;

            let ageMatch = true;
            // @ts-ignore
            const age = details.member_age ? parseInt(details.member_age, 10) : NaN;
            if (!isNaN(age)) {
                const min = minAge ? parseInt(minAge, 10) : -Infinity;
                const max = maxAge ? parseInt(maxAge, 10) : Infinity;
                ageMatch = age >= min && age <= max;
            } else if (minAge || maxAge) { // If there's an age filter but user has no age, exclude
                ageMatch = false;
            }

            return nameMatch && responsibleMatch && statusMatch && genderMatch && maritalStatusMatch && ageMatch;
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
    }, [allNewBeginnings, nameFilter, responsibleFilter, statusFilter, sortConfig, genderFilter, maritalStatusFilter, minAge, maxAge]);
    
    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const paginatedData = filteredAndSortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const hasActiveFilters = nameFilter || responsibleFilter.length > 0 || statusFilter.length > 0 || genderFilter || maritalStatusFilter || minAge || maxAge;


    if (loading || userLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Acolhimento de Novos Convertidos</h1>
                    <p className="text-muted-foreground">Acompanhe e integre as pessoas que tomaram uma decisão por Cristo.</p>
                </div>
                <Button variant="outline" onClick={handleShareLink} disabled={!churchId}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar Link do Formulário
                </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Novos Convertidos (Mês)</CardTitle>
                            <Handshake className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+{metrics.monthlyCount}</div>
                            <p className="text-xs text-muted-foreground">Decisões nos últimos 30 dias.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aguardando Contato</CardTitle>
                            <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.pendingCount}</div>
                            <p className="text-xs text-muted-foreground">Pessoas aguardando o primeiro contato.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Em Acolhimento</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.inProgressCount}</div>
                            <p className="text-xs text-muted-foreground">Pessoas sendo acompanhadas pela equipe.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.concludedCount}</div>
                            <p className="text-xs text-muted-foreground">Acolhimentos concluídos com sucesso.</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Central de Acompanhamento</CardTitle>
                                <CardDescription>Gerencie todos os novos convertidos e seus status.</CardDescription>
                            </div>
                            <div className="flex w-full sm:w-auto items-center gap-2">
                                <div className="relative flex-1 sm:flex-initial">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome..."
                                        className="pl-8 sm:w-64"
                                        value={nameFilter}
                                        onChange={(e) => setNameFilter(e.target.value)}
                                    />
                                </div>
                                <Dialog open={isResponsibleModalOpen} onOpenChange={setIsResponsibleModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="gap-1 flex-shrink-0">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            <span>Responsável</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Filtrar por Responsável</DialogTitle>
                                            <DialogDescription>Selecione um ou mais responsáveis para filtrar a lista.</DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="max-h-64 my-4">
                                            <div className="space-y-2 p-1">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="resp-ninguem"
                                                        checked={tempResponsibleFilter.includes('Ninguém')}
                                                        onCheckedChange={(checked) => {
                                                            setTempResponsibleFilter(prev => checked ? [...prev, 'Ninguém'] : prev.filter(n => n !== 'Ninguém'));
                                                        }}
                                                    />
                                                    <Label htmlFor="resp-ninguem" className="font-normal">Ninguém</Label>
                                                </div>
                                                {team.map(member => (
                                                    <div key={member.id} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`resp-${member.id}`}
                                                            checked={tempResponsibleFilter.includes(member.name)}
                                                            onCheckedChange={(checked) => {
                                                                setTempResponsibleFilter(prev => checked ? [...prev, member.name] : prev.filter(n => n !== member.name));
                                                            }}
                                                        />
                                                        <Label htmlFor={`resp-${member.id}`} className="font-normal">{member.name}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsResponsibleModalOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleApplyResponsibleFilter}>Filtrar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Dialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="gap-1 flex-shrink-0">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            <span>Filtro Avançado</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Filtro Avançado</DialogTitle>
                                            <DialogDescription>Use os campos abaixo para refinar sua busca.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {statusOptions.map(status => (
                                                        <div key={status} className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`status-${status}`}
                                                                checked={tempStatusFilter.includes(status || 'Pendente')}
                                                                onCheckedChange={checked => {
                                                                    const s = status || 'Pendente';
                                                                    setTempStatusFilter(prev => checked ? [...prev, s] : prev.filter(st => st !== s));
                                                                }}
                                                            />
                                                            <Label htmlFor={`status-${status}`} className="font-normal">{status || 'Pendente'}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Gênero</Label>
                                                    <RadioGroup value={tempGenderFilter} onValueChange={setTempGenderFilter}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="Masculino" id="gender-m" />
                                                                <Label htmlFor="gender-m" className="font-normal">Masculino</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="Feminino" id="gender-f" />
                                                                <Label htmlFor="gender-f" className="font-normal">Feminino</Label>
                                                            </div>
                                                        </div>
                                                    </RadioGroup>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="marital-status">Estado Civil</Label>
                                                    <Select value={tempMaritalStatusFilter} onValueChange={setTempMaritalStatusFilter}>
                                                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                                            <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                                            <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                                            <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="min-age">Idade Mínima</Label>
                                                    <Input id="min-age" type="number" placeholder="Ex: 18" value={tempMinAge} onChange={(e) => setTempMinAge(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="max-age">Idade Máxima</Label>
                                                    <Input id="max-age" type="number" placeholder="Ex: 35" value={tempMaxAge} onChange={(e) => setTempMaxAge(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsAdvancedFilterOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleApplyAdvancedFilters}>Filtrar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                {hasActiveFilters && (
                                    <Button variant="ghost" onClick={clearAllFilters}>Limpar</Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <NewBeginningsTable 
                            data={paginatedData} 
                            churchId={churchId} 
                            refreshData={() => churchId && user && userRole && fetchData(churchId, userRole, user.id)}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                        />
                    </CardContent>
                    <CardFooter>
                        <div className="text-xs text-muted-foreground">
                            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
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
                            >
                                Próxima
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <AlertDialog open={isSavePreferenceOpen} onOpenChange={setIsSavePreferenceOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Salvar Filtro Padrão?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você deseja salvar esta seleção de responsáveis como seu filtro padrão para a tela de Acolhimento? Ele será aplicado automaticamente sempre que você visitar esta página.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={applyAndSaveFilter}>
                            Sim, salvar como padrão
                        </AlertDialogAction>
                        <AlertDialogCancel onClick={applyFilterWithoutSaving}>Não, usar somente agora</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

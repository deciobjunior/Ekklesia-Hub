

'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowRight, Archive, Trash2, AlertTriangle, Briefcase, ArrowUpDown, Cake, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { NewBeginning, SortConfig } from '@/app/(app)/acolhimento/page';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';


interface NewBeginningsTableProps {
    data: NewBeginning[];
    churchId: string | null;
    refreshData: () => void;
    sortConfig: SortConfig;
    onSort: (key: keyof NewBeginning) => void;
}

type TeamMember = {
    id: string;
    name: string;
};

const statusDisplay: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Pendente': { text: 'Pendente', variant: 'destructive' },
    'Em acolhimento': { text: 'Em Acolhimento', variant: 'secondary' },
    'Direcionado': { text: 'Direcionado', variant: 'outline' },
    'Sem resposta': { text: 'Sem Resposta', variant: 'outline' },
    'Número errado': { text: 'Número Errado', variant: 'outline' },
    'Concluído': { text: 'Concluído', variant: 'default' },
    'Arquivado': { text: 'Arquivado', variant: 'outline' },
};


export function NewBeginningsTable({ data, churchId, refreshData, sortConfig, onSort }: NewBeginningsTableProps) {
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedNewBeginning, setSelectedNewBeginning] = useState<NewBeginning | null>(null);
    const [selectedFollowerId, setSelectedFollowerId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        setIsClient(true);
        const fetchTeam = async () => {
            if (!churchId) return;

            const [leadersRes, consolidatorsRes] = await Promise.all([
                supabase.from('pastors_and_leaders').select('id, name').eq('church_id', churchId),
                supabase.from('volunteers').select('id, name').eq('church_id', churchId).eq('role', 'Consolidador')
            ]);
            
            if (leadersRes.error || consolidatorsRes.error) {
                 toast({ title: 'Erro ao buscar equipe', description: leadersRes.error?.message || consolidatorsRes.error?.message, variant: 'destructive' });
                 return;
            }

            const combinedTeam = [...(leadersRes.data || []), ...(consolidatorsRes.data || [])];
            const uniqueTeam = Array.from(new Map(combinedTeam.map(item => [item.id, item])).values());
            
            uniqueTeam.sort((a, b) => a.name.localeCompare(b.name));

            setTeam(uniqueTeam as TeamMember[]);
        };

        if(churchId) {
            fetchTeam();
        }
    }, [churchId, toast, supabase]);

    const openAssignDialog = (item: NewBeginning) => {
        setSelectedNewBeginning(item);
        setSelectedFollowerId(item.follower_id);
        setIsAssignDialogOpen(true);
    };

    const handleAssignFollower = async () => {
        if (!selectedNewBeginning || !selectedFollowerId) return;

        const follower = team.find(t => t.id === selectedFollowerId);
        if (!follower) return;

        const { error } = await supabase
            .from('new_beginnings')
            .update({ 
                follower_id: selectedFollowerId,
                follower_name: follower.name,
                status: 'Em acolhimento',
            })
            .eq('id', selectedNewBeginning.id);

        if (error) {
            toast({ title: 'Erro ao designar responsável', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Responsável designado!', description: `${follower.name} agora está acompanhando ${selectedNewBeginning.name}.` });
            setIsAssignDialogOpen(false);
            refreshData();
        }
    };
    
    const openDeleteDialog = (item: NewBeginning) => {
        setSelectedNewBeginning(item);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDelete = async () => {
        if (!selectedNewBeginning) return;

        const { error } = await supabase
            .from('new_beginnings')
            .delete()
            .eq('id', selectedNewBeginning.id);

        if (error) {
            toast({ title: "Erro ao excluir", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Registro excluído!", description: `O registro de ${selectedNewBeginning.name} foi removido permanentemente.` });
            refreshData(); // Refresh the list
        }
        setIsDeleteDialogOpen(false);
    }
    
    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                             <Button variant="ghost" onClick={() => onSort('name')}>
                                Nome <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => onSort('created_at')}>
                                Data da Decisão <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                             <Button variant="ghost" onClick={() => onSort('follower_name')}>
                                Responsável <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? data.map(item => {
                        const isNotBaptized = Array.isArray(item.interests) && item.interests.some(interest => interest.key === 'baptism');
                        
                        let parsedDetails = {};
                        try {
                            if (item.request_details) {
                                // Only try to parse if it looks like a JSON string
                                if (typeof item.request_details === 'string' && item.request_details.trim().startsWith('{')) {
                                    parsedDetails = JSON.parse(item.request_details);
                                } else if (typeof item.request_details === 'object' && item.request_details !== null) {
                                    parsedDetails = item.request_details;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to parse request_details:", e);
                            // Keep parsedDetails as an empty object on error
                        }

                        // @ts-ignore
                        const { member_age, gender, maritalStatus } = parsedDetails;
                        
                        let isFromVolunteering = false;
                        if(item.request_details) {
                            try {
                                const details = typeof item.request_details === 'string' && item.request_details.trim().startsWith('{')
                                    ? JSON.parse(item.request_details)
                                    : item.request_details;
                                if(typeof details === 'object' && details !== null && 'source' in details && details.source === 'Voluntariado') {
                                    isFromVolunteering = true;
                                }
                            } catch(e) {
                                // ignore parse error
                            }
                        }
                        const currentStatus = item.status || 'Pendente';
                        const statusInfo = statusDisplay[currentStatus] || { text: currentStatus, variant: 'outline'};

                        return (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="font-medium">
                                    <Link href={`/acolhimento/${item.id}`} className="hover:underline">
                                        {item.name}
                                    </Link>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-4 mt-1">
                                    {member_age && <span className="flex items-center gap-1"><Cake className="h-3 w-3" />{member_age} anos</span>}
                                    {gender && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{gender}</span>}
                                    {maritalStatus && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{maritalStatus}</span>}
                                </div>
                                 <div className="flex items-center gap-2 mt-2">
                                     {isNotBaptized && (
                                        <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-white">
                                            <AlertTriangle className="mr-1 h-3 w-3"/>
                                            Não Batizado
                                        </Badge>
                                    )}
                                    {isFromVolunteering && (
                                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                                            <Briefcase className="mr-1 h-3 w-3" />
                                            Vindo do Voluntariado
                                        </Badge>
                                    )}
                                 </div>
                            </TableCell>
                            <TableCell>{isClient ? new Date(item.created_at).toLocaleDateString('pt-BR') : '...'}</TableCell>
                            <TableCell>{item.follower_name || 'Ninguém'}</TableCell>
                            <TableCell>
                                <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/acolhimento/${item.id}`}>
                                                <ArrowRight className="mr-2 h-4 w-4" /> Ver Jornada
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openAssignDialog(item)}>
                                            Designar Responsável
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openDeleteDialog(item)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir Permanentemente
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">Nenhum registro encontrado para os filtros selecionados.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            
             <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Designar Responsável</DialogTitle>
                        <DialogDescription>
                            Escolha um membro da equipe para acompanhar {selectedNewBeginning?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="follower-select">Equipe de Acolhimento</Label>
                        <Select onValueChange={setSelectedFollowerId} defaultValue={selectedFollowerId || undefined}>
                            <SelectTrigger id="follower-select">
                                <SelectValue placeholder="Selecione um membro da equipe" />
                            </SelectTrigger>
                            <SelectContent>
                                {team.map(member => (
                                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleAssignFollower}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O registro de <span className="font-bold">{selectedNewBeginning?.name}</span> será excluído para sempre.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Sim, excluir permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

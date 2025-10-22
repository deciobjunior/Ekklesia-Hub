
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { AddRelationDialog } from '@/components/discipleship/add-relation-dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { PendingDisciplesCard } from '@/components/discipleship/pending-disciples-card';
import { Badge } from '@/components/ui/badge';

interface DiscipleshipRelation {
    id: string;
    disciplerId: string;
    disciplerName: string;
    disciplerAvatar: string;
    discipleId: string;
    discipleName: string;
    discipleAvatar: string;
    status: 'Ativo' | 'Pendente';
}

export type PendingDisciple = {
    id: string;
    name: string;
};

export default function DiscipleshipPage() {
    const { toast } = useToast();
    const { churchId, loading: userLoading } = useUser();
    const [relations, setRelations] = useState<DiscipleshipRelation[]>([]);
    const [pendingDisciples, setPendingDisciples] = useState<PendingDisciple[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchDiscipleshipData = async (currentChurchId: string) => {
        setLoading(true);
        
        const { data: relationsData, error: relationsError } = await supabase
            .from('pending_registrations')
            .select('id, form_data, status')
            .eq('church_id', currentChurchId)
            .eq('role', 'Discipulado');
        
        if (relationsError) {
            setLoading(false);
            toast({ title: "Erro ao buscar relações", description: relationsError.message, variant: "destructive" });
            return;
        }
        
        if (!relationsData || relationsData.length === 0) {
            setRelations([]);
            setPendingDisciples([]);
            setLoading(false);
            return;
        }

        const activeRelationsRaw = relationsData.filter(rel => rel.form_data.discipler_id);
        const pendingRelationsRaw = relationsData.filter(rel => !rel.form_data.discipler_id);

        setPendingDisciples(pendingRelationsRaw.map(p => ({ id: p.id, name: p.form_data.disciple_name || p.form_data.name })));

        const userIds = new Set<string>();
        activeRelationsRaw.forEach(rel => {
            userIds.add(rel.form_data.discipler_id);
            userIds.add(rel.form_data.disciple_id);
        });

        if (userIds.size === 0) {
            setRelations([]);
            setLoading(false);
            return;
        }

        const { data: usersData, error: usersError } = await supabase
            .from('members')
            .select('id, name')
            .in('id', Array.from(userIds));
            
        if (usersError) {
            setLoading(false);
            toast({ title: "Erro ao buscar usuários", description: usersError.message, variant: "destructive" });
            return;
        }

        const userMap = new Map(usersData.map(u => [u.id, u.name]));

        const formattedRelations = activeRelationsRaw.map(relation => {
            const { discipler_id, disciple_id } = relation.form_data;
            const disciplerName = userMap.get(discipler_id) || 'Não encontrado';
            const discipleName = userMap.get(disciple_id) || 'Não encontrado';
            
            return {
                id: relation.id,
                disciplerId: discipler_id,
                disciplerName,
                disciplerAvatar: `https://placehold.co/40x40.png?text=${disciplerName.charAt(0)}`,
                discipleId: disciple_id,
                discipleName,
                discipleAvatar: `https://placehold.co/40x40.png?text=${discipleName.charAt(0)}`,
                status: relation.status as 'Ativo' | 'Pendente',
            };
        });

        setRelations(formattedRelations);
        setLoading(false);
    };

    useEffect(() => {
        if (churchId) {
            fetchDiscipleshipData(churchId);
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [churchId, userLoading]);

    useEffect(() => {
        if (!churchId) return;
        const channel = supabase
            .channel('discipleship-relations-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations', filter: `role=eq.Discipulado` }, (payload) => {
                fetchDiscipleshipData(churchId);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [churchId]); 

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Discipulado</h1>
                    <p className="text-muted-foreground">Acompanhe e gerencie as relações de discipulado.</p>
                </div>
                <AddRelationDialog onRelationCreated={() => churchId && fetchDiscipleshipData(churchId)} />
            </div>

            {loading || userLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-8">
                    <PendingDisciplesCard 
                        pendingDisciples={pendingDisciples}
                        onUpdate={() => churchId && fetchDiscipleshipData(churchId)} 
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Relações de Discipulado Ativas ({relations.length})</CardTitle>
                            <CardDescription>Lista de todos os discipulados em andamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Discipulador(a)</TableHead>
                                        <TableHead>Discípulo(a)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {relations.length > 0 ? relations.map(relation => (
                                        <TableRow key={relation.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={relation.disciplerAvatar} data-ai-hint="person" />
                                                        <AvatarFallback>{relation.disciplerName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{relation.disciplerName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={relation.discipleAvatar} data-ai-hint="person" />
                                                        <AvatarFallback>{relation.discipleName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{relation.discipleName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={relation.status === 'Ativo' ? 'default' : 'secondary'}>
                                                    {relation.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/discipleship/${relation.id}`}>
                                                        Acompanhar
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Nenhuma relação de discipulado ativa.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    {relations.length === 0 && pendingDisciples.length === 0 && (
                         <div className="text-center text-muted-foreground py-16">
                            <p>Nenhuma relação de discipulado encontrada.</p>
                            <p className="text-sm">Clique em "Nova Relação" para começar.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

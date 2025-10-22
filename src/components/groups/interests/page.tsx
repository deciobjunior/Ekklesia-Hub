

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Mail, Phone, ArrowRight, MapPin } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { AssignGroupDialog } from '@/components/groups/assign-group-dialog';
import { useUser } from '@/hooks/use-user';

type InterestedPerson = {
    id: string;
    name: string;
    phone: string;
    email: string;
    created_at: string;
    follower_name?: string | null;
    request_details?: any;
};

export default function GroupInterestsPage() {
    const { toast } = useToast();
    const { churchId, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(true);
    const [interested, setInterested] = useState<InterestedPerson[]>([]);
    const [personToAssign, setPersonToAssign] = useState<InterestedPerson | null>(null);
    const supabase = createClient();

    const fetchInterested = useCallback(async (currentChurchId: string) => {
        setLoading(true);

        const { data, error } = await supabase
            .from('new_beginnings')
            .select('id, name, phone, email, created_at, interests, follower_name, request_details')
            .eq('church_id', currentChurchId)
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: 'Erro ao buscar interessados', description: error.message, variant: 'destructive' });
        } else {
            const filteredData = data.filter(person =>
                Array.isArray(person.interests) &&
                person.interests.some(interest => interest.key === 'growth_group')
            );
            setInterested(filteredData as InterestedPerson[]);
        }

        setLoading(false);
    }, [toast, supabase]);

    useEffect(() => {
        if (churchId) {
            fetchInterested(churchId);
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [churchId, userLoading, fetchInterested]);
    
    const handleWhatsappClick = (phone: string) => {
        if (!phone) return;
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    };
    
    const openAssignDialog = (person: InterestedPerson) => {
        setPersonToAssign(person);
    };

    if (loading || userLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Interessados em Pequenos Grupos</h1>
                    <p className="text-muted-foreground">Pessoas que expressaram interesse em participar de um grupo de crescimento.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Interessados ({interested.length})</CardTitle>
                        <CardDescription>Direcione essas pessoas para um pequeno grupo para que possam ser integradas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Bairro</TableHead>
                                        <TableHead>Data do Interesse</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {interested.length > 0 ? interested.map(person => {
                                        let bairro = 'Não informado';
                                        if (person.request_details) {
                                            try {
                                                const details = typeof person.request_details === 'string' && person.request_details.trim().startsWith('{')
                                                    ? JSON.parse(person.request_details)
                                                    : person.request_details;
                                                bairro = details.bairro || 'Não informado';
                                            } catch (e) {
                                                console.error("Failed to parse request_details:", e);
                                            }
                                        }

                                        return (
                                        <TableRow key={person.id}>
                                            <TableCell className="font-medium">{person.name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {person.phone && <span className="flex items-center gap-2 text-xs"><Phone className="h-3 w-3"/> {person.phone}</span>}
                                                    {person.email && <span className="flex items-center gap-2 text-xs"><Mail className="h-3 w-3"/> {person.email}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    {bairro}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(parseISO(person.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/acolhimento/${person.id}`}>
                                                            Ver Jornada
                                                        </Link>
                                                    </Button>
                                                    {person.phone && (
                                                        <Button variant="outline" size="icon" className="h-8 w-8 bg-green-50 hover:bg-green-100" onClick={() => handleWhatsappClick(person.phone)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4 text-green-600"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                                                                <span className="sr-only">WhatsApp</span>
                                                            </Button>
                                                        )}
                                                        <Button variant="outline" size="sm" onClick={() => openAssignDialog(person)}>
                                                            Direcionar para Grupo
                                                            <ArrowRight className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                        </TableRow>
                                    );
                                    }) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center">
                                                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                                    <p className="font-semibold">Nenhuma pessoa interessada no momento.</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                </TableBody>
                            </Table>
                        </CardContent>
                </Card>
            </div>
            {personToAssign && (
                <AssignGroupDialog
                    open={!!personToAssign}
                    onOpenChange={(isOpen) => !isOpen && setPersonToAssign(null)}
                    interestedPerson={personToAssign}
                    onAssigned={() => {
                        churchId && fetchInterested(churchId);
                        setPersonToAssign(null);
                    }}
                />
            )}
        </>
    );
}

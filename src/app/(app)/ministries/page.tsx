
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMinistryDialog } from "@/components/ministries/add-ministry-dialog";
import { ArrowRight, Loader2, UserCheck, FileText } from "lucide-react";
import type { Ministry, Member } from "@/lib/data";
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MinistryDetailsDialog } from '@/components/ministries/ministry-details-dialog';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user';


export type MinistryMember = Member & {
    ministryCount?: number;
};

export type MinistryWithDetails = Ministry & {
    pastor_name?: string;
    volunteers_details: MinistryMember[];
    pending_approvals_count?: number;
    form_data?: any;
};

export default function MinistriesPage() {
    const { toast } = useToast();
    const { churchId, loading: userLoading } = useUser();
    const [ministries, setMinistries] = useState<MinistryWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [selectedMinistry, setSelectedMinistry] = useState<MinistryWithDetails | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const supabase = createClient();

    const fetchMinistries = async (currentChurchId: string) => {
        setLoading(true);

        const { data: ministriesData, error: ministriesError } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('church_id', currentChurchId)
            .eq('role', 'Ministério');

        if (ministriesError) {
            toast({ title: "Erro ao buscar ministérios", description: ministriesError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        const { data: pendingApprovals, error: approvalsError } = await supabase
            .from('pending_registrations')
            .select('id, form_data')
            .eq('church_id', currentChurchId)
            .eq('role', 'Voluntário')
            .eq('status', 'Aguardando Aprovação do Líder');
        
        if (approvalsError) {
            toast({ title: "Erro ao buscar aprovações pendentes", description: approvalsError.message, variant: "destructive" });
        }
        
        const approvalCounts: Record<string, number> = {};
        if (pendingApprovals) {
            for (const approval of pendingApprovals) {
                const assignedIds = approval.form_data?.assigned_ministry_ids || [];
                for (const ministryId of assignedIds) {
                    approvalCounts[ministryId] = (approvalCounts[ministryId] || 0) + 1;
                }
            }
        }


        const { data: allUsers, error: usersError } = await supabase
            .from('pastors_and_leaders')
            .select('id, name, role')
            .eq('church_id', currentChurchId);
            
        const { data: allVolunteers, error: volunteersError } = await supabase
            .from('volunteers')
            .select('id, name, email')
            .eq('church_id', currentChurchId);

        if (usersError || volunteersError) {
            toast({ title: "Erro ao buscar usuários", description: usersError?.message || volunteersError?.message, variant: 'destructive' });
        }
        
        const combinedUsers = [...(allUsers || []), ...(allVolunteers || [])];
        
        const volunteerMinistryCount: Record<string, number> = {};
        ministriesData.forEach(ministry => {
            const volunteerIds = ministry.form_data?.volunteer_ids || [];
            volunteerIds.forEach((id: string) => {
                volunteerMinistryCount[id] = (volunteerMinistryCount[id] || 0) + 1;
            });
        });

        const detailedMinistries = ministriesData.map(ministry => {
            const formData = ministry.form_data || {};
            const pastor = allUsers?.find(u => u.id === formData.pastor_id);
            const volunteers = formData.volunteer_ids?.map((id: string) => combinedUsers.find(u => u.id === id)).filter(Boolean) || [];

            return {
                id: ministry.id,
                name: ministry.name,
                description: formData.description || 'Sem descrição',
                pastor: pastor?.name || 'Não definido',
                pastorAvatar: `https://placehold.co/40x40.png?text=${(pastor?.name || 'P').charAt(0)}`,
                volunteers: formData.volunteer_ids?.map((id: string) => ({ id })) || [],
                volunteers_details: volunteers.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    email: v.email,
                    avatar: `https://placehold.co/40x40.png?text=${v.name.charAt(0)}`,
                    ministryCount: volunteerMinistryCount[v.id] || 0,
                })) as MinistryMember[],
                pending_approvals_count: approvalCounts[ministry.id] || 0,
                form_data: formData,
            };
        });

        setMinistries(detailedMinistries);
        
        if (selectedMinistry) {
            const updatedMinistry = detailedMinistries.find(m => m.id === selectedMinistry.id);
            if(updatedMinistry) {
                setSelectedMinistry(updatedMinistry);
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        if (churchId) {
            fetchMinistries(churchId);
        } else if (!userLoading) {
             setLoading(false);
        }
    }, [churchId, userLoading]);

    useEffect(() => {
        if (!churchId) return;
        const channel = supabase.channel('ministries-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations', filter: 'role=eq.Ministério' }, (payload) => {
                fetchMinistries(churchId);
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [churchId]);
    
    const handleOpenDetails = (ministry: MinistryWithDetails) => {
      setSelectedMinistry(ministry);
      setIsDetailsModalOpen(true);
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        
        const { default: autoTable } = await import('jspdf-autotable');

        const allActivities = ministries.flatMap(ministry => 
            (ministry.form_data?.activities || []).map((activity: any) => ({
                ministryName: ministry.name,
                ...activity
            }))
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (allActivities.length === 0) {
            toast({
                title: "Nenhuma Atividade",
                description: "Não há atividades registradas nos ministérios para gerar um relatório.",
                variant: "default"
            });
            setIsGeneratingReport(false);
            return;
        }

        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Relatório de Histórico de Ministérios", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
        
        const tableColumn = ["Ministério", "Usuário", "Ação", "Data"];
        const tableRows: any[] = [];

        allActivities.forEach(activity => {
            const activityData = [
                activity.ministryName,
                activity.user,
                activity.details,
                format(new Date(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            ];
            tableRows.push(activityData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [25, 97, 64] },
        });

        doc.save(`relatorio_ministerios_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        setIsGeneratingReport(false);
    };


    if (loading || userLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ministérios</h1>
                    <p className="text-muted-foreground">Gerencie os ministérios da sua igreja, líderes e voluntários.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                        {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4" />}
                        {isGeneratingReport ? 'Gerando...' : 'Extrair Relatório'}
                    </Button>
                    <AddMinistryDialog onMinistryCreated={() => churchId && fetchMinistries(churchId)} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ministries.map((ministry) => {
                    const volunteers = ministry.volunteers_details;

                    return (
                        <Card key={ministry.id} className="flex flex-col relative">
                             {(ministry.pending_approvals_count ?? 0) > 0 && (
                                <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {ministry.pending_approvals_count}
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle>{ministry.name}</CardTitle>
                                <CardDescription>{ministry.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Responsável</h4>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={ministry.pastorAvatar} alt={ministry.pastor} data-ai-hint="person" />
                                            <AvatarFallback>{ministry.pastor.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{ministry.pastor}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                        Voluntários ({volunteers.length})
                                    </h4>
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {volunteers.slice(0, 5).map((volunteer) => (
                                            volunteer && (
                                                <Avatar key={volunteer.id} className="h-8 w-8 border-2 border-card">
                                                    <AvatarImage src={volunteer.avatar || ''} alt={volunteer.name} data-ai-hint="person" />
                                                    <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )
                                        ))}
                                        {volunteers.length > 5 && (
                                            <Avatar className="h-8 w-8 border-2 border-card">
                                                <AvatarFallback>+{volunteers.length - 5}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-6 pt-0 mt-auto">
                                <Button variant="outline" className="w-full justify-between" onClick={() => handleOpenDetails(ministry)}>
                                    Ver Detalhes
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
            
            
            <MinistryDetailsDialog 
                ministry={selectedMinistry} 
                open={isDetailsModalOpen} 
                onOpenChange={setIsDetailsModalOpen}
                onUpdate={() => churchId && fetchMinistries(churchId)}
            />
            
        </div>
    );
}

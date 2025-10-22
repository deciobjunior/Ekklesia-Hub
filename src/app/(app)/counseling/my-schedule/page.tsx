'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Counselor, CounselingAppointment } from "@/lib/data";
import { Check, Clock, Tag, X, Calendar, ArrowRight, Loader2, History, Trash2, SendToBack, Cake, Briefcase, Repeat } from "lucide-react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AddAppointmentDialog } from '@/components/counseling/add-appointment-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { generateScheduleNotification } from '@/ai/flows/generate-schedule-notification-flow';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';


type AppointmentWithId = CounselingAppointment & { 
    registration_id: string, 
    churchName?: string,
    history?: { id: string; date: string; counselor: string }[];
};

export default function MySchedulePage() {
    const { toast } = useToast();
    const supabase = createClient();
    const [isClient, setIsClient] = useState(false);
    const [counselor, setCounselor] = useState<Counselor | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const router = useRouter();
    
    // State for rejection dialog
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [appointmentToReject, setAppointmentToReject] = useState<AppointmentWithId | null>(null);
    
    // State for cancellation/return dialog
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentWithId | null>(null);
    const [returnToQueueReason, setReturnToQueueReason] = useState('');

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<{ app: AppointmentWithId, allAppointments: { id: string; date: string; counselor: string }[], currentPage: number } | null>(null);

    // Pagination for past appointments
    const [pastAppointmentsPage, setPastAppointmentsPage] = useState(1);
    const itemsPerPage = 5;

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
            return;
        }

        const { data: counselorData, error: counselorError } = await supabase.from('counselors').select('*, churches(name)').eq('id', user.id).single();
        let churchId = null;
        let finalCounselorData = null;

        if (counselorData) {
            finalCounselorData = counselorData;
            churchId = counselorData.church_id;
        }

        if (!finalCounselorData || !churchId) { setLoading(false); return; }
        
        // @ts-ignore
        let churchName = finalCounselorData.churches?.name || 'Sua Igreja';
        
        const formattedCounselor: Counselor = {
            id: finalCounselorData.id, name: finalCounselorData.name, email: finalCounselorData.email, phone: finalCounselorData.phone,
            avatar: `https://placehold.co/64x64.png?text=${finalCounselorData.name.charAt(0)}`,
            topics: finalCounselorData.topics || [], availability: finalCounselorData.availability || '{}', gender: finalCounselorData.gender || 'Não informado',
        };
        setCounselor(formattedCounselor);

        const { data: allAppointmentsRaw, error: appointmentError } = await supabase.from('pending_registrations').select('*').eq('church_id', churchId).eq('role', 'Conselheiro');

        if (appointmentError) {
            toast({ title: "Erro ao buscar agendamentos", description: appointmentError.message, variant: 'destructive' });
        } else {
             const allAppointments: CounselingAppointment[] = (allAppointmentsRaw || [])
                .filter(item => item.form_data && isValid(new Date(item.form_data.date)))
                .map((item: any) => ({
                    id: item.id, counselorId: item.form_data.counselor_id, counselorName: item.form_data.counselor_name,
                    memberId: item.form_data.member_id || item.id, memberName: item.name,
                    memberAvatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`, date: item.form_data.date, topic: item.form_data.topic,
                    status: item.status, form_data: item.form_data, meetings: [],
                }));

            const myAppointments = allAppointments.filter(app => app.counselorId === user.id);
            
            // Now, for each of my appointments, fetch the full history of that person
            const myAppointmentsWithHistory = await Promise.all(myAppointments.map(async (app) => {
                const memberName = app.form_data?.member_name || app.memberName;
                const memberEmail = app.form_data?.member_email;
                const memberPhone = app.form_data?.member_phone;
                let history: { id: string; date: string; counselor: string; }[] = [];

                if (memberName) {
                     const orConditions = [];
                    if (memberEmail) orConditions.push(`form_data->>member_email.eq.${memberEmail}`);
                    if (memberPhone) orConditions.push(`form_data->>member_phone.eq.${memberPhone}`);

                     let query = supabase
                        .from('pending_registrations')
                        .select('id, form_data->>date, form_data->>counselor_name')
                        .eq('role', 'Conselheiro')
                        .eq('form_data->>member_name', memberName)
                        .not('form_data->>counselor_name', 'is', null);
                    
                    if (orConditions.length > 0) {
                        query = query.or(orConditions.join(','), { foreignTable: 'form_data'});
                    }

                    const { data: historyData } = await query;

                    if (historyData) {
                        history = historyData
                            .map((h: any) => ({ id: h.id, date: h.date as string, counselor: h.counselor_name as string || 'Não atribuído' }))
                            .filter(h => h.date && isValid(new Date(h.date)))
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    }
                }
                
                return { ...app, registration_id: app.id, churchName, history };
            }));

            setAppointments(myAppointmentsWithHistory);
        }

        setLoading(false);
    }, [toast, supabase]);

    useEffect(() => {
        setIsClient(true);
        fetchData();
        
        const channel = supabase.channel('pending-registrations-my-schedule')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations' }, (payload) => { fetchData(); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData, supabase]);

    const handleOpenHistoryModal = (app: AppointmentWithId) => {
        setSelectedHistory({ app, allAppointments: app.history || [], currentPage: 1 });
        setHistoryModalOpen(true);
    };

    const handleHistoryPageChange = (direction: 'next' | 'prev') => {
        if (!selectedHistory) return;
        const totalPages = Math.ceil(selectedHistory.allAppointments.length / 10);
        setSelectedHistory(prev => {
            if (!prev) return null;
            const newPage = direction === 'next' ? Math.min(prev.currentPage + 1, totalPages) : Math.max(prev.currentPage - 1, 1);
            return { ...prev, currentPage: newPage };
        });
    };
    
    const HistoryTag = ({ app }: { app: AppointmentWithId }) => {
        const history = app.history || [];
        const count = history.length;
        if (count === 0) return null;

        const getVariant = (): "default" | "secondary" | "destructive" => {
            if (count <= 1) return 'default';
            if (count <= 3) return 'secondary';
            return 'destructive';
        };

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant={getVariant()} className="cursor-pointer flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenHistoryModal(app); }}>
                            <Repeat className="h-3 w-3" />
                            {count}º Atendimento
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        {history.length > 0 ? (
                            <div className="text-xs space-y-1">
                                <p className="font-bold">Histórico ({history.length} atendimentos):</p>
                                {history.slice(0, 5).map((item, index) => <p key={index}>- {format(new Date(item.date), 'dd/MM/yy')} com {item.counselor}</p>)}
                                {history.length > 5 && <p>... e mais {history.length - 5}.</p>}
                            </div>
                        ) : <p className="text-xs">Este é o primeiro atendimento registrado.</p>}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };
    
    const handleApproval = async (appointment: AppointmentWithId) => {
        if (!counselor || !counselor.id) {
            toast({ title: 'Erro', description: 'Perfil de conselheiro não carregado.', variant: 'destructive'});
            return;
        }

        setProcessingId(appointment.registration_id);
        
        const { error: updateError } = await supabase
            .from('pending_registrations')
            .update({ status: 'Marcado' })
            .eq('id', appointment.registration_id);

        if (updateError) {
            toast({ title: `Erro ao aprovar`, description: updateError.message, variant: 'destructive' });
        } else {
            toast({ title: `Agendamento Aprovado!`, description: `O agendamento foi confirmado.` });
            
            const appointmentDate = new Date(appointment.date);
            const formattedDate = format(appointmentDate, "dd/MM/yyyy");
            const formattedTime = format(appointmentDate, "HH:mm");
            
            const isValidEmail = (email: string) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (appointment.form_data?.member_email && isValidEmail(appointment.form_data.member_email)) {
                try {
                    await sendEmail({ to: appointment.form_data.member_email, subject: `Seu agendamento foi confirmado - ${appointment.churchName}`, body: `<h1>Olá, ${appointment.memberName}!</h1><p>Boas notícias! Seu agendamento de atendimento pastoral na igreja <strong>${appointment.churchName}</strong> foi confirmado.</p><p><strong>Conselheiro(a):</strong> ${counselor?.name}</p><p><strong>Data:</strong> ${formattedDate}</p><p><strong>Hora:</strong> ${formattedTime}</p><p>Se precisar reagendar, por favor, entre em contato com a secretaria da igreja.</p><p>Fique na paz!</p>` });
                } catch (emailError) { console.error("Failed to send approval email to member:", emailError); toast({ title: "Aviso", description: "Não foi possível enviar o e-mail de confirmação para o membro.", variant: 'default' }); }
            }
            
            if (counselor?.email && isValidEmail(counselor.email)) {
                 try {
                    await sendEmail({ to: counselor.email, subject: `Agendamento Confirmado: ${appointment.memberName}`, body: `<h1>Olá, ${counselor.name}!</h1><p>Você confirmou o agendamento com <strong>${appointment.memberName}</strong>.</p><p><strong>Data:</strong> ${formattedDate}</p><p><strong>Hora:</strong> ${formattedTime}</p><p>O atendimento já está na sua agenda na plataforma.</p><br/><p><strong>Ekklesia Hub</strong></p>` });
                } catch (emailError) { console.error("Failed to send approval email to counselor:", emailError); }
            }
            if (counselor?.phone) {
                 try {
                    const notification = await generateScheduleNotification({
                        counselorName: counselor.name.split(' ')[0],
                        memberName: appointment.memberName,
                        appointmentDate: formattedDate,
                        appointmentTime: formattedTime,
                    });
                    
                    await supabase.from('message_history').insert({
                        church_id: counselor.church_id,
                        campaign_id: `booking-approved-${Date.now()}`,
                        member_name: counselor.name,
                        member_phone: counselor.phone,
                        message_body: notification.message,
                        status: 'pending',
                        sent_by: 'System',
                    });
                    
                    await sendWhatsappMessage(counselor.phone, notification.message);
                } catch (whatsappError) {
                    console.error("Failed to send counselor whatsapp notification:", whatsappError);
                }
            }
            fetchData();
        }
        setProcessingId(null);
    };

    const openRejectDialog = (appointment: AppointmentWithId) => {
        setAppointmentToReject(appointment);
        setIsRejectDialogOpen(true);
    };
    
    const handleReject = async () => {
        if (!appointmentToReject || !rejectionReason.trim()) {
            toast({ title: "Justificativa obrigatória", description: "Por favor, informe o motivo da recusa.", variant: "destructive" });
            return;
        }

        setProcessingId(appointmentToReject.registration_id);
        const updatedFormData = { ...appointmentToReject.form_data, rejection_reason: rejectionReason, rejected_by: counselor?.name };
        const { error: updateError } = await supabase.from('pending_registrations').update({ status: 'Na Fila', form_data: updatedFormData }).eq('id', appointmentToReject.registration_id);
        
        if (updateError) {
            toast({ title: "Erro ao recusar", description: updateError.message, variant: 'destructive' });
        } else {
             toast({ title: "Agendamento Recusado", description: "O agendamento foi movido para a fila de espera com sua justificativa." });
            const isValidEmail = (email: string) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (appointmentToReject.form_data?.member_email && isValidEmail(appointmentToReject.form_data.member_email)) {
                 try {
                    await sendEmail({ to: appointmentToReject.form_data.member_email, subject: `Atualização sobre seu agendamento - ${appointmentToReject.churchName}`, body: `<h1>Olá, ${appointmentToReject.memberName}!</h1><p>Houve uma atualização sobre seu pedido de agendamento de atendimento pastoral na igreja <strong>${appointmentToReject.churchName}</strong>.</p><p>O(a) conselheiro(a) ${counselor?.name} não poderá atendê-lo(a) neste momento, e sua solicitação foi movida para a fila de espera para que outro conselheiro possa assumir.</p><p><strong>Justificativa do conselheiro(a):</strong></p><blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 1rem; font-style: italic;">${rejectionReason}</blockquote><p>Agradecemos sua paciência. Assim que um novo conselheiro aceitar seu pedido, você será notificado(a).</p><p>Fique na paz!</p>` });
                    toast({ title: "E-mail de notificação enviado!", description: `O usuário ${appointmentToReject.memberName} foi informado sobre a recusa.` });
                } catch (emailError) { console.error("Failed to send rejection email:", emailError); toast({ title: "Recusado, mas o e-mail falhou", description: "Não foi possível notificar o usuário por e-mail.", variant: 'destructive' }); }
            }
            setIsRejectDialogOpen(false); setAppointmentToReject(null); setRejectionReason('');
            fetchData();
        }
        setProcessingId(null);
    };

    const handleReturnToQueue = async () => {
        if (!appointmentToCancel || !returnToQueueReason.trim()) {
            toast({ title: 'Justificativa obrigatória', description: 'Por favor, informe o motivo para devolver o atendimento à fila.', variant: 'destructive'});
            return;
        }

        setProcessingId(appointmentToCancel.registration_id);
        const updatedFormData = { ...appointmentToCancel.form_data, counselor_id: null, counselor_name: null, counselor_email: null, rejection_reason: returnToQueueReason, rejected_by: counselor?.name };
        const { error } = await supabase.from('pending_registrations').update({ status: 'Na Fila', form_data: updatedFormData }).eq('id', appointmentToCancel.registration_id);

        if (error) { toast({ title: 'Erro ao devolver para a fila', description: error.message, variant: 'destructive' }); } 
        else { toast({ title: 'Atendimento Devolvido!', description: 'O atendimento foi retornado para a fila de espera.' }); fetchData(); }
        
        setProcessingId(null); setIsCancelDialogOpen(false); setReturnToQueueReason(''); setAppointmentToCancel(null);
    };

    const handleDeleteForever = async () => {
        if (!appointmentToCancel) return;
        setProcessingId(appointmentToCancel.registration_id);
        const { error } = await supabase.from('pending_registrations').delete().eq('id', appointmentToCancel.registration_id);

        if (error) { toast({ title: 'Erro ao cancelar definitivamente', description: error.message, variant: 'destructive' }); } 
        else { toast({ title: 'Agendamento Cancelado Definitivamente!', description: 'O registro foi removido do sistema.' }); fetchData(); }

        setProcessingId(null); setIsCancelDialogOpen(false); setAppointmentToCancel(null);
    };

    const openCancelDialog = (appointment: AppointmentWithId) => {
        setAppointmentToCancel(appointment);
        setIsCancelDialogOpen(true);
    };

    if (loading) { return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }
    if (!counselor) { return <div className="flex items-center justify-center h-full"><Card className="max-w-md text-center"><CardHeader><CardTitle>Perfil de Conselheiro Não Encontrado</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Não foi possível carregar o seu perfil de conselheiro. Verifique se seu cadastro está ativo ou entre em contato com o administrador.</p></CardContent></Card></div>; }
    
    const pendingAppointments = appointments.filter(a => a.status === 'Pendente');
    const upcomingAppointments = appointments.filter(a => (a.status === 'Marcado' || a.status === 'Em Aconselhamento') && new Date(a.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastAppointments = appointments.filter(a => new Date(a.date) < new Date() || ['Concluído', 'Cancelado', 'Na Fila'].includes(a.status)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const totalPastPages = Math.ceil(pastAppointments.length / itemsPerPage);
    const paginatedPastAppointments = pastAppointments.slice((pastAppointmentsPage - 1) * itemsPerPage, pastAppointmentsPage * itemsPerPage);

    const getStatusVariant = (status: string) => {
        switch (status) { case 'Concluído': return 'default'; case 'Cancelado': case 'Na Fila': return 'destructive'; case 'Em Aconselhamento': return 'secondary'; default: return 'outline'; }
    }
    
    const handleHistoryItemClick = (id: string) => {
        setHistoryModalOpen(false);
        router.push(`/counseling/${id}`);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                         <Avatar className="h-16 w-16 border"><AvatarImage src={counselor.avatar} alt={counselor.name} data-ai-hint="person" /><AvatarFallback>{counselor.name.slice(0, 2)}</AvatarFallback></Avatar>
                        <div><h1 className="text-2xl font-bold tracking-tight">Meus Agendamentos</h1><p className="text-muted-foreground">Olá, {counselor.name}! Gerencie seus horários e aprove novos pedidos.</p></div>
                    </div>
                    <div className="flex items-center gap-2"><AddAppointmentDialog counselor={counselor} onAppointmentCreated={fetchData} /><Button variant="outline" asChild><Link href={`/counseling/schedules?counselor=${counselor.id}`}><Calendar className="mr-2 h-4 w-4" />Ver Agenda Completa</Link></Button></div>
                </div>
                
                {pendingAppointments.length > 0 && (
                     <Card>
                        <CardHeader><CardTitle>Pedidos Pendentes ({pendingAppointments.length})</CardTitle><CardDescription>Analise e aprove os novos pedidos de agendamento.</CardDescription></CardHeader>
                        <CardContent><div className="space-y-4">{pendingAppointments.map(app => (<div key={app.registration_id} className="p-3 border rounded-lg"><div className="flex items-center gap-3 mb-3"><Avatar className="h-10 w-10"><AvatarImage src={app.memberAvatar} alt={app.memberName} data-ai-hint="person" /><AvatarFallback>{app.memberName.slice(0,2)}</AvatarFallback></Avatar><div><p className="font-semibold">{app.memberName}</p><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1"><span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {app.topic}</span>{app.form_data?.member_age && <span className="flex items-center gap-1"><Cake className="h-3 w-3" /> {app.form_data.member_age} anos</span>}{app.form_data?.member_marital_status && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {app.form_data.member_marital_status}</span>}</div></div></div><div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md mb-3">Horário solicitado: {isClient ? `${new Date(app.date).toLocaleDateString('pt-BR')} às ${new Date(app.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}` : '...'}</div><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openRejectDialog(app)} disabled={processingId === app.registration_id}><X className="mr-2 h-4 w-4" /> Recusar</Button><Button size="sm" onClick={() => handleApproval(app)} disabled={processingId === app.registration_id}>{processingId === app.registration_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Aprovar</Button></div></div>))}</div></CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Próximos Atendimentos ({upcomingAppointments.length})</CardTitle><CardDescription>Seus próximos atendimentos marcados.</CardDescription></CardHeader>
                        <CardContent><div className="space-y-4">{upcomingAppointments.length > 0 ? upcomingAppointments.map(app => (<div key={app.id} className="p-3 border rounded-lg flex flex-col gap-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={app.memberAvatar} alt={app.memberName} data-ai-hint="person" /><AvatarFallback>{app.memberName.slice(0,2)}</AvatarFallback></Avatar><div><div className="flex items-center gap-2"><p className="font-semibold">{app.memberName}</p><HistoryTag app={app} /></div><div className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3" /><span>{isClient ? `${new Date(app.date).toLocaleDateString('pt-BR')} às ${new Date(app.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}` : '...'}</span></div></div></div><div className="flex items-center gap-2"><Badge variant={getStatusVariant(app.status)}>{app.status}</Badge></div></div><div className="flex justify-end items-center gap-2 border-t pt-3"><Button size="sm" variant="destructive" onClick={() => openCancelDialog(app)} disabled={processingId === app.id}><X className="mr-2 h-4 w-4" /> Cancelar</Button><Button size="sm" variant="outline" asChild><Link href={`/counseling/${app.id}`}>Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>)) : (<div className="text-center text-muted-foreground py-10"><p>Nenhum atendimento marcado para os próximos dias.</p></div>)}</div></CardContent>
                    </Card>
                    
                     <Card className="flex flex-col">
                        <CardHeader><CardTitle>Histórico de Atendimentos ({pastAppointments.length})</CardTitle><CardDescription>Seus atendimentos anteriores.</CardDescription></CardHeader>
                        <CardContent className="flex-grow"><div className="space-y-4">{paginatedPastAppointments.length > 0 ? paginatedPastAppointments.map(app => (<div key={app.id} className="p-3 border rounded-lg flex flex-col gap-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Avatar className="h-10 w-10 opacity-70"><AvatarImage src={app.memberAvatar} alt={app.memberName} data-ai-hint="person" /><AvatarFallback>{app.memberName.slice(0,2)}</AvatarFallback></Avatar><div><div className="flex items-center gap-2"><p className="font-semibold">{app.memberName}</p><HistoryTag app={app} /></div><div className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3" /><span>{isClient ? `${new Date(app.date).toLocaleDateString('pt-BR')}` : '...'}</span></div></div></div><div className="flex items-center gap-2"><Badge variant={getStatusVariant(app.status)}>{app.status}</Badge></div></div><div className="flex justify-end items-center gap-2 border-t pt-3"><Button size="sm" variant="destructive" onClick={() => openCancelDialog(app)} disabled={processingId === app.id}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button><Button size="sm" variant="outline" asChild><Link href={`/counseling/${app.id}`}>Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>)) : (<div className="text-center text-muted-foreground py-10"><History className="h-8 w-8 mx-auto mb-2" /><p>Nenhum atendimento no histórico.</p></div>)}</div></CardContent>
                        {totalPastPages > 1 && (
                            <div className="p-4 border-t flex justify-end items-center gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setPastAppointmentsPage(p => Math.max(1, p - 1))}
                                    disabled={pastAppointmentsPage === 1}
                                >
                                    Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Página {pastAppointmentsPage} de {totalPastPages}
                                </span>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setPastAppointmentsPage(p => Math.min(totalPastPages, p + 1))}
                                    disabled={pastAppointmentsPage === totalPastPages}
                                >
                                    Próxima
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}><DialogContent><DialogHeader><DialogTitle>Recusar Agendamento</DialogTitle><DialogDescription>Por favor, forneça uma justificativa para recusar este agendamento. O pedido será enviado para a fila de espera para que outro conselheiro possa atender.</DialogDescription></DialogHeader><div className="py-4"><Label htmlFor="rejection-reason" className="sr-only">Justificativa</Label><Textarea id="rejection-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Ex: Conflito de agenda, não tenho especialidade neste assunto, etc." rows={4}/></div><DialogFooter><DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose><Button variant="destructive" onClick={handleReject} disabled={processingId !== null}>{processingId === appointmentToReject?.registration_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar Recusa</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}><DialogContent><DialogHeader><DialogTitle>Cancelar Agendamento de {appointmentToCancel?.memberName}</DialogTitle><DialogDescription>O que você gostaria de fazer com este agendamento?</DialogDescription></DialogHeader><div className="py-4 space-y-6"><div className="space-y-4 p-4 border rounded-lg"><h3 className="font-semibold flex items-center gap-2"><SendToBack className="h-4 w-4" /> Devolver para Fila de Espera</h3><p className="text-sm text-muted-foreground">O agendamento voltará para a fila e outro conselheiro poderá aceitá-lo.</p><div className="space-y-2"><Label htmlFor="return-reason">Motivo (obrigatório)</Label><Textarea id="return-reason" value={returnToQueueReason} onChange={(e) => setReturnToQueueReason(e.target.value)} placeholder="Ex: Iprevisto pessoal, conflito de agenda..."/></div><Button onClick={handleReturnToQueue} disabled={processingId !== null || !returnToQueueReason.trim()}>{processingId === appointmentToCancel?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Devolver para a Fila</Button></div><AlertDialog><AlertDialogTrigger asChild><div className="space-y-4 p-4 border rounded-lg border-destructive/50 bg-destructive/5"><h3 className="font-semibold text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Cancelar Definitivamente</h3><p className="text-sm text-destructive/80">Esta ação é permanente e irá remover o agendamento do sistema. O usuário será notificado.</p><Button variant="destructive" disabled={processingId !== null}>Cancelar Definitivamente</Button></div></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover permanentemente o agendamento de <strong>{appointmentToCancel?.memberName}</strong>. Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteForever} className="bg-destructive hover:bg-destructive/90">{processingId === appointmentToCancel?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Sim, cancelar definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><DialogFooter><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter></DialogContent></Dialog>
            {selectedHistory && (<Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Histórico de Atendimentos de {selectedHistory.app.memberName}</DialogTitle><DialogDescription>Total de {selectedHistory.allAppointments.length} atendimentos registrados.</DialogDescription></DialogHeader><div className="py-4 max-h-[60vh] overflow-y-auto"><div className="space-y-2">{selectedHistory.allAppointments.slice((selectedHistory.currentPage - 1) * 10, selectedHistory.currentPage * 10).map((item) => (<Button key={item.id} variant={item.id === selectedHistory.app.id ? 'default' : 'secondary'} className="w-full justify-between h-auto py-2" onClick={() => handleHistoryItemClick(item.id)}><div className="flex flex-col items-start text-left"><span className="font-semibold">{format(new Date(item.date), 'dd/MM/yyyy')}</span><span className="text-xs">{item.counselor || 'Não atribuído'}</span></div>{item.id === selectedHistory.app.id && <span className="text-xs">(Atual)</span>}</Button>))}</div></div><DialogFooter className="justify-between sm:justify-between">{selectedHistory.allAppointments.length > 10 && (<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => handleHistoryPageChange('prev')} disabled={selectedHistory.currentPage === 1}>Anterior</Button><span className="text-sm text-muted-foreground">Página {selectedHistory.currentPage} de {Math.ceil(selectedHistory.allAppointments.length / 10)}</span><Button variant="outline" size="sm" onClick={() => handleHistoryPageChange('next')} disabled={selectedHistory.currentPage === Math.ceil(selectedHistory.allAppointments.length / 10)}>Próxima</Button></div>)}<div/><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter></DialogContent></Dialog>)}
        </>
    );
}



    

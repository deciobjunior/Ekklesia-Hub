

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, BookOpen, Target, PlusCircle, Loader2, User, Lock, Eye, EyeOff, Pencil, Sparkles, MessageSquare, Archive, Tag, List, History, Handshake, CalendarClock, UserCog, XCircle, Mail, Repeat, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import type { CounselingAppointment, CounselingMeeting, Counselor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { generateBriefing } from '@/ai/flows/generate-briefing-flow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow, getDay, addMonths, isSameDay, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


type Activity = {
    id: string;
    timestamp: string;
    user: string;
    action: 'status_change' | 'add_meeting' | 'edit_meeting' | 'whatsapp_contact' | 'created' | 'rescheduled' | 'assigned_counselor' | 'canceled' | 'transferred';
    details?: string;
};

type AppointmentHistoryItem = { id: string; date: string; counselor: string };

type CounselingAppointmentWithPhone = CounselingAppointment & {
    memberPhone?: string;
    activities?: Activity[];
    counselorEmail?: string;
    history?: AppointmentHistoryItem[];
    church_id?: string;
};

type UserProfile = {
  id: string;
  role: string;
  name: string;
}

const HistoryTag = ({ app, history }: { app: CounselingAppointmentWithPhone, history: AppointmentHistoryItem[] | undefined }) => {
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const router = useRouter();

    if (!history || history.length === 0) return null;

    const allAppointmentsSorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const totalPages = Math.ceil(allAppointmentsSorted.length / itemsPerPage);
    const paginatedHistory = allAppointmentsSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    const firstAppointmentDate = allAppointmentsSorted.length > 0 ? new Date(allAppointmentsSorted[0].date) : null;


    const getVariant = (): "default" | "secondary" | "destructive" => {
        if (history.length <= 1) return 'default';
        if (history.length <= 3) return 'secondary';
        return 'destructive';
    };

    const handleHistoryItemClick = (id: string) => {
        setIsHistoryModalOpen(false);
        if (id !== app.id) {
            router.push(`/counseling/${id}`);
        }
    };

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge 
                          variant={getVariant()} 
                          className="cursor-pointer flex items-center gap-1"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(1); setIsHistoryModalOpen(true); }}
                        >
                            <Repeat className="h-3 w-3" />
                            {history.length}º Atendimento
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        {history && history.length > 0 ? (
                            <div className="text-xs space-y-1">
                                <p className="font-bold">Histórico ({history.length} atendimentos):</p>
                                {history.slice(0, 5).map((item, index) => (
                                    <p key={index}>- {format(new Date(item.date), 'dd/MM/yy')} com {item.counselor}</p>
                                ))}
                                {history.length > 5 && <p>... e mais {history.length - 5}.</p>}
                            </div>
                        ) : <p className="text-xs">Este é o primeiro atendimento registrado.</p>}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Histórico de Atendimentos de {app.memberName}</DialogTitle>
                         <DialogDescriptionComponent>
                            {firstAppointmentDate && (
                              <span>Primeiro atendimento em {format(firstAppointmentDate, 'dd/MM/yyyy')}. </span>
                            )}
                            Total de {allAppointmentsSorted.length} atendimentos registrados.
                        </DialogDescriptionComponent>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            {paginatedHistory.map((item) => (
                                <Button
                                    key={item.id}
                                    variant={item.id === app.id ? "default" : "secondary"}
                                    className="w-full justify-between h-auto py-2"
                                    onClick={() => handleHistoryItemClick(item.id)}
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-semibold">{format(new Date(item.date), 'dd/MM/yyyy')}</span>
                                        <span className="text-xs">{item.counselor || 'Não atribuído'}</span>
                                    </div>
                                    {item.id === app.id && <span className="text-xs">(Atual)</span>}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="justify-between sm:justify-between">
                         {totalPages > 1 ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </Button>
                                 <span className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                 </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima
                                </Button>
                            </div>
                        ) : <div />}
                        <DialogClose asChild>
                            <Button variant="outline">Fechar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


export default function CounselingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  const { toast } = useToast();
  const supabase = createClient();

  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<CounselingAppointmentWithPhone | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(null);
  
  const [revealedNotes, setRevealedNotes] = useState<Record<string, boolean>>({});
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CounselingMeeting | null>(null);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10));
  const [meetingTopic, setMeetingTopic] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingNextSteps, setMeetingNextSteps] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const [isBriefingDialogOpen, setIsBriefingDialogOpen] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [briefing, setBriefing] = useState('');

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newSelectedDate, setNewSelectedDate] = useState<Date | undefined>();
  const [newSelectedTime, setNewSelectedTime] = useState('');
  const [counselorAvailability, setCounselorAvailability] = useState<Record<string, any>>({});
  const [existingAppointments, setExistingAppointments] = useState<CounselingAppointment[]>([]);

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // State for Transfer Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [allCounselors, setAllCounselors] = useState<Counselor[]>([]);
  const [newCounselorId, setNewCounselorId] = useState<string | null>(null);


  const fetchAppointment = async () => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        let userRole = 'Membro';
        const { data: profile } = await supabase.from('pastors_and_leaders').select('role').eq('id', user.id).single();
        if (profile) {
            userRole = profile.role;
        } else {
            const { data: counselorProfile } = await supabase.from('counselors').select('id').eq('id', user.id).single();
            if (counselorProfile) userRole = 'Conselheiro';
        }

        setLoggedInUser({
            id: user.id,
            role: userRole,
            name: user.user_metadata?.full_name || 'Usuário',
        });
    }

    const { data: registrationData, error: registrationError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (registrationError || !registrationData) {
      console.error("Error fetching appointment:", registrationError?.message);
      setAppointment(null);
      setLoading(false);
      return;
    }

    let counselorName = 'Conselheiro(a)';
    let counselorEmail = '';
    const counselorId = registrationData.form_data?.counselor_id;
    
    if (registrationData.form_data?.counselor_name) {
        counselorName = registrationData.form_data.counselor_name;
    }
    
    if (counselorId) {
        const { data: counselorData } = await supabase
            .from('counselors')
            .select('name, email')
            .eq('id', counselorId)
            .single();
        if (counselorData) {
            counselorName = counselorData.name;
            counselorEmail = counselorData.email;
        }
    }
    
    const memberName = registrationData.form_data?.member_name || registrationData.name;
    const memberEmail = registrationData.form_data?.member_email;
    const memberPhone = registrationData.form_data?.member_phone;
    let history: AppointmentHistoryItem[] = [];

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
                .map(h => ({ id: h.id, date: h.date as string, counselor: (h.counselor_name as string) || 'Não atribuído' }))
                .filter(h => h.date && isValid(new Date(h.date)))
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
    }


    const formattedAppointment: CounselingAppointmentWithPhone = {
        id: registrationData.id,
        church_id: registrationData.church_id,
        counselorId: counselorId,
        counselorName: counselorName,
        counselorEmail: counselorEmail,
        memberId: '', 
        memberName: memberName,
        memberAvatar: `https://placehold.co/40x40.png?text=${memberName.charAt(0)}`,
        memberPhone: memberPhone || 'Não informado',
        date: registrationData.form_data.date,
        topic: registrationData.form_data.topic,
        status: registrationData.status,
        meetings: registrationData.form_data.meetings || [],
        activities: registrationData.form_data.activities || [],
        form_data: registrationData.form_data,
        history: history
    };
    setAppointment(formattedAppointment);
    setLoading(false);
  };

  useEffect(() => {
    setIsClient(true);
    fetchAppointment();
  }, [appointmentId]);
  
  const resetDialog = () => {
    setEditingMeeting(null);
    setMeetingDate(new Date().toISOString().substring(0, 10));
    setMeetingTopic('');
    setMeetingNotes('');
    setMeetingNextSteps('');
    setIsConfidential(false);
  };
  
  const openEditDialog = (meeting: CounselingMeeting) => {
    setEditingMeeting(meeting);
    setMeetingDate(new Date(meeting.date).toISOString().substring(0, 10));
    setMeetingTopic(meeting.topic);
    setMeetingNotes(meeting.notes);
    setMeetingNextSteps(meeting.nextSteps);
    setIsConfidential(meeting.isConfidential || false);
    setIsMeetingDialogOpen(true);
  };
  
  const addActivity = (action: Activity['action'], details?: string): Activity[] => {
    if (!loggedInUser || !appointment) return appointment?.activities || [];
    const newActivity: Activity = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: loggedInUser.name,
        action: action,
        details: details
    };
    return [...(appointment.activities || []), newActivity];
  };

  const handleSaveMeeting = async () => {
    if (!appointment || !meetingTopic || !meetingNotes || !loggedInUser) {
        toast({ title: "Campos obrigatórios", description: "Por favor, preencha o assunto e as anotações.", variant: "destructive" });
        return;
    }
    setSavingMeeting(true);

    const currentFormData = appointment.form_data || {};
    let updatedMeetings: CounselingMeeting[];

    if (editingMeeting) {
      updatedMeetings = (currentFormData.meetings || []).map((m: CounselingMeeting) => 
        m.id === editingMeeting.id 
          ? { ...m, date: meetingDate, topic: meetingTopic, notes: meetingNotes, nextSteps: meetingNextSteps, isConfidential: isConfidential }
          : m
      );
    } else {
      const newMeeting: CounselingMeeting = {
        id: `meeting-${Date.now()}`,
        date: meetingDate,
        topic: meetingTopic,
        notes: meetingNotes,
        nextSteps: meetingNextSteps,
        recordedBy: loggedInUser.name,
        recordedById: loggedInUser.id,
        isConfidential: isConfidential,
      };
      updatedMeetings = [...(currentFormData.meetings || []), newMeeting];
    }
    
    const updatedActivities = addActivity(
        editingMeeting ? 'edit_meeting' : 'add_meeting', 
        `Atendimento sobre "${meetingTopic}" ${editingMeeting ? 'atualizado' : 'registrado'}.`
    );

    const updatedFormData = {
      ...currentFormData,
      meetings: updatedMeetings,
      activities: updatedActivities,
    };

    const { error } = await supabase
        .from('pending_registrations')
        .update({ form_data: updatedFormData })
        .eq('id', appointment.id);

    if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: 'destructive' });
    } else {
        toast({ title: `Atendimento ${editingMeeting ? 'Atualizado' : 'Registrado'}!`, description: "A sessão foi salva com sucesso." });
        setIsMeetingDialogOpen(false);
        resetDialog();
        fetchAppointment();
    }

    setSavingMeeting(false);
  }
  
  const handleStatusChange = async (newStatus: 'Em Aconselhamento' | 'Concluído' | 'Cancelado' | 'Não houve retorno') => {
    if (!appointment) return;
    
    if (newStatus === 'Cancelado') {
        setIsCancelOpen(true);
        return;
    }

    setIsSavingStatus(true);
    
    const updatedActivities = addActivity('status_change', `Status alterado para "${newStatus}"`);
    const updatedFormData = { ...appointment.form_data, activities: updatedActivities };

    const { error } = await supabase
        .from('pending_registrations')
        .update({ status: newStatus, form_data: updatedFormData })
        .eq('id', appointment.id);
    
    if (error) {
        toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Status Atualizado!", description: `O atendimento agora está: ${newStatus}.` });
        fetchAppointment();
    }
    setIsSavingStatus(false);
  };
  
  const handleWhatsappClick = async () => {
    if (!appointment) return;

    const updatedActivities = addActivity('whatsapp_contact', `Tentativa de contato via WhatsApp com ${appointment.memberName}`);
    const { error } = await supabase
      .from('pending_registrations')
      .update({ form_data: { ...appointment.form_data, activities: updatedActivities } })
      .eq('id', appointment.id);
    
    if (error) {
        toast({ title: "Erro ao registrar atividade", description: error.message, variant: "destructive"});
    } else {
        fetchAppointment(); // Refresh to show new activity
        window.open(`https://wa.me/${appointment.memberPhone?.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGenerateBriefing = async () => {
    if (!appointment) return;
    setIsGeneratingBriefing(true);
    setBriefing('');
    setIsBriefingDialogOpen(true);

    try {
      const result = await generateBriefing({
        memberName: appointment.memberName,
        memberAge: appointment.form_data?.member_age,
        memberGender: appointment.form_data?.member_gender,
        memberMaritalStatus: appointment.form_data?.member_marital_status,
        requestDetails: appointment.form_data?.details,
        meetings: (appointment.meetings || []).map(m => ({
          ...m,
          isConfidential: canViewConfidential(m) ? m.isConfidential : true // Treat as confidential if user can't see it
        }))
      });
      setBriefing(result.briefing);
    } catch (error) {
      console.error("Error generating briefing:", error);
      toast({
        title: "Erro ao Gerar Briefing",
        description: "Não foi possível se comunicar com la IA. Tente novamente.",
        variant: "destructive",
      });
      setBriefing("Ocorreu um erro ao gerar o resumo.");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

    const openRescheduleDialog = async () => {
      if (!appointment?.counselorId) return;

      const { data, error } = await supabase
        .from('counselors')
        .select('availability')
        .eq('id', appointment.counselorId)
        .maybeSingle();

      if (error || !data || !data.availability) {
        toast({ title: "Erro", description: "Não foi possível carregar a disponibilidade do conselheiro. Verifique se os horários estão configurados no perfil dele(a).", variant: "destructive" });
        return;
      }

      const availabilityData = data.availability;
      try {
        const availability = typeof availabilityData === 'string' 
          ? JSON.parse(availabilityData) 
          : availabilityData;
        setCounselorAvailability(availability || {});
      } catch (e) {
        console.error("Failed to parse availability", e);
        toast({ title: "Erro", description: "O formato da disponibilidade do conselheiro é inválido.", variant: "destructive" });
        setCounselorAvailability({});
      }

      const { data: appointmentData } = await supabase
        .from('pending_registrations')
        .select('form_data')
        .eq('form_data->>counselor_id', appointment.counselorId)
        .in('status', ['Pendente', 'Marcado', 'Em Aconselhamento']);

      setExistingAppointments((appointmentData || []).map(d => d.form_data));
      
      setIsRescheduleOpen(true);
   };

    const availableWeekDays = useMemo(() => {
        const dayMap: { [key: string]: number } = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
        return Object.keys(counselorAvailability).map(day => dayMap[day]);
    }, [counselorAvailability]);


    const availableTimes = useMemo(() => {
        if (!newSelectedDate || !counselorAvailability) return [];
        
        const dayOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayOfWeek = dayOfWeekNames[getDay(newSelectedDate)];
        
        const baseTimes = counselorAvailability[dayOfWeek] || [];

        const bookedTimes = existingAppointments
            .filter(app => isSameDay(new Date(app.date), newSelectedDate))
            .map(app => format(new Date(app.date), 'HH:mm'));

        return baseTimes.map((time: string) => ({
            time,
            isBooked: bookedTimes.includes(time)
        })).sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));

    }, [newSelectedDate, existingAppointments, counselorAvailability]);

  const handleReschedule = async () => {
    if (!appointment || !newSelectedDate || !newSelectedTime) {
      toast({ title: "Campos obrigatórios", description: "Por favor, selecione a nova data e hora.", variant: "destructive" });
      return;
    }
    setSavingMeeting(true);

    const newDateTime = parse(`${format(newSelectedDate, 'yyyy-MM-dd')} ${newSelectedTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const updatedActivities = addActivity('rescheduled', `Atendimento reagendado para ${format(newDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`);
    
    const updatedFormData = { 
      ...(appointment.form_data || {}), 
      activities: updatedActivities,
      date: newDateTime.toISOString(),
    };

    const { error } = await supabase
      .from('pending_registrations')
      .update({ form_data: updatedFormData })
      .eq('id', appointmentId);
    
    if (error) {
      toast({ title: "Erro ao reagendar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Atendimento Reagendado!", description: `A nova data é ${format(newDateTime, "dd/MM/yyyy 'às' HH:mm")}.` });
      
      const isValidEmail = (email: string) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      // Send notification emails
      try {
        const fd = appointment.form_data || {};
        if (fd.member_email && isValidEmail(fd.member_email)) {
          await sendEmail({
            to: fd.member_email,
            subject: 'Seu atendimento foi reagendado',
            body: `<p>Olá, ${appointment.memberName}.</p><p>Seu atendimento pastoral foi reagendado para <strong>${format(newDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>.</p>`,
          });
        } else {
          console.warn(`Skipping email to invalid member address: ${fd.member_email}`);
        }
        if (appointment.counselorEmail && isValidEmail(appointment.counselorEmail)) {
          await sendEmail({
            to: appointment.counselorEmail,
            subject: `Atendimento reagendado: ${appointment.memberName}`,
            body: `<p>Olá, ${appointment.counselorName}.</p><p>O atendimento com <strong>${appointment.memberName}</strong> foi reagendado para <strong>${format(newDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>.</p>`,
          });
        } else {
           console.warn(`Skipping email to invalid counselor address: ${appointment.counselorEmail}`);
        }
      } catch (emailError: any) {
        console.error("Email sending failed after rescheduling:", emailError);
        toast({ title: "Emails não enviados", description: `O agendamento foi salvo, mas houve um erro ao notificar os participantes: ${emailError.message}`, variant: "default" });
      }

      setIsRescheduleOpen(false);
      setNewSelectedDate(undefined);
      setNewSelectedTime('');
      fetchAppointment();
    }
    setSavingMeeting(false);
  };
  
    const handleCancelAppointment = async () => {
    if (!appointment || !cancelReason.trim()) {
        toast({ title: "Justificativa obrigatória", description: "Por favor, informe o motivo do cancelamento.", variant: "destructive" });
        return;
    }

    setIsCanceling(true);

    try {
        const updatedActivities = addActivity('canceled', `Atendimento cancelado pelo motivo: "${cancelReason}".`);
        const updatedFormData = { 
            ...(appointment.form_data || {}), 
            activities: updatedActivities,
            cancellation_reason: cancelReason,
        };

        const { error } = await supabase
            .from('pending_registrations')
            .update({ status: 'Cancelado', form_data: updatedFormData })
            .eq('id', appointment.id);

        if (error) throw error;

        const isValidEmail = (email: string) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        try {
            const fd = appointment.form_data || {};
            if (fd.member_email && isValidEmail(fd.member_email)) {
                 await sendEmail({
                    to: fd.member_email,
                    subject: 'Seu atendimento pastoral foi cancelado',
                    body: `<p>Olá, ${appointment.memberName}.</p><p>Informamos que seu atendimento pastoral foi cancelado.</p><p><strong>Motivo:</strong> ${cancelReason}</p><p>Se precisar, você pode solicitar um novo agendamento na plataforma.</p>`,
                });
            } else {
                console.warn(`Skipping cancellation email to invalid member address: ${fd.member_email}`);
            }
            
            if (appointment.counselorEmail && isValidEmail(appointment.counselorEmail)) {
                 await sendEmail({
                    to: appointment.counselorEmail,
                    subject: `Atendimento cancelado: ${appointment.memberName}`,
                    body: `<p>Olá, ${appointment.counselorName}.</p><p>O atendimento com ${appointment.memberName} foi cancelado por você.</p><p><strong>Motivo:</strong> ${cancelReason}</p><p>Este é um e-mail de confirmação para seus registros.</p>`,
                });
            } else {
                console.warn(`Skipping cancellation email to invalid counselor address: ${appointment.counselorEmail}`);
            }

            toast({ title: "Atendimento Cancelado!", description: "O status foi atualizado e as notificações por e-mail foram enviadas." });
        } catch (emailError: any) {
            console.error("Cancellation email sending failed:", emailError);
            toast({ title: "Cancelado, mas houve falha no envio de e-mails", description: `O agendamento foi cancelado, mas houve um erro ao notificar os participantes: ${emailError.message}`, variant: "default" });
        }
        
        fetchAppointment();
        setIsCancelOpen(false);
        setCancelReason('');
    } catch (error: any) {
        toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    } finally {
        setIsCanceling(false);
    }
  };

  const handleOpenTransferModal = async () => {
    if (!appointment?.counselorId || !appointment.church_id) {
        toast({ title: "Erro", description: "Não é possível transferir este atendimento.", variant: "destructive" });
        return;
    }

    const { data, error } = await supabase
      .from('counselors')
      .select('id, name')
      .eq('church_id', appointment.church_id)
      .not('id', 'eq', appointment.counselorId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar la lista de conselheiros.", variant: "destructive" });
      return;
    }
    
    setAllCounselors(data as Counselor[]);
    setNewCounselorId(null);
    setTransferReason('');
    setIsTransferOpen(true);
  };
  
  const handleTransfer = async () => {
      if (!appointment || !newCounselorId || !transferReason.trim()) {
          toast({ title: "Campos obrigatórios", description: "Selecione o novo conselheiro e informe a justificativa.", variant: "destructive" });
          return;
      }
      setIsTransferring(true);
  
      try {
          const newCounselor = allCounselors.find(c => c.id === newCounselorId);
          if (!newCounselor) throw new Error("Novo conselheiro não encontrado.");
          
          const oldCounselorName = appointment.counselorName;

          const updatedActivities = addActivity('transferred', `Atendimento transferido de ${oldCounselorName} para ${newCounselor.name}. Motivo: "${transferReason}"`);
          
          const updatedFormData = { 
              ...(appointment.form_data || {}), 
              activities: updatedActivities,
              counselor_id: newCounselor.id,
              counselor_name: newCounselor.name,
              counselor_email: newCounselor.email,
          };
  
          const { error } = await supabase
              .from('pending_registrations')
              .update({ form_data: updatedFormData, status: 'Marcado' }) // Keep status as it is, or move to Marcado
              .eq('id', appointment.id);
  
          if (error) throw error;
          
          toast({ title: "Atendimento Transferido!", description: `O atendimento foi atribuído a ${newCounselor.name}.` });
          
          fetchAppointment();
          setIsTransferOpen(false);
  
      } catch (error: any) {
          toast({ title: "Erro ao transferir", description: error.message, variant: "destructive" });
      } finally {
          setIsTransferring(false);
      }
  };


  const toggleConfidentiality = (meetingId: string) => {
    setRevealedNotes(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }));
  };
  
  const canViewConfidential = (meeting: CounselingMeeting) => {
    if (!loggedInUser) return false;
    // Only Pastor can view all confidential notes
    if (loggedInUser.role === 'Pastor' || loggedInUser.role === 'Administrador' || loggedInUser.role === 'Coordenador') return true;
    // The counselor who recorded it can view it
    if (loggedInUser.id === meeting.recordedById) return true;
    // No one else can
    return false;
  };
  
  const canEditMeeting = (meeting: CounselingMeeting) => {
    if (!loggedInUser) return false;
    return loggedInUser.id === meeting.recordedById;
  };
  
  const getActionIcon = (action: Activity['action']) => {
    switch (action) {
      case 'status_change':
        return <Tag className="h-4 w-4" />;
      case 'add_meeting':
      case 'edit_meeting':
        return <BookOpen className="h-4 w-4" />;
      case 'whatsapp_contact':
        return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                </svg>;
      case 'created':
        return <PlusCircle className="h-4 w-4" />;
      case 'rescheduled':
        return <CalendarClock className="h-4 w-4" />;
      case 'assigned_counselor':
        return <UserCog className="h-4 w-4" />;
      case 'canceled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'transferred':
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appointment) {
    return notFound();
  }

  const backUrl = loggedInUser?.role === 'Conselheiro' ? '/counseling/my-schedule' : '/counseling/schedules';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
            <Link href={backUrl}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
            </Link>
            </Button>
            <div>
            <h1 className="text-2xl font-bold tracking-tight">Acompanhamento de Atendimento Pastoral</h1>
            <p className="text-muted-foreground">Histórico de encontros e progresso do atendimento.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleOpenTransferModal}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transferir
          </Button>
          <Button variant="secondary" onClick={openRescheduleDialog}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Reagendar
          </Button>
          <Button variant="outline" onClick={handleGenerateBriefing}>
            <Sparkles className="mr-2 h-4 w-4" />
            Resumo de perfil
          </Button>
         <Dialog open={isMeetingDialogOpen} onOpenChange={(open) => { setIsMeetingDialogOpen(open); if (!open) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingMeeting(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar Atendimento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingMeeting ? 'Editar' : 'Registrar Novo'} Atendimento</DialogTitle>
                <DialogDescriptionComponent>
                  Preencha as informações sobre la sessão de atendimento pastoral.
                </DialogDescriptionComponent>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Data do Atendimento</Label>
                  <Input id="meeting-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="meeting-topic">Assunto Principal</Label>
                  <Input id="meeting-topic" placeholder="Ex: Comunicação no casamento" value={meetingTopic} onChange={(e) => setMeetingTopic(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="meeting-notes">Anotações da Sessão</Label>
                  <Textarea id="meeting-notes" placeholder="Descreva o que foi conversado, pontos importantes, etc." rows={4} value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-next-steps">Próximos Passos e Recomendações</Label>
                  <Textarea id="meeting-next-steps" placeholder="Ex: Leitura recomendada, exercícios práticos, etc." rows={3} value={meetingNextSteps} onChange={(e) => setMeetingNextSteps(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="confidential-check" checked={isConfidential} onCheckedChange={(checked) => setIsConfidential(!!checked)} />
                    <Label htmlFor="confidential-check" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Marcar como confidencial
                    </Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveMeeting} disabled={savingMeeting}>
                    {savingMeeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {savingMeeting ? "Salvando..." : "Salvar Registro"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Detalhes do Atendimento Pastoral</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                    {appointment.form_data?.source === 'Acolhimento' && (
                       <Badge variant="secondary">
                            <Handshake className="mr-1 h-3 w-3" />
                            Origem: Acolhimento
                       </Badge>
                    )}
                    <HistoryTag app={appointment} history={appointment.history} />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="status-select" className="text-sm text-muted-foreground">Status:</Label>
                {isSavingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Select onValueChange={(value) => handleStatusChange(value as any)} value={appointment.status || 'Em Aconselhamento'}>
                        <SelectTrigger id="status-select" className="w-[220px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Em Aconselhamento">Em Atendimento</SelectItem>
                            <SelectItem value="Concluído">Concluído</SelectItem>
                            <SelectItem value="Não houve retorno">Não houve retorno</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
           <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                <AvatarImage src={`https://placehold.co/64x64.png?text=${appointment.counselorName?.slice(0, 2) || 'C'}`} alt={appointment.counselorName} data-ai-hint="person" />
                <AvatarFallback>{appointment.counselorName?.slice(0, 2) || 'C'}</AvatarFallback>
                </Avatar>
                <div>
                <p className="text-sm text-muted-foreground">Conselheiro(a)</p>
                <p className="font-bold text-lg">{appointment.counselorName}</p>
                </div>
            </div>
           <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={appointment.memberAvatar} alt={appointment.memberName} data-ai-hint="person" />
                    <AvatarFallback>{appointment.memberName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Atendido(a)</p>
                    <p className="font-bold text-lg">{appointment.memberName}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate" title={(appointment.form_data || {}).member_email || 'Não informado'}>{(appointment.form_data || {}).member_email || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {appointment.memberPhone && appointment.memberPhone !== 'Não informado' && (
                            <Button onClick={handleWhatsappClick} className="bg-green-600 hover:bg-green-700 text-white h-auto px-2 py-1 text-xs flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                </svg>
                                {appointment.memberPhone}
                            </Button>
                        )}
                        {appointment.form_data?.member_age && (
                            <p className="text-sm text-muted-foreground">{appointment.form_data.member_age} anos</p>
                        )}
                         {appointment.form_data?.member_marital_status && (
                            <p className="text-sm text-muted-foreground">{appointment.form_data.member_marital_status}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t">
                 <div className="flex items-start gap-3 text-sm">
                    <Tag className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Tópico Principal</p>
                        <p className="font-semibold text-foreground">{appointment.topic}</p>
                    </div>
                </div>
                {appointment.form_data?.details && (
                    <div className="flex items-start gap-3 text-sm">
                        <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Detalhes da Solicitação</p>
                            <p className="font-semibold text-foreground italic">"{appointment.form_data.details}"</p>
                        </div>
                    </div>
                )}
            </div>
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Histórico de Atendimentos</CardTitle>
            <CardDescription>Linha do tempo das sessões de atendimento pastoral registradas.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                {appointment.meetings && appointment.meetings.length > 0 ? (
                    appointment.meetings.map(meeting => {
                        const hasPermissionToReveal = canViewConfidential(meeting);
                        const isRevealed = revealedNotes[meeting.id] && hasPermissionToReveal;
                        const isEffectivelyConfidential = meeting.isConfidential && !isRevealed;

                        return (
                        <div key={meeting.id} className="p-4 rounded-lg border relative">
                             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                                <h3 className="font-semibold text-lg">{meeting.topic}</h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1 sm:mt-0">
                                    <div className="flex items-center gap-2 self-end">
                                         {meeting.isConfidential && (
                                            <>
                                                <Badge variant="destructive">
                                                    <Lock className="mr-1 h-3 w-3" />
                                                    Confidencial
                                                </Badge>
                                                {hasPermissionToReveal && (
                                                    <Button variant="ghost" size="sm" onClick={() => toggleConfidentiality(meeting.id)}>
                                                        {isRevealed ? <EyeOff className="mr-1 h-4 w-4"/> : <Eye className="mr-1 h-4 w-4"/>}
                                                        {isRevealed ? 'Ocultar' : 'Revelar'}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {canEditMeeting(meeting) && (
                                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(meeting)}>
                                                <Pencil className="mr-1 h-4 w-4" />
                                                Editar
                                            </Button>
                                        )}
                                    </div>
                                    {meeting.recordedBy && (
                                        <div className="flex items-center gap-2 self-end">
                                            <User className="h-4 w-4" />
                                            <span>Registrado por: {meeting.recordedBy}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 self-end">
                                        <CalendarIcon className="h-4 w-4" />
                                        <span>{isClient ? new Date(meeting.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '...'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={cn("space-y-3 text-muted-foreground transition-all duration-300", isEffectivelyConfidential && "blur-sm pointer-events-none")}>
                                <div className="flex items-start gap-3">
                                <BookOpen className="h-4 w-4 mt-1 flex-shrink-0" />
                                <p><strong className="text-foreground">Anotações:</strong> {meeting.notes}</p>
                                </div>
                                <div className="flex items-start gap-3">
                                <Target className="h-4 w-4 mt-1 flex-shrink-0" />
                                <p><strong className="text-foreground">Próximos Passos:</strong> {meeting.nextSteps}</p>
                                </div>
                            </div>
                        </div>
                        )
                    })
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="font-semibold">Nenhum atendimento registrado</h3>
                        <p className="text-sm">Clique em "Registrar Atendimento" para adicionar la primeira sessão.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle>Registro de Atividades</CardTitle>
            <CardDescription>Histórico de todas as ações relacionadas a este atendimento.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {appointment.activities && appointment.activities.length > 0 ? (
                    [...appointment.activities].reverse().map(activity => (
                        <div key={activity.id} className="flex items-center gap-4">
                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                {getActionIcon(activity.action)}
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">{activity.user}</span> {activity.details}
                                <div className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <History className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="font-semibold">Nenhuma atividade registrada</h3>
                        <p className="text-sm">As ações importantes ficarão registradas aqui.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      {/* AI Briefing Dialog */}
      <Dialog open={isBriefingDialogOpen} onOpenChange={setIsBriefingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo do Perfil (IA)
            </DialogTitle>
            <DialogDescriptionComponent>
              Resumo gerado por IA do histórico de atendimentos de {appointment.memberName}.
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="py-4 min-h-[150px]">
            {isGeneratingBriefing ? (
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analisando histórico e gerando resumo...</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{briefing}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reagendar Atendimento</DialogTitle>
            <DialogDescriptionComponent>Selecione uma nova data e horário para o atendimento de {appointment.memberName}.</DialogDescriptionComponent>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-4">
             <div className="flex justify-center">
                <Calendar
                    locale={ptBR}
                    mode="single"
                    selected={newSelectedDate}
                    onSelect={setNewSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={{ available: availableWeekDays.map(day => ({ dayOfWeek: [day] })) }}
                    modifiersClassNames={{ available: 'day-available' }}
                    disabled={(date) => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        if (date < today) return true;
                        return !availableWeekDays.includes(getDay(date));
                    }}
                    className="rounded-md border"
                />
             </div>
             {newSelectedDate && (
                <div className="space-y-2">
                    <Label>Horários disponíveis para {isClient ? newSelectedDate.toLocaleDateString('pt-BR') : '...'}</Label>
                        <div className="grid grid-cols-3 gap-2">
                        {availableTimes.length > 0 ? availableTimes.map((item: { time: string; isBooked: boolean }) => (
                            <Button 
                                key={item.time}
                                variant={newSelectedTime === item.time ? 'default' : 'outline'}
                                onClick={() => setNewSelectedTime(item.time)}
                                disabled={item.isBooked}
                            >
                                {item.time}
                            </Button>
                        )) : (
                            <p className="col-span-3 text-center text-sm text-muted-foreground pt-4">Nenhum horário cadastrado para este dia.</p>
                        )}
                        </div>
                </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleReschedule} disabled={savingMeeting || !newSelectedTime}>
              {savingMeeting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Dialog */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transferir Atendimento</DialogTitle>
                    <DialogDescriptionComponent>
                       Selecione o novo conselheiro e justifique a transferência. O status do atendimento será mantido.
                    </DialogDescriptionComponent>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-counselor">Novo Conselheiro(a)</Label>
                        <Select onValueChange={setNewCounselorId} value={newCounselorId || ''}>
                            <SelectTrigger id="new-counselor">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allCounselors.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transfer-reason">Justificativa da Transferência</Label>
                        <Textarea
                            id="transfer-reason"
                            value={transferReason}
                            onChange={(e) => setTransferReason(e.target.value)}
                            placeholder="Escreva uma justificativa breve para a transferência..."
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button variant="default" onClick={handleTransfer} disabled={isTransferring || !transferReason.trim() || !newCounselorId}>
                        {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Transferência
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      {/* Cancel Appointment Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar Atendimento</DialogTitle>
                    <DialogDescriptionComponent>
                        Por favor, informe o motivo do cancelamento. O membro será notificado por e-mail.
                    </DialogDescriptionComponent>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="cancel-reason" className="sr-only">Motivo do Cancelamento</Label>
                    <Textarea
                        id="cancel-reason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Ex: O membro não compareceu, o problema foi resolvido, etc."
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Voltar</Button></DialogClose>
                    <Button variant="destructive" onClick={handleCancelAppointment} disabled={isCanceling || !cancelReason.trim()}>
                        {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cancelamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

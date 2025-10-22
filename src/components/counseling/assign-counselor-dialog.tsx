
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, UserCog } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Counselor, CounselingAppointment } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { format, getDay, parse, isSameDay, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { Label } from '../ui/label';
import { useUser } from '@/hooks/use-user';
import { generateScheduleNotification } from '@/ai/flows/generate-schedule-notification-flow';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';

type WaitingListEntry = CounselingAppointment;

interface AssignCounselorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: WaitingListEntry;
  churchId: string;
  churchName: string;
  onSuccess: () => void;
}

export function AssignCounselorDialog({ open, onOpenChange, request, churchId, churchName, onSuccess }: AssignCounselorDialogProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const { user } = useUser();
    
    const [submitting, setSubmitting] = useState(false);
    const [loadingCounselors, setLoadingCounselors] = useState(true);
    const [allCounselors, setAllCounselors] = useState<Counselor[]>([]);
    const [appointments, setAppointments] = useState<CounselingAppointment[]>([]);
    
    const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');

    useEffect(() => {
        const fetchCounselors = async () => {
            if (!open) return;
            setLoadingCounselors(true);

            const { data, error } = await supabase
                .from('counselors')
                .select('*')
                .eq('church_id', churchId);

            if (error) {
                toast({ title: "Erro ao buscar conselheiros", description: error.message, variant: "destructive" });
                setAllCounselors([]);
            } else {
                 const formattedData: Counselor[] = (data || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    email: item.email,
                    phone: item.phone,
                    avatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
                    topics: item.topics || [],
                    availability: item.availability || '{}',
                    gender: item.gender || 'Não informado',
                }));
                setAllCounselors(formattedData);
            }
            setLoadingCounselors(false);
        };
        fetchCounselors();
    }, [open, churchId, toast, supabase]);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!selectedCounselorId) return;

            const { data, error } = await supabase
                .from('pending_registrations')
                .select('form_data')
                .eq('form_data->>counselor_id', selectedCounselorId)
                .in('status', ['Pendente', 'Marcado', 'Em Aconselhamento']);

            if (error) {
                toast({ title: "Erro ao buscar agendamentos", description: error.message, variant: 'destructive' });
                setAppointments([]);
            } else {
                const formattedAppointments: CounselingAppointment[] = data.map((item: any) => ({
                    ...(item.form_data as CounselingAppointment),
                    id: '', memberName: '', memberId: '', memberAvatar: '', meetings: []
                }));
                setAppointments(formattedAppointments);
            }
        };

        fetchAppointments();
    }, [selectedCounselorId, toast, supabase]);

    const selectedCounselor = useMemo(() => {
        return allCounselors.find(c => c.id === selectedCounselorId);
    }, [selectedCounselorId, allCounselors]);

    const counselorAvailability = useMemo(() => {
        if (!selectedCounselor || !selectedCounselor.availability) return {};
        try {
            if (typeof selectedCounselor.availability === 'string') return JSON.parse(selectedCounselor.availability);
            return selectedCounselor.availability;
        } catch { return {}; }
    }, [selectedCounselor]);

    const availableWeekDays = useMemo(() => {
        const dayMap: { [key: string]: number } = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
        return Object.keys(counselorAvailability).map(day => dayMap[day]);
    }, [counselorAvailability]);

    const availableTimes = useMemo(() => {
        if (!selectedDate || !counselorAvailability) return [];
        const dayOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayOfWeek = dayOfWeekNames[getDay(selectedDate)];
        const baseTimes = counselorAvailability[dayOfWeek] || [];
        const bookedTimes = appointments
            .filter(app => isSameDay(new Date(app.date), selectedDate))
            .map(app => format(new Date(app.date), 'HH:mm'));
        return baseTimes.map((time: string) => ({
            time,
            isBooked: bookedTimes.includes(time)
        })).sort((a,b) => a.time.localeCompare(b.time));
    }, [selectedDate, appointments, counselorAvailability]);

    const handleAssignAppointment = async () => {
        if (!selectedCounselor || !selectedDate || !selectedTime) {
            toast({ title: "Campos Incompletos", description: "Selecione conselheiro, data e horário.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        const finalDateTime = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTime}`, 'yyyy-MM-dd HH:mm', new Date());

        const assignerName = user?.user_metadata?.full_name || 'Coordenador';

        const assignmentActivity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: assignerName,
            action: 'assigned_counselor',
            details: `Atendimento atribuído a ${selectedCounselor.name} por ${assignerName}.`
        };

        const updatedActivities = [...(request.form_data?.activities || []), assignmentActivity];

        const { error } = await supabase
            .from('pending_registrations')
            .update({
                status: 'Marcado',
                form_data: {
                    ...request.form_data,
                    counselor_id: selectedCounselor.id,
                    counselor_name: selectedCounselor.name,
                    counselor_email: selectedCounselor.email,
                    counselor_phone: selectedCounselor.phone,
                    date: finalDateTime.toISOString(),
                    activities: updatedActivities,
                }
            })
            .eq('id', request.id);

        if (error) {
            toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
            setSubmitting(false);
            return;
        }

        try {
            if (request.form_data.member_email) {
                 await sendEmail({
                    to: request.form_data.member_email,
                    subject: `Seu agendamento foi confirmado - ${churchName}`,
                    body: `<p>Olá, ${request.memberName}!</h1><p>Boas notícias! Um conselheiro já está disponível e seu agendamento na igreja <strong>${churchName}</strong> foi confirmado.</p><p><strong>Conselheiro(a):</strong> ${selectedCounselor.name}</p><p><strong>Data:</strong> ${format(finalDateTime, "PPP", { locale: ptBR })}</p><p><strong>Hora:</strong> ${format(finalDateTime, "p", { locale: ptBR })}</p><p>Fique na paz!</p>`
                });
            }
            if (selectedCounselor.phone) {
                const notification = await generateScheduleNotification({
                    counselorName: selectedCounselor.name.split(' ')[0],
                    memberName: request.memberName,
                    appointmentDate: format(finalDateTime, "dd/MM/yyyy"),
                    appointmentTime: format(finalDateTime, "HH:mm"),
                });

                 await supabase.from('message_history').insert({
                    church_id: churchId,
                    campaign_id: `assigned-booking-${Date.now()}`,
                    member_name: selectedCounselor.name,
                    member_phone: selectedCounselor.phone,
                    message_body: notification.message,
                    status: 'pending',
                    sent_by: 'System',
                 });
                
                await sendWhatsappMessage(selectedCounselor.phone, notification.message);
            }
        } catch(e) {
            console.error("Notification sending failed but appointment was assigned:", e);
             toast({ title: "Agendado, mas notificações falharam", variant: "default" });
        }
        
        toast({ title: "Atendimento Atribuído!", description: `${request.memberName} foi agendado com ${selectedCounselor.name}.` });
        onSuccess();
        setSubmitting(false);
    };

    const genderFilteredCounselors = allCounselors.filter(c =>
        !request.requestingUserGender ||
        request.requestingUserGender === 'Outro' ||
        c.gender === request.requestingUserGender
    );
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Atribuir Atendimento para: {request.memberName}</DialogTitle>
                    <DialogDescription>
                       Selecione um conselheiro, uma nova data e horário para este atendimento.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    {loadingCounselors ? (
                        <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Conselheiro</Label>
                                    <Select onValueChange={setSelectedCounselorId} value={selectedCounselorId || ''}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um conselheiro..." /></SelectTrigger>
                                        <SelectContent>
                                            {genderFilteredCounselors.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedCounselor && selectedDate && (
                                     <div className="space-y-2">
                                        <Label>Horários disponíveis</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {availableTimes.length > 0 ? availableTimes.map(item => (
                                                <Button 
                                                    key={item.time}
                                                    variant={selectedTime === item.time ? 'default' : 'outline'}
                                                    onClick={() => setSelectedTime(item.time)}
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
                            <div className="flex justify-center">
                                <Calendar
                                    locale={ptBR}
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    fromMonth={new Date()}
                                    toDate={addMonths(new Date(), 2)}
                                    disabled={(date) => {
                                        const today = new Date(); today.setHours(0,0,0,0);
                                        if (date < today || !selectedCounselorId) return true;
                                        return !availableWeekDays.includes(getDay(date));
                                    }}
                                    className="rounded-md border"
                                />
                            </div>
                        </div>
                    )}
                 </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleAssignAppointment} disabled={submitting || loadingCounselors || !selectedTime}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirmar Atribuição
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

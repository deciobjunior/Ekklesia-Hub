

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Counselor, CounselingAppointment } from '@/lib/data';
import { format, getDay, parse, isSameDay, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendEmail } from '@/ai/flows/send-email-flow';

type WaitingListEntry = CounselingAppointment & {
    originalCounselorName?: string;
    requestingUserGender?: string;
    rejectionReason?: string;
};

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: WaitingListEntry;
  counselor: Counselor;
  churchName: string;
  onSuccess: () => void;
}

export function ScheduleFromWaitingListDialog({ open, onOpenChange, request, counselor, churchName, onSuccess }: ScheduleDialogProps) {
    const { toast } = useToast();
    const supabase = createClient();
    
    const [submitting, setSubmitting] = useState(false);
    const [appointments, setAppointments] = useState<CounselingAppointment[]>([]);
    
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');

    const counselorAvailability = useMemo(() => {
        if (!counselor || !counselor.availability) return {};
        try {
            if (typeof counselor.availability === 'string') {
                return JSON.parse(counselor.availability);
            }
            return counselor.availability;
        } catch {
            return {};
        }
    }, [counselor]);

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
        })).sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));

    }, [selectedDate, appointments, counselorAvailability]);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!open) return;
            const { data, error } = await supabase
                .from('pending_registrations')
                .select('form_data')
                .eq('form_data->>counselor_id', counselor.id)
                .in('status', ['Pendente', 'Marcado', 'Em Aconselhamento']);

            if (error) {
                toast({ title: "Erro ao buscar agendamentos", description: error.message, variant: 'destructive' });
            } else {
                const formattedAppointments: CounselingAppointment[] = data.map((item: any) => ({ ...(item.form_data as CounselingAppointment), id:'', memberName:'', memberId:'', memberAvatar:'', meetings: [] }));
                setAppointments(formattedAppointments);
            }
        };

        fetchAppointments();
    }, [open, counselor.id, toast, supabase]);
    
    const handleWhatsappClick = () => {
        if (!request.form_data?.member_phone) return;
        window.open(`https://wa.me/${request.form_data.member_phone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    };

    const handleScheduleAppointment = async () => {
        if (!selectedDate || !selectedTime) {
            toast({ title: "Campos Incompletos", description: "Por favor, selecione uma data e um horário.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        const finalDateTime = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTime}`, 'yyyy-MM-dd HH:mm', new Date());

        const { error } = await supabase
            .from('pending_registrations')
            .update({
                status: 'Marcado',
                form_data: {
                    ...request.form_data,
                    counselor_id: counselor.id,
                    counselor_name: counselor.name,
                    counselor_email: counselor.email,
                    date: finalDateTime.toISOString(),
                }
            })
            .eq('id', request.id);

        if (error) {
            toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
            setSubmitting(false);
            return;
        }

        try {
            // Notify user
            if ((request.form_data || {}).member_email) {
                 await sendEmail({
                    to: (request.form_data || {}).member_email,
                    subject: `Seu agendamento foi confirmado - ${churchName}`,
                    body: `<p>Olá, ${request.memberName}!</h1><p>Boas notícias! Seu agendamento de aconselhamento na igreja <strong>${churchName}</strong> foi confirmado.</p><p><strong>Conselheiro(a):</strong> ${counselor.name}</p><p><strong>Data:</strong> ${format(finalDateTime, "PPP", { locale: ptBR })}</p><p><strong>Hora:</strong> ${format(finalDateTime, "p", { locale: ptBR })}</p><p>Fique na paz!</p>`
                });
            }
             // Notify counselor
            if (counselor.email) {
                 await sendEmail({
                    to: counselor.email,
                    subject: `Agendamento Confirmado - ${request.memberName}`,
                    body: `<h1>Olá, ${counselor.name}!</h1><p>Você confirmou o agendamento de <strong>${request.memberName}</strong> para o dia ${format(finalDateTime, "PPP 'às' p", { locale: ptBR })}.</p><p>Este atendimento já consta em sua agenda na plataforma.</p>`
                });
            }
        } catch(e) {
            console.error("Email sending failed but appointment was scheduled:", e);
             toast({ title: "Agendado, mas e-mail de notificação falhou", variant: "default" });
        }
        
        toast({ title: "Agendamento Confirmado!", description: `O atendimento com ${request.memberName} foi marcado com sucesso.` });
        onSuccess();
        setSubmitting(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Agendar Atendimento para: {request.memberName}</DialogTitle>
                    <DialogDescription>
                        Selecione a data e o horário para o aconselhamento. O horário original solicitado foi {new Date(request.date).toLocaleDateString('pt-BR')} às {new Date(request.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 items-start py-4">
                    <div className="flex justify-center">
                        <Calendar
                            locale={ptBR}
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                                const today = new Date(); today.setHours(0,0,0,0);
                                if (date < today) return true;
                                return !availableWeekDays.includes(getDay(date));
                            }}
                             modifiers={{ available: availableWeekDays.map(day => ({ dayOfWeek: [day] })) }}
                             modifiersClassNames={{ available: 'day-available' }}
                             className="rounded-md border"
                        />
                    </div>
                     <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                             <h4 className="font-semibold">Informações do Solicitante</h4>
                             <p className="text-sm"><strong>Tópico:</strong> {request.topic}</p>
                             {(request.form_data || {}).member_phone && (
                                <Button variant="outline" size="sm" onClick={handleWhatsappClick} className="bg-green-100 border-green-200 text-green-800 hover:bg-green-200">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4 mr-2"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                                    Falar no WhatsApp
                                </Button>
                             )}
                        </div>
                        {selectedDate && (
                            <div className="space-y-2">
                                <Label>Horários disponíveis para {selectedDate.toLocaleDateString('pt-BR')}</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {availableTimes.length > 0 ? availableTimes.map((item: { time: string; isBooked: boolean }) => (
                                        <Button 
                                            key={item.time}
                                            variant={selectedTime === item.time ? 'default' : 'outline'}
                                            onClick={() => setSelectedTime(item.time)}
                                            disabled={item.isBooked}
                                        >
                                            {item.time}
                                        </Button>
                                    )) : (
                                        <p className="col-span-4 text-center text-sm text-muted-foreground pt-4">Nenhum horário cadastrado para este dia.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleScheduleAppointment} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirmar Agendamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

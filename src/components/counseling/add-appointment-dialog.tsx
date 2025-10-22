'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Counselor, counselingTopics } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { generateScheduleNotification } from '@/ai/flows/generate-schedule-notification-flow';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';

interface AddAppointmentDialogProps {
    counselor: Counselor;
    onAppointmentCreated: () => void;
}

export function AddAppointmentDialog({ counselor, onAppointmentCreated }: AddAppointmentDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [churchId, setChurchId] = useState<string | null>(null);
    const supabase = createClient();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [topic, setTopic] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        if (open) {
            const getChurchId = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: c } = await supabase.from('counselors').select('church_id').eq('id', user.id).single();
                    if (c) setChurchId(c.church_id);
                }
            };
            getChurchId();
        }
    }, [open, supabase]);

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setGender(''); setAge('');
        setMaritalStatus(''); setTopic(''); setDate(''); setTime(''); setDetails('');
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            resetForm();
        }
        setOpen(isOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !topic || !date || !time) {
            toast({ title: "Campos obrigatórios", description: "Nome, tópico, data e hora são obrigatórios.", variant: "destructive" });
            return;
        }

        setLoading(true);

        const appointmentDateTime = new Date(`${date}T${time}:00`);

        try {
            if (!churchId) throw new Error("ID da Igreja não encontrado.");

            const { error } = await supabase.from('pending_registrations').insert({
                church_id: churchId,
                name: name,
                email: email,
                role: 'Conselheiro',
                status: 'Marcado',
                form_data: {
                    counselor_id: counselor.id,
                    counselor_name: counselor.name,
                    counselor_email: counselor.email,
                    counselor_phone: counselor.phone,
                    member_email: email,
                    member_phone: phone,
                    member_marital_status: maritalStatus,
                    member_gender: gender,
                    member_age: age,
                    topic: topic,
                    date: appointmentDateTime.toISOString(),
                    details: details,
                    source: 'Registro Direto',
                }
            });

            if (error) throw error;

            if (counselor.phone) {
                 const notification = await generateScheduleNotification({
                    counselorName: counselor.name.split(' ')[0],
                    memberName: name,
                    appointmentDate: format(appointmentDateTime, "dd/MM/yyyy"),
                    appointmentTime: format(appointmentDateTime, "HH:mm"),
                });

                await supabase.from('message_history').insert({
                    church_id: churchId,
                    campaign_id: `manual-booking-${Date.now()}`,
                    member_name: counselor.name,
                    member_phone: counselor.phone,
                    message_body: notification.message,
                    status: 'pending',
                    sent_by: 'System',
                });
                
                await sendWhatsappMessage(counselor.phone, notification.message);
            }


            toast({ title: "Atendimento Registrado!", description: "O novo atendimento foi salvo na sua agenda." });
            onAppointmentCreated();
            handleOpenChange(false);

        } catch (error: any) {
            toast({ title: "Erro ao registrar", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const ageOptions = Array.from({ length: 82 }, (_, i) => i + 18); // Ages 18 to 99

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Atendimento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Registrar Novo Atendimento Manual</DialogTitle>
                        <DialogDescription>
                            Preencha os dados do atendimento que você realizou ou agendou.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="counselee" className="w-full pt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="counselee">Aconselhado</TabsTrigger>
                            <TabsTrigger value="appointment">Atendimento</TabsTrigger>
                            <TabsTrigger value="confirm">Revisar</TabsTrigger>
                        </TabsList>
                        <div className="py-4 min-h-[300px]">
                            <TabsContent value="counselee" className="space-y-4">
                                 <div className="grid md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="name">Nome do Aconselhado</Label>
                                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                                        <Input id="phone" type="tel" value={phone} placeholder="+5511999999999" onChange={e => setPhone(e.target.value)} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gênero</Label>
                                        <Select onValueChange={setGender} value={gender}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Masculino">Masculino</SelectItem>
                                                <SelectItem value="Feminino">Feminino</SelectItem>
                                                <SelectItem value="Outro">Prefiro não informar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Idade</Label>
                                        <Select onValueChange={setAge} value={age}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                {ageOptions.map(opt => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="maritalStatus">Estado Civil</Label>
                                        <Select onValueChange={setMaritalStatus} value={maritalStatus}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                                <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                                <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                                <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                 </div>
                            </TabsContent>
                             <TabsContent value="appointment" className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="topic">Tópico Principal</Label>
                                    <Select onValueChange={setTopic} value={topic} required>
                                        <SelectTrigger><SelectValue placeholder="Selecione um tópico..." /></SelectTrigger>
                                        <SelectContent>
                                            {counselingTopics.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Data do Atendimento</Label>
                                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Hora do Atendimento</Label>
                                        <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} required />
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="confirm" className="space-y-4">
                                <h3 className="font-semibold">Revise as informações</h3>
                                <div className="space-y-1 text-sm p-4 border rounded-md bg-muted/50">
                                    <p><strong>Aconselhado(a):</strong> {name || 'Não preenchido'}</p>
                                    <p><strong>Contato:</strong> {email || phone || 'Não preenchido'}</p>
                                    <p><strong>Tópico:</strong> {topic || 'Não preenchido'}</p>
                                    <p><strong>Conselheiro:</strong> {counselor.name}</p>
                                    {date && time && (
                                        <p><strong>Data e Hora:</strong> {format(new Date(`${date}T${time}:00`), "dd/MM/yyyy 'às' HH:mm")}</p>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">Ao salvar, este atendimento será adicionado diretamente à sua agenda com o status "Marcado".</p>
                            </TabsContent>
                        </div>
                    </Tabs>
                    <DialogFooter className="pt-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar Atendimento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

    

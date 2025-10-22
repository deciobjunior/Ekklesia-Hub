
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Counselor, counselingTopics, CounselingAppointment } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Tag, User, Mail, Loader2, Phone, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { isSameDay, format, getDay, parse, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { Textarea } from '@/components/ui/textarea';
import { generateScheduleNotification } from '@/ai/flows/generate-schedule-notification-flow';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';

export function BookingClientForm({ churchId }: { churchId: string; }) {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    
    const [churchName, setChurchName] = useState("Carregando...");
    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [loadingInitialData, setLoadingInitialData] = useState(true);

    const [selectedTopic, setSelectedTopic] = useState('');
    const [userGender, setUserGender] = useState('');
    const [selectedCounselorId, setSelectedCounselorId] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');
    const [isClient, setIsClient] = useState(false);

    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userMaritalStatus, setUserMaritalStatus] = useState('');
    const [userAge, setUserAge] = useState('');
    const [userDetails, setUserDetails] = useState('');

    const [appointments, setAppointments] = useState<CounselingAppointment[]>([]);
    const supabase = createClient();

    useEffect(() => {
        setIsClient(true);
        const fetchInitialData = async () => {
            setLoadingInitialData(true);
            const { data: churchData, error: churchError } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();
            
            if (churchError || !churchData) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(churchData.name);
            }

            const { data: counselorsData, error: counselorsError } = await supabase
                .from('counselors')
                .select('*')
                .eq('church_id', churchId);

            if (counselorsError) {
                toast({ title: "Erro ao carregar conselheiros", description: counselorsError.message, variant: "destructive" });
            } else if (counselorsData) {
                 const formattedCounselors: Counselor[] = counselorsData.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    email: item.email,
                    phone: item.phone,
                    avatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
                    topics: item.topics || [],
                    availability: item.availability || '{}',
                    gender: item.gender || 'Não informado',
                }));
                setCounselors(formattedCounselors);
            }
            setLoadingInitialData(false);
        };
        fetchInitialData();
    }, [churchId, supabase, toast]);


    // Fetch appointments when counselor changes
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
                    id: '', // not needed here
                    memberName: '',
                    memberAvatar: '',
                    meetings: [],
                    memberId: ''
                }));
                setAppointments(formattedAppointments);
            }
        };

        fetchAppointments();
    }, [selectedCounselorId, toast, supabase]);
    
    const counselorsForTopic = counselors.filter(c => {
        // Find the topic object from the data file
        const topicObject = counselingTopics.find(t => t.label === selectedTopic);
        if (!topicObject) return false;

        // Check if any of the counselor's topics is a substring of the selected topic's label.
        // This is a simple way to match "Espiritual" to "Espirituais (Não consigo ler...)"
        const topicMatch = c.topics.some(counselorTopic => topicObject.label.includes(counselorTopic));
        
        const genderMatch = !userGender || userGender === 'Outro' || c.gender === userGender;
        return topicMatch && genderMatch;
    });
    
    const selectedCounselor = counselors.find(c => c.id === selectedCounselorId);
    
    const counselorAvailability = useMemo(() => {
        if (!selectedCounselor || !selectedCounselor.availability) return {};
        try {
            if (typeof selectedCounselor.availability === 'string') {
                return JSON.parse(selectedCounselor.availability);
            }
            return selectedCounselor.availability;
        } catch {
            return {};
        }
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
        })).sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));

    }, [selectedDate, appointments, counselorAvailability]);
    
    const handleBooking = async (isWaitingList: boolean = false) => {
        if (!userName || !userEmail || !userPhone || !selectedTopic) {
            toast({
                title: "Campos Incompletos",
                description: "Por favor, preencha pelo menos seu nome, e-mail, telefone e o tópico antes de continuar.",
                variant: "destructive"
            });
            return;
        }
        
        if (!isWaitingList && (!selectedCounselorId || !selectedDate || !selectedTime)) {
            toast({
                title: "Campos Incompletos",
                description: "Por favor, preencha todos os campos antes de confirmar.",
                variant: "destructive"
            });
            return;
        }
        
        setSubmitting(true);
        
        // Check for existing pending registration
        const { data: existing, error: checkError } = await supabase
            .from('pending_registrations')
            .select('id')
            .eq('church_id', churchId)
            .eq('name', userName)
            .or(`email.eq.${userEmail},form_data->>member_phone.eq.${userPhone}`)
            .eq('role', 'Conselheiro')
            .in('status', ['Pendente', 'Marcado', 'Em Aconselhamento', 'Na Fila'])
            .maybeSingle();

        if (checkError) {
            toast({ title: "Erro na verificação", description: checkError.message, variant: "destructive" });
            setSubmitting(false);
            return;
        }
        
        if (existing) {
             toast({
                title: "Solicitação já existe",
                description: "Você já possui um agendamento ou está na fila de espera. Nossa equipe entrará em contato em breve.",
                variant: "default",
                duration: 6000,
            });
            setSubmitting(false);
            return;
        }

        const finalStatus = isWaitingList ? 'Na Fila' : 'Pendente';
        const finalCounselorId = isWaitingList ? null : selectedCounselorId;
        const finalCounselorName = isWaitingList ? null : selectedCounselor?.name;
        const finalCounselorEmail = isWaitingList ? null : selectedCounselor?.email;
        const finalCounselorPhone = isWaitingList ? null : selectedCounselor?.phone;
        const finalDateTime = isWaitingList ? new Date() : parse(`${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`, 'yyyy-MM-dd HH:mm', new Date());

        const initialActivity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: 'Sistema',
            action: 'created',
            details: `Solicitação de atendimento recebida através do formulário público.`,
        };

        const { error } = await supabase.from('pending_registrations').insert({
            church_id: churchId,
            name: userName,
            email: userEmail, 
            role: 'Conselheiro', 
            status: finalStatus,
            form_data: {
                counselor_id: finalCounselorId,
                counselor_name: finalCounselorName,
                counselor_email: finalCounselorEmail,
                counselor_phone: finalCounselorPhone,
                member_name: userName,
                member_email: userEmail,
                member_phone: userPhone,
                member_marital_status: userMaritalStatus,
                topic: selectedTopic,
                date: finalDateTime.toISOString(),
                member_age: userAge,
                member_gender: userGender,
                details: userDetails,
                activities: [initialActivity],
            }
        });

        if (error) {
            toast({
                title: "Erro no Agendamento",
                description: `Ocorreu um erro: ${error.message}`,
                variant: 'destructive'
            });
            setSubmitting(false);
            return;
        }
        
        if (isWaitingList) {
             try {
                const emailSubject = `Confirmação de Fila de Espera - ${churchName}`;
                const emailBody = `
                    <h1>Olá, ${userName}!</h1>
                    <p>Recebemos sua solicitação de atendimento pastoral na igreja ${churchName}.</p>
                    <p>No momento, não há conselheiros disponíveis para o tópico/horário selecionado, mas colocamos você em nossa <strong>fila de espera</strong>.</p>
                    <p>Assim que um conselheiro estiver disponível para assumir seu caso, você será notificado por e-mail.</p>
                    <p>Agradecemos sua paciência.</p>
                `;
                await sendEmail({ to: userEmail, subject: emailSubject, body: emailBody });
                toast({
                    title: "Você está na Fila!",
                    description: "Sua solicitação foi recebida e você foi adicionado à fila de espera. Enviamos um e-mail de confirmação.",
                });
            } catch (emailError) {
                 toast({
                    title: "Você está na Fila!",
                    description: "Não foi possível enviar o e-mail de confirmação, mas sua solicitação foi recebida.",
                });
            }
        } else {
            // Send confirmation email to user
            try {
                const emailSubject = `Confirmação de Agendamento - ${churchName}`;
                const emailBody = `
                    <h1>Olá, ${userName}!</h1>
                    <p>Recebemos seu pedido de agendamento de atendimento pastoral na igreja ${churchName}.</p>
                    <p><strong>Assunto:</strong> ${selectedTopic}</p>
                    <p><strong>Conselheiro(a):</strong> ${selectedCounselor?.name}</p>
                    <p><strong>Data e Hora Solicitada:</strong> ${selectedDate!.toLocaleDateString('pt-BR')} às ${selectedTime}</p>
                    <p>Seu pedido está pendente de aprovação. Você receberá um novo e-mail assim que o conselheiro(a) confirmar o horário.</p>
                    <p>Fique na paz!</p>
                    <br/>
                    <p><strong>Equipe de Aconselhamento</strong></p>
                    <p>${churchName}</p>
                `;
                await sendEmail({ to: userEmail, subject: emailSubject, body: emailBody });
                toast({
                    title: "Agendamento Enviado!",
                    description: "Seu pedido foi recebido. Enviamos uma confirmação para o seu e-mail.",
                });
            } catch (emailError) {
                 console.error("Failed to send confirmation email:", emailError);
                 toast({
                    title: "Agendamento Enviado, mas...",
                    description: "Não foi possível enviar o e-mail de confirmação. Mesmo assim, seu pedido foi recebido.",
                    variant: "default",
                });
            }

            // Send notification email AND WhatsApp to counselor
            if (selectedCounselor?.phone) {
                 try {
                     const notification = await generateScheduleNotification({
                        counselorName: selectedCounselor.name.split(' ')[0],
                        memberName: userName,
                        appointmentDate: format(finalDateTime, "dd/MM/yyyy"),
                        appointmentTime: format(finalDateTime, "HH:mm"),
                    });

                    // Save to history then send
                    await supabase.from('message_history').insert({
                        church_id: churchId,
                        member_name: selectedCounselor.name,
                        member_phone: selectedCounselor.phone,
                        message_body: notification.message,
                        status: 'pending',
                        sent_by: 'System',
                        campaign_id: `booking-${finalDateTime.getTime()}`
                    });

                    await sendWhatsappMessage(selectedCounselor.phone, notification.message);
                } catch (whatsappError) {
                    console.error("Failed to send counselor whatsapp notification:", whatsappError);
                }
            }
        }
        
        setUserName('');
        setUserEmail('');
        setUserPhone('');
        setUserMaritalStatus('');
        setUserAge('');
        setSelectedTopic('');
        setSelectedCounselorId('');
        setSelectedDate(undefined);
        setSelectedTime('');
        setUserGender('');
        setUserDetails('');
        setSubmitting(false);
    };
    
    const ageOptions = Array.from({ length: 82 }, (_, i) => i + 18); // Ages 18 to 99

    if (loadingInitialData) {
        return (
             <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4"><Logo /></div>
                    <CardTitle className="text-2xl">Agendamento de Atendimento Pastoral</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }
    
    return (
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Agendamento de Atendimento Pastoral</CardTitle>
                <CardDescription>
                    {churchName} - Estamos aqui para ajudar. Preencha os campos abaixo para marcar um horário.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Step 1: Personal Info & Topic */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">Passo 1: Suas informações e o motivo do contato</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="user-name">Seu Nome</Label>
                                <Input id="user-name" placeholder="Como podemos te chamar?" value={userName} onChange={e => setUserName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-phone">Seu WhatsApp</Label>
                                <Input id="user-phone" type="tel" placeholder="+5511999999999" value={userPhone} onChange={e => setUserPhone(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="user-email">Seu E-mail</Label>
                                <Input id="user-email" type="email" placeholder="seu.email@exemplo.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-age">Sua Idade</Label>
                                <Select onValueChange={setUserAge} value={userAge}>
                                    <SelectTrigger id="user-age">
                                        <SelectValue placeholder="Selecione sua idade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ageOptions.map(age => (
                                            <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-gender">Seu Gênero</Label>
                                <Select onValueChange={setUserGender} value={userGender}>
                                    <SelectTrigger id="user-gender">
                                        <SelectValue placeholder="Selecione seu gênero..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="user-marital-status">Seu Estado Civil</Label>
                                 <Select onValueChange={setUserMaritalStatus} value={userMaritalStatus}>
                                    <SelectTrigger id="user-marital-status">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="topic">Qual o assunto que você gostaria de conversar?</Label>
                            <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                                <SelectTrigger id="topic">
                                    <SelectValue placeholder="Selecione um tópico..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {counselingTopics.map(topic => (
                                        <SelectItem key={topic.id} value={topic.label}>{topic.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user-details">Descreva com mais detalhes o motivo do seu contato (opcional)</Label>
                            <Textarea id="user-details" placeholder="Quanto mais detalhes você fornecer, melhor o conselheiro poderá se preparar para ajudá-lo(a)." value={userDetails} onChange={e => setUserDetails(e.target.value)} rows={4} />
                        </div>
                    </div>

                    {selectedTopic && (
                        <div className="space-y-4">
                            <h3 className="font-semibold border-b pb-2">Passo 2: Escolha um conselheiro e o melhor horário</h3>
                            <div className="space-y-2">
                                <Label>Conselheiros disponíveis para este assunto</Label>
                                {counselorsForTopic.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {counselorsForTopic.map(c => (
                                            <Button 
                                                key={c.id}
                                                variant={selectedCounselorId === c.id ? 'default' : 'outline'}
                                                className="h-auto p-3 justify-start gap-3"
                                                onClick={() => setSelectedCounselorId(c.id)}
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${c.name.charAt(0)}`} alt={c.name} data-ai-hint="person" />
                                                    <AvatarFallback>{c.name.slice(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                <span>{c.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 border rounded-md bg-amber-50 border-amber-200">
                                        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                                        <p className="font-semibold text-amber-800">Nenhum conselheiro disponível</p>
                                        <p className="text-sm text-amber-700 mb-4">No momento, não temos conselheiros para a sua seleção. Você pode entrar na fila de espera e será notificado quando alguém estiver disponível.</p>
                                        <Button
                                            onClick={() => handleBooking(true)}
                                            disabled={submitting}
                                            className="bg-amber-600 hover:bg-amber-700"
                                        >
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                            Entrar na Fila de Espera
                                        </Button>
                                    </div>
                                )}
                            </div>
                            
                            {selectedCounselorId && (
                                <div className="grid md:grid-cols-2 gap-6 items-start pt-4">
                                    <div className="flex justify-center">
                                       {Object.keys(counselorAvailability).length > 0 ? (
                                            <Calendar
                                                locale={ptBR}
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                month={selectedDate || new Date()}
                                                toDate={addMonths(new Date(), 2)}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0,0,0,0);
                                                    if (date < today) return true;
                                                    return !availableWeekDays.includes(getDay(date));
                                                }}
                                                className="rounded-md border"
                                            />
                                        ) : (
                                            <div className="p-4 border rounded-md h-full flex items-center justify-center text-center text-muted-foreground">
                                                Este conselheiro não possui horários de disponibilidade cadastrados.
                                            </div>
                                        )}
                                    </div>
                                    {selectedDate && (
                                        <div className="space-y-2">
                                             <Label>Horários disponíveis para {isClient ? selectedDate.toLocaleDateString('pt-BR') : '...'}</Label>
                                             <div className="grid grid-cols-3 gap-2">
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
                                                    <p className="col-span-3 text-center text-sm text-muted-foreground pt-4">Nenhum horário cadastrado para este dia.</p>
                                                )}
                                             </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                     {selectedTopic && selectedCounselorId && selectedDate && selectedTime && (
                        <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                            <h3 className="font-semibold">Passo 3: Confirme seu agendamento</h3>
                            <div className="text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>Conselheiro(a): <span className="font-medium">{selectedCounselor?.name}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                    <span>Assunto: <span className="font-medium">{selectedTopic}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>Data e Hora: <span className="font-medium">{isClient ? `${selectedDate.toLocaleDateString('pt-BR')} às ${selectedTime}` : '...'}</span></span>
                                </div>
                            </div>
                            <Button className="w-full" size="lg" onClick={() => handleBooking(false)} disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {submitting ? 'Enviando...' : 'Confirmar Agendamento'}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

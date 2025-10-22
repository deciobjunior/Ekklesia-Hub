
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, UserPlus, Handshake, Users, Info, Sparkles, HelpingHand, CheckCircle, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { counselingTopics, welcomeInterests } from '@/lib/data';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { generateWelcomeMessage } from '@/ai/flows/generate-welcome-message-flow';
import { sendEmail } from '@/ai/flows/send-email-flow';
import Markdown from 'react-markdown';
import { createClient } from '@/lib/supabaseClient';

const interestIcons: { [key: string]: React.ElementType } = {
    baptism: Handshake,
    membership: UserPlus,
    volunteer: Handshake,
    growth_group: Users,
    counseling: Sparkles,
    prayer_request: HelpingHand,
    know_more_about_jesus: Info,
};

export function WelcomeClientForm({ churchId }: { churchId: string | undefined; }) {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', birthdate: '', gender: '', maritalStatus: '', bairro: '' });
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedCounselingTopics, setSelectedCounselingTopics] = useState<string[]>([]);
    const [prayerRequest, setPrayerRequest] = useState('');
    const [isJustVisiting, setIsJustVisiting] = useState(false);
    const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [churchName, setChurchName] = useState('Carregando...');
    const [initialLoading, setInitialLoading] = useState(true);
    const supabase = createClient();
    
    useEffect(() => {
        const fetchChurchName = async () => {
            if (!churchId) {
                setChurchName("Igreja não encontrada");
                setInitialLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();
            
            if (error || !data) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(data.name);
            }
            setInitialLoading(false);
        };

        fetchChurchName();
    }, [churchId]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
    };

    const handleSelectChange = (id: string, value: string) => {
      setFormData(prev => ({...prev, [id]: value}));
    };

    const handleInterestChange = (interestKey: string, checked: boolean) => {
        setSelectedInterests(prev => {
            const newSelection = checked ? [...prev, interestKey] : prev.filter(k => k !== interestKey);
            if (interestKey === 'counseling' && !checked) {
                setSelectedCounselingTopics([]);
            }
            if (interestKey === 'prayer_request' && !checked) {
                setPrayerRequest('');
            }
            return newSelection;
        });
    };
    
    const handleCounselingTopicChange = (topicLabel: string, checked: boolean) => {
        setSelectedCounselingTopics(prev => {
            const newSelection = checked ? [...prev, topicLabel] : prev.filter(t => t !== topicLabel);
            return newSelection;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStep('loading');

        const { data: existing, error: checkError } = await supabase
            .from('new_beginnings')
            .select('id')
            .eq('church_id', churchId)
            .eq('name', formData.name)
            .or(`phone.eq.${formData.phone},email.eq.${formData.email}`)
            .maybeSingle();

        if (checkError) {
             toast({
                title: "Erro na verificação",
                description: checkError.message,
                variant: 'destructive'
            });
            setSubmitting(false);
            setStep('form');
            return;
        }

        if (existing) {
            toast({
                title: "Cadastro já existe",
                description: "Suas informações já foram recebidas anteriormente. Em breve nossa equipe entrará em contato!",
                variant: 'default'
            });
            setSubmitting(false);
            setStep('form');
            return;
        }

        const finalSelectedInterests = isJustVisiting 
            ? ['visiting']
            : selectedInterests;

        if (!isJustVisiting && finalSelectedInterests.length === 0) {
             toast({
                title: "Nenhum interesse selecionado",
                description: "Por favor, selecione pelo menos uma opção para continuar.",
                variant: 'destructive'
            });
            setSubmitting(false);
            setStep('form');
            return;
        }
        
        const wantsCounseling = selectedInterests.includes('counseling');
        
        let counselingDetails = '';
        if (wantsCounseling) {
            if (selectedCounselingTopics.length === 0) {
                toast({ title: "Tópico de atendimento pastoral necessário", description: "Por favor, selecione ao menos um motivo do atendimento.", variant: 'destructive' });
                setSubmitting(false);
                setStep('form');
                return;
            }
            counselingDetails = selectedCounselingTopics.join(', ');
        }
        
        const extraDetails: Record<string, any> = {
            gender: formData.gender,
            maritalStatus: formData.maritalStatus,
            birthdate: formData.birthdate,
            bairro: formData.bairro,
        };
        if(formData.birthdate) {
             extraDetails.member_age = String(new Date().getFullYear() - new Date(formData.birthdate).getFullYear());
        }
        if (counselingDetails) extraDetails['counseling_topics'] = counselingDetails;
        if (selectedInterests.includes('prayer_request') && prayerRequest.trim()) {
            extraDetails['prayer_request'] = prayerRequest;
        }
        
        const finalRequestDetails = JSON.stringify(extraDetails);
        
        const initialActivities = [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: 'Sistema',
            action: 'created',
            details: 'Cadastro recebido via formulário de boas-vindas.'
          }
        ];
        
        if (wantsCounseling) {
            initialActivities.push({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user: 'Sistema',
                action: 'sent_to_counseling',
                details: 'Enviado automaticamente para a Fila de Espera de Aconselhamento.'
            });
        }


        try {
            const interestsForAI = finalSelectedInterests.reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {} as Record<string, boolean>);
            
            const welcomePromise = generateWelcomeMessage({ 
                name: formData.name.split(' ')[0],
                churchName: churchName,
                interests: interestsForAI,
            });

            const interestsToSave = welcomeInterests
              .filter(i => finalSelectedInterests.includes(i.key))
              .map(({ key, label }) => ({ key, label }));

            if (isJustVisiting) {
                interestsToSave.push({ key: 'visiting', label: 'Estou apenas visitando' });
            }

            const { data: nbData, error: nbError } = await supabase
                .from('new_beginnings')
                .insert({
                    church_id: churchId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    interests: interestsToSave,
                    request_details: finalRequestDetails,
                    forwarded_to_counseling: wantsCounseling,
                    status: 'Pendente',
                    activities: initialActivities,
                }).select().single();

            if (nbError) throw nbError;

            if (wantsCounseling) {
                const { error: counselingError } = await supabase.from('pending_registrations').insert({
                    id: nbData.id, 
                    church_id: churchId,
                    name: formData.name,
                    email: formData.email, 
                    role: 'Conselheiro', 
                    status: 'Na Fila',
                    form_data: {
                        member_name: formData.name,
                        member_email: formData.email,
                        member_phone: formData.phone,
                        member_gender: formData.gender,
                        member_marital_status: formData.maritalStatus,
                        member_age: extraDetails['member_age'],
                        topic: counselingDetails,
                        details: 'Enviado diretamente do formulário de boas-vindas.',
                        source: 'Acolhimento',
                        date: new Date().toISOString(),
                    }
                });

                if (counselingError) {
                    console.error("Failed to create counseling request:", counselingError);
                    toast({ title: "Aviso", description: "Não foi possível criar a solicitação de atendimento pastoral, mas seu cadastro principal foi recebido.", variant: "default" });
                }
            }
            
            const welcomeResult = await welcomePromise;
            setWelcomeMessage(welcomeResult.message);

            if (formData.email) {
                await sendEmail({
                    to: formData.email,
                    subject: `Seja muito bem-vindo(a) à ${churchName}!`,
                    body: welcomeResult.message.replace(/\\n/g, '<br />'),
                }).catch(emailError => {
                    console.warn("Failed to send welcome email:", emailError);
                });
            }
            
            setStep('success');

        } catch (error: any) {
            toast({
                title: "Erro ao registrar",
                description: error.message,
                variant: 'destructive'
            });
            setStep('form');
        } finally {
            setSubmitting(false);
        }
    }
    
     if (initialLoading) {
        return (
            <Card className="w-full max-w-2xl h-96 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </Card>
        );
    }
    
    if (!churchId) {
         return (
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <Logo />
                    <CardTitle className="pt-4">Link Inválido</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-destructive">O link de boas-vindas que você usou está incompleto ou a igreja não foi encontrada. Por favor, solicite um novo link.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (step === 'loading') {
        return (
            <Card className="w-full max-w-2xl">
                <CardContent className="flex flex-col items-center justify-center h-96 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Estamos preparando uma mensagem especial para você...</p>
                </CardContent>
            </Card>
        );
    }
    
     if (step === 'success') {
        return (
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">Informações Recebidas!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                     <div className="prose prose-sm lg:prose-base mx-auto text-left bg-muted/50 p-4 rounded-lg">
                        <Markdown>{welcomeMessage}</Markdown>
                    </div>
                    <p className="text-sm text-muted-foreground">Que benção ter você conosco! Em breve nossa equipe entrará em contato.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Bem-vindo(a) à {churchName || 'Igreja'}!</CardTitle>
                <CardDescription>
                    É uma alegria ter você conosco, queremos caminhar ao seu lado e ajudar no seu próximo passo de fé.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Seu Nome</Label>
                                <Input id="name" placeholder="Como podemos te chamar?" onChange={handleInputChange} required value={formData.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Seu Telefone (WhatsApp)</Label>
                                <Input id="phone" type="tel" placeholder="+5511999999999" onChange={handleInputChange} required value={formData.phone}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" onChange={handleInputChange} value={formData.birthdate} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gênero</Label>
                                <Select onValueChange={(v) => handleSelectChange('gender', v)} value={formData.gender}>
                                    <SelectTrigger id="gender"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="maritalStatus">Estado Civil</Label>
                                <Select onValueChange={(v) => handleSelectChange('maritalStatus', v)} value={formData.maritalStatus}>
                                    <SelectTrigger id="maritalStatus"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="bairro">Bairro</Label>
                                <Input id="bairro" placeholder="Seu bairro" onChange={handleInputChange} value={formData.bairro} />
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="email">Seu Email (opcional)</Label>
                                <Input id="email" type="email" placeholder="seu.email@example.com" onChange={handleInputChange} value={formData.email} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label className="font-semibold">Qual seu próximo passo?</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                            {welcomeInterests.map(interest => {
                                const Icon = interestIcons[interest.key] || Info;
                                const isChecked = selectedInterests.includes(interest.key);

                                return (
                                <div key={interest.key} className="flex flex-col">
                                    <div className="flex items-center space-x-3 rounded-md border p-3 flex-grow">
                                        <Checkbox id={interest.key} checked={isChecked} onCheckedChange={(checked) => handleInterestChange(interest.key, !!checked)} disabled={isJustVisiting} />
                                        <Label htmlFor={interest.key} className="font-normal flex-1 cursor-pointer flex items-center gap-2">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            {interest.label}
                                        </Label>
                                    </div>
                                    {interest.key === 'counseling' && isChecked && (
                                        <div className="mt-2 pl-1 animate-in fade-in duration-300 space-y-2">
                                            <Label className="text-sm text-muted-foreground">Selecione um ou mais motivos:</Label>
                                             <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
                                                {counselingTopics.map(topic => (
                                                    <div key={topic.id} className="flex items-center gap-2">
                                                        <Checkbox 
                                                            id={`counseling-topic-${topic.id}`} 
                                                            checked={selectedCounselingTopics.includes(topic.label)} 
                                                            onCheckedChange={(checked) => handleCounselingTopicChange(topic.label, !!checked)}
                                                        />
                                                        <Label htmlFor={`counseling-topic-${topic.id}`} className="font-normal cursor-pointer text-sm">
                                                            {topic.label}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                     {interest.key === 'prayer_request' && isChecked && (
                                        <div className="mt-2 pl-1 animate-in fade-in duration-300 space-y-2">
                                            <Label htmlFor="prayer-request-description" className="text-sm text-muted-foreground">Descreva seu pedido:</Label>
                                            <Textarea
                                                id="prayer-request-description"
                                                value={prayerRequest}
                                                onChange={(e) => setPrayerRequest(e.target.value)}
                                                placeholder="Deixe aqui seu pedido de oração..."
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>

                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-muted"></div>
                        <span className="flex-shrink mx-4 text-muted-foreground text-sm">OU</span>
                        <div className="flex-grow border-t border-muted"></div>
                    </div>

                     <div className="flex items-center space-x-3 rounded-md border p-3">
                        <Checkbox id="visiting" checked={isJustVisiting} onCheckedChange={(checked) => setIsJustVisiting(!!checked)} />
                        <Label htmlFor="visiting" className="font-normal flex-1 cursor-pointer">
                           Estou apenas visitando
                        </Label>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={submitting || !churchId}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {submitting ? 'Enviando...' : 'Enviar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

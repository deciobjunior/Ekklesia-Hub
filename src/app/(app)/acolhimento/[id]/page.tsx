

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NewBeginning, FollowUp } from '../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Phone, Mail, MessageSquare, PlusCircle, User, CheckCircle, Heart, UserPlus, Handshake, Users, Info, Sparkles, Send, History, Tag, UserCheck, HelpingHand, Cake, VenetianMask, Briefcase, Church, GraduationCap, ChevronDown, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { generateBriefing } from '@/ai/flows/generate-briefing-flow';
import { useUser } from '@/hooks/use-user';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type TeamMember = {
    id: string;
    name: string;
};

type Activity = {
    id: string;
    timestamp: string;
    user: string;
    action: 'contact_registered' | 'sent_to_counseling' | 'status_change' | 'created' | 'ownership_taken' | 'sent_to_small_group' | 'sent_to_volunteer_hub' | 'marked_as_baptized' | 'sent_to_discipleship';
    details?: string;
};

const interestIcons: { [key: string]: React.ElementType } = {
  baptism: Heart,
  membership: UserPlus,
  volunteer: Handshake,
  growth_group: Users,
  counseling: Sparkles,
  prayer_request: HelpingHand,
  know_more_about_jesus: GraduationCap,
  visiting: User,
};

type StatusOption = 'Pendente' | 'Em acolhimento' | 'Direcionado' | 'Sem resposta' | 'Número errado' | 'Concluído';

const statusDisplay: Record<StatusOption, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Pendente': { text: 'Pendente', variant: 'destructive' },
    'Em acolhimento': { text: 'Em Acolhimento', variant: 'secondary' },
    'Direcionado': { text: 'Direcionado', variant: 'outline' },
    'Sem resposta': { text: 'Sem Resposta', variant: 'outline' },
    'Número errado': { text: 'Número Errado', variant: 'outline' },
    'Concluído': { text: 'Concluído', variant: 'default' },
};

const statusOptions: StatusOption[] = ['Pendente', 'Em acolhimento', 'Direcionado', 'Sem resposta', 'Número errado', 'Concluído'];

export default function AcolhimentoDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();
    const supabase = createClient();
    const { user: loggedInUser, userRole } = useUser();

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingBaptism, setIsUpdatingBaptism] = useState(false);
    const [data, setData] = useState<NewBeginning | null>(null);
    const [briefing, setBriefing] = useState('');
    const [isBriefingDialogOpen, setIsBriefingDialogOpen] = useState(false);
    const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
    const [isSendingToCounseling, setIsSendingToCounseling] = useState(false);
    const [isSendingToVolunteers, setIsSendingToVolunteers] = useState(false);
    const [isSendingToDiscipleship, setIsSendingToDiscipleship] = useState(false);
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [contactNotes, setContactNotes] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: nbData, error } = await supabase
            .from('new_beginnings')
            .select('id, name, phone, email, created_at, church_id, follower_id, follower_name, follow_ups, interests, activities, forwarded_to_counseling, status, request_details')
            .eq('id', id)
            .single();

        if (error || !nbData) {
            toast({ title: 'Erro', description: 'Não foi possível encontrar o registro.', variant: 'destructive' });
            setLoading(false);
            return notFound();
        }
        setData(nbData as NewBeginning);
        setLoading(false);
    }, [id, toast, supabase]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const parsedDetails = useMemo(() => {
        if (!data?.request_details) return {};
        try {
            if (typeof data.request_details === 'string' && data.request_details.trim().startsWith('{')) {
                return JSON.parse(data.request_details);
            }
            if (typeof data.request_details === 'object' && data.request_details !== null) {
                return data.request_details;
            }
        } catch (e) {
            console.error("Failed to parse request_details:", e);
            return {};
        }
        return {};
    }, [data?.request_details]);
    
    const addActivity = (action: Activity['action'], details?: string): Activity[] => {
        if (!loggedInUser || !data) return data?.activities || [];
        const newActivity: Activity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: loggedInUser.user_metadata?.full_name || 'Usuário',
            action: action,
            details: details
        };
        return [...(data.activities || []), newActivity];
    };

    const handleTakeOwnership = async () => {
        if (!data || !loggedInUser) return;
        setIsSaving(true);
        
        const updatedActivities = addActivity('ownership_taken', `${loggedInUser.user_metadata?.full_name} assumiu o acompanhamento.`);

        const { error } = await supabase
            .from('new_beginnings')
            .update({ 
                follower_id: loggedInUser.id, 
                follower_name: loggedInUser.user_metadata?.full_name,
                activities: updatedActivities,
                status: 'Em acolhimento'
            })
            .eq('id', data.id);

        if (error) {
            toast({ title: 'Erro ao assumir acompanhamento', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Acompanhamento Assumido!', description: `Você agora é o responsável por acompanhar ${data.name}.` });
            fetchData();
        }
        setIsSaving(false);
    };

    const handleSaveContact = async () => {
        if (!contactNotes.trim() || !id || !loggedInUser) return;
        setIsSaving(true);

        const { data: currentData, error: fetchError } = await supabase
            .from('new_beginnings')
            .select('follow_ups, follower_id, follower_name, activities')
            .eq('id', id)
            .single();

        if (fetchError || !currentData) {
            toast({ title: 'Erro ao buscar dados atuais', description: fetchError?.message, variant: 'destructive' });
            setIsSaving(false);
            return;
        }

        const newFollowUp: FollowUp = {
            id: `contact-${Date.now()}`,
            contact_date: new Date().toISOString(),
            notes: contactNotes,
            contacted_by: loggedInUser.user_metadata?.full_name,
        };

        const updatedFollowUps = [...(currentData.follow_ups || []), newFollowUp];
        
        const updatedActivities = addActivity('contact_registered', `Comentário registrado: "${contactNotes.substring(0, 50)}..."`);
        
        const { error: updateError } = await supabase
            .from('new_beginnings')
            .update({
                follow_ups: updatedFollowUps,
                follower_id: currentData.follower_id || loggedInUser.id,
                follower_name: currentData.follower_name || loggedInUser.user_metadata?.full_name,
                activities: updatedActivities,
            })
            .eq('id', id);

        if (updateError) {
            toast({ title: 'Erro ao salvar comentário', description: updateError.message, variant: 'destructive' });
        } else {
            toast({ title: 'Comentário registrado!', description: 'O novo ponto de contato foi salvo com sucesso.' });
            setIsContactDialogOpen(false);
            setContactNotes('');
            await fetchData(); 
        }

        setIsSaving(false);
    };
    
    const handleWhatsappClick = () => {
        if (!data?.phone) return;
        window.open(`https://wa.me/${data.phone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    };

    const handleGenerateBriefing = async () => {
        if (!data) return;
        setIsGeneratingBriefing(true);
        setBriefing('');
        setIsBriefingDialogOpen(true);

        try {
            const meetingsData = (data.follow_ups || []).map(f => ({
                date: f.contact_date,
                topic: "Ponto de Contato",
                notes: f.notes,
            }));

            const result = await generateBriefing({
                memberName: data.name,
                // @ts-ignore
                memberAge: parsedDetails?.member_age,
                // @ts-ignore
                memberGender: parsedDetails?.gender,
                // @ts-ignore
                memberMaritalStatus: parsedDetails?.maritalStatus,
                requestDetails: JSON.stringify(parsedDetails),
                meetings: meetingsData,
            });

            setBriefing(result.briefing);
        } catch (error) {
            console.error("Error generating briefing:", error);
            setBriefing("Ocorreu um erro ao gerar o resumo.");
        } finally {
            setIsGeneratingBriefing(false);
        }
    };

    const handleSendToCounseling = async () => {
         if (!data || !data.church_id) {
            toast({ title: 'Erro', description: 'Dados do registro ou da igreja não encontrados.', variant: 'destructive' });
            return;
        }

        setIsSendingToCounseling(true);

        try {
            const initialActivity = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user: 'Sistema',
                action: 'created',
                details: `Solicitação de atendimento recebida do Acolhimento.`,
            };

            const { error } = await supabase.from('pending_registrations').insert({
                church_id: data.church_id,
                name: data.name,
                email: data.email, 
                role: 'Conselheiro', 
                status: 'Na Fila',
                form_data: {
                    member_name: data.name,
                    member_email: data.email,
                    member_phone: data.phone,
                    // @ts-ignore
                    member_gender: parsedDetails?.gender,
                    // @ts-ignore
                    member_age: parsedDetails?.member_age,
                    // @ts-ignore
                    member_marital_status: parsedDetails?.maritalStatus,
                    // @ts-ignore
                    topic: parsedDetails['counseling_topics'] || 'Não especificado',
                    details: 'Enviado diretamente do Acolhimento.',
                    source: 'Acolhimento',
                    date: new Date().toISOString(),
                    activities: [initialActivity],
                }
            });

            if (error) throw error;
            
            const updatedActivities = addActivity('sent_to_counseling', `Enviado para a Fila de Espera de Aconselhamento.`);
            await supabase.from('new_beginnings')
                .update({ forwarded_to_counseling: true, activities: updatedActivities, status: 'Direcionado' })
                .eq('id', data.id);

            toast({
                title: 'Enviado para a Fila de Espera!',
                description: `${data.name} foi adicionado(a) à fila de espera de aconselhamento.`,
            });
            fetchData();

        } catch (error: any) {
            toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSendingToCounseling(false);
        }
    };

    const handleSendToDiscipleship = async () => {
        if (!data || !data.church_id || !loggedInUser) {
            toast({ title: 'Erro', description: 'Dados do registro, da igreja ou do usuário não encontrados.', variant: 'destructive' });
            return;
        }

        setIsSendingToDiscipleship(true);

        try {
             const { data: memberUpsert, error: memberError } = await supabase
                .from('members')
                .upsert({ 
                    id: data.id, 
                    church_id: data.church_id, 
                    name: data.name, 
                    email: data.email,
                    phone: data.phone,
                    role: 'Membro'
                }, { onConflict: 'id' })
                .select()
                .single();

            if (memberError) throw memberError;
            
            const { error: pendingRegError } = await supabase.from('pending_registrations').insert({
                church_id: data.church_id,
                name: `Discipulado de ${data.name}`,
                role: 'Discipulado',
                status: 'Pendente',
                form_data: {
                    disciple_id: data.id,
                    disciple_name: data.name,
                    source: 'Acolhimento',
                    initial_request_details: data.request_details,
                    meetings: [],
                }
            });

            if (pendingRegError) throw pendingRegError;
            
            const updatedActivities = addActivity('sent_to_discipleship', `Enviado para a Central de Discipulado.`);
            await supabase.from('new_beginnings')
                .update({ activities: updatedActivities, status: 'Direcionado' })
                .eq('id', data.id);

            toast({
                title: 'Enviado para Discipulado!',
                description: `${data.name} foi adicionado(a) à central de discipulado para ser acompanhado.`,
            });
            fetchData();

        } catch (error: any) {
            toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSendingToDiscipleship(false);
        }
    };


    const handleSendToVolunteerHub = async () => {
        if (!data || !data.church_id) {
            toast({ title: 'Erro', description: 'Dados do registro ou da igreja não encontrados.', variant: 'destructive' });
            return;
        }

        setIsSendingToVolunteers(true);
        
        try {
             const { error } = await supabase.from('pending_registrations').insert({
                church_id: data.church_id,
                name: data.name,
                email: data.email,
                role: 'Voluntário',
                status: 'Pendente',
                form_data: {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    source: 'Acolhimento'
                }
            });

            if (error) throw error;
            
            const updatedActivities = addActivity('sent_to_volunteer_hub', `Enviado para a Central de Voluntários.`);
            await supabase.from('new_beginnings')
                .update({ activities: updatedActivities, status: 'Direcionado' })
                .eq('id', data.id);

            toast({
                title: 'Enviado para a Central de Voluntários!',
                description: `${data.name} foi adicionado(a) à lista de novos voluntários para triagem.`,
            });
            fetchData();

        } catch (error: any) {
            toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSendingToVolunteers(false);
        }
    }

    const handleStatusChange = async (newStatus: StatusOption) => {
        if (!data || !loggedInUser) return;

        const updatedActivities = addActivity('status_change', `Status alterado para "${statusDisplay[newStatus].text}".`);

        const { error } = await supabase
            .from('new_beginnings')
            .update({ status: newStatus, activities: updatedActivities })
            .eq('id', id);

        if (error) {
            toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Status atualizado!", description: `O acompanhamento foi marcado como ${statusDisplay[newStatus].text.toLowerCase()}.` });
            fetchData();
        }
    };
    
    const handleMarkAsBaptized = async () => {
        if (!data) return;
        setIsUpdatingBaptism(true);
        
        const updatedInterests = (data.interests || []).filter(i => i.key !== 'baptism');
        const updatedActivities = addActivity('marked_as_baptized', `${data.name} foi marcado(a) como batizado(a).`);

        const { error } = await supabase.from('new_beginnings').update({
            interests: updatedInterests,
            activities: updatedActivities,
        }).eq('id', data.id);
        
        if (error) {
            toast({ title: "Erro ao marcar batismo", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Batismo Registrado!", description: "O interesse de batismo foi removido do perfil." });
            fetchData();
        }
        
        setIsUpdatingBaptism(false);
    };

    const interests = data?.interests || [];
    let activities = data?.activities || [];
    const hasCounselingInterest = interests.some((i: any) => i.key === 'counseling');
    const hasGrowthGroupInterest = interests.some((i: any) => i.key === 'growth_group');
    const hasVolunteerInterest = interests.some((i: any) => i.key === 'volunteer');
    const wantsToKnowJesus = interests.some((i: any) => i.key === 'know_more_about_jesus');
    const alreadySentToDiscipleship = (data?.activities || []).some(a => a.action === 'sent_to_discipleship');
    
    if (hasGrowthGroupInterest && !activities.some(a => a.action === 'sent_to_small_group')) {
        activities.push({
            id: 'auto-sg-activity',
            timestamp: data.created_at,
            user: 'Sistema',
            action: 'sent_to_small_group',
            details: 'Enviado automaticamente para a Central de Pequenos Grupos'
        });
    }
    
    const getActionIcon = (action: Activity['action']) => {
        switch (action) {
            case 'contact_registered':
                return <MessageSquare className="h-4 w-4" />;
            case 'sent_to_counseling':
            case 'sent_to_small_group':
            case 'sent_to_volunteer_hub':
            case 'sent_to_discipleship':
                return <Send className="h-4 w-4" />;
            case 'status_change':
                return <Tag className="h-4 w-4" />;
            case 'created':
                return <PlusCircle className="h-4 w-4" />;
            case 'ownership_taken':
                return <UserCheck className="h-4 w-4" />;
            case 'marked_as_baptized':
                return <Church className="h-4 w-4" />;
        }
    };


    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!data) {
        return notFound();
    }
    
    const currentStatus = data.status || 'Pendente';
    const currentStatusInfo = statusDisplay[currentStatus as StatusOption] || { text: currentStatus, variant: 'outline' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/acolhimento')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Jornada do Novo Convertido</h1>
                        <p className="text-muted-foreground">Acompanhamento de {data.name}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={handleGenerateBriefing}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Resumo com IA
                    </Button>
                    <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Comentário
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Comentário</DialogTitle>
                                <DialogDescriptionComponent>Descreva o contato feito com {data.name}.</DialogDescriptionComponent>
                            </DialogHeader>
                            <div className="py-4 space-y-2">
                                <Label htmlFor="contact-notes">Anotações do Contato</Label>
                                <Textarea id="contact-notes" rows={5} placeholder="Ex: Conversei por telefone, foi uma bênção. Agendamos um café..." value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                <Button onClick={handleSaveContact} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Salvar Comentário
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                 </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                     <CardTitle className="text-xl">{data.name}</CardTitle>
                                     <CardDescription>Decisão em {format(new Date(data.created_at), 'dd/MM/yyyy')}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant={currentStatusInfo.variant} className="flex items-center gap-2">
                                                <span>{currentStatusInfo.text}</span>
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {statusOptions.map(status => (
                                                <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)}>
                                                    {statusDisplay[status].text}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <p className="text-sm text-muted-foreground mt-1">Status</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={`https://placehold.co/80x80.png`} alt={data.name} data-ai-hint="person" />
                                    <AvatarFallback>{data.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                     {data.phone ? (
                                        <Button onClick={handleWhatsappClick} className="bg-green-600 hover:bg-green-700 text-white h-auto px-3 py-1.5 text-sm flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="h-4 w-4"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                                            <span>{data.phone}</span>
                                        </Button>
                                     ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            <span>Não informado</span>
                                        </div>
                                     )}
                                     <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                        <Mail className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate" title={data.email || 'Não informado'}>{data.email || 'Não informado'}</span>
                                     </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>Acompanhado por: <span className="font-semibold text-foreground">{data.follower_name || 'Ninguém'}</span></span>
                                </div>
                                {// @ts-ignore
                                parsedDetails?.birthdate && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Cake className="h-4 w-4" />
                                        <span>Nascimento: <span className="font-semibold text-foreground">{format(new Date(parsedDetails.birthdate), 'dd/MM/yyyy', { locale: ptBR })}</span></span>
                                    </div>
                                )}
                                {// @ts-ignore
                                parsedDetails?.gender && (
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span>Gênero: <span className="font-semibold text-foreground">{parsedDetails.gender}</span></span>
                                    </div>
                                )}
                                {// @ts-ignore
                                parsedDetails?.maritalStatus && (
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <Briefcase className="h-4 w-4" />
                                        <span>Estado Civil: <span className="font-semibold text-foreground">{parsedDetails.maritalStatus}</span></span>
                                    </div>
                                )}
                                {// @ts-ignore
                                parsedDetails?.bairro && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>Bairro: <span className="font-semibold text-foreground">{parsedDetails.bairro}</span></span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Contatos</CardTitle>
                            <CardDescription>Linha do tempo dos contatos feitos com {data.name}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {data.follow_ups && data.follow_ups.length > 0 ? (
                                    data.follow_ups.map(contact => (
                                        <div key={contact.id} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border">
                                                    <User className="m-auto h-5 w-5 text-muted-foreground" />
                                                </span>
                                                <div className="h-full w-px bg-border"></div>
                                            </div>
                                            <div className="pb-6 w-full">
                                                <div className="flex items-baseline justify-between">
                                                     <p className="font-semibold text-foreground">{contact.contacted_by}</p>
                                                     <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(contact.contact_date), { addSuffix: true, locale: ptBR })}
                                                     </p>
                                                </div>
                                                 <p className="text-sm text-muted-foreground">
                                                    Registrou um contato em {format(new Date(contact.contact_date), 'dd/MM/yyyy HH:mm')}
                                                 </p>
                                                <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                                                    {contact.notes}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                                        <h3 className="font-semibold">Nenhum Contato Registrado</h3>
                                        <p>Clique em "Adicionar Comentário" para iniciar o acompanhamento.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Interesses Declarados</CardTitle>
                             <CardDescription>Áreas que {data.name} demonstrou interesse.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {interests.length > 0 ? (
                                <div className="space-y-4">
                                    {interests.map((interest: any) => {
                                        const Icon = interestIcons[interest.key] || Heart;
                                        // @ts-ignore
                                        const prayerRequestText = interest.key === 'prayer_request' ? parsedDetails['prayer_request'] : null;
                                        // @ts-ignore
                                        const counselingTopicsText = interest.key === 'counseling' ? parsedDetails['counseling_topics'] : null;

                                        return (
                                            <div key={interest.key}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <Icon className="h-5 w-5" />
                                                        </div>
                                                        <span className="font-medium">{interest.label}</span>
                                                    </div>
                                                    {interest.key === 'baptism' && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="outline" size="sm" disabled={isUpdatingBaptism}>
                                                                    {isUpdatingBaptism ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Church className="mr-2 h-4 w-4"/>}
                                                                    Marcar como Batizado
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmar Batismo?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Esta ação marcará que <strong>{data.name}</strong> foi batizado(a) e removerá este interesse da lista. Deseja continuar?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleMarkAsBaptized}>Sim, Confirmar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                                {counselingTopicsText && (
                                                    <div className="pl-11 mt-2 text-xs text-muted-foreground">
                                                        <p className="font-semibold text-foreground mb-1">Tópicos de interesse:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {counselingTopicsText.split(', ').map(topic => (
                                                                <Badge key={topic} variant="secondary" className="font-normal">{topic}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {prayerRequestText && (
                                                     <div className="pl-11 mt-2 text-xs text-muted-foreground border-l-2 ml-4 pl-4 py-1">
                                                        <p className="italic">"{prayerRequestText}"</p>
                                                    </div>
                                                )}
                                                
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum interesse específico foi registrado.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ação Rápida</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.follower_id !== loggedInUser?.id && (
                                <Button className="w-full" onClick={handleTakeOwnership} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                    Assumir Acolhimento
                                </Button>
                            )}
                            {wantsToKnowJesus && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full" disabled={alreadySentToDiscipleship || isSendingToDiscipleship}>
                                            {isSendingToDiscipleship ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : alreadySentToDiscipleship ? (
                                                <><CheckCircle className="mr-2 h-4 w-4" /> Enviado</>
                                            ) : (
                                                <><Send className="mr-2 h-4 w-4" /> Enviar para Discipulado</>
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Enviar para Discipulado?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Isto criará uma solicitação na central de discipulado para que um discipulador possa acompanhar <strong>{data.name}</strong>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSendToDiscipleship}>Sim, Enviar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {hasCounselingInterest && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                            <Button className="w-full" disabled={data.forwarded_to_counseling || isSendingToCounseling}>
                                            {isSendingToCounseling ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : data.forwarded_to_counseling ? (
                                                <><CheckCircle className="mr-2 h-4 w-4" /> Enviado</>
                                            ) : (
                                                <><Send className="mr-2 h-4 w-4" /> Enviar p/ Aconselhamento</>
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Enviar para Fila de Aconselhamento?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Isto enviará as informações de <strong>{data.name}</strong> para a fila de espera do ministério de aconselhamento. Um conselheiro disponível assumirá o caso.
                                            </AlertDialogDescription>
                                            <div className="text-sm space-y-1 rounded-md border p-3 bg-muted/50 !mt-4">
                                                <p><strong>Nome:</strong> {data.name}</p>
                                                <p><strong>Contato:</strong> {data.phone || data.email}</p>
                                                {/* @ts-ignore */}
                                                <p><strong>Tópico:</strong> {parsedDetails['counseling_topics'] || 'Não especificado'}</p>
                                            </div>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSendToCounseling}>Sim, Enviar para a Fila</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {hasGrowthGroupInterest && (
                                <Button className="w-full" variant="secondary" disabled>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Enviado para Central de Pequenos Grupos
                            </Button>
                            )}
                            {hasVolunteerInterest && (
                                <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                        <Button className="w-full" disabled={isSendingToVolunteers}>
                                            {isSendingToVolunteers ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <><Send className="mr-2 h-4 w-4" /> Enviar p/ Central de Voluntários</>
                                            )}
                                        </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                         <AlertDialogHeader>
                                             <AlertDialogTitle>Enviar para Central de Voluntários?</AlertDialogTitle>
                                             <AlertDialogDescription>
                                                 Isto enviará as informações de <strong>{data.name}</strong> para a central de voluntários, onde a equipe de gestão poderá direcioná-lo(a) para um ministério.
                                             </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <AlertDialogFooter>
                                             <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                             <AlertDialogAction onClick={handleSendToVolunteerHub}>Sim, Enviar</AlertDialogAction>
                                         </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                            )}
                        </CardContent>
                    </Card>
                    
                     <Card>
                        <CardHeader>
                            <CardTitle>Registro de Atividades</CardTitle>
                            <CardDescription>Histórico de todas as ações relacionadas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activities && activities.length > 0 ? (
                                    [...activities].reverse().map(activity => (
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
                </div>
            </div>

             <Dialog open={isBriefingDialogOpen} onOpenChange={setIsBriefingDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Resumo do Perfil (IA)
                    </DialogTitle>
                    <DialogDescriptionComponent>
                    Resumo gerado por IA do histórico de {data.name}.
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
        </div>
    );
}


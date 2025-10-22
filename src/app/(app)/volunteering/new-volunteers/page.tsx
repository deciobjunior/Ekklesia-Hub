
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UserPlus, Link as LinkIcon, Handshake, Mail, ListFilter, Search, Trash2, GraduationCap } from "lucide-react";
import { AssignMinistryDialog } from "@/components/volunteering/assign-ministry-dialog";
import { sendEmail } from "@/ai/flows/send-email-flow";
import { VolunteersListView } from "@/components/volunteering/volunteers-list-view";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ViewVolunteerApplicationDialog } from "@/components/volunteering/view-volunteer-application-dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import type { Ministry } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-user";


// Define VolunteerApplication type here as it's used in this component
export type VolunteerApplication = {
    id: string;
    name: string;
    status: 'Pendente' | 'Em Treinamento' | 'Em Validação' | 'Aprovado' | 'Aguardando regularização' | 'Aguardando Documentos' | 'Com Retorno' | 'Alocado' | 'Aguardando Aprovação do Líder';
    created_at: string;
    form_data?: any;
    // New property to track baptism status from new_beginnings
    isStillNotBaptized?: boolean;
};

export default function NewVolunteersPage() {
    const { toast } = useToast();
    const { user, churchId, loading: userLoading } = useUser();
    const [applications, setApplications] = useState<VolunteerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerApplication | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    
    const [isConfirmingResend, setIsConfirmingResend] = useState(false);
    const [volunteerToResend, setVolunteerToResend] = useState<VolunteerApplication | null>(null);
    
    const [volunteerToSendMemberForm, setVolunteerToSendMemberForm] = useState<VolunteerApplication | null>(null);
    const [volunteerToSendToWelcome, setVolunteerToSendToWelcome] = useState<VolunteerApplication | null>(null);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [volunteerToDelete, setVolunteerToDelete] = useState<VolunteerApplication | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [ministryFilters, setMinistryFilters] = useState<string[]>([]);
    const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
    
    // Pagination for "Gerenciamento Geral" tab
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Pagination for "Alocados" tab
    const [allocatedCurrentPage, setAllocatedCurrentPage] = useState(1);
    const [allocatedItemsPerPage, setAllocatedItemsPerPage] = useState(10);


    const supabase = createClient();

    const fetchApplications = useCallback(async (currentChurchId?: string | null) => {
        const idToFetch = currentChurchId || churchId;
        if (!idToFetch) {
            setLoading(false);
            return;
        };

        const { data, error } = await supabase
            .from('pending_registrations')
            .select('id, name, status, created_at, form_data')
            .eq('church_id', idToFetch)
            .eq('role', 'Voluntário');
             

        if (error) {
            toast({ title: "Erro ao buscar inscrições", description: error.message, variant: "destructive" });
        } else {
            const volunteerApps = (data || []) as VolunteerApplication[];
            const volunteerIds = volunteerApps.map(v => v.form_data?.id).filter(Boolean);
            
            let baptismStatusMap = new Map<string, boolean>();
            if (volunteerIds.length > 0) {
                const { data: beginningsData, error: beginningsError } = await supabase
                    .from('new_beginnings')
                    .select('id, interests')
                    .in('id', volunteerIds);

                if (beginningsError) {
                    console.error("Error fetching new beginnings data:", beginningsError.message);
                } else {
                    baptismStatusMap = new Map(beginningsData.map(b => [b.id, b.interests?.some((i: any) => i.key === 'baptism')]));
                }
            }
            
             const combinedData = volunteerApps.map(app => ({
                ...app,
                isStillNotBaptized: app.form_data?.is_baptized === false && baptismStatusMap.get(app.form_data?.id) !== false
             }));

            setApplications(combinedData);
        }
        setLoading(false);
    }, [churchId, toast, supabase]);

    const fetchMinistries = useCallback(async (currentChurchId: string) => {
        const { data, error } = await supabase
            .from('pending_registrations')
            .select('id, name')
            .eq('church_id', currentChurchId)
            .eq('role', 'Ministério');
        
        if (error) {
            toast({ title: "Erro ao buscar ministérios", description: error.message, variant: "destructive" });
        } else {
            setAllMinistries((data || []).map((m: any) => ({
                id: m.id,
                name: m.name,
                description: '',
                pastor: '',
                pastorAvatar: '',
                volunteers: []
            })));
        }
    }, [toast, supabase]);

    useEffect(() => {
        if (!userLoading && churchId) {
            setLoading(true);
            Promise.all([
                fetchApplications(churchId),
                fetchMinistries(churchId)
            ]).finally(() => setLoading(false));
        } else if (!userLoading) {
            setLoading(false);
        }
    }, [userLoading, churchId, fetchApplications, fetchMinistries]);
    
    useEffect(() => {
        if (!churchId) return;

        const volunteerChannel = supabase
            .channel('pending_registrations_volunteers_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations', filter: `church_id=eq.${churchId}` }, 
                (payload) => {
                    fetchApplications(churchId);
                }
            ).subscribe();
            
        const acolhimentoChannel = supabase
            .channel('new_beginnings_for_volunteers_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'new_beginnings', filter: `church_id=eq.${churchId}` }, 
                (payload) => {
                    fetchApplications(churchId);
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(volunteerChannel);
            supabase.removeChannel(acolhimentoChannel);
        };
    }, [churchId, supabase, fetchApplications]);

    const handleShareLink = () => {
        if (!churchId) {
            toast({
                title: "Erro ao gerar link",
                description: "Não foi possível identificar sua igreja. Recarregue a página.",
                variant: "destructive"
            });
            return;
        }
        const link = `${window.location.origin}/register-volunteer?church_id=${churchId}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: "O link de inscrição para voluntários foi copiado.",
        });
    };

    const updateApplicationStatus = async (appIds: string[], newStatus: string) => {
        const optimisticUpdates = applications.map(app => 
            appIds.includes(app.id) ? { ...app, status: newStatus as VolunteerApplication['status'] } : app
        );
        setApplications(optimisticUpdates);

        const { error } = await supabase
            .from('pending_registrations')
            .update({ status: newStatus })
            .in('id', appIds);
        
        if (error) {
            toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
            fetchApplications(); // Revert on error
        } else {
            toast({ title: "Status Atualizado!", description: `${appIds.length} voluntário(s) movido(s).`});
        }
    };
    
    const onViewDetails = (volunteer: VolunteerApplication) => {
        setSelectedVolunteer(volunteer);
        setIsDetailsOpen(true);
    };

    const onAssignToMinistry = (volunteer: VolunteerApplication) => {
        setSelectedVolunteer(volunteer);
        setIsAssignOpen(true);
    }

    const onDeleteVolunteer = (volunteer: VolunteerApplication) => {
        setVolunteerToDelete(volunteer);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteVolunteer = async () => {
        if (!volunteerToDelete) return;
        setIsDeleting(true);

        const { error } = await supabase
            .from('pending_registrations')
            .delete()
            .eq('id', volunteerToDelete.id)
            .eq('role', 'Voluntário');

        if (error) {
            toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Voluntário Deletado", description: "O registro foi removido com sucesso." });
            fetchApplications();
        }
        
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setVolunteerToDelete(null);
    };
    
    const handleRequestDocuments = async (volunteer: VolunteerApplication) => {
        if (!volunteer.form_data?.email) {
            toast({ title: "Email não encontrado", description: "Não é possível notificar o voluntário sem um email cadastrado.", variant: "destructive"});
            return;
        }
        
        const ministryChoiceUrl = `${window.location.origin}/choose-ministry?application_id=${volunteer.id}`;
        
        try {
            await sendEmail({
                to: volunteer.form_data.email,
                subject: "Próximo Passo: Escolha seus Ministérios!",
                body: `
                    <h1>Olá, ${volunteer.name}!</h1>
                    <p>Parabéns por concluir o treinamento de voluntários! O próximo passo é escolher os ministérios em que você gostaria de servir.</p>
                    <p>Por favor, acesse o link abaixo para fazer sua escolha:</p>
                    <p><a href="${ministryChoiceUrl}">${ministryChoiceUrl}</a></p>
                    <p>Após sua escolha, os líderes dos ministérios selecionados irão analisar seu perfil para aprovação.</p>
                    <p>Agradecemos sua dedicação e estamos ansiosos para servir com você!</p>
                `
            });

            await updateApplicationStatus([volunteer.id], 'Aguardando Documentos');

            toast({ title: "Email Enviado!", description: `O voluntário ${volunteer.name} foi notificado para escolher seus ministérios.` });
        } catch (error: any) {
            toast({ title: "Erro ao enviar email", description: error.message, variant: "destructive" });
        }
    };

    const handleSendRegistrationLink = async (volunteer: VolunteerApplication, isResend: boolean = false) => {
        if (volunteer.form_data?.registration_link_sent && !isResend) {
            setVolunteerToResend(volunteer);
            setIsConfirmingResend(true);
            return;
        }

        if (!churchId) {
            toast({ title: "Erro", description: "ID da Igreja não encontrado.", variant: "destructive" });
            return;
        }
        if (!volunteer.form_data?.email) {
            toast({ title: "Erro", description: "O cadastro pendente não possui um e-mail.", variant: "destructive" });
            return;
        }
    
        try {
            const link = `${window.location.origin}/register-volunteer?application_id=${volunteer.id}`;
            await sendEmail({
                to: volunteer.form_data.email,
                subject: 'Complete seu Cadastro de Voluntário',
                body: `
                    <h1>Olá, ${volunteer.name}!</h1>
                    <p>Vimos que você demonstrou interesse em se tornar voluntário(a) em nossa igreja. Que alegria!</p>
                    <p>Para dar continuidade, por favor, complete seu cadastro acessando o link abaixo:</p>
                    <p><a href="${link}">${link}</a></p>
                    <p>Estamos ansiosos para ter você servindo conosco!</p>
                `
            });

            const { error: updateError } = await supabase
                .from('pending_registrations')
                .update({ form_data: { ...volunteer.form_data, registration_link_sent: true }})
                .eq('id', volunteer.id);
            
            if (updateError) throw updateError;
            
            toast({ title: "E-mail Enviado!", description: `Um link de cadastro foi enviado para ${volunteer.form_data.email}.`});
            fetchApplications(); // Refresh data to show updated state
        } catch (error: any) {
            toast({ title: "Erro ao enviar e-mail", description: error.message, variant: "destructive" });
        } finally {
            if (isResend) {
                setIsConfirmingResend(false);
                setVolunteerToResend(null);
            }
        }
    };
    
    const onSendToAdmin = async (volunteer: VolunteerApplication) => {
        if (!churchId || !volunteer.form_data?.email) {
             toast({ title: "Erro", description: "ID da Igreja ou e-mail do voluntário não encontrado.", variant: "destructive" });
             return;
        }

        const { error: insertError } = await supabase.from('pending_registrations').insert({
            church_id: churchId,
            name: volunteer.name,
            email: volunteer.form_data.email,
            role: 'Membro',
            status: 'Pendente', 
            form_data: { ...volunteer.form_data, source: 'Voluntariado' },
        });

        if (insertError) {
            toast({ title: 'Erro ao criar pendência de membro', description: insertError.message, variant: 'destructive' });
            return;
        }
        
        const { error: updateError } = await supabase
            .from('pending_registrations')
            .update({ status: 'Alocado' })
            .eq('id', volunteer.id);

        if (updateError) {
            toast({ title: 'Aviso', description: `O cadastro foi enviado, mas o status original não pôde ser atualizado. ${updateError.message}`, variant: 'destructive' });
        } else {
            toast({ title: 'Enviado para Administração!', description: `O cadastro de ${volunteer.name} agora está na fila de pendências de membros.` });
        }

        fetchApplications();
    };

    const handleSendMemberForm = async () => {
        if (!volunteerToSendMemberForm) return;

        try {
            const link = `${window.location.origin}/register-member?application_id=${volunteerToSendMemberForm.id}`;
            await sendEmail({
                to: volunteerToSendMemberForm.form_data.email,
                subject: 'Próximo Passo: Torne-se um Membro!',
                body: `
                    <h1>Olá, ${volunteerToSendMemberForm.name}!</h1>
                    <p>Vimos em sua inscrição para o voluntariado que você ainda não é membro de nossa igreja. Ser membro é um passo importante em sua jornada conosco!</p>
                    <p>Por favor, acesse o link abaixo para preencher o formulário de cadastro de membro:</p>
                    <p><a href="${link}">${link}</a></p>
                    <p>Após o envio, seu cadastro será analisado por nossa equipe pastoral.</p>
                `
            });
            await supabase.from('pending_registrations').update({
                form_data: { ...volunteerToSendMemberForm.form_data, member_form_sent: true }
            }).eq('id', volunteerToSendMemberForm.id);
            toast({ title: "Formulário de Membro Enviado!", description: `Um e-mail foi enviado para ${volunteerToSendMemberForm.name}.` });
            fetchApplications();
        } catch (error: any) {
             toast({ title: "Erro ao enviar e-mail", description: error.message, variant: "destructive" });
        } finally {
            setVolunteerToSendMemberForm(null);
        }
    };
    
    const handleSendToWelcome = async () => {
        if (!volunteerToSendToWelcome || !churchId) return;
        
        try {
            const { data: existing, error: checkError } = await supabase
                .from('new_beginnings')
                .select('id')
                .eq('id', volunteerToSendToWelcome.form_data.id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existing) {
                 toast({ title: "Já no Acolhimento", description: `${volunteerToSendToWelcome.name} já está na Central de Acolhimento.` });
            } else {
                const { error: insertError } = await supabase.from('new_beginnings').insert({
                    id: volunteerToSendToWelcome.form_data.id,
                    church_id: churchId,
                    name: volunteerToSendToWelcome.name,
                    email: volunteerToSendToWelcome.form_data.email,
                    phone: volunteerToSendToWelcome.form_data.phone,
                    interests: [{ key: 'baptism', label: 'Desejo me batizar' }],
                    request_details: JSON.stringify({ source: 'Voluntariado', from_volunteer_id: volunteerToSendToWelcome.id }),
                    status: 'Pendente',
                });
                if (insertError) throw insertError;
                toast({ title: "Enviado para Acolhimento!", description: `${volunteerToSendToWelcome.name} foi adicionado à Central de Acolhimento.` });
            }
            
            await supabase.from('pending_registrations').update({
                 form_data: { ...volunteerToSendToWelcome.form_data, sent_to_welcome: true }
            }).eq('id', volunteerToSendToWelcome.id);
            
            fetchApplications();

        } catch (error: any) {
            toast({ title: "Erro ao enviar para o Acolhimento", description: error.message, variant: "destructive" });
        } finally {
            setVolunteerToSendToWelcome(null);
        }
    };

    const handleFilterChange = (type: 'status' | 'ministry', value: string) => {
        const updater = type === 'status' ? setStatusFilters : setMinistryFilters;
        updater(prev => 
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
        setCurrentPage(1);
    };

    const newApplications = useMemo(() => applications.filter(app => app.status === 'Pendente'), [applications]);
    
    const allocatedApplications = useMemo(() => applications.filter(app => app.status === 'Alocado'), [applications]);

    const otherApplications = useMemo(() => {
        const excludedStatuses = ['Pendente', 'Alocado', 'Arquivado'];
        return applications.filter(app => {
            if (excludedStatuses.includes(app.status)) return false;

            const matchesSearch = searchTerm ? app.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(app.status);
            
            const ministryMap = new Map(allMinistries.map(m => [m.name, m.id]));
            const matchesMinistry = ministryFilters.length === 0 || ministryFilters.some(mf => {
                const ministryId = ministryMap.get(mf);
                if (!ministryId) return false;
                const inInterests = app.form_data?.ministry_interests?.includes(mf);
                const inAssigned = app.form_data?.assigned_ministry_ids?.includes(ministryId);
                return inInterests || inAssigned;
            });

            return matchesSearch && matchesStatus && matchesMinistry;
        });
    }, [applications, searchTerm, statusFilters, ministryFilters, allMinistries]);


    const totalPages = Math.ceil(otherApplications.length / itemsPerPage);
    const paginatedApplications = useMemo(() => {
        return otherApplications.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [otherApplications, currentPage, itemsPerPage]);
    
    const allocatedTotalPages = Math.ceil(allocatedApplications.length / allocatedItemsPerPage);
    const paginatedAllocatedApplications = useMemo(() => {
        return allocatedApplications.slice(
            (allocatedCurrentPage - 1) * allocatedItemsPerPage,
            allocatedCurrentPage * allocatedItemsPerPage
        );
    }, [allocatedApplications, allocatedCurrentPage, allocatedItemsPerPage]);

    const uniqueStatuses = Array.from(new Set(otherApplications.map(app => app.status)));

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const actions = {
        onViewDetails,
        onAssignToMinistry,
        handleRequestDocuments,
        onSendToAdmin,
        onSendRegistrationLink: handleSendRegistrationLink,
        onSendToWelcome: (volunteer: VolunteerApplication) => setVolunteerToSendToWelcome(volunteer),
        onSendMemberForm: (volunteer: VolunteerApplication) => setVolunteerToSendMemberForm(volunteer),
        onDelete: onDeleteVolunteer,
        onUpdateStatus: updateApplicationStatus,
    };
  
  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Voluntários</h1>
            <p className="text-muted-foreground">
              Acompanhe os novos voluntários desde a inscrição até a alocação nos ministérios.
            </p>
          </div>
          <Button onClick={handleShareLink}>
            <UserPlus className="mr-2 h-4 w-4" />
            Link de Inscrição
          </Button>
        </div>
        
        <Tabs defaultValue="new" className="flex-1 flex flex-col">
            <TabsList>
                <TabsTrigger value="new">Inscrições Recebidas ({newApplications.length})</TabsTrigger>
                <TabsTrigger value="management">Gerenciamento Geral ({otherApplications.length})</TabsTrigger>
                <TabsTrigger value="allocated">Alocados ({allocatedApplications.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-4 flex-1">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Novas Inscrições</CardTitle>
                        <CardDescription>Voluntários que acabaram de se inscrever e aguardam o primeiro contato ou ação.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                         <VolunteersListView data={newApplications} actions={actions} onUpdate={() => fetchApplications(churchId)} />
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="management" className="mt-4 flex-1">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Gerenciamento de Voluntários</CardTitle>
                        <CardDescription>Filtre e gerencie todos os voluntários em processo na plataforma.</CardDescription>
                         <div className="flex items-center gap-2 pt-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-10 gap-1">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        <span className="sm:whitespace-nowrap">Filtrar por Status</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {uniqueStatuses.map(status => (
                                        <DropdownMenuCheckboxItem
                                            key={status}
                                            checked={statusFilters.includes(status)}
                                            onCheckedChange={() => handleFilterChange('status', status)}
                                        >
                                            {status}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-10 gap-1">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        <span className="sm:whitespace-nowrap">Filtrar por Ministério</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ministério de Interesse</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {allMinistries.map(ministry => (
                                        <DropdownMenuCheckboxItem
                                            key={ministry.id}
                                            checked={ministryFilters.includes(ministry.name)}
                                            onCheckedChange={() => handleFilterChange('ministry', ministry.name)}
                                        >
                                            {ministry.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <VolunteersListView data={paginatedApplications} actions={actions} onUpdate={() => fetchApplications(churchId)} />
                    </CardContent>
                    <CardFooter>
                        <div className="text-xs text-muted-foreground">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                        </div>
                        <div className="ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="ml-2"
                        >
                            Próxima
                        </Button>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="allocated" className="mt-4 flex-1">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Voluntários Alocados</CardTitle>
                        <CardDescription>Voluntários que já foram aprovados e estão servindo em um ou mais ministérios.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                         <VolunteersListView data={paginatedAllocatedApplications} actions={actions} onUpdate={() => fetchApplications(churchId)} />
                    </CardContent>
                     <CardFooter>
                        <div className="text-xs text-muted-foreground">
                            Página <strong>{allocatedCurrentPage}</strong> de <strong>{allocatedTotalPages}</strong>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAllocatedCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={allocatedCurrentPage === 1}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAllocatedCurrentPage(prev => Math.min(prev + 1, allocatedTotalPages))}
                                disabled={allocatedCurrentPage === allocatedTotalPages}
                            >
                                Próxima
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
      </div>

       {selectedVolunteer && (
          <ViewVolunteerApplicationDialog
              volunteer={selectedVolunteer}
              open={isDetailsOpen}
              onOpenChange={setIsDetailsOpen}
              onUpdateStatus={async (appId, newStatus) => {
                  await updateApplicationStatus([appId], newStatus);
                  fetchApplications();
                  setIsDetailsOpen(false);
              }}
          />
      )}
      
      {selectedVolunteer && churchId && (
          <AssignMinistryDialog
              volunteer={selectedVolunteer}
              churchId={churchId}
              open={isAssignOpen}
              onOpenChange={setIsAssignOpen}
              onUpdate={() => fetchApplications()}
          />
      )}

       <AlertDialog open={isConfirmingResend} onOpenChange={setIsConfirmingResend}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Reenviar Link de Cadastro?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Um e-mail já foi enviado para {volunteerToResend?.form_data.email}. Deseja reenviar mesmo assim?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setVolunteerToResend(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => volunteerToResend && handleSendRegistrationLink(volunteerToResend, true)}>
                      Sim, Reenviar
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!volunteerToSendToWelcome} onOpenChange={(open) => !open && setVolunteerToSendToWelcome(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Enviar para o Acolhimento?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação criará um novo registro na Central de Acolhimento para <strong>{volunteerToSendToWelcome?.name}</strong> para que a equipe possa acompanhar o processo do batismo.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendToWelcome}>
                    <Handshake className="mr-2 h-4 w-4"/> Sim, Enviar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!volunteerToSendMemberForm} onOpenChange={(open) => !open && setVolunteerToSendMemberForm(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Enviar Formulário de Membro?</AlertDialogTitle>
                <AlertDialogDescription>
                   Um e-mail com o link para o formulário de cadastro de membro será enviado para <strong>{volunteerToSendMemberForm?.name}</strong>. Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendMemberForm}>
                    <Mail className="mr-2 h-4 w-4"/> Sim, Enviar E-mail
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação removerá permanentemente o registro de inscrição de <strong>{volunteerToDelete?.name}</strong>. Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteVolunteer} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sim, Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
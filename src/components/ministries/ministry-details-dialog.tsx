
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, User, Users, Trash2, Loader2, Briefcase, UserCheck, History, ArrowRightLeft, CalendarClock, Pencil } from "lucide-react";
import type { MinistryWithDetails, MinistryMember } from "@/app/(app)/ministries/page";
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransferVolunteerDialog } from "./transfer-volunteer-dialog";
import { ViewVolunteerApplicationDialog } from "../volunteering/view-volunteer-application-dialog";
import { EditMemberDialog } from "../members/edit-member-dialog";
import { EditMinistryDialog } from "./edit-ministry-dialog";
import { AddMinistryVolunteerDialog } from "./add-ministry-volunteer-dialog";


interface MinistryDetailsDialogProps {
    ministry: MinistryWithDetails | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

export function MinistryDetailsDialog({ ministry, open, onOpenChange, onUpdate }: MinistryDetailsDialogProps) {
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [isDeletingMinistry, setIsDeletingMinistry] = useState(false);
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
    
    const [availableVolunteers, setAvailableVolunteers] = useState<MinistryMember[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    
    const [rejectionReason, setRejectionReason] = useState('');
    const [volunteerToReject, setVolunteerToReject] = useState<MinistryMember | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    
    const [volunteerToTransfer, setVolunteerToTransfer] = useState<MinistryMember | null>(null);
    const [volunteerToView, setVolunteerToView] = useState<any | null>(null);
    const [volunteerToEdit, setVolunteerToEdit] = useState<MinistryMember | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditMinistryOpen, setIsEditMinistryOpen] = useState(false);
    const supabase = createClient();


    useEffect(() => {
        const fetchUserDataAndVolunteers = async () => {
            if (!open || !ministry) return;

            setLoadingAvailable(true);
            const { data: { user } } = await supabase.auth.getUser();
            if(user) {
                setCurrentUser({ id: user.id, name: user.user_metadata.full_name || 'Usuário' });
            }
            
            const { data, error } = await supabase
                .from('pending_registrations')
                .select('id, name, form_data')
                .eq('role', 'Voluntário')
                .eq('status', 'Aguardando Aprovação do Líder')
                .contains('form_data', { assigned_ministry_ids: [ministry.id] });
                
            if (error) {
                toast({ title: "Erro ao buscar voluntários pendentes", description: error.message, variant: "destructive"});
            } else {
                 const available = (data || []).map(v => ({
                    id: v.id,
                    name: v.name,
                    avatar: `https://placehold.co/40x40.png?text=${v.name.charAt(0)}`,
                    form_data: v.form_data,
                } as MinistryMember));
                setAvailableVolunteers(available);
            }

            setLoadingAvailable(false);
        };

        fetchUserDataAndVolunteers();

    }, [open, ministry, toast, onUpdate]);


    if (!ministry) {
        return null;
    }

    const openViewDialog = async (volunteer: MinistryMember) => {
        let registrationData = null;

        // Try fetching by ID first
        const { data: byIdData, error: byIdError } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('id', volunteer.id)
            .eq('role', 'Voluntário')
            .maybeSingle();

        if (byIdData) {
            registrationData = byIdData;
        } else if (volunteer.email && volunteer.email !== 'N/A') {
            // Fallback to email if ID search fails and email exists
            const { data: byEmailData, error: byEmailError } = await supabase
                .from('pending_registrations')
                .select('*')
                .eq('email', volunteer.email)
                .eq('role', 'Voluntário')
                .maybeSingle();

            if (byEmailData) {
                registrationData = byEmailData;
            }
        }
        
        if (!registrationData) {
            toast({ title: "Erro", description: "Não foi possível carregar os detalhes completos do voluntário.", variant: "destructive"});
            return;
        }

        setVolunteerToView(registrationData);
    };

    const openEditDialog = async (volunteer: MinistryMember) => {
        let memberData: any = null;

        // Cascade through tables to find the most complete profile
        const { data: memberProfile } = await supabase.from('members').select('*').eq('id', volunteer.id).maybeSingle();
        if (memberProfile) {
            memberData = memberProfile;
        } else {
            const { data: leaderProfile } = await supabase.from('pastors_and_leaders').select('*').eq('id', volunteer.id).maybeSingle();
            if (leaderProfile) {
                memberData = leaderProfile;
            } else {
                const { data: volunteerProfile } = await supabase.from('volunteers').select('*').eq('id', volunteer.id).maybeSingle();
                if (volunteerProfile) {
                    memberData = volunteerProfile;
                } else {
                     const { data: pendingRegProfile } = await supabase.from('pending_registrations').select('form_data').eq('id', volunteer.id).maybeSingle();
                     if (pendingRegProfile) {
                         memberData = pendingRegProfile.form_data;
                     }
                }
            }
        }
        
        if (!memberData) {
            toast({ title: "Erro", description: "Não foi possível carregar os dados completos deste membro.", variant: "destructive"});
            return;
        }
        
        // Fetch pending registration data to get form_data
        const { data: pendingRegData } = await supabase.from('pending_registrations').select('form_data').eq('id', volunteer.id).maybeSingle();
        
        setVolunteerToEdit({
            ...volunteer, // Base data from ministry list
            ...memberData, // Data from members/leaders/volunteers table
            form_data: {
                ...memberData, // Base form data from the primary profile table
                ...(pendingRegData?.form_data || {}), // Overwrite/add with more detailed data from pending_registrations
            }
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveMember = async (updatedMember: MinistryMember) => {
        // This function will be called from EditMemberDialog
        // A real implementation would handle the specific update logic here
        const { data, error } = await supabase.from('volunteers').update({
            availability: (updatedMember.form_data || {}).availability
        }).eq('id', updatedMember.id);
        
        if(error) {
            toast({ title: "Erro ao salvar disponibilidade", description: error.message, variant: 'destructive'});
        } else {
            toast({ title: "Disponibilidade Atualizada!", description: "As informações de disponibilidade foram salvas." });
            setIsEditDialogOpen(false);
            onUpdate();
        }
    };
    
    const addActivity = (action: string, details: string, currentFormData: any) => {
        if (!currentUser) return currentFormData.activities || [];
        const newActivity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action,
            details,
        };
        return [...(currentFormData.activities || []), newActivity];
    };

    const volunteerDetails = ministry.volunteers_details;
    
    const handleRemoveVolunteer = async (volunteerToRemove: MinistryMember) => {
        setIsRemoving(volunteerToRemove.id);
        
        const { data: currentMinistryData, error: fetchError } = await supabase
          .from('pending_registrations')
          .select('form_data')
          .eq('id', ministry.id)
          .single();

        if (fetchError) {
            toast({ title: "Erro ao buscar dados atuais", description: fetchError.message, variant: "destructive" });
            setIsRemoving(null);
            return;
        }

        const currentVolunteerIds = currentMinistryData.form_data?.volunteer_ids || [];
        const newVolunteerIds = currentVolunteerIds.filter((id: string) => id !== volunteerToRemove.id);
        
        const updatedActivities = addActivity('volunteer_removed', `Voluntário ${volunteerToRemove.name} foi removido do ministério.`, currentMinistryData.form_data);

        const { error: updateError } = await supabase
            .from('pending_registrations')
            .update({ form_data: { ...currentMinistryData.form_data, volunteer_ids: newVolunteerIds, activities: updatedActivities } })
            .eq('id', ministry.id);

        setIsRemoving(null);
        if (updateError) {
            toast({ title: "Erro ao remover voluntário", description: updateError.message, variant: "destructive" });
        } else {
            toast({ title: "Voluntário Removido!", description: `${volunteerToRemove.name} foi removido do ministério.` });
            onUpdate();
        }
    }
    
    const handleDeleteMinistry = async () => {
        if (!ministry) return;
        setIsDeletingMinistry(true);
        const { error } = await supabase.from('pending_registrations').delete().eq('id', ministry.id);

        if (error) {
            toast({ title: "Erro ao excluir ministério", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Ministério Excluído!", description: `O ministério "${ministry.name}" foi removido com sucesso.` });
            onOpenChange(false);
            onUpdate();
        }
        setIsDeletingMinistry(false);
    };
    
    const handleFinalApproval = async (volunteerId: string, volunteerName: string) => {
        setIsRemoving(volunteerId);

        try {
            // Fetch volunteer application data to get its form_data
            const { data: volunteerApp, error: volunteerAppError } = await supabase
                .from('pending_registrations')
                .select('form_data, church_id')
                .eq('id', volunteerId)
                .single();

            if (volunteerAppError || !volunteerApp) {
                throw new Error(volunteerAppError?.message || 'Inscrição do voluntário não encontrada.');
            }
            
            const volunteerApplicationData = volunteerApp.form_data;
            
            // Upsert the volunteer into the main 'members' table
            const { error: memberUpsertError } = await supabase
              .from('members')
              .upsert({
                id: volunteerApplicationData.id,
                church_id: volunteerApp.church_id,
                name: volunteerApplicationData.name,
                email: volunteerApplicationData.email,
                phone: volunteerApplicationData.phone,
                role: 'Voluntário',
                status: 'Ativo',
              }, { onConflict: 'id' });

            if (memberUpsertError) throw memberUpsertError;


            // Upsert the volunteer into the main 'volunteers' table to make them active
            const { error: volunteerInsertError } = await supabase
                .from('volunteers')
                .upsert({
                    id: volunteerApplicationData.id,
                    church_id: volunteerApp.church_id,
                    name: volunteerApplicationData.name,
                    email: volunteerApplicationData.email,
                    phone: volunteerApplicationData.phone,
                    availability: volunteerApplicationData.availability || [],
                    role: 'Voluntário',
                }, { onConflict: 'id' });

            if (volunteerInsertError) {
                throw volunteerInsertError;
            }
            
            // Fetch the current ministry data to update its volunteer list
            const { data: ministryRes, error: ministryError } = await supabase
                .from('pending_registrations')
                .select('form_data')
                .eq('id', ministry.id)
                .single();
                
            if(ministryError || !ministryRes) {
                 throw new Error(ministryError?.message || 'Ministério não encontrado.');
            }

            const currentMinistryData = ministryRes.form_data;
            const currentVolunteerIds = currentMinistryData.volunteer_ids || [];
            
            const newVolunteerIds = [...new Set([...currentVolunteerIds, volunteerId])];
            const updatedActivities = addActivity('volunteer_approved', `Voluntário ${volunteerName} foi aprovado.`, currentMinistryData);

            const { error: ministryUpdateError } = await supabase
                .from('pending_registrations')
                .update({ form_data: { ...currentMinistryData, volunteer_ids: newVolunteerIds, activities: updatedActivities } })
                .eq('id', ministry.id);

            if (ministryUpdateError) {
                throw ministryUpdateError;
            }

            // Update the volunteer's original application status
            const currentAssignedIds = volunteerApplicationData.assigned_ministry_ids || [];
            const newAssignedIds = currentAssignedIds.filter((id: string) => id !== ministry.id);

            let finalStatus = 'Aguardando Aprovação do Líder';
            if (newAssignedIds.length === 0) {
                finalStatus = 'Alocado';
            }
            
            const { error: appUpdateError } = await supabase
                .from('pending_registrations')
                .update({ 
                    status: finalStatus, 
                    form_data: { ...volunteerApplicationData, assigned_ministry_ids: newAssignedIds } 
                })
                .eq('id', volunteerId);

            if (appUpdateError) {
                throw appUpdateError;
            }

            toast({ title: "Voluntário Aprovado!", description: `${volunteerApplicationData.name} agora faz parte do ministério e da lista de membros.` });
            
        } catch (error: any) {
            toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
        } finally {
            setIsRemoving(null);
            onUpdate();
        }
    }
    
    const openRejectionDialog = (volunteer: MinistryMember) => {
        setVolunteerToReject(volunteer);
        setIsRejecting(true);
    };

    const handleRejectVolunteer = async () => {
        if (!volunteerToReject || !rejectionReason.trim()) {
            toast({ title: "Justificativa obrigatória", description: "A justificativa é necessária para recusar o voluntário.", variant: "destructive" });
            return;
        }
        setIsRemoving(volunteerToReject.id);
        
        try {
            const { data: applicationData, error: fetchError } = await supabase
                .from('pending_registrations')
                .select('form_data')
                .eq('id', volunteerToReject.id)
                .single();

            if (fetchError || !applicationData) {
                throw new Error("Não foi possível carregar os dados da inscrição do voluntário.");
            }
            
            const updatedFormData = {
                ...applicationData.form_data,
                assigned_ministry_ids: [],
                rejection_reason: rejectionReason,
                rejected_by_ministry: ministry.name,
            };
            
            const { error: updateError } = await supabase
                .from('pending_registrations')
                .update({ 
                    status: 'Com Retorno',
                    form_data: updatedFormData 
                })
                .eq('id', volunteerToReject.id);

            if (updateError) {
                throw updateError;
            }

            toast({ title: "Voluntário Recusado", description: "O voluntário foi movido para a coluna 'Com Retorno' para reavaliação do coordenador." });
            onUpdate();

        } catch (error: any) {
            toast({ title: "Erro ao recusar", description: error.message, variant: "destructive" });
        } finally {
            setIsRemoving(null);
            setIsRejecting(false);
            setRejectionReason('');
            setVolunteerToReject(null);
        }
    }

    const getActionIcon = (action: string) => {
        if (action.includes('approved')) return <UserCheck className="h-4 w-4" />;
        if (action.includes('removed')) return <Trash2 className="h-4 w-4" />;
        if (action.includes('transferred')) return <ArrowRightLeft className="h-4 w-4" />;
        return <Briefcase className="h-4 w-4" />;
    };


    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-2xl">{ministry.name}</DialogTitle>
                                <DialogDescription>Detalhes do ministério, voluntários e agenda.</DialogDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsEditMinistryOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="volunteers" className="w-full flex-grow flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="about">Sobre</TabsTrigger>
                            <TabsTrigger value="volunteers">Voluntários ({volunteerDetails.length})</TabsTrigger>
                            <TabsTrigger value="approval" className="relative">
                                Aprovar
                                {availableVolunteers.length > 0 && (
                                    <Badge variant="default" className="absolute -top-1 -right-1 h-5 px-1.5">{availableVolunteers.length}</Badge>
                                )}
                            </TabsTrigger>
                             <TabsTrigger value="history">Histórico</TabsTrigger>
                            <TabsTrigger value="schedule">Agenda</TabsTrigger>
                        </TabsList>
                        <div className="flex-grow overflow-hidden mt-4">
                            <ScrollArea className="h-full pr-4">
                                <TabsContent value="about" className="space-y-6 mt-0">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Descrição</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground">{ministry.description}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Responsável</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={ministry.pastorAvatar} alt={ministry.pastor} data-ai-hint="person" />
                                                <AvatarFallback>{ministry.pastor.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-lg">{ministry.pastor}</p>
                                                <p className="text-muted-foreground">Pastor</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="volunteers" className="mt-0">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle>Voluntários Ativos</CardTitle>
                                                <CardDescription>Membros que servem neste ministério.</CardDescription>
                                            </div>
                                            <AddMinistryVolunteerDialog ministry={ministry} onUpdate={onUpdate} />
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {volunteerDetails.map((volunteer) => volunteer && (
                                                <div key={volunteer.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={volunteer.avatar} alt={volunteer.name} data-ai-hint="person" />
                                                            <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold">{volunteer.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                                                                {(volunteer.ministryCount ?? 0) > 1 && (
                                                                    <Badge variant="destructive" className="flex items-center gap-1">
                                                                        <Briefcase className="h-3 w-3" />
                                                                        {volunteer.ministryCount} ministérios
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => openEditDialog(volunteer)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => setVolunteerToTransfer(volunteer)}>Transferir</Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={isRemoving === volunteer.id}>
                                                                    {isRemoving === volunteer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Esta ação irá remover <strong>{volunteer.name}</strong> do ministério {ministry.name}.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleRemoveVolunteer(volunteer)} className="bg-destructive hover:bg-destructive/90">
                                                                        Sim, remover
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            ))}
                                            {volunteerDetails.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center pt-4">Nenhum voluntário neste ministério ainda.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="approval" className="mt-0">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Aprovações Pendentes</CardTitle>
                                            <CardDescription>Voluntários que foram direcionados e aguardam sua aprovação.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {loadingAvailable ? (
                                                <div className="flex items-center justify-center h-24"><Loader2 className="h-6 w-6 animate-spin"/></div>
                                            ) : availableVolunteers.length > 0 ? (
                                                availableVolunteers.map(volunteer => (
                                                    <div key={volunteer.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={volunteer.avatar} alt={volunteer.name} data-ai-hint="person" />
                                                                <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <p className="font-semibold">{volunteer.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button size="sm" variant="destructive" onClick={() => openRejectionDialog(volunteer)}>Recusar</Button>
                                                            <Button size="sm" onClick={() => handleFinalApproval(volunteer.id, volunteer.name)} disabled={isRemoving === volunteer.id}>
                                                                {isRemoving === volunteer.id ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                                                                Aprovar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-center text-muted-foreground pt-4">Nenhum voluntário aguardando aprovação.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="history" className="mt-0">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Histórico de Atividades</CardTitle>
                                            <CardDescription>Registro de todas as ações importantes do ministério.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {ministry.form_data?.activities && ministry.form_data.activities.length > 0 ? (
                                                [...ministry.form_data.activities].reverse().map((activity: any) => (
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
                                                    <History className="mx-auto h-8 w-8 mb-2" />
                                                    <p className="text-sm">Nenhuma atividade registrada.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="schedule" className="mt-0">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Agenda do Ministério</CardTitle>
                                            <CardDescription>Próximos eventos e reuniões.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex items-center justify-center">
                                            <Calendar
                                                mode="multiple"
                                                selected={[new Date()]}
                                                className="p-0 rounded-md border"
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </ScrollArea>
                        </div>
                    </Tabs>

                    <DialogFooter className="pt-4 border-t flex justify-between w-full">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isDeletingMinistry}>
                                    {isDeletingMinistry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Excluir Ministério
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso irá remover permanentemente o ministério <strong>{ministry.name}</strong> e todos os seus dados.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteMinistry} className="bg-destructive hover:bg-destructive/90">
                                        Sim, excluir ministério
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Fechar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isRejecting} onOpenChange={setIsRejecting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Recusar Voluntário</AlertDialogTitle>
                        <AlertDialogDescription>
                            Por favor, forneça uma justificativa para recusar a entrada de <strong>{volunteerToReject?.name}</strong> no ministério.
                            A solicitação retornará ao painel do coordenador.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejection-reason" className="sr-only">Justificativa</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Perfil não se encaixa nas necessidades atuais, etc."
                            rows={4}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectVolunteer} disabled={isRemoving === volunteerToReject?.id || !rejectionReason.trim()}>
                             {isRemoving === volunteerToReject?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Confirmar Recusa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {volunteerToTransfer && (
                <TransferVolunteerDialog
                    open={!!volunteerToTransfer}
                    onOpenChange={(isOpen) => { if (!isOpen) setVolunteerToTransfer(null) }}
                    volunteer={volunteerToTransfer}
                    currentMinistry={ministry}
                    onSuccess={() => {
                        setVolunteerToTransfer(null);
                        onUpdate();
                    }}
                />
            )}
             {volunteerToView && (
                <ViewVolunteerApplicationDialog
                    volunteer={volunteerToView}
                    open={!!volunteerToView}
                    onOpenChange={(isOpen) => { if (!isOpen) setVolunteerToView(null) }}
                    onUpdateStatus={() => {
                        setVolunteerToView(null);
                        onUpdate();
                    }}
                />
            )}
             {volunteerToEdit && (
                <EditMemberDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    member={volunteerToEdit}
                    onSave={handleSaveMember}
                    defaultTab="availability"
                />
            )}

            {isEditMinistryOpen && (
                <EditMinistryDialog 
                    ministry={ministry}
                    open={isEditMinistryOpen}
                    onOpenChange={setIsEditMinistryOpen}
                    onUpdate={() => {
                        setIsEditMinistryOpen(false);
                        onUpdate();
                    }}
                />
            )}
        </>
    );
}

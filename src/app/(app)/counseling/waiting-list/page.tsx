

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Counselor, CounselingAppointment } from "@/lib/data";
import { Clock, User, Tag, Loader2, CheckCircle, BadgeHelp, MessageSquare, Handshake, Users as UsersIcon, Cake, Briefcase, UserCog, ArrowLeft } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from '@/hooks/use-user';
import { ScheduleFromWaitingListDialog } from '@/components/counseling/schedule-from-waiting-list-dialog';
import { AssignCounselorDialog } from '@/components/counseling/assign-counselor-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';


type WaitingListEntry = CounselingAppointment & {
    created_at: string;
    originalCounselorName?: string;
    requestingUserGender?: string;
    rejectionReason?: string;
    member_gender?: string;
    member_age?: string;
    member_marital_status?: string;
};

export default function WaitingListPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
    const [loggedInCounselor, setLoggedInCounselor] = useState<Counselor | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [churchName, setChurchName] = useState('Sua Igreja');
    const supabase = createClient();
    const { user, userRole, churchId, loading: userLoading } = useUser();
    
    const [selectedRequestToSchedule, setSelectedRequestToSchedule] = useState<WaitingListEntry | null>(null);
    const [isScheduling, setIsScheduling] = useState(false);

    const [selectedRequestToAssign, setSelectedRequestToAssign] = useState<WaitingListEntry | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);


    const fetchWaitingList = useCallback(async () => {
        if (!churchId) {
            if (!userLoading) {
                setLoading(false);
            }
            return;
        }

        setLoading(true);

        const { data: churchData } = await supabase.from('churches').select('name').eq('id', churchId).single();
        if (churchData) {
            setChurchName(churchData.name);
        }

        // If the user is a counselor, fetch their specific data
        if ((userRole === 'Conselheiro' || userRole === 'Pastor') && user) {
            const { data: counselorData } = await supabase.from('counselors').select('*').eq('id', user.id).single();
            if (counselorData) {
                const formattedCounselor: Counselor = {
                    id: counselorData.id,
                    name: counselorData.name,
                    email: counselorData.email,
                    avatar: `https://placehold.co/40x40.png?text=${counselorData.name.charAt(0)}`,
                    topics: counselorData.topics || [],
                    availability: counselorData.availability || '{}',
                    gender: counselorData.gender || 'Não informado',
                }
                setLoggedInCounselor(formattedCounselor);
            }
        }
        
        const { data, error } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('church_id', churchId)
            .eq('status', 'Na Fila');

        if (error) {
            toast({ title: "Erro ao buscar fila de espera", description: error.message, variant: 'destructive' });
            setWaitingList([]);
        } else {
            const formattedList: WaitingListEntry[] = (data || []).map((item: any) => ({
                id: item.id,
                created_at: item.created_at,
                counselorId: item.form_data.counselor_id,
                originalCounselorName: item.form_data.rejected_by,
                rejectionReason: item.form_data.rejection_reason,
                memberId: '',
                memberName: item.name,
                memberAvatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
                date: item.form_data.date,
                topic: item.form_data.topic,
                status: item.status,
                meetings: [],
                requestingUserGender: item.form_data.member_gender,
                form_data: item.form_data,
                member_gender: item.form_data.member_gender,
                member_age: item.form_data.member_age,
                member_marital_status: item.form_data.member_marital_status,
            }));
            setWaitingList(formattedList);
        }
        setLoading(false);
    }, [toast, supabase, churchId, userLoading, user, userRole]);

    useEffect(() => {
        if (churchId) {
            fetchWaitingList();
        }

        const channel = supabase.channel('waiting-list-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations', filter: `church_id=eq.${churchId}` }, payload => {
                if(payload.new.status === 'Na Fila' || payload.old.status === 'Na Fila') {
                    fetchWaitingList();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchWaitingList, supabase, churchId]);

    const handleAcceptRequest = (request: WaitingListEntry) => {
        setSelectedRequestToSchedule(request);
        setIsScheduling(true);
    };

    const handleAssignRequest = (request: WaitingListEntry) => {
        setSelectedRequestToAssign(request);
        setIsAssigning(true);
    }

    if (userLoading || loading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    const canAcceptRequests = (userRole === 'Conselheiro' || userRole === 'Pastor') && loggedInCounselor;
    
    const canAssignRequests = userRole === 'Administrador' || userRole === 'Pastor' || userRole === 'Coordenador';

    return (
        <TooltipProvider>
            <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/counseling/statistics')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Fila de Espera do Atendimento Pastoral</h1>
                        <p className="text-muted-foreground">Atendimentos que foram recusados e aguardam um novo conselheiro.</p>
                    </div>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle>Solicitações na Fila ({waitingList.length})</CardTitle>
                        <CardDescription>
                            Abaixo estão os pedidos que aguardam um conselheiro disponível.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {waitingList.length > 0 ? (
                                waitingList.map(request => {
                                    const isMatchForSelf = canAcceptRequests && (
                                        !request.requestingUserGender ||
                                        request.requestingUserGender === 'Outro' ||
                                        request.requestingUserGender === loggedInCounselor.gender
                                    );
                                    
                                    const isFromAcolhimento = request.form_data?.source === 'Acolhimento';

                                    return (
                                        <div key={request.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={request.memberAvatar} alt={request.memberName} data-ai-hint="person" />
                                                    <AvatarFallback>{request.memberName.slice(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-lg">{request.memberName}</p>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Tag className="h-4 w-4" />
                                                            <span>{request.topic}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            <span>Tempo na fila: {formatDistanceToNow(new Date(request.created_at), { locale: ptBR })}</span>
                                                        </div>
                                                         {request.member_gender && (
                                                            <div className="flex items-center gap-1 capitalize"><UsersIcon className="h-4 w-4" />{request.member_gender}</div>
                                                        )}
                                                        {request.member_age && (
                                                            <div className="flex items-center gap-1"><Cake className="h-4 w-4" />{request.member_age} anos</div>
                                                        )}
                                                        {request.member_marital_status && (
                                                            <div className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{request.member_marital_status}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                                        {request.originalCounselorName && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex items-center gap-1 text-xs text-amber-600 cursor-pointer">
                                                                        <MessageSquare className="h-4 w-4" />
                                                                        <span>Recusado por: {request.originalCounselorName}</span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{request.rejectionReason || 'Nenhuma justificativa fornecida.'}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                         {isFromAcolhimento && (
                                                            <div className="flex items-center gap-1 text-xs text-blue-600">
                                                                <Handshake className="h-4 w-4" />
                                                                <span>Enviado do Acolhimento</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                {canAssignRequests && (
                                                    <Button variant="secondary" size="sm" onClick={() => handleAssignRequest(request)}>
                                                        <UserCog className="mr-2 h-4 w-4" />
                                                        Atribuir
                                                    </Button>
                                                )}
                                                {canAcceptRequests && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleAcceptRequest(request)}
                                                        disabled={!isMatchForSelf || processingId === request.id}
                                                        title={!isMatchForSelf ? "Incompatível com o gênero solicitado pelo usuário." : "Aceitar solicitação"}
                                                    >
                                                        {processingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                        {processingId === request.id ? 'Processando...' : 'Aceitar Atendimento'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center">
                                    <BadgeHelp className="h-12 w-12 mb-4" />
                                    <h3 className="font-semibold text-lg">A fila de espera está vazia.</h3>
                                    <p>Nenhuma solicitação de atendimento pastoral aguardando um novo conselheiro no momento.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {loggedInCounselor && selectedRequestToSchedule && (
                <ScheduleFromWaitingListDialog
                    open={isScheduling}
                    onOpenChange={setIsScheduling}
                    request={selectedRequestToSchedule}
                    counselor={loggedInCounselor}
                    churchName={churchName}
                    onSuccess={() => {
                        setIsScheduling(false);
                        setSelectedRequestToSchedule(null);
                        fetchWaitingList();
                    }}
                />
            )}

            {canAssignRequests && selectedRequestToAssign && churchId && (
                <AssignCounselorDialog
                    open={isAssigning}
                    onOpenChange={setIsAssigning}
                    request={selectedRequestToAssign}
                    churchId={churchId}
                    churchName={churchName}
                    onSuccess={() => {
                        setIsAssigning(false);
                        setSelectedRequestToAssign(null);
                        fetchWaitingList();
                    }}
                />
            )}

        </TooltipProvider>
    );
}

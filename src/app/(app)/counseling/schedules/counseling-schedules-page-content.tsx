

'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Counselor, CounselingAppointment } from "@/lib/data";
import { Clock, User, Tag, Share2, ArrowRight, Loader2, Calendar as CalendarIcon, List, ArrowLeft, Search, ListFilter, Repeat } from "lucide-react";
import { format, isSameDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';


const statusOptions = ['Pendente', 'Marcado', 'Em Aconselhamento', 'Concluído', 'Cancelado', 'Na Fila'];

type AppointmentWithHistory = CounselingAppointment & {
    history?: { id: string; date: string; counselor: string }[];
};


export default function CounselingSchedulesPageContent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const counselorIdFromQuery = searchParams.get('counselor');
    const statusFromQuery = searchParams.get('status');
    const viewFromQuery = searchParams.get('view');
    const supabase = createClient();

    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [appointments, setAppointments] = useState<AppointmentWithHistory[]>([]);
    const [loadingCounselors, setLoadingCounselors] = useState(true);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    
    const { churchId, user, loading: userLoading } = useUser();

    const [selectedCounselorId, setSelectedCounselorId] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isClient, setIsClient] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilters, setStatusFilters] = useState<string[]>(statusFromQuery ? [statusFromQuery] : []);
    
    const [listCurrentPage, setListCurrentPage] = useState(1);
    const [listItemsPerPage, setListItemsPerPage] = useState(10);
    
    const [activeTab, setActiveTab] = useState(statusFromQuery || viewFromQuery === 'list' ? 'list' : 'calendar');
    
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<{ app: AppointmentWithHistory, allAppointments: { id: string; date: string; counselor: string }[], currentPage: number } | null>(null);


    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // Fetch counselors
    useEffect(() => {
        const fetchCounselors = async () => {
            if (!churchId) {
                if (!userLoading) {
                    toast({ title: "Erro", description: "Não foi possível encontrar uma igreja associada a este usuário.", variant: "destructive"});
                    setLoadingCounselors(false);
                }
                return;
            }

            setLoadingCounselors(true);

            const { data, error } = await supabase
                .from('counselors')
                .select('*')
                .eq('church_id', churchId);

            if (error) {
                toast({ title: "Erro ao buscar conselheiros", description: error.message, variant: 'destructive' });
            } else {
                const formattedData: Counselor[] = data.map((item: any) => ({
                    id: item.id, name: item.name, email: item.email,
                    avatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
                    topics: item.topics || [], availability: item.availability || '{}', gender: item.gender,
                }));
                setCounselors(formattedData);

                const defaultCounselorId = counselorIdFromQuery || 'all';
                setSelectedCounselorId(defaultCounselorId);
            }
            setLoadingCounselors(false);
        };
        
        if (churchId) {
            fetchCounselors();
            setSelectedDate(new Date());
        }
    }, [churchId, userLoading, counselorIdFromQuery, toast, supabase]);
    
    // Fetch all appointments for the church
    const fetchAppointments = useCallback(async () => {
        if (!churchId) return;

        setLoadingAppointments(true);
        let query = supabase
            .from('pending_registrations')
            .select('*')
            .eq('church_id', churchId)
            .eq('role', 'Conselheiro');
        
        const { data, error } = await query;
        
        if (error) {
            toast({ title: "Erro ao buscar agendamentos", description: error.message, variant: "destructive" });
            setAppointments([]);
        } else {
            const allAppointmentsData = (data || []).filter(item => item.form_data && isValid(new Date(item.form_data.date)));

            const allAppointments: CounselingAppointment[] = allAppointmentsData.map((item: any) => ({
                id: item.id,
                counselorId: item.form_data.counselor_id,
                counselorName: item.form_data.counselor_name || 'Não atribuído',
                memberId: item.form_data.member_id || item.id,
                memberName: item.name,
                memberAvatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
                date: item.form_data.date,
                topic: item.form_data.topic,
                status: item.status,
                form_data: item.form_data,
                meetings: [],
            }));

            // Create a unique key for each person based on name + contact info
            const userKeyMap: Record<string, string> = {}; // { appointmentId -> userKey }
            allAppointments.forEach(app => {
                const email = app.form_data?.member_email?.toLowerCase();
                const phone = app.form_data?.member_phone;
                const name = app.memberName;
                const key = `${name}-${email || phone || app.id}`;
                userKeyMap[app.id] = key;
            });

            // Group all appointments by this key to build history
            const userHistory: Record<string, { id: string; date: string; counselor: string }[]> = {};
            allAppointments
                .forEach(app => {
                    const key = userKeyMap[app.id];
                    if (!userHistory[key]) {
                        userHistory[key] = [];
                    }
                    userHistory[key].push({ id: app.id, date: app.date, counselor: app.counselorName! });
                });

            // Attach history to each appointment
            const appointmentsWithHistory = allAppointments.map(app => {
                 const key = userKeyMap[app.id];
                 const history = (userHistory[key] || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                 return { ...app, history };
            });

            setAppointments(appointmentsWithHistory);
        }
        setLoadingAppointments(false);
    }, [churchId, toast, supabase]);
    
    useEffect(() => {
        if (churchId) {
            fetchAppointments();

            const channel = supabase.channel('pending-registrations-counseling-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'pending_registrations', filter: `church_id=eq.${churchId}` },
                    (payload) => {
                        fetchAppointments();
                    })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [churchId, fetchAppointments, supabase]);
    
    const appointmentsOnSelectedDate = appointments.filter(app => {
        if (!selectedDate || !isSameDay(new Date(app.date), selectedDate)) {
            return false;
        }
        if (selectedCounselorId === 'all') {
            return true;
        }
        return app.counselorId === selectedCounselorId;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const appointmentDates = appointments.map(app => new Date(app.date));
    
    const myAppointmentDates = appointments
        .filter(app => app.counselorId === user?.id)
        .map(app => new Date(app.date));

    const filteredAndSortedList = useMemo(() => {
       let listSourceData = appointments;

        let filteredItems = listSourceData.filter(app => {
            const matchesCounselor = selectedCounselorId === 'all' || app.counselorId === selectedCounselorId;
            const matchesSearch = searchTerm === '' || 
                                  app.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (app.counselorName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(app.status);
            return matchesCounselor && matchesSearch && matchesStatus;
        });
        
        return filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, selectedCounselorId, searchTerm, statusFilters]);

    const listTotalPages = Math.ceil(filteredAndSortedList.length / listItemsPerPage);
    const paginatedList = filteredAndSortedList.slice(
        (listCurrentPage - 1) * listItemsPerPage,
        listCurrentPage * listItemsPerPage
    );


    const handleShareLink = () => {
        if (!churchId) {
            toast({
                title: "Erro ao gerar link",
                description: "Não foi possível identificar a sua igreja. Recarregue a página.",
                variant: "destructive"
            });
            return;
        }
        const link = `${window.location.origin}/agendar?church_id=${churchId}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: "O link para a página de agendamento foi copiado para sua área de transferência.",
        });
    }
    
    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Marcado':
            case 'Concluído':
                 return 'default';
            case 'Pendente':
            case 'Em Aconselhamento':
                return 'secondary';
            case 'Cancelado':
            case 'Na Fila':
                return 'destructive';
            default:
                return 'outline';
        }
    }
    
    const handleStatusFilterChange = (status: string) => {
        setStatusFilters(prev => 
          prev.includes(status)
            ? prev.filter(s => s !== status)
            : [...prev, status]
        );
        setListCurrentPage(1);
    };
    
    const handleOpenHistoryModal = (app: AppointmentWithHistory) => {
        setSelectedHistory({ app, allAppointments: app.history || [], currentPage: 1 });
        setHistoryModalOpen(true);
    };

    const HistoryTag = ({ app }: { app: AppointmentWithHistory }) => {
        const history = app.history || [];
        const count = history.length;
        if (count === 0) return null;

        const getVariant = (): "default" | "secondary" | "destructive" => {
            if (count <= 1) return 'default';
            if (count <= 3) return 'secondary';
            return 'destructive';
        };

        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge 
                          variant={getVariant()} 
                          className="cursor-pointer flex items-center gap-1"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenHistoryModal(app); }}
                        >
                            <Repeat className="h-3 w-3" />
                            {count}º Atendimento
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                         {history && history.length > 0 ? (
                            <div className="text-xs space-y-1">
                                <p className="font-bold">Histórico ({history.length} atendimentos):</p>
                                {history.slice(0, 5).map((item, index) => (
                                    <p key={index}>
                                        - {format(new Date(item.date), 'dd/MM/yy')} com {item.counselor}
                                    </p>
                                ))}
                                {history.length > 5 && <p>... e mais {history.length - 5}.</p>}
                            </div>
                        ) : (
                            <p className="text-xs">Este é o primeiro atendimento registrado.</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };
    
    const handleHistoryPageChange = (direction: 'next' | 'prev') => {
        if (!selectedHistory) return;
        
        const { allAppointments } = selectedHistory;
        const totalPages = Math.ceil(allAppointments.length / 10);

        setSelectedHistory(prev => {
            if (!prev) return null;
            const newPage = direction === 'next' 
                ? Math.min(prev.currentPage + 1, totalPages)
                : Math.max(prev.currentPage - 1, 1);
            return { ...prev, currentPage: newPage };
        });
    };

    const handleHistoryItemClick = (id: string) => {
        setHistoryModalOpen(false);
        router.push(`/counseling/${id}`);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {statusFromQuery && (
                            <Button variant="outline" size="icon" onClick={() => router.push('/counseling/statistics')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Agenda de Atendimento Pastoral</h1>
                            <p className="text-muted-foreground">Visualize e gerencie os agendamentos dos conselheiros.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleShareLink} disabled={!churchId}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Compartilhar Link
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                        <TabsTrigger value="calendar"><CalendarIcon className="mr-2 h-4 w-4" />Calendário</TabsTrigger>
                        <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Lista</TabsTrigger>
                    </TabsList>
                    <TabsContent value="calendar" className="mt-4">
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Filtrar por Conselheiro</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingCounselors ? (
                                            <div className="h-10 w-full bg-muted rounded-md animate-pulse flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                            </div>
                                        ) : (
                                            <Select value={selectedCounselorId} onValueChange={setSelectedCounselorId} disabled={counselors.length === 0}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um conselheiro" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    {counselors.map(counselor => (
                                                        <SelectItem key={counselor.id} value={counselor.id}>{counselor.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-0">
                                    <Suspense fallback={<Skeleton className="h-[290px] w-full" />}>
                                            {isClient ? (
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={setSelectedDate}
                                                    locale={ptBR}
                                                    modifiers={{ 
                                                        booked: appointmentDates,
                                                        myAppointments: myAppointmentDates,
                                                        highlighted: (date) => appointments.some(app => {
                                                            if (!isSameDay(new Date(app.date), date)) return false;
                                                            if (selectedCounselorId === 'all') return true;
                                                            return app.counselorId === selectedCounselorId;
                                                        })
                                                    }}
                                                    modifiersStyles={{
                                                    booked: { 
                                                        textDecoration: 'underline',
                                                        textDecorationStyle: 'dotted',
                                                        textUnderlineOffset: '3px',
                                                    },
                                                    myAppointments: {
                                                        backgroundColor: 'hsl(var(--primary) / 0.2)',
                                                    },
                                                    highlighted: {
                                                        border: "2px solid hsl(var(--primary))",
                                                        borderRadius: 'var(--radius)',
                                                    }
                                                    }}
                                                    className="p-0 rounded-md"
                                                />
                                            ) : (
                                                <Skeleton className="h-[290px] w-full" />
                                            )}
                                    </Suspense>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Agendamentos para {isClient && selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : '...'}</CardTitle>
                                        <CardDescription>Lista de horários agendados para o dia e filtro selecionado.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="min-h-[350px]">
                                        {loadingAppointments ? (
                                            <div className="flex justify-center items-center h-full">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {appointmentsOnSelectedDate.length > 0 ? (
                                                    appointmentsOnSelectedDate.map(app => (
                                                        <Link key={app.id} href={`/counseling/${app.id}`} className="block">
                                                            <div className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/50 transition-colors">
                                                                <div className="flex items-center gap-4">
                                                                    <Avatar className="h-12 w-12">
                                                                        <AvatarImage src={app.memberAvatar} alt={app.memberName} data-ai-hint="person" />
                                                                        <AvatarFallback>{app.memberName.slice(0,2)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-semibold text-lg">{app.memberName}</p>
                                                                            <HistoryTag app={app} />
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-1">
                                                                            <div className="flex items-center gap-1">
                                                                                <Clock className="h-4 w-4" />
                                                                                <span>{isClient ? format(new Date(app.date), 'HH:mm') : '...'}</span>
                                                                            </div>
                                                                            <span className="hidden sm:inline text-xl leading-none font-thin text-muted-foreground/50">|</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <Tag className="h-4 w-4" />
                                                                                <span>{app.topic}</span>
                                                                            </div>
                                                                            <span className="hidden sm:inline text-xl leading-none font-thin text-muted-foreground/50">|</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <User className="h-4 w-4" />
                                                                                <span>{app.counselorName}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                                    <Badge 
                                                                        variant={getStatusVariant(app.status)}
                                                                        className="h-fit"
                                                                    >
                                                                        {app.status}
                                                                    </Badge>
                                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="text-center text-muted-foreground py-10">
                                                        {selectedDate ? <p>Nenhum agendamento para a seleção atual neste dia.</p> : <p>Selecione uma data para ver os agendamentos.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="list" className="mt-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                                    <div>
                                        <CardTitle>Todos os Agendamentos ({filteredAndSortedList.length})</CardTitle>
                                        <CardDescription>
                                            Lista de todos os atendimentos cadastrados.
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar..."
                                                className="pl-8"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="gap-1">
                                                    <ListFilter className="h-3.5 w-3.5" />
                                                    <span>Status</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {statusOptions.map(status => (
                                                    <DropdownMenuCheckboxItem
                                                        key={status}
                                                        checked={statusFilters.includes(status)}
                                                        onCheckedChange={() => handleStatusFilterChange(status)}
                                                    >
                                                        {status}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingAppointments ? (
                                    <div className="flex justify-center items-center h-[350px]">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Aconselhado</TableHead>
                                                <TableHead>Conselheiro</TableHead>
                                                <TableHead>Data do Atendimento</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedList.length > 0 ? (
                                                paginatedList.map(app => (
                                                    <TableRow key={app.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                            {app.memberName}
                                                            <HistoryTag app={app} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{app.counselorName}</TableCell>
                                                        <TableCell>{format(new Date(app.date), 'PPP HH:mm', { locale: ptBR })}</TableCell>
                                                        <TableCell><Badge variant={getStatusVariant(app.status)}>{app.status}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/counseling/${app.id}`}>
                                                                    Ver Detalhes
                                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">
                                                        Nenhum agendamento encontrado para a seleção atual.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                            <CardFooter>
                                <div className="text-xs text-muted-foreground">
                                    Página <strong>{listCurrentPage}</strong> de <strong>{listTotalPages}</strong>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setListCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={listCurrentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setListCurrentPage(prev => Math.min(prev + 1, listTotalPages))}
                                        disabled={listCurrentPage === listTotalPages}
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            
            {selectedHistory && (
                <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Histórico de Atendimentos de {selectedHistory.app.memberName}</DialogTitle>
                            <DialogDescription>
                                {selectedHistory.allAppointments.length > 0 && `Primeiro atendimento em ${format(new Date(selectedHistory.allAppointments[0].date), 'dd/MM/yyyy')}. `}
                                Total de {selectedHistory.allAppointments.length} atendimentos registrados.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-2">
                                {selectedHistory.allAppointments.slice((selectedHistory.currentPage - 1) * 10, selectedHistory.currentPage * 10).map((item) => (
                                    <Button
                                        key={item.id}
                                        variant={item.id === selectedHistory.app.id ? "default" : "secondary"}
                                        className="w-full justify-between h-auto py-2"
                                        onClick={() => handleHistoryItemClick(item.id)}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-semibold">{format(new Date(item.date), 'dd/MM/yyyy')}</span>
                                            <span className="text-xs">{item.counselor || 'Não atribuído'}</span>
                                        </div>
                                        {item.id === selectedHistory.app.id && <span className="text-xs">(Atual)</span>}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <DialogFooter className="justify-between sm:justify-between">
                             {selectedHistory.allAppointments.length > 10 ? (
                                 <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHistoryPageChange('prev')}
                                        disabled={selectedHistory.currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Página {selectedHistory.currentPage} de {Math.ceil(selectedHistory.allAppointments.length / 10)}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHistoryPageChange('next')}
                                        disabled={selectedHistory.currentPage === Math.ceil(selectedHistory.allAppointments.length / 10)}
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
            )}
        </>
    );
}

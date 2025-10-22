
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HeartHandshake, CheckCircle, Clock, Loader2, Calendar, Archive, UserCheck, HelpCircle, XCircle } from 'lucide-react';
import { AppointmentsByCounselorChart } from '@/components/counseling/appointments-by-counselor-chart';
import { AppointmentsByTopicChart } from '@/components/counseling/appointments-by-topic-chart';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyAppointmentsByTopicChart } from '@/components/counseling/my-appointments-by-topic-chart';
import { MyAppointmentsDemographicsChart } from '@/components/counseling/my-appointments-demographics-chart';
import { AppointmentsByDemographicsChart } from '@/components/counseling/appointments-by-demographics-chart';


function GeneralStatistics({ selectedMonth, churchId, loading, stats }: { selectedMonth: string, churchId: string | null, loading: boolean, stats: any }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
                <Link href="/counseling/schedules?view=list" className="lg:col-span-1">
                    <Card className="hover:bg-muted/50 transition-colors h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de aconselhamento</CardTitle>
                            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalAppointments}</div>}
                            <p className="text-xs text-muted-foreground">Soma de todos os atendimentos.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/counseling/waiting-list" className="lg:col-span-1">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Na Fila</CardTitle>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.inWaitingList}</div>}
                            <p className="text-xs text-muted-foreground">Aguardando atribuição.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/counseling/schedules?status=Pendente" className="lg:col-span-1">
                     <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.pendingApproval}</div>}
                            <p className="text-xs text-muted-foreground">Pedidos pendentes de aceite.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/counseling/schedules?status=Marcado" className="lg:col-span-1">
                     <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Marcado / Em Aconselhamento</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.scheduled}</div>}
                            <p className="text-xs text-muted-foreground">Confirmados e em andamento.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/counseling/schedules?status=Concluído" className="lg:col-span-1">
                     <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Concluído</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.completed}</div>}
                            <p className="text-xs text-muted-foreground">Jornadas finalizadas no período.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/counseling/schedules?status=Cancelado" className="lg:col-span-1">
                     <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cancelado</CardTitle>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.canceled}</div>}
                            <p className="text-xs text-muted-foreground">Registros cancelados no período.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AppointmentsByTopicChart selectedMonth={selectedMonth} churchId={churchId} />
                <AppointmentsByCounselorChart selectedMonth={selectedMonth} churchId={churchId} />
                <AppointmentsByDemographicsChart selectedMonth={selectedMonth} churchId={churchId} />
            </div>
        </div>
    );
}

function MyStatistics({ selectedMonth, churchId }: { selectedMonth: string, churchId: string | null }) {
    const { user, loading: userLoading } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAppointments: 0,
        completedAppointments: 0,
        inProgressAppointments: 0,
    });
    const supabase = createClient();
    
    useEffect(() => {
        const fetchStats = async () => {
            if (userLoading || !user) {
                if (!userLoading) setLoading(false);
                return;
            }
            setLoading(true);

            let query = supabase
                .from('pending_registrations')
                .select('status, form_data->>date', { count: 'exact' })
                .eq('form_data->>counselor_id', user.id)
                .not('status', 'in', '("Arquivado")');

            if (selectedMonth !== 'all') {
                const startDate = `${selectedMonth}-01T00:00:00.000Z`;
                const endDate = `${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}T23:59:59.999Z`;
                query = query.gte('form_data->>date', startDate).lte('form_data->>date', endDate);
            }

            const { data, error, count } = await query;

            if (error) {
                toast({ title: 'Erro ao buscar suas estatísticas', description: error.message, variant: 'destructive' });
                setLoading(false);
                return;
            }

            const completed = (data || []).filter(d => d.status === 'Concluído').length;
            const inProgress = (data || []).filter(d => ['Em Aconselhamento', 'Marcado', 'Pendente', 'Na Fila'].includes(d.status)).length;
            
            setStats({
                totalAppointments: count || 0,
                completedAppointments: completed,
                inProgressAppointments: inProgress,
            });

            setLoading(false);
        };

        fetchStats();
    }, [userLoading, user, toast, selectedMonth, supabase]);

    return (
        <div className="space-y-6">
             <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalAppointments}</div>}
                        <p className="text-xs text-muted-foreground">No período selecionado.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atendimentos Concluídos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.completedAppointments}</div>}
                        <p className="text-xs text-muted-foreground">Jornadas finalizadas no período.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.inProgressAppointments}</div>}
                        <p className="text-xs text-muted-foreground">Aconselhamentos ativos no período.</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
                <MyAppointmentsByTopicChart counselorId={user?.id || null} selectedMonth={selectedMonth} />
                <MyAppointmentsDemographicsChart counselorId={user?.id || null} selectedMonth={selectedMonth} />
            </div>
        </div>
    );
}


export default function CounselingStatisticsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAppointments: 0,
        inWaitingList: 0,
        pendingApproval: 0,
        scheduled: 0,
        completed: 0,
        canceled: 0,
    });
    const { churchId, loading: userLoading } = useUser();
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const supabase = createClient();

    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => {
            const date = subMonths(new Date(), i);
            return {
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM/yyyy', { locale: ptBR }),
            };
        });
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            if (!churchId) {
                if (!userLoading) setLoading(false);
                return;
            }
            setLoading(true);

            let query = supabase
                .from('pending_registrations')
                .select('status, form_data->>date', { count: 'exact' })
                .eq('church_id', churchId)
                .eq('role', 'Conselheiro');

            if (selectedMonth !== 'all') {
                const startDate = `${selectedMonth}-01T00:00:00.000Z`;
                const endDate = `${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}T23:59:59.999Z`;
                query = query.gte('form_data->>date', startDate).lte('form_data->>date', endDate);
            }

            const { data, error, count } = await query;

            if (error) {
                toast({ title: 'Erro ao buscar estatísticas', description: error.message, variant: 'destructive' });
                setLoading(false);
                return;
            }
            
            const statusCounts = (data || []).reduce((acc, item) => {
                const status = item.status || 'Pendente';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            setStats({
                totalAppointments: count || 0,
                inWaitingList: statusCounts['Na Fila'] || 0,
                pendingApproval: statusCounts['Pendente'] || 0,
                scheduled: (statusCounts['Marcado'] || 0) + (statusCounts['Em Aconselhamento'] || 0),
                completed: statusCounts['Concluído'] || 0,
                canceled: statusCounts['Cancelado'] || 0,
            });

            setLoading(false);
        };

        if (!userLoading) {
            fetchStats();
        }
    }, [userLoading, churchId, selectedMonth, toast, supabase]);
    
    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Estatísticas de Aconselhamento</h1>
                    <p className="text-muted-foreground">Analise os dados e o impacto do ministério de aconselhamento.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por mês" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os meses</SelectItem>
                            {monthOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="personal">Meus Atendimentos</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-6">
                    <GeneralStatistics selectedMonth={selectedMonth} churchId={churchId} loading={loading} stats={stats} />
                </TabsContent>
                <TabsContent value="personal" className="mt-6">
                   <MyStatistics selectedMonth={selectedMonth} churchId={churchId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

    

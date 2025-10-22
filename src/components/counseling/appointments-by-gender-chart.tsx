

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { HeartHandshake, CheckCircle, Clock, Loader2, Calendar } from 'lucide-react';
import { AppointmentsByCounselorChart } from '@/components/counseling/appointments-by-counselor-chart';
import { AppointmentsByTopicChart } from '@/components/counseling/appointments-by-topic-chart';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user';

export default function CounselingStatisticsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAppointments: 0,
        completedAppointments: 0,
        pendingAppointments: 0,
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
                .eq('role', 'Conselheiro')
                .not('status', 'in', '("Arquivado", "Cancelado")');

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

            const completed = (data || []).filter(d => d.status === 'Concluído').length;
            const pending = (data || []).filter(d => ['Em Aconselhamento', 'Marcado', 'Pendente', 'Na Fila'].includes(d.status)).length;

            setStats({
                totalAppointments: count || 0,
                completedAppointments: completed,
                pendingAppointments: pending,
            });

            setLoading(false);
        };

        if (!userLoading) {
            fetchStats();
        }
    }, [userLoading, churchId, selectedMonth, toast, supabase]);
    
    if (userLoading || loading) {
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

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
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
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.pendingAppointments}</div>}
                        <p className="text-xs text-muted-foreground">Aconselhamentos ativos no período.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <AppointmentsByTopicChart selectedMonth={selectedMonth} churchId={churchId} />
                <AppointmentsByCounselorChart selectedMonth={selectedMonth} churchId={churchId} />
            </div>
        </div>
    );
}

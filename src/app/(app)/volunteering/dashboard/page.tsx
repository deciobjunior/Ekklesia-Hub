
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Users, Briefcase, Loader2 } from 'lucide-react';
import { VolunteersTable } from '@/components/volunteering/volunteers-table';
import { VolunteersByPeriodChart } from '@/components/volunteering/volunteers-by-period-chart';
import type { Member } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MinistryWithDetails } from '@/app/(app)/ministries/page';
import { useUser } from '@/hooks/use-user';

export type VolunteerInfo = Member & {
  ministries: string[];
};

export default function VolunteerDashboardPage() {
    const { toast } = useToast();
    const { churchId, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalVolunteers: 0, totalMinistries: 0 });
    const [volunteers, setVolunteers] = useState<VolunteerInfo[]>([]);
    const [ministries, setMinistries] = useState<MinistryWithDetails[]>([]);
    const [selectedMinistryId, setSelectedMinistryId] = useState<string>('all');
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            if (!churchId) {
                if (!userLoading) {
                    setLoading(false);
                    toast({ title: 'Erro', description: 'Igreja não encontrada.', variant: 'destructive' });
                }
                return;
            }

            setLoading(true);

            const [volunteersRes, ministriesRes] = await Promise.all([
                supabase.from('volunteers').select('id, name, email').eq('church_id', churchId),
                supabase.from('pending_registrations').select('id, name, form_data').eq('church_id', churchId).eq('role', 'Ministério')
            ]);
            
            const { data: volunteersData, error: volunteersError } = volunteersRes;
            const { data: ministriesData, error: ministriesError } = ministriesRes;

            if (volunteersError || ministriesError) {
                toast({ title: 'Erro ao buscar dados', description: volunteersError?.message || ministriesError?.message, variant: 'destructive' });
                setLoading(false);
                return;
            }
            
            const ministryMap: { [key: string]: string[] } = {}; // volunteerId -> [ministry Names]
            const detailedMinistries: MinistryWithDetails[] = (ministriesData || []).map(ministry => {
                const volunteerIds = ministry.form_data?.volunteer_ids || [];
                volunteerIds.forEach((id: string) => {
                    if (!ministryMap[id]) ministryMap[id] = [];
                    ministryMap[id].push(ministry.name);
                });
                return {
                    id: ministry.id,
                    name: ministry.name,
                    description: ministry.form_data.description || '',
                    pastor: '',
                    pastorAvatar: '',
                    volunteers: [],
                    volunteers_details: []
                };
            });
            setMinistries(detailedMinistries);

            const formattedVolunteers: VolunteerInfo[] = (volunteersData || []).map(v => ({
                id: v.id,
                name: v.name,
                email: v.email,
                avatar: `https://placehold.co/40x40.png?text=${v.name.charAt(0)}`,
                ministries: ministryMap[v.id] || [],
                role: 'Voluntário',
                status: 'Ativo',
                lastSeen: '',
                gender: 'Outro',
                birthdate: '',
                maritalStatus: 'Solteiro(a)'
            }));

            setStats({
                totalVolunteers: volunteersData?.length || 0,
                totalMinistries: ministriesData?.length || 0,
            });
            setVolunteers(formattedVolunteers);
            setLoading(false);
        };
        fetchData();
    }, [churchId, userLoading, toast, supabase]);

    const filteredVolunteers = selectedMinistryId === 'all' 
        ? volunteers
        : volunteers.filter(v => {
            const ministry = ministries.find(m => m.id === selectedMinistryId);
            return ministry && v.ministries.includes(ministry.name);
        });

    if (loading || userLoading) {
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
                    <h1 className="text-2xl font-bold tracking-tight">Painel de Voluntários</h1>
                    <p className="text-muted-foreground">Analise o engajamento e a distribuição dos voluntários nos ministérios.</p>
                </div>
                 <div className="w-full max-w-sm">
                    <Select onValueChange={setSelectedMinistryId} defaultValue="all">
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por ministério" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Ministérios</SelectItem>
                            {ministries.map(ministry => (
                                <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Voluntários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalVolunteers}</div>
                        <p className="text-xs text-muted-foreground">Pessoas servindo ativamente.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Ministérios</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMinistries}</div>
                        <p className="text-xs text-muted-foreground">Que possuem voluntários.</p>
                    </CardContent>
                </Card>
            </div>
            
             <div className="grid gap-6 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Voluntários por Período</CardTitle>
                        <CardDescription>Distribuição de voluntários nas escalas salvas do ministério selecionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VolunteersByPeriodChart ministryId={selectedMinistryId} churchId={churchId} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Análise de Voluntários</CardTitle>
                        <CardDescription>Filtre e analise os detalhes de cada voluntário.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VolunteersTable volunteers={filteredVolunteers} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

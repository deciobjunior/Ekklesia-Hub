
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserPlus, Loader2, AlertCircle, Handshake, HeartHandshake, Briefcase, UserCheck, Users2 } from "lucide-react";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { DemographicsChart } from "@/components/dashboard/demographics-chart";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GrowthChart } from '@/components/dashboard/growth-chart';
import { RecentActivities } from '@/components/dashboard/recent-activities';
import { useUser } from '@/hooks/use-user';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, authLoading, churchId, userRole } = useUser();
  const [loading, setLoading] = useState(true);

  // State for all dashboard metrics
  const [metrics, setMetrics] = useState({
    totalPeople: 0,
    totalMembers: 0,
    visitorsCount: 0,
    newBeginningsCount: 0,
    totalSmallGroups: 0,
    totalLeaders: 0,
    totalPastors: 0,
    totalVolunteers: 0,
  });

  const fetchDashboardData = async (currentChurchId: string) => {
      setLoading(true);
      
      const thirtyDaysAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();

      const [
        totalMembersCount,
        recentVisitorsCount,
        newBeginningsResult,
        smallGroupsCount,
        leadersAndPastorsRes,
        volunteersCount,
        counselorsCount,
        visitorsTotalCount,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', currentChurchId).eq('role', 'Membro'),
        supabase.from('visitors').select('*', { count: 'exact', head: true }).eq('church_id', currentChurchId).gte('created_at', thirtyDaysAgo),
        supabase.from('new_beginnings').select('*', { count: 'exact', head: true }).eq('church_id', currentChurchId).gte('created_at', thirtyDaysAgo),
        supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('church_id', currentChurchId),
        supabase.from('pastors_and_leaders').select('id, role', { count: 'exact' }).eq('church_id', currentChurchId),
        supabase.from('volunteers').select('id', { count: 'exact', head: true }).eq('church_id', currentChurchId),
        supabase.from('counselors').select('id', { count: 'exact', head: true }).eq('church_id', currentChurchId),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('church_id', currentChurchId),
      ]);
      
      const allLeadersAndPastors = leadersAndPastorsRes.data || [];
      const pastorsList = allLeadersAndPastors.filter(p => p.role === 'Pastor');
      const ministryAndSgLeaders = allLeadersAndPastors.filter(p => p.role === 'Líder' || p.role === 'Líder de Pequeno Grupo');
      
      const totalPeople = (totalMembersCount.count || 0) + 
                          (leadersAndPastorsRes.count || 0) +
                          (volunteersCount.count || 0) +
                          (counselorsCount.count || 0) +
                          (visitorsTotalCount.count || 0);

      setMetrics({
        totalPeople: totalPeople,
        totalMembers: totalMembersCount.count || 0,
        visitorsCount: recentVisitorsCount.count || 0,
        newBeginningsCount: newBeginningsResult.count || 0,
        totalSmallGroups: smallGroupsCount.count || 0,
        totalLeaders: ministryAndSgLeaders.length,
        totalPastors: pastorsList.length,
        totalVolunteers: volunteersCount.count || 0,
      });

      setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (userRole === 'Conselheiro') {
      router.push('/counseling/my-schedule');
      return;
    }
    if (userRole === 'Consolidador') {
      router.push('/acolhimento');
      return;
    }

    if (userRole === 'Voluntário') {
      // Volunteers stay on the dashboard but see a limited view.
      // The navigation will be restricted by main-nav.tsx.
    }

    if (churchId) {
      fetchDashboardData(churchId);

      const subscriptions = [
        'members', 'pastors_and_leaders', 'visitors', 'small_groups', 'new_beginnings', 'pending_registrations', 'volunteers', 'counselors'
      ].map(tableName => 
        supabase.channel(`public:${tableName}:dashboard`)
          .on('postgres_changes', { event: '*', schema: 'public', table: tableName, filter: `church_id=eq.${churchId}` }, (payload) => {
              fetchDashboardData(churchId);
          })
          .subscribe()
      );

      return () => {
        subscriptions.forEach(sub => {
          try {
              supabase.removeChannel(sub);
          } catch(error) {
              console.error('Error removing channel', error);
          }
        });
      };
    } else {
        setLoading(false);
    }
  }, [authLoading, user, userRole, churchId]);


  if (!supabase) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Configuração</AlertTitle>
            <AlertDescription>
                As credenciais do Supabase não foram configuradas. Por favor, edite o arquivo `.env` para continuar.
            </AlertDescription>
        </Alert>
    )
  }

  if(authLoading || loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!userRole) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Você não tem permissão para ver este painel.</p>
        </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Crescimento da Igreja</CardTitle>
          <CardDescription>Métricas de crescimento de pessoas no último mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Total de Pessoas</h3>
                      <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalPeople}</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Total de Membros</h3>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalMembers}</div>
              </div>
               <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Visitantes</h3>
                      <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">+{metrics.visitorsCount}</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Novos Convertidos</h3>
                      <Handshake className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">+{metrics.newBeginningsCount}</div>
              </div>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Estrutura e Liderança</CardTitle>
          <CardDescription>Métricas da organização da estrutura da igreja.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Pequenos Grupos</h3>
                      <Users2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalSmallGroups}</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Líderes</h3>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalLeaders}</div>
              </div>
               <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Pastores</h3>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalPastors}</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-card-foreground">
                   <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-sm font-medium">Voluntários</h3>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalVolunteers}</div>
              </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6">
            <AttendanceChart />
            <GrowthChart />
          </div>
          <div className="lg:col-span-1 grid gap-6">
            <RecentActivities />
            <DemographicsChart />
          </div>
      </div>
    </div>
  );
}

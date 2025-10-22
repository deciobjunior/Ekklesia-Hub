

"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  members: {
    label: "Membros",
    color: "hsl(var(--chart-1))",
  },
  visitors: {
    label: "Visitantes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function GrowthChart() {
  const [chartData, setChartData] = useState<{ month: string, members: number, visitors: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchGrowthData = async () => {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: church } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
        if (!church) { setLoading(false); return; }
        const churchId = church.id;

        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

        const [membersRes, visitorsRes] = await Promise.all([
            supabase.from('members').select('created_at').eq('church_id', churchId).gte('created_at', format(sixMonthsAgo, 'yyyy-MM-dd')),
            supabase.from('visitors').select('created_at').eq('church_id', churchId).gte('created_at', format(sixMonthsAgo, 'yyyy-MM-dd'))
        ]);
        
        const { data: membersData, error: membersError } = membersRes;
        const { data: visitorsData, error: visitorsError } = visitorsRes;

        if (membersError || visitorsError) {
            console.error("Error fetching growth data:", membersError || visitorsError);
            setLoading(false);
            return;
        }

        const monthlyCounts = Array.from({ length: 6 }).map((_, i) => {
            const d = subMonths(new Date(), 5 - i);
            return {
                month: format(d, 'MMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
                members: 0,
                visitors: 0,
            };
        });

        membersData?.forEach(record => {
            const monthStr = format(new Date(record.created_at), 'MMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
            const monthData = monthlyCounts.find(m => m.month === monthStr);
            if (monthData) monthData.members++;
        });
        
        visitorsData?.forEach(record => {
            const monthStr = format(new Date(record.created_at), 'MMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
            const monthData = monthlyCounts.find(m => m.month === monthStr);
            if (monthData) monthData.visitors++;
        });

        setChartData(monthlyCounts);
        setLoading(false);
    };

    fetchGrowthData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crescimento de Novos Cadastros</CardTitle>
        <CardDescription>Novos membros e visitantes cadastrados nos últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">Carregando dados...</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <defs>
                  <linearGradient id="fillMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-members)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-members)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.1} />
                  </linearGradient>
              </defs>
              <Area
                dataKey="visitors"
                type="natural"
                fill="url(#fillVisitors)"
                stroke="var(--color-visitors)"
                stackId="a"
              />
              <Area
                dataKey="members"
                type="natural"
                fill="url(#fillMembers)"
                stroke="var(--color-members)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

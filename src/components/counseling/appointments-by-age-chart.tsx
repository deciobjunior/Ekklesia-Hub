

'use client';

import * as React from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { endOfMonth } from 'date-fns';

const chartConfig = {
  appointments: {
    label: "Atendimentos",
  },
  "18-29": { label: "18-29 anos", color: "hsl(var(--chart-1))" },
  "30-45": { label: "30-45 anos", color: "hsl(var(--chart-2))" },
  "46-59": { label: "46-59 anos", color: "hsl(var(--chart-3))" },
  "60+": { label: "60+ anos", color: "hsl(var(--chart-4))" },
  "Não informado": { label: "Idade não informada", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

interface AppointmentsByAgeChartProps {
  selectedMonth: string;
  churchId: string | null;
}

export function AppointmentsByAgeChart({ selectedMonth, churchId }: AppointmentsByAgeChartProps) {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const fetchDemographics = async () => {
      if (!churchId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      let query = supabase
        .from('pending_registrations')
        .select('form_data, created_at')
        .eq('church_id', churchId)
        .eq('role', 'Membro') // Correctly filter for member registrations
        .not('status', 'in', '("Arquivado", "Cancelado")');

      if (selectedMonth !== 'all') {
        const startDate = `${selectedMonth}-01T00:00:00.000Z`;
        const monthDate = new Date(startDate);
        const endDate = endOfMonth(monthDate).toISOString();
        query = query.gte('created_at', startDate).lte('created_at', endDate);
      }
      
      const { data: appointments, error } = await query;
      
      if (error) {
          console.error("Error fetching age demographics:", error);
          setLoading(false);
          return;
      }
      
      if (!appointments) {
        setData([]);
        setLoading(false);
        return;
      }
      
      const ageDemographics = { "18-29": 0, "30-45": 0, "46-59": 0, "60+": 0, "Não informado": 0 };
      
      appointments.forEach(app => {
        const ageStr = app.form_data?.member_age || app.form_data?.age;
        const age = ageStr ? parseInt(ageStr, 10) : NaN;
        
        if (isNaN(age)) ageDemographics["Não informado"]++;
        else if (age >= 18 && age <= 29) ageDemographics["18-29"]++;
        else if (age >= 30 && age <= 45) ageDemographics["30-45"]++;
        else if (age >= 46 && age <= 59) ageDemographics["46-59"]++;
        else if (age >= 60) ageDemographics["60+"]++;
        else ageDemographics["Não informado"]++;
      });

      const formattedData = Object.entries(ageDemographics).map(([key, value]) => ({
        group: key,
        appointments: value,
        fill: chartConfig[key as keyof typeof chartConfig]?.color || "hsl(var(--muted))",
      })).filter(item => item.appointments > 0);

      setData(formattedData);
      setLoading(false);
    };

    fetchDemographics();
  }, [selectedMonth, churchId]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demografia por Faixa Etária</CardTitle>
        <CardDescription>Distribuição dos atendimentos por idade.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : data.length > 0 ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full max-h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="appointments" nameKey="group" innerRadius={60} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const RADIAN = Math.PI / 180;
                const radius = (innerRadius || 0) + ((outerRadius || 0) - (innerRadius || 0)) * 0.5;
                const x = (cx || 0) + radius * Math.cos(-midAngle * RADIAN);
                const y = (cy || 0) + radius * Math.sin(-midAngle * RADIAN);
                return <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > (cx || 0) ? "start" : "end"} dominantBaseline="central" className="text-xs font-medium">{`${(percent * 100).toFixed(0)}%`}</text>;
              }} />
              <ChartLegend content={<ChartLegendContent nameKey="group" />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-center p-4 text-sm">
            Nenhum dado de idade encontrado para exibir o gráfico.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

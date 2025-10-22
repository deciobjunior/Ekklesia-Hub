

'use client';

import * as React from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const chartConfig = {
  appointments: {
    label: "Atendimentos",
  },
  "18-29": { label: "18-29 anos", color: "hsl(var(--chart-1))" },
  "30-45": { label: "30-45 anos", color: "hsl(var(--chart-2))" },
  "46-59": { label: "46-59 anos", color: "hsl(var(--chart-3))" },
  "60+": { label: "60+ anos", color: "hsl(var(--chart-4))" },
  "Não informado": { label: "Idade não informada", color: "hsl(var(--chart-5))" },
  "Masculino": { label: "Masculino", color: "hsl(var(--chart-1))" },
  "Feminino": { label: "Feminino", color: "hsl(var(--chart-2))" },
  "Outro": { label: "Gênero não informado", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

interface AppointmentsByDemographicsChartProps {
  selectedMonth: string;
  churchId: string | null;
}

export function AppointmentsByDemographicsChart({ selectedMonth, churchId }: AppointmentsByDemographicsChartProps) {
  const [ageData, setAgeData] = React.useState<any[]>([]);
  const [genderData, setGenderData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
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
        .select('form_data, status')
        .eq('church_id', churchId)
        .eq('role', 'Conselheiro')
        .not('status', 'in', '("Arquivado", "Cancelado")');
        
      if (selectedMonth !== 'all') {
        const startDate = `${selectedMonth}-01T00:00:00.000Z`;
        const endDate = `${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}T23:59:59.999Z`;
        query = query.gte('form_data->>date' as any, startDate).lte('form_data->>date' as any, endDate);
      }
      
      const { data: appointments, error } = await query;
      
      if (error) {
        toast({ title: "Erro ao buscar demografia", description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (!appointments || appointments.length === 0) {
        setAgeData([]);
        setGenderData([]);
        setLoading(false);
        return;
      }
      
      const ageDemographics = { "18-29": 0, "30-45": 0, "46-59": 0, "60+": 0, "Não informado": 0 };
      const genderDemographics = { "Masculino": 0, "Feminino": 0, "Outro": 0 };

      appointments.forEach(app => {
        const ageStr = app.form_data?.member_age;
        const age = ageStr ? parseInt(ageStr, 10) : NaN;
        const gender = app.form_data?.member_gender || "Outro";

        if (isNaN(age)) ageDemographics["Não informado"]++;
        else if (age >= 18 && age <= 29) ageDemographics["18-29"]++;
        else if (age >= 30 && age <= 45) ageDemographics["30-45"]++;
        else if (age >= 46 && age <= 59) ageDemographics["46-59"]++;
        else if (age >= 60) ageDemographics["60+"]++;

        if (gender === 'Masculino') genderDemographics.Masculino++;
        else if (gender === 'Feminino') genderDemographics.Feminino++;
        else genderDemographics.Outro++;
      });
      
      setAgeData(Object.entries(ageDemographics).map(([key, value]) => ({
        group: key,
        appointments: value,
        fill: (chartConfig as any)[key]?.color || "hsl(var(--muted))",
      })).filter(item => item.appointments > 0));

      setGenderData(Object.entries(genderDemographics).map(([key, value]) => ({
        group: key,
        appointments: value,
        fill: (chartConfig as any)[key]?.color || "hsl(var(--muted))",
      })).filter(item => item.appointments > 0));

      setLoading(false);
    };

    fetchDemographics();
  }, [churchId, selectedMonth, toast]);

  const renderPieChart = (data: any[], title: string, description: string) => (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        {loading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : data.length > 0 ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full max-h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="appointments" nameKey="group" innerRadius={60} strokeWidth={5} />
              <ChartLegend content={<ChartLegendContent nameKey="group" />} />
            </PieChart>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-center p-4">
                Nenhum atendimento para exibir dados.
            </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="grid gap-6 md:grid-cols-2">
        {renderPieChart(ageData, "Demografia por Idade", "Faixa etária das pessoas que buscaram atendimento.")}
        {renderPieChart(genderData, "Demografia por Gênero", "Distribuição de gênero das pessoas que buscaram atendimento.")}
    </div>
  );
}

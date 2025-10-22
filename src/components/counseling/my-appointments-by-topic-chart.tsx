

'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { counselingTopics } from "@/lib/data";

const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface MyAppointmentsByTopicChartProps {
  counselorId: string | null;
  selectedMonth: string;
}

export function MyAppointmentsByTopicChart({ counselorId, selectedMonth }: MyAppointmentsByTopicChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchChartData = async () => {
      if (!counselorId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      let query = supabase
        .from('pending_registrations')
        .select('status, form_data->>topic, form_data->>date')
        .eq('form_data->>counselor_id', counselorId)
        .not('status', 'in', '("Arquivado", "Cancelado")');
      
      if (selectedMonth !== 'all') {
        const startDate = `${selectedMonth}-01T00:00:00.000Z`;
        const endDate = `${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}T23:59:59.999Z`;
        query = query.gte('form_data->>date', startDate).lte('form_data->>date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        toast({ title: "Erro ao buscar dados do gráfico", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!data) {
        setChartData([]);
        setLoading(false);
        return;
      }
      
      const counts = data.reduce((acc, item) => {
        const topicName = item.topic || 'Não informado';
        acc[topicName] = (acc[topicName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const getShortLabel = (fullLabel: string) => {
          const topic = counselingTopics.find(t => t.label === fullLabel);
          if (!topic) return fullLabel;
          // Extract the main word before parenthesis
          return topic.label.split(' ')[0].replace(/s$/, '');
      }

      const formattedData = Object.entries(counts).map(([name, count]) => ({
        topic: getShortLabel(name),
        appointments: count,
        fill: "hsl(var(--primary))",
      })).sort((a, b) => b.appointments - a.appointments);


      setChartData(formattedData);
      setLoading(false);
    };

    fetchChartData();
  }, [counselorId, selectedMonth, toast]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Suas Necessidades Atendidas</CardTitle>
            <CardDescription>Distribuição dos seus atendimentos por tópico solicitado.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex items-center justify-center h-[250px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : chartData.length > 0 ? (
                <div className="h-[250px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 10, left: -10 }}
                    >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="topic"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-xs"
                    />
                    <YAxis dataKey="appointments" type="number" />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="appointments" radius={5}>
                         <LabelList dataKey="appointments" position="top" offset={8} className="fill-foreground text-sm" />
                    </Bar>
                    </BarChart>
                </ChartContainer>
                </div>
            ) : (
                <div className="flex items-center justify-center h-[250px] text-center text-sm text-muted-foreground">
                    Nenhum tópico de atendimento encontrado para exibir o gráfico.
                </div>
            )}
      </CardContent>
    </Card>
  );
}

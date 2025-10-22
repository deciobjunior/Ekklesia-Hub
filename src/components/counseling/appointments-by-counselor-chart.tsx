

'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Counselor } from "@/lib/data";

const chartConfig = {
  appointments: {
    label: "Atendimentos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface AppointmentsByCounselorChartProps {
  selectedMonth: string;
  churchId: string | null;
}

export function AppointmentsByCounselorChart({ selectedMonth, churchId }: AppointmentsByCounselorChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchChartData = async () => {
      if (!churchId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Fetch counselors (this doesn't need to be filtered by month)
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('counselors')
        .select('id, name')
        .eq('church_id', churchId);
      
      if (counselorsError) {
        toast({ title: "Erro ao buscar conselheiros", description: counselorsError.message, variant: "destructive" });
      } else {
        setCounselors(counselorsData as Counselor[]);
      }

      // Fetch appointments
      let query = supabase
        .from('pending_registrations')
        .select('form_data')
        .eq('church_id', churchId)
        .eq('role', 'Conselheiro')
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
      
      let filteredData = data;
      if (selectedCounselor !== 'all') {
        filteredData = data.filter(item => item.form_data.counselor_id === selectedCounselor);
      }
      
      const counts = filteredData.reduce((acc, item) => {
        const counselorName = item.form_data.counselor_name || 'Não atribuído';
        acc[counselorName] = (acc[counselorName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const formattedData = Object.entries(counts).map(([name, count]) => ({
        counselor: name,
        appointments: count,
        fill: "hsl(var(--primary))",
      })).sort((a, b) => b.appointments - a.appointments);


      setChartData(formattedData);
      setLoading(false);
    };

    fetchChartData();
  }, [selectedMonth, selectedCounselor, churchId, toast]);

  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Atendimentos por Conselheiro</CardTitle>
                    <CardDescription>Distribuição de agendamentos por conselheiro no período.</CardDescription>
                </div>
                 <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por conselheiro" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {counselors.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
                        dataKey="counselor"
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
                    Nenhum dado de atendimento encontrado para a seleção atual.
                </div>
            )}
      </CardContent>
    </Card>
  );
}

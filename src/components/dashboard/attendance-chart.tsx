

"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  attendance: {
    label: "Participantes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function AttendanceChart() {
  const [chartData, setChartData] = useState<{ month: string, attendance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      const twelveMonthsAgo = subMonths(new Date(), 12);
      const { data, error } = await supabase
        .from('attendance_records')
        .select('service_date, adults_count, kids_count, visitors_count')
        .gte('service_date', format(twelveMonthsAgo, 'yyyy-MM-dd'));

      if (error) {
        console.error("Error fetching attendance data:", error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }
      
      const monthlyAttendance = data.reduce((acc, record) => {
        const month = format(new Date(record.service_date), 'MMM', { locale: ptBR });
        const total = (record.adults_count || 0) + (record.kids_count || 0) + (record.visitors_count || 0);
        
        if (!acc[month]) {
          acc[month] = { total: 0, count: 0 };
        }
        acc[month].total += total;
        acc[month].count += 1;

        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      const lastTwelveMonths = Array.from({ length: 12 }).map((_, i) => {
          const d = subMonths(new Date(), i);
          return format(d, 'MMM', { locale: ptBR });
      }).reverse();

      const finalData = lastTwelveMonths.map(monthName => {
          const foundData = monthlyAttendance[monthName] || { total: 0, count: 0 };
          return { 
              month: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
              attendance: foundData.count > 0 ? Math.round(foundData.total / foundData.count) : 0,
          };
      });


      setChartData(finalData);
      setLoading(false);
    };

    fetchAttendanceData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência Mensal</CardTitle>
        <CardDescription>Frequência média nos cultos dos últimos 12 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Carregando dados do gráfico...
            </div>
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="attendance" fill="var(--color-attendance)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
             <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado de frequência encontrado para exibir o gráfico.
            </div>
        )}
      </CardContent>
    </Card>
  )
}

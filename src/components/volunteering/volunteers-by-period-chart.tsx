
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const chartConfig = {
  volunteers: {
    label: "Voluntários",
  },
  manha: {
    label: "Manhã",
    color: "hsl(var(--chart-1))",
  },
  noite: {
    label: "Noite",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface VolunteersByPeriodChartProps {
    ministryId: string;
    churchId: string | null;
}

export function VolunteersByPeriodChart({ ministryId, churchId }: VolunteersByPeriodChartProps) {
  const [chartData, setChartData] = useState<{ period: string; volunteers: number; fill: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      if (!churchId) {
        setLoading(false);
        return;
      }
      
      const currentMonth = format(new Date(), 'yyyy-MM');

      let query = supabase
        .from('volunteer_schedules')
        .select('schedule_data')
        .eq('church_id', churchId)
        .eq('month', currentMonth);

      if (ministryId !== 'all') {
          query = query.eq('ministry_id', ministryId);
      }
      
      const { data, error } = await query;

      if (error) {
        toast({ title: "Erro ao buscar escalas", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      const periodCounts = data.reduce((acc, schedule) => {
        const scheduleData = schedule.schedule_data as { morningVolunteers: string[], eveningVolunteers: string[] }[];
        
        scheduleData.forEach(week => {
          acc.morning += week.morningVolunteers.length;
          acc.evening += week.eveningVolunteers.length;
        });

        return acc;
      }, { morning: 0, evening: 0 });
      
      const formattedData = [
          { period: "Manhã", volunteers: periodCounts.morning, fill: "var(--color-manha)" },
          { period: "Noite", volunteers: periodCounts.evening, fill: "var(--color-noite)" },
      ];

      setChartData(formattedData);
      setLoading(false);
    };

    fetchSchedules();
  }, [ministryId, churchId, toast]);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (chartData.length === 0 || (chartData[0].volunteers === 0 && chartData[1].volunteers === 0)) {
     return (
        <div className="flex items-center justify-center h-[250px] text-center text-sm text-muted-foreground">
            Nenhuma escala salva encontrada para o ministério selecionado.
        </div>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart 
            accessibilityLayer 
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 0,
            }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="period"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar 
            dataKey="volunteers"
            radius={8}
            barSize={80}
          >
             <LabelList dataKey="volunteers" position="top" offset={10} className="fill-foreground text-sm" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

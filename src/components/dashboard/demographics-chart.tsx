

"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client"
import { differenceInYears } from 'date-fns';

const chartConfig = {
  members: {
    label: "Membros",
  },
  children: {
    label: "Crianças (0-12)",
    color: "hsl(var(--chart-1))",
  },
  teens: {
    label: "Adolescentes (13-17)",
    color: "hsl(var(--chart-2))",
  },
  youth: {
    label: "Jovens (18-29)",
    color: "hsl(var(--chart-3))",
  },
  adults: {
    label: "Adultos (30-59)",
    color: "hsl(var(--chart-4))",
  },
  seniors: {
    label: "Idosos (60+)",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

export function DemographicsChart() {
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const fetchDemographics = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          setLoading(false);
          return;
      }
      
      const { data: churches, error: churchError } = await supabase
        .from('churches')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      const church = churches?.[0];
      
      if (churchError || !church) {
        if (churchError) console.error("Could not find church for user:", churchError.message);
        setLoading(false);
        return;
      }

      const { data: members, error } = await supabase
        .from('members')
        .select('birthdate')
        .eq('church_id', church.id);
      
      if (error) {
        console.error("Error fetching members for demographics:", error.message);
        setLoading(false);
        return;
      }

      if (!members || members.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }
      
      const demographics = {
        children: 0,
        teens: 0,
        youth: 0,
        adults: 0,
        seniors: 0,
      };

      members.forEach(member => {
        if (!member.birthdate) return;
        const age = differenceInYears(new Date(), new Date(member.birthdate));
        if (age <= 12) demographics.children++;
        else if (age <= 17) demographics.teens++;
        else if (age <= 29) demographics.youth++;
        else if (age <= 59) demographics.adults++;
        else demographics.seniors++;
      });
      
      const formattedData = [
        { group: "children", members: demographics.children, fill: "var(--color-children)" },
        { group: "teens", members: demographics.teens, fill: "var(--color-teens)" },
        { group: "youth", members: demographics.youth, fill: "var(--color-youth)" },
        { group: "adults", members: demographics.adults, fill: "var(--color-adults)" },
        { group: "seniors", members: demographics.seniors, fill: "var(--color-seniors)" },
      ].filter(item => item.members > 0); // Only show groups with members

      setChartData(formattedData);
      setLoading(false);
    };

    fetchDemographics();
  }, []);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Demografia</CardTitle>
        <CardDescription>Distribuição de membros por faixa etária.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Carregando...
            </div>
        ) : chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-full max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="members"
                nameKey="group"
                innerRadius={60}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  percent,
                }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = (innerRadius || 0) + ((outerRadius || 0) - (innerRadius || 0)) * 0.5;
                  const x = (cx || 0) + radius * Math.cos(-midAngle * RADIAN);
                  const y = (cy || 0) + radius * Math.sin(-midAngle * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="hsl(var(--card-foreground))"
                      textAnchor={x > (cx || 0) ? "start" : "end"}
                      dominantBaseline="central"
                      className="text-xs font-medium"
                    >
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              />
              <ChartLegend content={<ChartLegendContent nameKey="group" />} />
            </PieChart>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-center p-4">
                Nenhum membro com data de nascimento cadastrada para exibir o gráfico.
            </div>
        )}
      </CardContent>
    </Card>
  )
}

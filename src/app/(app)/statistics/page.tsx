'use client';

import { useState, useEffect } from 'react';
import { DemographicsChart } from "@/components/dashboard/demographics-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Users, PlusCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { createClient } from '@/lib/supabase/client';


export default function StatisticsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const supabase = createClient();

    const fetchRecentAttendance = async () => {
      const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .order('service_date', { ascending: false })
          .limit(5);

      if (error) {
          console.error("Error fetching attendance:", error);
      } else {
          setRecentAttendance(data);
      }
    };

    useEffect(() => {
        fetchRecentAttendance();
    }, []);

    const handleRegisterAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const serviceDate = formData.get('service-date') as string;
        const serviceType = formData.get('service-type') as string;
        const adultsCount = parseInt(formData.get('adults-count') as string, 10);
        const kidsCount = parseInt(formData.get('kids-count') as string, 10);
        const visitorsCount = parseInt(formData.get('visitors-count') as string, 10);

        // First, get the current user to find their church_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ title: "Erro", description: "Você precisa estar logado para registrar frequência.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const { data: churches, error: churchError } = await supabase
            .from('churches')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1);

        const church = churches?.[0];

        if (churchError || !church) {
            toast({ title: "Erro", description: churchError ? churchError.message : "Não foi possível encontrar a sua igreja.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const { error: insertError } = await supabase
            .from('attendance_records')
            .insert({
                church_id: church.id,
                service_date: serviceDate,
                service_type: serviceType,
                adults_count: adultsCount,
                kids_count: kidsCount,
                visitors_count: visitorsCount,
            });

        if (insertError) {
            toast({
                title: "Erro ao Salvar",
                description: `Ocorreu um erro: ${insertError.message}`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Frequência Registrada!",
                description: "Os dados de frequência do culto foram salvos com sucesso.",
            });
            (e.target as HTMLFormElement).reset();
            fetchRecentAttendance(); // Refresh the table
        }

        setIsLoading(false);
    };
    
    const handleShareLink = () => {
        const link = `${window.location.origin}/attendance`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: "O link para a página de registro de frequência foi copiado.",
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Registros de Culto</h1>
                    <p className="text-muted-foreground">Registre a frequência e visualize a demografia da sua igreja.</p>
                </div>
                 <Button variant="outline" onClick={handleShareLink}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Compartilhar Link de Registro
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Frequência de Culto</CardTitle>
                        <CardDescription>Preencha os dados do culto ou evento para registrar a presença.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegisterAttendance} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="service-date">Data do Culto</Label>
                                    <Input id="service-date" name="service-date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="service-type">Tipo de Culto</Label>
                                    <Select name="service-type" required>
                                        <SelectTrigger id="service-type">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Culto de Domingo (Manhã)">Culto de Domingo (Manhã)</SelectItem>
                                            <SelectItem value="Culto de Domingo (Noite)">Culto de Domingo (Noite)</SelectItem>
                                            <SelectItem value="Culto de Oração">Culto de Oração</SelectItem>
                                            <SelectItem value="Culto de Jovens">Culto de Jovens</SelectItem>
                                            <SelectItem value="Evento Especial">Evento Especial</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adults-count">Adultos</Label>
                                    <Input id="adults-count" name="adults-count" type="number" placeholder="0" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="kids-count">Crianças</Label>
                                    <Input id="kids-count" name="kids-count" type="number" placeholder="0" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visitors-count">Visitantes</Label>
                                    <Input id="visitors-count" name="visitors-count" type="number" placeholder="0" required />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Registrando...' : 'Registrar Frequência'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="h-full">
                     <DemographicsChart />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Frequência</CardTitle>
                    <CardDescription>Visualização dos últimos registros de frequência.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><CalendarIcon className="h-4 w-4 inline-block mr-1" /> Data</TableHead>
                                <TableHead>Culto/Evento</TableHead>
                                <TableHead className="text-right"><Users className="h-4 w-4 inline-block mr-1" /> Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {recentAttendance.map((item) => (
                             <TableRow key={item.id}>
                                <TableCell>{new Date(item.service_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                                <TableCell>{item.service_type}</TableCell>
                                <TableCell className="text-right font-medium">{(item.adults_count || 0) + (item.kids_count || 0) + (item.visitors_count || 0)}</TableCell>
                            </TableRow>
                           ))}
                           {recentAttendance.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    Nenhum registro de frequência encontrado.
                                </TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

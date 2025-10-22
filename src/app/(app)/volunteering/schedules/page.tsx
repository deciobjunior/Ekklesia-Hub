

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Member, Availability } from "@/lib/data";
import { Sparkles, Users, Calendar, Send, ClipboardList, CheckCircle, ChevronDown, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule, GenerateScheduleOutput } from '@/ai/flows/generate-schedule-flow';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { createClient } from '@/lib/supabase/client';
import { MinistryWithDetails } from '@/app/(app)/ministries/page';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUser } from '@/hooks/use-user';

type Schedule = GenerateScheduleOutput['schedule'];
type ScheduleEntry = Schedule[number];

export default function SchedulesPage() {
  const [ministries, setMinistries] = useState<MinistryWithDetails[]>([]);
  const [loadingMinistries, setLoadingMinistries] = useState(true);
  const [selectedMinistry, setSelectedMinistry] = useState<MinistryWithDetails | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule>([]);
  const { toast } = useToast();
  const [isScheduleApproved, setIsScheduleApproved] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const { churchId, user, loading: userLoading } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchMinistries = async () => {
        if (!churchId) {
            if (!userLoading) {
                setLoadingMinistries(false);
                toast({ title: "Erro", description: "Igreja não encontrada.", variant: "destructive" });
            }
            return;
        }
        setLoadingMinistries(true);

        const { data: ministriesData, error: ministriesError } = await supabase
            .from('pending_registrations').select('*').eq('church_id', churchId).eq('role', 'Ministério');

        if (ministriesError) {
            toast({ title: "Erro ao buscar ministérios", description: ministriesError.message, variant: 'destructive' });
            setLoadingMinistries(false);
            return;
        }

        const [usersRes, volunteersRes] = await Promise.all([
          supabase.from('pastors_and_leaders').select('id, name, role, email').eq('church_id', churchId),
          supabase.from('volunteers').select('id, name, availability, phone, email').eq('church_id', churchId),
        ]);
        
        const {data: allUsers, error: usersError} = usersRes;
        const {data: allVolunteers, error: volunteersError} = volunteersRes;

        if (usersError || volunteersError) {
            toast({ title: "Erro ao buscar usuários", description: usersError?.message || volunteersError?.message, variant: 'destructive' });
        }
        
        const combinedUsers = [...(allUsers || []), ...(allVolunteers || [])];
        
        const detailedMinistries = ministriesData.map(ministry => {
            const formData = ministry.form_data || {};
            const pastor = allUsers?.find(u => u.id === formData.pastor_id);
            const volunteers = formData.volunteer_ids?.map((id: string) => {
                const vol = allVolunteers?.find(v => v.id === id);
                return vol ? { id: vol.id, name: vol.name, availability: vol.availability, phone: vol.phone, email: vol.email } : null;
            }).filter(Boolean) || [];

            return {
                id: ministry.id,
                name: ministry.name,
                description: formData.description,
                pastor: pastor?.name || 'Não definido',
                pastorAvatar: `https://placehold.co/40x40.png?text=${(pastor?.name || 'P').charAt(0)}`,
                volunteers_details: volunteers.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    avatar: `https://placehold.co/40x40.png?text=${v.name.charAt(0)}`,
                    availability: v.availability,
                    phone: v.phone,
                    email: v.email,
                })) as Member[],
            } as MinistryWithDetails;
        });

        setMinistries(detailedMinistries);
        setLoadingMinistries(false);
    };

    fetchMinistries();
  }, [churchId, userLoading, toast, supabase]);

  const handleMinistryChange = (ministryId: string) => {
    const ministry = ministries.find(m => m.id === ministryId);
    setSelectedMinistry(ministry || null);
    setGeneratedSchedule([]);
    setIsScheduleApproved(false);
  };
  
const handleGenerateSchedule = async () => {
    const ministryVolunteers = selectedMinistry?.volunteers_details || [];
    if (ministryVolunteers.length === 0) {
      toast({
        title: "Nenhum voluntário",
        description: "Não há voluntários com disponibilidade cadastrada para este ministério.",
        variant: "destructive",
      });
      return;
    }

    const transformAvailability = (availability: any): Availability[] => {
      if (!availability) return [];
      let parsedAvailability = availability;
      if (typeof availability === 'string') {
        try {
          parsedAvailability = JSON.parse(availability);
        } catch (e) {
          return [];
        }
      }

      if (typeof parsedAvailability === 'object' && parsedAvailability !== null && !Array.isArray(parsedAvailability)) {
        return Object.entries(parsedAvailability).map(([day, times]) => {
          const periods = new Set<'Manhã' | 'Tarde' | 'Noite'>();
          if (Array.isArray(times)) {
            times.forEach(time => {
              const hour = parseInt(String(time).split(':')[0], 10);
              if (hour < 12) periods.add('Manhã');
              else if (hour < 18) periods.add('Tarde');
              else periods.add('Noite');
            });
          }
          return {
            day: day as Availability['day'],
            periods: Array.from(periods),
          };
        }).filter(item => item.periods.length > 0);
      }

      if (Array.isArray(parsedAvailability)) {
        return parsedAvailability;
      }
      
      return [];
    };

    const simplifiedVolunteers = ministryVolunteers.map(v => ({
      id: v.id,
      name: v.name,
      availability: transformAvailability(v.availability),
    }));
    
    setIsLoading(true);
    setGeneratedSchedule([]);
    setIsScheduleApproved(false);

    try {
      const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });
      const result = await generateSchedule({ volunteers: simplifiedVolunteers, month: currentMonth });
      setGeneratedSchedule(result.schedule);
       toast({
        title: "Escala Gerada!",
        description: "A IA gerou uma sugestão de escala para o próximo mês.",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Erro ao Gerar Escala",
        description: "Houve um problema ao se comunicar com a IA.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveSchedule = async () => {
    if (!selectedMinistry || !churchId || generatedSchedule.length === 0) {
        toast({ title: "Erro", description: "Ministério ou escala não selecionados.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    const currentMonth = format(new Date(), 'yyyy-MM');

    const { error } = await supabase
        .from('volunteer_schedules')
        .upsert({
            church_id: churchId,
            ministry_id: selectedMinistry.id,
            month: currentMonth,
            ministry_name: selectedMinistry.name,
            schedule_data: generatedSchedule,
        }, { onConflict: 'church_id, ministry_id, month' });


    setIsSaving(false);
    if (error) {
         toast({ title: "Erro ao aprovar escala", description: error.message, variant: "destructive" });
    } else {
        setIsScheduleApproved(true);
        toast({
            title: "Escala Aprovada e Salva!",
            description: "A escala foi salva e está pronta para ser comunicada. Se já existia uma para este mês, ela foi atualizada.",
            className: "bg-green-100 text-green-800 border-green-300",
        });
    }
  }
  
  const prepareNotificationMessage = () => {
    let message = `Olá! Segue a escala de voluntários do ministério *${selectedMinistry?.name}* para o próximo mês:\n\n`;
    generatedSchedule.forEach(week => {
        message += `*${week.week}:*\n`;
        message += `  - *Manhã (10h):* ${week.morningVolunteers.join(', ') || 'N/A'}\n`;
        message += `  - *Noite (18h):* ${week.eveningVolunteers.join(', ') || 'N/A'}\n\n`;
    });
    message += "Obrigado pelo seu serviço e dedicação! 🙏";
    setNotificationMessage(message);
  };

  const handleNotifyVolunteers = async () => {
    setIsSending(true);
    
    const uniqueVolunteerNames = Array.from(new Set(generatedSchedule.flatMap(s => [...s.morningVolunteers, ...s.eveningVolunteers])));
    const volunteersToNotify = selectedMinistry?.volunteers_details.filter(m => uniqueVolunteerNames.includes(m.name) && m.email) || [];
    
    let successCount = 0;
    for (const volunteer of volunteersToNotify) {
        try {
            if (volunteer.email) {
                const result = await sendEmail({ 
                  to: volunteer.email, 
                  subject: `Escala de Voluntários - ${selectedMinistry?.name}`,
                  body: notificationMessage.replace(/\*/g, '').replace(/\n/g, '<br>') // Basic formatting for HTML email
                });
                if (result.success) {
                    successCount++;
                }
            }
        } catch (error) {
            console.error(`Failed to send email to ${volunteer.name}`, error);
        }
    }
    
    setIsSending(false);
    setIsNotifyDialogOpen(false);

    toast({
      title: "Notificações Enviadas!",
      description: `${successCount} de ${volunteersToNotify.length} voluntários foram notificados por e-mail com sucesso.`,
    });
  };

  const volunteers = selectedMinistry?.volunteers_details || [];

  const formatAvailability = (availability: any): string => {
    if (!availability) return "Não informada";
  
    let parsedAvailability = availability;
  
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (error) {
        console.error("Failed to parse availability JSON", error);
        return 'Formato inválido';
      }
    }
    
    if (typeof parsedAvailability === 'object' && parsedAvailability !== null && !Array.isArray(parsedAvailability)) {
      return Object.entries(parsedAvailability)
        .map(([day, times]) => {
          if (Array.isArray(times) && times.length > 0) {
            return `${day}: ${times.join(', ')}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('; ');
    }
  
    if (Array.isArray(parsedAvailability) && parsedAvailability.length > 0) {
        return parsedAvailability.map(a => `${a.day}: ${a.periods.join(', ')}`).join('; ');
    }
  
    return "Não informada";
  };
  

  const handleScheduleChange = (weekIndex: number, period: 'morningVolunteers' | 'eveningVolunteers', selectedNames: string[]) => {
    const newSchedule = [...generatedSchedule];
    newSchedule[weekIndex] = {
      ...newSchedule[weekIndex],
      [period]: selectedNames,
    };
    setGeneratedSchedule(newSchedule);
  };

  const VolunteerMultiSelect = ({ selectedVolunteers, onSelectionChange }: { selectedVolunteers: string[], onSelectionChange: (names: string[]) => void }) => {
    const [open, setOpen] = useState(false);

    const handleSelect = (name: string) => {
        const newSelection = selectedVolunteers.includes(name)
            ? selectedVolunteers.filter(v => v !== name)
            : [...selectedVolunteers, name];
        onSelectionChange(newSelection);
    };
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between min-h-10 h-auto py-1">
                    <span className="flex flex-wrap gap-1">
                      {selectedVolunteers.length > 0 
                        ? selectedVolunteers.map(v => <Badge key={v} variant="secondary">{v}</Badge>) 
                        : 'Selecionar...'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                 <Command>
                    <CommandInput placeholder="Buscar voluntário..." />
                    <CommandList>
                        <CommandEmpty>Nenhum voluntário encontrado.</CommandEmpty>
                        <CommandGroup>
                            {volunteers.map(v => (
                                <CommandItem key={v.id} onSelect={() => handleSelect(v.name)}>
                                     <Checkbox
                                        className="mr-2"
                                        checked={selectedVolunteers.includes(v.name)}
                                        onCheckedChange={() => handleSelect(v.name)}
                                    />
                                    {v.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Escalas</h1>
            <p className="text-muted-foreground">Crie e visualize as escalas dos ministérios.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Selection and Volunteers */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seleção de Ministério</CardTitle>
                <CardDescription>Escolha um ministério para gerenciar a escala.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMinistries ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <Select onValueChange={handleMinistryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ministério" />
                    </SelectTrigger>
                    <SelectContent>
                      {ministries.map(ministry => (
                        <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Voluntários Disponíveis
                  </CardTitle>
                   <CardDescription>Lista de voluntários no ministério selecionado.</CardDescription>
              </CardHeader>
              <CardContent>
                  {selectedMinistry ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                          {volunteers.length > 0 ? volunteers.map(v => (
                              <div key={v.id} className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={v.avatar} alt={v.name} data-ai-hint="person" />
                                      <AvatarFallback>{v.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <p className="font-semibold">{v.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                         Disponibilidade: {formatAvailability(v.availability)}
                                      </p>
                                  </div>
                              </div>
                          )) : <p className="text-sm text-muted-foreground">Nenhum voluntário encontrado para este ministério.</p>}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground">Selecione um ministério para ver os voluntários.</p>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Schedule Generation and Display */}
          <div className="lg:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Sugestão de Escala
                      </CardTitle>
                      <CardDescription>Gere e visualize a escala para o ministério selecionado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="p-4 border-dashed border-2 rounded-lg min-h-80 bg-muted/50">
                          {isLoading ? (
                              <div className="flex items-center justify-center h-full">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                  <p className="ml-2">Gerando escala com IA...</p>
                              </div>
                          ) : generatedSchedule.length > 0 ? (
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Semana</TableHead>
                                          <TableHead className="w-[40%]">Culto da Manhã (10h)</TableHead>
                                          <TableHead className="w-[40%]">Culto da Noite (18h)</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {generatedSchedule.map((item, index) => (
                                          <TableRow key={index}>
                                              <TableCell className="font-medium">{item.week}</TableCell>
                                              <TableCell>
                                                 <VolunteerMultiSelect 
                                                   selectedVolunteers={item.morningVolunteers}
                                                   onSelectionChange={(names) => handleScheduleChange(index, 'morningVolunteers', names)}
                                                 />
                                              </TableCell>
                                              <TableCell>
                                                 <VolunteerMultiSelect 
                                                   selectedVolunteers={item.eveningVolunteers}
                                                   onSelectionChange={(names) => handleScheduleChange(index, 'eveningVolunteers', names)}
                                                 />
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                  <ClipboardList className="h-12 w-12 mb-4" />
                                  <h3 className="font-semibold">Nenhuma escala gerada</h3>
                                  <p className="text-sm">Clique no botão abaixo para gerar a escala com base nos voluntários disponíveis.</p>
                              </div>
                          )}
                      </div>
                  </CardContent>
              </Card>
              <div className="flex gap-2 justify-end">
                  <Button onClick={handleGenerateSchedule} disabled={!selectedMinistry || isLoading}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isLoading ? "Gerando..." : generatedSchedule.length > 0 ? "Gerar Novamente" : "Gerar Escala com IA"}
                  </Button>
                  {generatedSchedule.length > 0 && (
                      <Button onClick={handleApproveSchedule} variant="default" disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          {isSaving ? 'Salvando...' : 'Aprovar e Salvar Escala'}
                      </Button>
                  )}
                   <Button variant="default" disabled={!isScheduleApproved} onClick={() => { prepareNotificationMessage(); setIsNotifyDialogOpen(true); }}>
                      <Send className="mr-2 h-4 w-4" />
                      Notificar Voluntários
                  </Button>
              </div>
          </div>
        </div>
      </div>

       <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notificar Voluntários por E-mail</DialogTitle>
            <DialogDescription>
              Revise a mensagem abaixo antes de enviar para todos os voluntários da escala.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-message">Mensagem da Escala</Label>
              <Textarea
                id="notification-message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleNotifyVolunteers} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSending ? 'Enviando...' : 'Enviar E-mails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

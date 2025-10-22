
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ministries, members as allMembers } from "@/lib/data";
import { ArrowLeft, User, CalendarIcon, Users, PlusCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ptBR } from 'date-fns/locale';

export default function MinistryDetailsPage() {
  const params = useParams();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const { toast } = useToast();

  const ministry = ministries.find((m) => m.id === params.id);

  if (!ministry) {
    notFound();
  }
  
  const volunteerDetails = ministry.volunteers.map(v => allMembers.find(m => m.id === v.id)).filter(Boolean);

  const handleShare = () => {
    // In a real app, you would implement sharing logic, e.g., using Web Share API or copying a link.
    toast({
      title: "Compartilhado!",
      description: "A agenda do ministério foi compartilhada com sucesso.",
    });
  };

  const handleAddEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const eventName = formData.get('event-name');
    const eventDate = formData.get('event-date');
    console.log("Novo evento:", { eventName, eventDate });
    toast({
      title: "Evento Criado!",
      description: `O evento "${eventName}" foi adicionado à agenda.`,
    });
    setIsEventDialogOpen(false);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/ministries">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Ministérios</span>
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{ministry.name}</h1>
            <p className="text-muted-foreground">Detalhes do ministério, voluntários e agenda.</p>
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Sobre o Ministério</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{ministry.description}</p>

                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Voluntários ({volunteerDetails.length})</CardTitle>
                    <Button variant="outline" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Voluntário
                    </Button>
                </CardHeader>
                <CardContent>
                   <div className="grid gap-4 md:grid-cols-2">
                    {volunteerDetails.map((volunteer) => volunteer && (
                        <div key={volunteer.id} className="flex items-center gap-3 p-2 rounded-lg border">
                             <Avatar className="h-10 w-10">
                                <AvatarImage src={volunteer.avatar} alt={volunteer.name} data-ai-hint="person" />
                                <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{volunteer.name}</p>
                                <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                            </div>
                        </div>
                    ))}
                   </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Responsável</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={ministry.pastorAvatar} alt={ministry.pastor} data-ai-hint="person" />
                        <AvatarFallback>{ministry.pastor.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-lg">{ministry.pastor}</p>
                        <p className="text-muted-foreground">Pastor</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Agenda do Ministério</CardTitle>
                            <CardDescription>Próximos eventos e reuniões.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <PlusCircle className="h-4 w-4" />
                                        <span className="sr-only">Cadastrar Evento</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Cadastrar Novo Evento</DialogTitle>
                                        <DialogDescription>
                                            Preencha os detalhes do evento para adicioná-lo à agenda.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddEvent} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="event-name">Nome do Evento</Label>
                                            <Input id="event-name" name="event-name" placeholder="Ex: Ensaio do Louvor" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="event-date">Data do Evento</Label>
                                            <Input id="event-date" name="event-date" type="date" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="event-description">Descrição</Label>
                                            <Textarea id="event-description" name="event-description" placeholder="Descreva brevemente o evento..." />
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="outline">Cancelar</Button>
                                            </DialogClose>
                                            <Button type="submit">Salvar Evento</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                             <Button variant="outline" size="icon" onClick={handleShare}>
                                <Share2 className="h-4 w-4" />
                                <span className="sr-only">Compartilhar</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                   <Calendar
                        locale={ptBR}
                        mode="multiple"
                        selected={[new Date()]}
                        className="p-0 rounded-md border"
                    />
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                           <div className="w-2 h-2 rounded-full bg-primary" />
                           <span>Reunião de Liderança - 25/07</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm">
                           <div className="w-2 h-2 rounded-full bg-accent" />
                           <span>Ensaio Geral - 28/07</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

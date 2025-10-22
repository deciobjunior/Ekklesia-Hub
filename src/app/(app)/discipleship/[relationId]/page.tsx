
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, BookOpen, Target, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Meeting = {
  id: string;
  meeting_date: string;
  topic: string;
  notes: string;
  next_steps: string;
};

type RelationDetails = {
  id: string;
  disciplerName: string;
  disciplerAvatar: string;
  discipleId: string;
  discipleName: string;
  discipleAvatar: string;
  meetings: Meeting[];
  form_data: any;
};

export default function DiscipleshipDetailsPage() {
  const params = useParams();
  const relationId = params.relationId as string;
  const { toast } = useToast();
  const supabase = createClient();
  
  const [relation, setRelation] = useState<RelationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // State for new meeting dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10));
  const [meetingTopic, setMeetingTopic] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingNextSteps, setMeetingNextSteps] = useState('');
  
  const fetchRelationDetails = async () => {
      if (!relationId) {
          setLoading(false);
          return;
      }
      setLoading(true);

      const { data: relationData, error: relationError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', relationId)
        .eq('role', 'Discipulado')
        .single();
      
      if (relationError || !relationData) {
          console.error("Error fetching discipleship relation:", relationError?.message);
          setRelation(null);
          setLoading(false);
          return;
      }

      const { form_data } = relationData;
      const { discipler_id, disciple_id } = form_data;

      const { data: usersData, error: usersError } = await supabase
        .from('members')
        .select('id, name')
        .in('id', [discipler_id, disciple_id]);

      if (usersError) {
          console.error("Error fetching user details:", usersError.message);
          setLoading(false);
          return;
      }
      
      const discipler = usersData.find(u => u.id === discipler_id);
      const disciple = usersData.find(u => u.id === disciple_id);

      if (!discipler || !disciple) {
          console.error("Could not find discipler or disciple");
          setLoading(false);
          return;
      }

      setRelation({
          id: relationData.id,
          disciplerName: discipler.name,
          disciplerAvatar: `https://placehold.co/64x64.png?text=${discipler.name.charAt(0)}`,
          discipleId: disciple.id,
          discipleName: disciple.name,
          discipleAvatar: `https://placehold.co/64x64.png?text=${disciple.name.charAt(0)}`,
          meetings: (form_data.meetings || []) as Meeting[],
          form_data: form_data,
      });
      setLoading(false);
  };

  useEffect(() => {
    setIsClient(true);
    fetchRelationDetails();

    const channel = supabase
      .channel(`discipleship-meetings-${relationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations', filter: `id=eq.${relationId}` }, payload => {
          fetchRelationDetails();
      })
      .subscribe();
      
    return () => {
        supabase.removeChannel(channel);
    }
  }, [relationId]);
  
  const handleSaveMeeting = async () => {
      if (!meetingTopic || !meetingNotes || !relation) {
          toast({ title: "Campos obrigatórios", description: "Por favor, preencha o assunto e as anotações.", variant: "destructive" });
          return;
      }
      setSavingMeeting(true);
      
      const newMeeting = {
        id: `meeting-${Date.now()}`,
        meeting_date: meetingDate,
        topic: meetingTopic,
        notes: meetingNotes,
        next_steps: meetingNextSteps,
      };

      const updatedFormData = {
        ...relation.form_data,
        meetings: [...(relation.form_data.meetings || []), newMeeting]
      };

      const { error } = await supabase
          .from('pending_registrations')
          .update({ form_data: updatedFormData })
          .eq('id', relation.id);

      if (error) {
          toast({ title: "Erro ao salvar encontro", description: error.message, variant: 'destructive' });
      } else {
          toast({ title: "Encontro Registrado!", description: "A nova sessão foi salva com sucesso." });
          setIsDialogOpen(false);
          // Reset form
          setMeetingDate(new Date().toISOString().substring(0, 10));
          setMeetingTopic('');
          setMeetingNotes('');
          setMeetingNextSteps('');
      }
      setSavingMeeting(false);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!relation) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
            <Link href="/discipleship">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Discipulado</span>
            </Link>
            </Button>
            <div>
            <h1 className="text-2xl font-bold tracking-tight">Acompanhamento de Discipulado</h1>
            <p className="text-muted-foreground">Histórico de encontros e progresso.</p>
            </div>
        </div>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar Encontro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Novo Encontro</DialogTitle>
                <DialogDescriptionComponent>
                  Preencha as informações sobre o encontro de discipulado.
                </DialogDescriptionComponent>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Data do Encontro</Label>
                  <Input id="meeting-date" type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="meeting-topic">Assunto Principal</Label>
                  <Input id="meeting-topic" placeholder="Ex: Vida de Oração" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="meeting-notes">Anotações</Label>
                  <Textarea id="meeting-notes" placeholder="Descreva o que foi conversado..." rows={4} value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-next-steps">Próximos Passos</Label>
                  <Textarea id="meeting-next-steps" placeholder="Ex: Ler o livro de Salmos, praticar o jejum..." rows={3} value={meetingNextSteps} onChange={e => setMeetingNextSteps(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveMeeting} disabled={savingMeeting}>
                  {savingMeeting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {savingMeeting ? "Salvando..." : "Salvar Registro"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <Card>
        <CardHeader>
           <CardTitle>Detalhes da Relação</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
           <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={relation.disciplerAvatar} alt={relation.disciplerName} data-ai-hint="person" />
              <AvatarFallback>{relation.disciplerName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Discipulador(a)</p>
              <p className="font-bold text-lg">{relation.disciplerName}</p>
            </div>
          </div>
           <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16">
              <AvatarImage src={relation.discipleAvatar} alt={relation.discipleName} data-ai-hint="person" />
              <AvatarFallback>{relation.discipleName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Discípulo(a)</p>
              <p className="font-bold text-lg">{relation.discipleName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Histórico de Encontros</CardTitle>
            <CardDescription>Lista dos últimos encontros registrados.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                {relation.meetings.length > 0 ? relation.meetings.map(meeting => (
                    <div key={meeting.id} className="p-4 rounded-lg border relative">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                            <h3 className="font-semibold text-lg">{meeting.topic}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 sm:mt-0">
                                <Calendar className="h-4 w-4" />
                                <span>{isClient ? new Date(meeting.meeting_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '...'}</span>
                            </div>
                        </div>
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                               <BookOpen className="h-4 w-4 mt-1 flex-shrink-0" />
                               <p><strong className="text-foreground">Anotações:</strong> {meeting.notes}</p>
                            </div>
                            <div className="flex items-start gap-3">
                               <Target className="h-4 w-4 mt-1 flex-shrink-0" />
                               <p><strong className="text-foreground">Próximos Passos:</strong> {meeting.next_steps}</p>
                            </div>
                        </div>
                    </div>
                )) : (
                  <div className="text-center text-muted-foreground py-10">
                    <p>Nenhum encontro registrado para esta relação.</p>
                    <p className="text-sm">Clique em "Registrar Encontro" para adicionar o primeiro.</p>
                  </div>
                )}
            </div>
        </CardContent>
      </Card>

    </div>
  );
}

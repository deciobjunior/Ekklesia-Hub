
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Send } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Member } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getContacts } from '@/helpers/getContacts';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddCommunicationGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onIndividualSelected: (memberId: string) => void;
  allMembers: Member[];
  loadingMembers: boolean;
}

export function AddCommunicationGroupDialog({
  open,
  onOpenChange,
  onSuccess,
  onIndividualSelected,
  allMembers,
  loadingMembers
}: AddCommunicationGroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState('visitantes');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const { churchId, user } = useUser();
  const [contacts, setContacts] = useState<{ id: string, name: string, phone: string }[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const supabase = createClient();
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);

  // State for individual selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMinistries = async () => {
      if (!churchId) return;
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('id, name')
        .eq('church_id', churchId)
        .eq('role', 'Ministério');
      
      if (data) setMinistries(data);
    };
    fetchMinistries();
  }, [churchId, supabase]);

  useEffect(() => {
    const loadContacts = async () => {
        if (!group || !churchId) return;
        setLoadingContacts(true);
        const contactData = await getContacts(group, churchId);
        setContacts(contactData);
        setLoadingContacts(false);
    };
    loadContacts();
  }, [group, churchId]);


  const handleSubmitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || contacts.length === 0) {
      toast({ title: 'Mensagem ou grupo vazio', description: 'Por favor, escreva uma mensagem e selecione um grupo com contatos.', variant: 'destructive'});
      return;
    }
    setLoading(true);
    
    try {
        if (!churchId || !user) throw new Error("Usuário ou igreja não encontrado");

        for (const contact of contacts) {
          const personalizedMessage = message.replace(/{nome}/g, contact.name.split(' ')[0]);
          
          await supabase.from('message_history').insert({
              church_id: churchId,
              member_name: contact.name,
              member_phone: contact.phone,
              message_body: personalizedMessage,
              status: 'sent',
              sent_by: user.user_metadata.full_name || 'System',
              campaign_id: `broadcast-${Date.now()}`
          });

          await sendWhatsappMessage(contact.phone, personalizedMessage);
        }

        toast({
            title: `Mensagens Enviadas!`,
            description: `${contacts.length} mensagens foram enviadas para a fila de envio.`,
        });
        
        onSuccess();
    } catch (error: any) {
         toast({
            title: `Erro ao enviar mensagens`,
            description: error.message,
            variant: 'destructive',
        });
    }

    setLoading(false);
  };
  
  const handleStartIndividualChat = () => {
    if (selectedMemberId) {
      onIndividualSelected(selectedMemberId);
      onOpenChange(false);
    } else {
      toast({ title: "Nenhum contato selecionado", description: "Por favor, selecione uma pessoa para iniciar a conversa.", variant: "destructive" });
    }
  };
  
  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Selecione um grupo para envio em massa ou uma pessoa para iniciar uma conversa individual.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Conversa Individual</TabsTrigger>
              <TabsTrigger value="broadcast">Envio em Massa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual">
                <div className="py-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar pessoa..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="h-64 border rounded-md">
                      {loadingMembers ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-6 w-6"/></div>
                      ) : (
                        <div className="p-2">
                          {filteredMembers.map(member => (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedMemberId === member.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                              onClick={() => setSelectedMemberId(member.id)}
                            >
                               <Avatar className="h-9 w-9">
                                    <AvatarImage src={member.avatar || ''} alt={member.name} data-ai-hint="person" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleStartIndividualChat} disabled={!selectedMemberId}>Iniciar Conversa</Button>
                </DialogFooter>
            </TabsContent>
            
            <TabsContent value="broadcast">
              <form onSubmit={handleSubmitBroadcast}>
                <div className="space-y-4 py-4">
                   <div className="space-y-2">
                      <Label htmlFor="group-select">Grupo de Contatos ({loadingContacts ? '...' : contacts.length} contatos)</Label>
                      <Select value={group} onValueChange={setGroup}>
                        <SelectTrigger id="group-select">
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visitantes">Visitantes</SelectItem>
                          <SelectItem value="novos-convertidos">Novos Convertidos</SelectItem>
                          <SelectItem value="membros">Membros</SelectItem>
                          <SelectItem value="lideres">Líderes</SelectItem>
                          <SelectItem value="voluntarios">Todos os Voluntários</SelectItem>
                          {ministries.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (Ministério)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="message-body">Mensagem</Label>
                    <Textarea 
                      id="message-body" 
                      rows={5} 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ex: Paz do Senhor, {nome}! Gostaríamos de te convidar para o nosso culto especial..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={loading || loadingContacts}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar Mensagens
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>
  );
}

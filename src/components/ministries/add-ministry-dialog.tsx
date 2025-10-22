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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Member } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '../ui/textarea';
import { useUser } from '@/hooks/use-user';


interface AddMinistryDialogProps {
  onMinistryCreated: () => void;
}


export function AddMinistryDialog({ onMinistryCreated }: AddMinistryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ministryName, setMinistryName] = useState('');
  const [ministryDescription, setMinistryDescription] = useState('');
  const [selectedPastorId, setSelectedPastorId] = useState('');
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const { churchId } = useUser();
  const [pastors, setPastors] = useState<Member[]>([]);
  const [volunteers, setVolunteers] = useState<Member[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!open || !churchId) return;
      setLoading(true);

      const [pastorsAndLeadersRes, volunteersRes] = await Promise.all([
        supabase.from('pastors_and_leaders').select('id, name, role').eq('church_id', churchId),
        supabase.from('volunteers').select('id, name').eq('church_id', churchId)
      ]);

      const { data: pastorsAndLeaders, error: pastorsAndLeadersError } = pastorsAndLeadersRes;
      const { data: volunteersData, error: volunteersError } = volunteersRes;

      if (pastorsAndLeadersError || volunteersError) {
        toast({ title: "Erro ao buscar usuários", description: pastorsAndLeadersError?.message || volunteersError?.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      const allLeadersAndPastors: Member[] = (pastorsAndLeaders || []).map((p: any) => ({ ...p, status: 'Ativo' }));
      const allVolunteers: Member[] = (volunteersData || []).map((v: any) => ({ ...v, role: 'Voluntário', status: 'Ativo' }));

      setPastors(allLeadersAndPastors.filter(u => u.role === 'Pastor'));
      setVolunteers(allVolunteers);
      
      setLoading(false);
    };

    fetchUsers();
  }, [open, churchId, toast]);

  const toggleVolunteerSelection = (memberId: string) => {
    setSelectedVolunteers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };
  
  const filteredVolunteers = volunteers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (!churchId) {
      toast({ title: "Erro", description: "Igreja não encontrada. Recarregue a página.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase
        .from('pending_registrations')
        .insert({
            church_id: churchId,
            name: ministryName,
            role: 'Ministério',
            status: 'Ativo',
            form_data: {
              description: ministryDescription,
              pastor_id: selectedPastorId,
              volunteer_ids: selectedVolunteers,
            }
        });
    
    setSaving(false);
    
    if (error) {
         toast({ title: "Erro ao criar ministério", description: error.message, variant: 'destructive' });
    } else {
        toast({
            title: "Ministério Criado!",
            description: "O novo ministério foi adicionado com sucesso.",
        });
        onMinistryCreated(); // Callback to refresh parent list
        setOpen(false);
        // Reset form state
        setMinistryName('');
        setMinistryDescription('');
        setSelectedPastorId('');
        setSelectedVolunteers([]);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Ministério
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
            <DialogTitle>Novo Ministério</DialogTitle>
            <DialogDescription>
                Preencha as informações para criar um novo ministério.
            </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <form onSubmit={handleCreateMinistry}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                  <Label htmlFor="ministry-name">Nome do Ministério</Label>
                  <Input id="ministry-name" placeholder="Ex: Louvor e Adoração" value={ministryName} onChange={e => setMinistryName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ministry-description">Descrição</Label>
                <Textarea id="ministry-description" placeholder="Descreva o propósito do ministério" value={ministryDescription} onChange={e => setMinistryDescription(e.target.value)} />
              </div>
               <div className="space-y-2">
                  <Label htmlFor="pastor-responsible">Pastor Responsável</Label>
                  <Select onValueChange={setSelectedPastorId} value={selectedPastorId}>
                      <SelectTrigger id="pastor-responsible">
                          <SelectValue placeholder="Selecione um pastor" />
                      </SelectTrigger>
                      <SelectContent>
                          {pastors.map(member => (
                               <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>Voluntários</Label>
                   <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar voluntário..." 
                      className="pl-8" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-48 rounded-md border">
                      <div className="p-4 space-y-2">
                          {filteredVolunteers.length > 0 ? filteredVolunteers.map(member => (
                               <div key={member.id} className="flex items-center gap-3">
                                   <Checkbox 
                                      id={`volunteer-${member.id}`}
                                      checked={selectedVolunteers.includes(member.id)}
                                      onCheckedChange={() => toggleVolunteerSelection(member.id)}
                                  />
                                  <Avatar className="h-8 w-8">
                                      <AvatarImage src={member.avatar || ''} alt={member.name} data-ai-hint="person" />
                                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <label htmlFor={`volunteer-${member.id}`} className="flex-1 cursor-pointer">{member.name}</label>
                              </div>
                          )) : (
                            <p className="text-sm text-center text-muted-foreground">Nenhum voluntário encontrado.</p>
                          )}
                      </div>
                  </ScrollArea>
              </div>
          </div>
          <DialogFooter className="pt-4">
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Criando...' : 'Criar Ministério'}
              </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

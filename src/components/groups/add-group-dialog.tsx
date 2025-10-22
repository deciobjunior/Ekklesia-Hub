

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

interface AddGroupDialogProps {
  onGroupCreated: () => void;
}

export function AddGroupDialog({ onGroupCreated }: AddGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allLeaders, setAllLeaders] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;
      setLoading(true);

      const { data: leadersData, error: leadersError } = await supabase
        .from('pastors_and_leaders')
        .select('id, name, role');
      
      if (leadersError) {
        toast({ title: "Erro ao buscar líderes", description: leadersError.message, variant: "destructive" });
      } else {
        const leaders: Member[] = (leadersData || []).map((l: any) => ({ ...l, status: 'Ativo' }));
        setAllLeaders(leaders);
      }
      
      const tablesToFetch = ['members', 'pastors_and_leaders', 'volunteers'];
      const promises = tablesToFetch.map(tableName => supabase.from(tableName).select('id, name'));
      const results = await Promise.all(promises);

      const combinedUsers: Member[] = [];
      results.forEach((res, index) => {
        if (res.error) {
            console.error(`Error fetching from ${tablesToFetch[index]}`, res.error);
        } else {
            combinedUsers.push(...(res.data || []).map((u: any) => ({...u, role: 'Membro', status: 'Ativo'})));
        }
      });
      
      const uniqueUsers = Array.from(new Map(combinedUsers.map(item => [item.id, item])).values());
      setAllMembers(uniqueUsers);

      setLoading(false);
    };

    fetchUsers();
  }, [open, toast]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };
  
  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: church } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
    if (!church) {
      toast({ title: "Erro", description: "Igreja não encontrada", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('small_groups').insert({
      name,
      location,
      leader_id: leaderId,
      member_ids: selectedMembers,
      church_id: church.id,
      image_url: `https://placehold.co/600x400.png`
    });

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao criar grupo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Grupo criado!", description: `O grupo "${name}" foi criado com sucesso.` });
      setOpen(false);
      // Reset state
      setName('');
      setLocation('');
      setLeaderId('');
      setSelectedMembers([]);
      setSearchTerm('');
      onGroupCreated();
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
            <DialogTitle>Novo Pequeno Grupo</DialogTitle>
            <DialogDescription>
                Preencha as informações para criar um novo grupo.
            </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <form onSubmit={handleCreateGroup}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="group-name">Nome do Grupo</Label>
                <Input id="group-name" placeholder="Ex: Jovens Conectados" value={name} onChange={e => setName(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="group-leader">Líder do Grupo</Label>
                <Select onValueChange={setLeaderId} value={leaderId} required>
                    <SelectTrigger id="group-leader">
                        <SelectValue placeholder="Selecione um líder" />
                    </SelectTrigger>
                    <SelectContent>
                        {allLeaders.map(member => (
                             <SelectItem key={member.id} value={member.id}>{member.name} ({member.role})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="group-location">Localização</Label>
                <Input id="group-location" placeholder="Ex: Bairro, Online, etc." value={location} onChange={e => setLocation(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label>Membros</Label>
                 <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar membro..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-48 rounded-md border">
                    <div className="p-4 space-y-2">
                        {filteredMembers.map(member => (
                             <div key={member.id} className="flex items-center gap-3">
                                 <Checkbox 
                                    id={`member-group-${member.id}`}
                                    checked={selectedMembers.includes(member.id)}
                                    onCheckedChange={() => toggleMemberSelection(member.id)}
                                />
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person" />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <label htmlFor={`member-group-${member.id}`} className="flex-1 cursor-pointer">{member.name}</label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Grupo
              </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}



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
import { Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Member } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { SmallGroupDetails } from '@/app/(app)/groups/[id]/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: SmallGroupDetails;
  onGroupUpdated: () => void;
}

export function EditGroupDialog({ open, onOpenChange, group, onGroupUpdated }: EditGroupDialogProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allLeaders, setAllLeaders] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setLocation(group.location);
      setLeaderId(group.leader_id);
      setSelectedMembers(group.member_ids || []);
    }

    const fetchUsers = async () => {
      if (!open) return;
      setLoading(true);

      const [leadersRes, membersRes, volunteersRes, pastorsRes] = await Promise.all([
        supabase.from('pastors_and_leaders').select('id, name, role'),
        supabase.from('members').select('id, name'),
        supabase.from('volunteers').select('id, name'),
        supabase.from('pastors_and_leaders').select('id, name, role'),
      ]);

      if (leadersRes.error) {
        toast({ title: "Erro ao buscar líderes", description: leadersRes.error.message, variant: "destructive" });
      } else {
        setAllLeaders((leadersRes.data as Member[]) || []);
      }

      const combinedUsers: Member[] = [];
      if (membersRes.data) combinedUsers.push(...membersRes.data.map((u:any) => ({...u, role: 'Membro', status: 'Ativo'})));
      if (pastorsRes.data) combinedUsers.push(...pastorsRes.data.map((u:any) => ({...u, status: 'Ativo'})));
      if (volunteersRes.data) combinedUsers.push(...volunteersRes.data.map((u:any) => ({...u, role: 'Voluntário', status: 'Ativo'})));

      const uniqueUsers = Array.from(new Map(combinedUsers.map(item => [item.id, item])).values());
      setAllMembers(uniqueUsers);
      
      setLoading(false);
    };

    fetchUsers();
  }, [open, group, toast]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };
  
  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from('small_groups').update({
      name,
      location,
      leader_id: leaderId,
      member_ids: selectedMembers,
    }).eq('id', group.id);

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao atualizar grupo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Grupo Atualizado!", description: `O grupo "${name}" foi atualizado com sucesso.` });
      onOpenChange(false);
      onGroupUpdated();
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
            <DialogTitle>Editar Grupo: {group.name}</DialogTitle>
            <DialogDescription>
                Atualize as informações do grupo.
            </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex items-center justify-center py-10 h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <form onSubmit={handleUpdateGroup}>
           <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="members">Membros ({selectedMembers.length})</TabsTrigger>
              </TabsList>
              <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
                 <TabsContent value="info" className="space-y-4 mt-0">
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Nome do Grupo</Label>
                        <Input id="group-name" value={name} onChange={e => setName(e.target.value)} required/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="group-leader">Líder do Grupo</Label>
                        <Select onValueChange={(value) => setLeaderId(value)} value={leaderId || ''} required>
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
                        <Input id="group-location" value={location} onChange={e => setLocation(e.target.value)} required />
                    </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-4 mt-0">
                   <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar membro..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72 rounded-md border">
                        <div className="p-4 space-y-2">
                            {filteredMembers.map(member => (
                                 <div key={member.id} className="flex items-center gap-3">
                                     <Checkbox 
                                        id={`member-group-edit-${member.id}`}
                                        checked={selectedMembers.includes(member.id)}
                                        onCheckedChange={() => toggleMemberSelection(member.id)}
                                    />
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person" />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <label htmlFor={`member-group-edit-${member.id}`} className="flex-1 cursor-pointer">{member.name}</label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>

          <DialogFooter className="border-t pt-4">
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

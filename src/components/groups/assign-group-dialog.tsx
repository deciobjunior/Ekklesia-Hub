

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
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { SmallGroup } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type SmallGroupWithDetails = SmallGroup & {
  leader_name: string;
};

type InterestedPerson = {
    id: string;
    name: string;
};

interface AssignGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interestedPerson: InterestedPerson;
  onAssigned: () => void;
}

export function AssignGroupDialog({ open, onOpenChange, interestedPerson, onAssigned }: AssignGroupDialogProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<SmallGroupWithDetails[]>([]);
    
    // Filters
    const [nameFilter, setNameFilter] = useState('');
    const [leaderFilter, setLeaderFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    useEffect(() => {
        const fetchGroups = async () => {
            if (!open) return;
            setLoading(true);

             const { data: { user } } = await supabase.auth.getUser();
             if (!user) return;

             const { data: church } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
             if (!church) return;


            const { data, error } = await supabase
                .from('small_groups')
                .select('*, leader:leader_id ( name )')
                .eq('church_id', church.id);

            if (error) {
                toast({ title: 'Erro ao buscar grupos', description: error.message, variant: 'destructive' });
                setGroups([]);
            } else {
                 const formattedGroups: SmallGroupWithDetails[] = data.map((group: any) => ({
                    ...group,
                    leader_name: group.leader?.name || 'Não definido',
                    member_count: (group.member_ids || []).length,
                 }));
                setGroups(formattedGroups);
            }
            setLoading(false);
        };

        fetchGroups();
    }, [open, toast]);

    const handleAssign = async () => {
        if (!selectedGroupId) {
            toast({ title: "Selecione um grupo", description: "Você precisa escolher um grupo para direcionar a pessoa.", variant: "destructive" });
            return;
        }
        setSaving(true);
        
        try {
            // Fetch the small group and the new beginning record in parallel
            const [groupRes, newBeginningRes] = await Promise.all([
                supabase.from('small_groups').select('member_ids, leader_id, leader:leader_id (name)').eq('id', selectedGroupId).single(),
                supabase.from('new_beginnings').select('interests, follower_id, follower_name').eq('id', interestedPerson.id).single()
            ]);

            const { data: group, error: groupError } = groupRes;
            const { data: newBeginning, error: newBeginningError } = newBeginningRes;

            if (groupError || !group) {
                throw new Error(groupError?.message || 'Grupo não encontrado.');
            }
            if (newBeginningError || !newBeginning) {
                throw new Error(newBeginningError?.message || 'Registro de "Novo Começo" não encontrado.');
            }
            
            // Prepare updates
            const newMemberIds = [...new Set([...(group.member_ids || []), interestedPerson.id])];
            const newInterests = (newBeginning.interests || []).filter((interest: any) => interest.key !== 'growth_group');
            const leaderName = (group as any).leader?.name || 'Não definido';

            // Run updates in parallel
            const [updateGroupRes, updateBeginningRes] = await Promise.all([
                supabase.from('small_groups').update({ member_ids: newMemberIds }).eq('id', selectedGroupId),
                supabase.from('new_beginnings').update({ 
                    follower_name: newBeginning.follower_name || leaderName, 
                    follower_id: newBeginning.follower_id || group.leader_id,
                    interests: newInterests,
                }).eq('id', interestedPerson.id)
            ]);

            if (updateGroupRes.error) throw updateGroupRes.error;
            if (updateBeginningRes.error) throw updateBeginningRes.error;

            toast({ title: "Sucesso!", description: `${interestedPerson.name} foi adicionado(a) ao grupo.` });
            onOpenChange(false);
            onAssigned();

        } catch (error: any) {
            toast({ title: "Erro ao direcionar", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
        g.leader_name.toLowerCase().includes(leaderFilter.toLowerCase()) &&
        g.location.toLowerCase().includes(locationFilter.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Direcionar {interestedPerson.name}</DialogTitle>
                    <DialogDescription>
                        Filtre e selecione o pequeno grupo para o qual deseja enviar esta pessoa.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 border rounded-lg">
                        <Input placeholder="Filtrar por nome..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
                        <Input placeholder="Filtrar por líder..." value={leaderFilter} onChange={(e) => setLeaderFilter(e.target.value)} />
                        <Input placeholder="Filtrar por local..." value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <ScrollArea className="h-64 border rounded-md">
                            <RadioGroup value={selectedGroupId || ''} onValueChange={setSelectedGroupId} className="p-4 space-y-2">
                                {filteredGroups.length > 0 ? filteredGroups.map(group => (
                                    <Label key={group.id} htmlFor={group.id} className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
                                        <RadioGroupItem value={group.id} id={group.id} />
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={group.image_url} alt={group.name} data-ai-hint="group people"/>
                                            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{group.name}</p>
                                            <p className="text-xs text-muted-foreground">Líder: {group.leader_name} • Local: {group.location}</p>
                                        </div>
                                    </Label>
                                )) : (
                                    <p className="text-center text-sm text-muted-foreground py-4">Nenhum grupo encontrado com os filtros atuais.</p>
                                )}
                            </RadioGroup>
                        </ScrollArea>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleAssign} disabled={saving || loading || !selectedGroupId}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Direcionamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

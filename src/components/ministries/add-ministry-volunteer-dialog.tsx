
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
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Member } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { MinistryWithDetails } from '@/app/(app)/ministries/page';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddMinistryVolunteerDialogProps {
  ministry: MinistryWithDetails;
  onUpdate: () => void;
}

export function AddMinistryVolunteerDialog({ ministry, onUpdate }: AddMinistryVolunteerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allVolunteers, setAllVolunteers] = useState<Member[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const supabase = createClient();
  
  useEffect(() => {
    const fetchVolunteers = async () => {
      if (!open) return;
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: churchData } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
      if (!churchData) {
        toast({ title: "Erro", description: "Igreja não encontrada.", variant: "destructive"});
        setLoading(false);
        return;
      }

      const { data: volunteersData, error } = await supabase.from('volunteers').select('id, name').eq('church_id', churchData.id);

      if (error) {
        toast({ title: "Erro ao buscar voluntários", description: error.message, variant: "destructive" });
      } else {
        const existingVolunteerIds = new Set(ministry.volunteers_details.map(v => v.id));
        const availableVolunteers = (volunteersData || [])
          .filter(v => !existingVolunteerIds.has(v.id))
          .map(v => ({
              ...v,
              avatar: `https://placehold.co/40x40.png?text=${v.name.charAt(0)}`,
          }));
        setAllVolunteers(availableVolunteers as Member[]);
      }
      setLoading(false);
    };

    fetchVolunteers();
  }, [open, toast, ministry.volunteers_details]);

  const toggleVolunteerSelection = (memberId: string) => {
    setSelectedVolunteers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };
  
  const handleAddVolunteers = async () => {
    if (selectedVolunteers.length === 0) {
        toast({ title: "Nenhum voluntário selecionado", variant: "destructive" });
        return;
    }
    setSaving(true);
    
    // Fetch the latest form_data to avoid overwriting other fields
    const { data: currentMinistryData, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('form_data')
      .eq('id', ministry.id)
      .single();

    if (fetchError) {
        toast({ title: "Erro ao buscar dados atuais do ministério", description: fetchError.message, variant: "destructive" });
        setSaving(false);
        return;
    }

    const currentVolunteerIds = currentMinistryData.form_data?.volunteer_ids || [];
    const newVolunteerIds = [...new Set([...currentVolunteerIds, ...selectedVolunteers])];
    
    const { error: updateError } = await supabase
        .from('pending_registrations')
        .update({ form_data: { ...currentMinistryData.form_data, volunteer_ids: newVolunteerIds } })
        .eq('id', ministry.id);

    setSaving(false);
    
    if (updateError) {
      toast({ title: "Erro ao adicionar voluntários", description: updateError.message, variant: 'destructive' });
    } else {
      toast({ title: "Voluntários Adicionados!", description: "Os novos voluntários foram adicionados ao ministério." });
      setOpen(false);
      onUpdate(); // Refresh the details dialog
    }
  };

  const filteredVolunteers = allVolunteers.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Voluntários a {ministry.name}</DialogTitle>
          <DialogDescription>Selecione os voluntários que deseja adicionar a este ministério.</DialogDescription>
        </DialogHeader>
        {loading ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar voluntário..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-64 rounded-md border">
                    <div className="p-4 space-y-2">
                        {filteredVolunteers.length > 0 ? filteredVolunteers.map(volunteer => (
                            <div key={volunteer.id} className="flex items-center gap-3">
                                <Checkbox 
                                id={`add-volunteer-${volunteer.id}`}
                                checked={selectedVolunteers.includes(volunteer.id)}
                                onCheckedChange={() => toggleVolunteerSelection(volunteer.id)}
                                />
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={volunteer.avatar || ''} alt={volunteer.name} data-ai-hint="person" />
                                    <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Label htmlFor={`add-volunteer-${volunteer.id}`} className="flex-1 cursor-pointer">{volunteer.name}</Label>
                            </div>
                        )) : (
                            <p className="text-sm text-center text-muted-foreground pt-4">Nenhum voluntário disponível para adicionar.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleAddVolunteers} disabled={saving || loading}>
             {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Adicionar Selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

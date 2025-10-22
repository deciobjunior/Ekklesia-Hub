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
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { MinistryWithDetails } from '@/app/(app)/ministries/page';
import type { Member } from '@/lib/data';

interface EditMinistryDialogProps {
  ministry: MinistryWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditMinistryDialog({ ministry, open, onOpenChange, onUpdate }: EditMinistryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pastorId, setPastorId] = useState('');
  const [pastors, setPastors] = useState<Member[]>([]);
  const { toast } = useToast();
  const supabase = createClient();
  
  useEffect(() => {
    if (ministry) {
      setName(ministry.name);
      setDescription(ministry.form_data?.description || '');
      setPastorId(ministry.form_data?.pastor_id || '');
    }
  }, [ministry]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: churchData } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
      if (!churchData) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('pastors_and_leaders')
        .select('id, name, role')
        .eq('church_id', churchData.id);

      if (error) {
        toast({ title: 'Erro ao buscar líderes e pastores', description: error.message, variant: 'destructive' });
      } else {
        const allUsers: Member[] = (data || []).map((u: any) => ({ ...u, status: 'Ativo' }));
        setPastors(allUsers.filter(u => u.role === 'Pastor'));
      }
      setLoading(false);
    };
    fetchUsers();
  }, [open, toast]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const updatedFormData = {
      ...ministry.form_data,
      description: description,
      pastor_id: pastorId,
    };
    
    const { error } = await supabase
      .from('pending_registrations')
      .update({ name: name, form_data: updatedFormData })
      .eq('id', ministry.id);
      
    setSaving(false);
    if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'Ministério Atualizado!', description: 'As informações foram salvas.' });
        onUpdate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Ministério</DialogTitle>
          <DialogDescription>
            Atualize as informações principais do ministério {ministry.name}.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <form onSubmit={handleSaveChanges}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ministry-name">Nome do Ministério</Label>
              <Input id="edit-ministry-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ministry-description">Descrição</Label>
              <Textarea id="edit-ministry-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pastor">Pastor Responsável</Label>
              <Select onValueChange={setPastorId} value={pastorId}>
                <SelectTrigger id="edit-pastor"><SelectValue placeholder="Selecione um pastor" /></SelectTrigger>
                <SelectContent>
                  {pastors.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

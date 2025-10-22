

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
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { PendingDisciple } from '@/app/(app)/discipleship/page';
import { MemberCombobox } from './member-combobox'; // Assuming this component exists
import { useUser } from '@/hooks/use-user';


interface AssignDisciplerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pendingDisciple: PendingDisciple;
    onSuccess: () => void;
}

type Member = {
    id: string;
    name: string;
};

export function AssignDisciplerDialog({ open, onOpenChange, pendingDisciple, onSuccess }: AssignDisciplerDialogProps) {
    const [disciplerId, setDisciplerId] = useState<string | null>(null);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();
    const { churchId } = useUser();

    useEffect(() => {
        const fetchMembers = async () => {
            if (!open || !churchId) return;
            setLoadingMembers(true);
            
            const [pastorsRes, consolidatorsRes, counselorsRes] = await Promise.all([
                supabase.from('pastors_and_leaders').select('id, name').eq('church_id', churchId),
                supabase.from('volunteers').select('id, name').eq('church_id', churchId).eq('role', 'Consolidador'),
                supabase.from('counselors').select('id, name').eq('church_id', churchId)
            ]);

            const allPotentialDisciplers = [
                ...(pastorsRes.data || []),
                ...(consolidatorsRes.data || []),
                ...(counselorsRes.data || []),
            ];

            if (pastorsRes.error || consolidatorsRes.error || counselorsRes.error) {
                toast({ title: "Erro ao buscar membros", description: "Não foi possível carregar la lista de discipuladores.", variant: "destructive" });
            } else {
                 const uniqueMembers = Array.from(new Map(allPotentialDisciplers.map(item => [item.id, item])).values());
                 uniqueMembers.sort((a, b) => a.name.localeCompare(b.name));
                 setMembers(uniqueMembers);
            }

            setLoadingMembers(false);
        };
        fetchMembers();
    }, [open, churchId, toast]);

    const handleAssign = async () => {
        if (!disciplerId) {
            toast({ title: "Selecione um discipulador", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const { data: pendingReg, error: fetchError } = await supabase
                .from('pending_registrations')
                .select('form_data')
                .eq('id', pendingDisciple.id)
                .single();

            if (fetchError || !pendingReg) {
                throw new Error(fetchError?.message || "Registro pendente não encontrado.");
            }

            const updatedFormData = {
                ...pendingReg.form_data,
                discipler_id: disciplerId,
            };

            const { error: updateError } = await supabase
                .from('pending_registrations')
                .update({ form_data: updatedFormData, status: 'Ativo' })
                .eq('id', pendingDisciple.id);

            if (updateError) throw updateError;
            
            toast({ title: "Discipulador Designado!", description: `Uma nova relação de discipulado foi criada.`});
            onSuccess();

        } catch (error: any) {
            toast({ title: "Erro ao designar", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Designar Discipulador</DialogTitle>
                    <DialogDescription>
                        Selecione um membro para ser o discipulador de <strong>{pendingDisciple.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {loadingMembers ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="discipler-select">Discipulador(a)</Label>
                            <MemberCombobox
                                members={members}
                                selectedMemberId={disciplerId}
                                onSelectMember={setDisciplerId}
                                placeholder="Selecione um membro..."
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleAssign} disabled={saving || loadingMembers || !disciplerId}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Designação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

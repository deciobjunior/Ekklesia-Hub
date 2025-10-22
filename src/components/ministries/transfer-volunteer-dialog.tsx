

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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Ministry, Member } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface TransferVolunteerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: Member;
  currentMinistry: Ministry;
  onSuccess: () => void;
}

export function TransferVolunteerDialog({ open, onOpenChange, volunteer, currentMinistry, onSuccess }: TransferVolunteerDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
    const supabase = createClient();


    useEffect(() => {
        const fetchMinistriesAndUser = async () => {
            if (!open) return;
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser({ id: user.id, name: user.user_metadata.full_name || 'Usuário' });
            }

            const { data, error } = await supabase
                .from('pending_registrations')
                .select('id, name')
                .eq('role', 'Ministério')
                .neq('id', currentMinistry.id); // Exclude current ministry

            if (error) {
                toast({ title: 'Erro ao buscar ministérios', description: error.message, variant: 'destructive' });
            } else {
                setMinistries((data || []).map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    description: '',
                    pastor: '',
                    pastorAvatar: '',
                    volunteers: []
                })));
            }
            setLoading(false);
        };
        fetchMinistriesAndUser();
    }, [open, toast, currentMinistry.id]);
    
    const addActivity = (action: string, details: string, currentFormData: any) => {
        if (!currentUser) return currentFormData.activities || [];
        const newActivity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action,
            details,
        };
        return [...(currentFormData.activities || []), newActivity];
    };

    const handleTransfer = async () => {
        if (!selectedMinistryId) {
            toast({ title: 'Nenhum ministério selecionado', variant: 'destructive' });
            return;
        }
        setSaving(true);
        
        try {
            // Step 1: Securely fetch source ministry data
            const { data: sourceMinistryData, error: sourceMinistryError } = await supabase
                .from('pending_registrations')
                .select('form_data, name, church_id')
                .eq('id', currentMinistry.id)
                .maybeSingle();

            if (sourceMinistryError || !sourceMinistryData) {
                throw new Error(sourceMinistryError?.message || "Ministério de origem não encontrado.");
            }
            const sourceFormData = sourceMinistryData.form_data;
            const churchId = sourceMinistryData.church_id;

            // Step 2: Securely fetch volunteer data from multiple possible tables
            let volunteerData = null;
            const { data: volData } = await supabase.from('volunteers').select('id, name, email, phone').eq('id', volunteer.id).maybeSingle();
            if (volData) {
                volunteerData = volData;
            } else {
                const { data: leaderData } = await supabase.from('pastors_and_leaders').select('id, name, email').eq('id', volunteer.id).maybeSingle();
                if (leaderData) {
                    volunteerData = { ...leaderData, phone: null }; // Leaders might not have a phone in that table
                }
            }

            if (!volunteerData) {
                 throw new Error("Dados do voluntário não encontrados para realizar a transferência.");
            }
            
            // Step 3: Update source ministry
            const sourceVolunteerIds = (sourceFormData.volunteer_ids || []).filter((id: string) => id !== volunteer.id);
            const destinationMinistryName = ministries.find(m => m.id === selectedMinistryId)?.name || 'desconhecido';
            const sourceActivities = addActivity('volunteer_transferred', `Voluntário ${volunteer.name} foi transferido para o ministério ${destinationMinistryName}.`, sourceFormData);

            const { error: updateSourceError } = await supabase
                .from('pending_registrations')
                .update({ form_data: { ...sourceFormData, volunteer_ids: sourceVolunteerIds, activities: sourceActivities } })
                .eq('id', currentMinistry.id);
            
            if (updateSourceError) throw updateSourceError;

            // Step 4: Create a new pending registration for the volunteer to be approved in the new ministry
            const { error: newPendingError } = await supabase
                .from('pending_registrations')
                .insert({
                    church_id: churchId,
                    name: volunteerData.name,
                    email: volunteerData.email,
                    role: 'Voluntário',
                    status: 'Aguardando Aprovação do Líder',
                    form_data: { 
                        id: volunteerData.id,
                        name: volunteerData.name,
                        email: volunteerData.email,
                        phone: volunteerData.phone,
                        assigned_ministry_ids: [selectedMinistryId]
                    },
                });

            // We can ignore duplicate errors (code 23505) if the user is already pending in the target ministry.
            if (newPendingError && newPendingError.code !== '23505') { 
                throw newPendingError;
            }

            toast({ title: 'Transferência Solicitada!', description: `${volunteer.name} foi enviado para aprovação no novo ministério.` });
            onSuccess();
            
        } catch(error: any) {
            toast({ title: 'Erro ao transferir', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transferir Voluntário</DialogTitle>
                    <DialogDescription>
                        Mover <strong>{volunteer.name}</strong> do ministério <strong>{currentMinistry.name}</strong> para outro ministério.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {loading ? (
                        <div className="h-24 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="space-y-2">
                            <label htmlFor="ministry-select">Selecione o ministério de destino</label>
                            <Select onValueChange={setSelectedMinistryId}>
                                <SelectTrigger id="ministry-select">
                                    <SelectValue placeholder="Escolha um ministério..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ministries.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleTransfer} disabled={loading || saving || !selectedMinistryId}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirmar Transferência
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

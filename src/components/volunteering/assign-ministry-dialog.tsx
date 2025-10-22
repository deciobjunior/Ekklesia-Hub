'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Ministry } from '@/lib/data';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

type VolunteerApplication = {
    id: string;
    name: string;
    form_data?: any;
};

interface AssignMinistryDialogProps {
  volunteer: VolunteerApplication;
  churchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AssignMinistryDialog({ volunteer, churchId, open, onOpenChange, onUpdate }: AssignMinistryDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [selectedMinistryIds, setSelectedMinistryIds] = useState<string[]>([]);
    const [unregisteredInterests, setUnregisteredInterests] = useState<string[]>([]);
    const supabase = createClient();
    
    useEffect(() => {
        const fetchMinistries = async () => {
            if (!open) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('pending_registrations')
                .select('id, name, form_data')
                .eq('church_id', churchId)
                .eq('role', 'Ministério');
            
            if (error) {
                toast({ title: "Erro ao buscar ministérios", description: error.message, variant: "destructive" });
            } else {
                const fetchedMinistries = (data || []).map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    description: m.form_data.description || '',
                    pastor: '',
                    pastorAvatar: '',
                    volunteers: []
                }));
                setMinistries(fetchedMinistries);
                
                const volunteerInterests = volunteer.form_data?.ministry_interests || [];
                const registeredMinistryNames = new Set(fetchedMinistries.map(m => m.name));
                const missing = volunteerInterests.filter((interest: string) => !registeredMinistryNames.has(interest));
                setUnregisteredInterests(missing);

                if (missing.length === 0) {
                  const interestedIds = fetchedMinistries
                      .filter(m => volunteerInterests.includes(m.name))
                      .map(m => m.id);
                  setSelectedMinistryIds(interestedIds);
                }
            }

            setLoading(false);
        };
        fetchMinistries();
    }, [open, churchId, toast, volunteer.form_data?.ministry_interests, supabase]);

    const handleToggleMinistry = (ministryId: string) => {
        setSelectedMinistryIds(prev =>
            prev.includes(ministryId)
                ? prev.filter(id => id !== ministryId)
                : [...prev, ministryId]
        );
    };
    
    const handleAssign = async () => {
        if (selectedMinistryIds.length === 0) {
            toast({ title: "Nenhum ministério selecionado", variant: "destructive" });
            return;
        }
        setSaving(true);
        
        const updateData = {
            status: 'Aguardando Aprovação do Líder',
            form_data: {
                ...volunteer.form_data,
                assigned_ministry_ids: selectedMinistryIds,
            }
        };

        const { error } = await supabase
            .from('pending_registrations')
            .update(updateData)
            .eq('id', volunteer.id);

        setSaving(false);
        
        if (error) {
            toast({ title: "Erro ao direcionar voluntário", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Voluntário Direcionado!", description: `${volunteer.name} foi enviado para a aprovação do(s) líder(es) do(s) ministério(s) selecionado(s).` });
            onUpdate();
            onOpenChange(false);
        }
    }
    
    const canProceed = unregisteredInterests.length === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Direcionar {volunteer.name} para Ministérios</DialogTitle>
                    <DialogDescription>
                        Selecione os ministérios para os quais deseja enviar este voluntário para aprovação do líder. Os interesses dele(a) vêm pré-selecionados.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                           {!canProceed && (
                               <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                                   <div className="flex items-center gap-2">
                                       <AlertTriangle className="h-5 w-5" />
                                       <h4 className="font-semibold">Ministério(s) Não Cadastrado(s)</h4>
                                   </div>
                                   <p className="text-sm mt-1 pl-7">
                                       O voluntário expressou interesse em: <span className="font-semibold">{unregisteredInterests.join(', ')}</span>, mas este(s) ministério(s) não existe(m). Por favor, cadastre-o(s) na tela de Gestão de Ministérios antes de continuar.
                                   </p>
                               </div>
                           )}
                           <div className="space-y-2 max-h-64 overflow-y-auto">
                                {ministries.map(ministry => (
                                    <div key={ministry.id} className="flex items-center gap-3 rounded-md border p-3">
                                        <Checkbox
                                            id={`ministry-assign-${ministry.id}`}
                                            checked={selectedMinistryIds.includes(ministry.id)}
                                            onCheckedChange={() => handleToggleMinistry(ministry.id)}
                                            disabled={!canProceed}
                                        />
                                        <Label htmlFor={`ministry-assign-${ministry.id}`} className={`font-medium cursor-pointer ${!canProceed ? 'cursor-not-allowed text-muted-foreground' : ''}`}>
                                            {ministry.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button disabled={saving || loading || selectedMinistryIds.length === 0 || !canProceed}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Direcionamento
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Enviar para aprovação do líder?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   Ao confirmar, o voluntário será enviado para a fila de aprovação do(s) líder(es) do(s) ministério(s) selecionado(s). Deseja continuar?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAssign} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sim, enviar para aprovação
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

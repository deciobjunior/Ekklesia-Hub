// @ts-nocheck
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabaseClient';
import { Loader2, Crown } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';

interface ChurchInfo {
    id: string;
    name: string;
    senior_pastor_name: string;
}

interface AssociateChurchClientFormProps {
    churches: ChurchInfo[];
}

export function AssociateChurchClientForm({ churches }: AssociateChurchClientFormProps) {
    const { toast } = useToast();
    const { user, authLoading } = useUser();
    const [saving, setSaving] = useState(false);
    const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
    const supabase = createClient();

    const handleAssociation = async () => {
        if (!selectedChurchId || !user) {
            toast({ title: "Seleção necessária", description: "Por favor, selecione uma igreja para continuar.", variant: "destructive" });
            return;
        }
        setSaving(true);
        
        try {
             const { error } = await supabase.from('members').insert({
                id: user.id,
                church_id: selectedChurchId,
                name: user.user_metadata.full_name || user.email,
                email: user.email,
                role: 'Membro',
                status: 'Pendente',
             });
            
             if (error && error.code !== '23505') { // Ignore duplicate key error, user might exist
                throw error;
             }
            
            toast({
                title: "Associação realizada!",
                description: "Você foi associado à igreja. Redirecionando...",
            });

            // Force a reload to re-run the useUser hook logic completely
            window.location.href = '/dashboard';

        } catch (error: any) {
             toast({
                title: "Erro na associação",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <RadioGroup value={selectedChurchId || ''} onValueChange={setSelectedChurchId} className="space-y-2">
                {churches.map((church) => (
                     <Label key={church.id} htmlFor={church.id} className="flex flex-col rounded-lg border p-4 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <div className="flex items-center gap-2">
                             <RadioGroupItem value={church.id} id={church.id} />
                             <span className="font-bold text-lg">{church.name}</span>
                        </div>
                        <div className="pl-8 pt-2 text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                <span>Pastor Sênior: {church.senior_pastor_name}</span>
                            </div>
                        </div>
                     </Label>
                ))}
            </RadioGroup>

            {churches.length === 0 && (
                <p className="text-center text-muted-foreground">Nenhuma igreja encontrada para associação.</p>
            )}

            <Button className="w-full mt-6" size="lg" onClick={handleAssociation} disabled={saving || !selectedChurchId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Associando...' : 'Associar-se a esta Igreja'}
            </Button>
        </div>
    );
}

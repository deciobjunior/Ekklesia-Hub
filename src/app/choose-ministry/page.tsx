'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import type { Ministry } from '@/lib/data';

function ChooseMinistryFormComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [volunteer, setVolunteer] = useState<{ id: string, name: string, church_id: string, form_data: any } | null>(null);
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [selectedMinistryIds, setSelectedMinistryIds] = useState<string[]>([]);
    
    const applicationId = searchParams.get('application_id');
    const supabase = createClient();

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!applicationId) {
                toast({ title: "Erro", description: "Link de inscrição inválido ou ausente.", variant: "destructive"});
                setPageLoading(false);
                return;
            }

            setPageLoading(true);
            const { data: appData, error: appError } = await supabase
                .from('pending_registrations')
                .select('id, name, church_id, form_data')
                .eq('id', applicationId)
                .single();
            
            if (appError || !appData) {
                toast({ title: "Erro", description: "Inscrição não encontrada.", variant: "destructive"});
                setPageLoading(false);
                return;
            }
            
            setVolunteer(appData as any);
            const volunteerInterests = appData.form_data?.ministry_interests || [];

            const { data: ministriesData, error: ministriesError } = await supabase
                .from('pending_registrations')
                .select('id, name')
                .eq('church_id', appData.church_id)
                .eq('role', 'Ministério');

            if (ministriesError) {
                toast({ title: "Erro ao carregar ministérios", description: ministriesError.message, variant: "destructive" });
            } else {
                const fetchedMinistries = (ministriesData || []).map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    description: '', pastor: '', pastorAvatar: '', volunteers: []
                }));
                setMinistries(fetchedMinistries);
                
                // Pre-select ministries based on interest
                const interestedIds = fetchedMinistries
                    .filter(m => volunteerInterests.includes(m.name))
                    .map(m => m.id);
                setSelectedMinistryIds(interestedIds);
            }

            setPageLoading(false);
        };

        fetchInitialData();
    }, [applicationId, supabase, toast]);

    const handleToggleMinistry = (ministryId: string) => {
        setSelectedMinistryIds(prev =>
            prev.includes(ministryId)
                ? prev.filter(id => id !== ministryId)
                : [...prev, ministryId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedMinistryIds.length === 0) {
            toast({ title: "Nenhum ministério selecionado", description: "Por favor, escolha pelo menos um ministério.", variant: "destructive" });
            return;
        }
        setLoading(true);

        const updateData = {
            status: 'Aguardando Aprovação do Líder',
            form_data: {
                ...volunteer?.form_data,
                assigned_ministry_ids: selectedMinistryIds,
            }
        };

        const { error } = await supabase
            .from('pending_registrations')
            .update(updateData)
            .eq('id', applicationId!);

        setLoading(false);
        if (error) {
            toast({ title: "Erro ao direcionar", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Escolha enviada!", description: "Sua seleção foi enviada para aprovação do(s) líder(es). Obrigado!" });
            router.push('/login');
        }
    };

    if (pageLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!volunteer) {
        return <p className="text-center text-destructive">Não foi possível carregar as informações do voluntário.</p>;
    }

    return (
        <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Escolha de Ministérios</CardTitle>
                <CardDescription>
                    Olá, {volunteer.name.split(' ')[0]}! Selecione os ministérios nos quais você gostaria de servir.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Label className="font-semibold">Ministérios Disponíveis</Label>
                        <div className="space-y-2 max-h-72 overflow-y-auto rounded-md border p-4">
                            {ministries.length > 0 ? (
                                ministries.map(ministry => (
                                    <div key={ministry.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`ministry-${ministry.id}`}
                                            checked={selectedMinistryIds.includes(ministry.id)}
                                            onCheckedChange={() => handleToggleMinistry(ministry.id)}
                                        />
                                        <Label htmlFor={`ministry-${ministry.id}`} className="font-medium cursor-pointer">
                                            {ministry.name}
                                        </Label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Nenhum ministério disponível no momento.</p>
                            )}
                        </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? 'Enviando...' : 'Confirmar Escolha'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ChooseMinistryPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <ChooseMinistryFormComponent />
            </Suspense>
        </div>
    );
}

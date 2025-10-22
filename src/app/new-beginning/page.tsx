

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SmallGroup } from '@/lib/data';

function NewBeginningForm() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', service: '', smallGroupId: '' });
    const churchId = searchParams.get('church_id');
    const [churchName, setChurchName] = useState('Carregando...');
    const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!churchId) {
                setChurchName("Igreja não identificada");
                return;
            }
            const { data, error } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();
            
            if (error || !data) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(data.name);
            }
            
            const { data: groupsData, error: groupsError } = await supabase
                .from('small_groups')
                .select('id, name')
                .eq('church_id', churchId);

            if (groupsError) {
                console.error("Error fetching small groups", groupsError);
            } else {
                setSmallGroups(groupsData || []);
            }
        };

        fetchInitialData();
    }, [churchId]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
    };
    
    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!churchId) {
            toast({
                title: "Erro: Link Inválido",
                description: "O link de cadastro não contém um ID de igreja. Por favor, solicite um novo link.",
                variant: 'destructive'
            });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('new_beginnings')
                .insert({
                    church_id: churchId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    service_where_decision_was_made: formData.service,
                    small_group_id: formData.smallGroupId !== 'none' ? formData.smallGroupId : null,
                    status: 'Pendente',
                });

            if (error) throw error;
            
            toast({
                title: "Decisão Registrada!",
                description: "Que benção! Suas informações foram recebidas e em breve entraremos em contato.",
            });
            router.push('/login'); // For now, redirecting to login
        } catch (error: any) {
            toast({
                title: "Erro ao registrar",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Novo Convertido com Jesus</CardTitle>
                <CardDescription>
                    Ficamos muito felizes com a sua decisão! Por favor, preencha seus dados para que possamos caminhar com você.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="church-name">Igreja</Label>
                        <Input id="church-name" value={churchName} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Seu Nome Completo</Label>
                        <Input id="name" placeholder="Como podemos te chamar?" onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Seu Telefone (WhatsApp)</Label>
                        <Input id="phone" type="tel" placeholder="+5511999999999" onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Seu Email</Label>
                        <Input id="email" type="email" placeholder="seu.email@example.com" onChange={handleInputChange} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="service">Em qual culto você tomou essa decisão?</Label>
                             <Select onValueChange={(v) => handleSelectChange('service', v)}>
                                <SelectTrigger id="service">
                                    <SelectValue placeholder="Selecione um culto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Não sei informar">Não sei informar</SelectItem>
                                    <SelectItem value="Culto de Domingo (Manhã)">Culto de Domingo (Manhã)</SelectItem>
                                    <SelectItem value="Culto de Domingo (Noite)">Culto de Domingo (Noite)</SelectItem>
                                    <SelectItem value="Culto de Oração">Culto de Oração</SelectItem>
                                    <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smallGroupId">Você faz parte de algum Pequeno Grupo?</Label>
                            <Select onValueChange={(v) => handleSelectChange('smallGroupId', v)}>
                                <SelectTrigger id="smallGroupId">
                                    <SelectValue placeholder="Selecione um grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Não sei informar / Nenhum</SelectItem>
                                    {smallGroups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading || !churchId}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? 'Registrando...' : 'Registrar minha decisão'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function NewBeginningPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <NewBeginningForm />
            </Suspense>
        </div>
    );
}

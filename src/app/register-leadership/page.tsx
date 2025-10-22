
'use client';

import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function RegisterLeadershipForm() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const churchId = searchParams.get('church_id');
    const [churchName, setChurchName] = useState('Carregando...');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        password: '',
        confirm_password: '',
        birthdate: '',
        gender: '',
        marital_status: '',
    });
    const supabase = createClient();

    useEffect(() => {
        const fetchChurchName = async () => {
            if (!churchId) {
                toast({ title: "Erro: Link Inválido", description: "O link de cadastro está incompleto.", variant: 'destructive' });
                setPageLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();

            if (error || !data) {
                toast({ title: "Erro: Igreja não encontrada", description: "Não foi possível encontrar a igreja associada a este link.", variant: 'destructive' });
            } else {
                setChurchName(data.name);
            }
            setPageLoading(false);
        };

        fetchChurchName();
    }, [churchId, toast, supabase]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };
    
    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleRadioChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!churchId) {
             toast({ title: "Erro: Link inválido", variant: 'destructive' });
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirm_password) {
            toast({ title: "Senhas não coincidem", variant: 'destructive' });
            setLoading(false);
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { full_name: formData.name } }
        });

        if (authError) {
            toast({ title: "Erro ao criar usuário", description: authError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        const userId = authData.user?.id;
        if (!userId) {
            toast({ title: "Erro", description: "Não foi possível identificar o usuário.", variant: 'destructive'});
            setLoading(false);
            return;
        }

        try {
            // Upsert into 'members' to have a base profile for everyone
            const { error: memberError } = await supabase.from('members').upsert({
                id: userId,
                church_id: churchId,
                name: formData.name,
                email: formData.email,
                birthdate: formData.birthdate,
                gender: formData.gender,
                marital_status: formData.marital_status,
                role: formData.role,
            }, { onConflict: 'id' });

            if (memberError) throw memberError;

            // Upsert into 'pastors_and_leaders'
            const { error: leaderError } = await supabase.from('pastors_and_leaders').upsert({
                id: userId,
                church_id: churchId,
                name: formData.name,
                email: formData.email,
                role: formData.role
            }, { onConflict: 'id' });

            if (leaderError) throw leaderError;

            toast({ title: "Cadastro Concluído!", description: "Seu cadastro foi finalizado com sucesso. Você será redirecionado para o login.", });
            router.push('/login');
        } catch(error: any) {
             toast({ title: "Erro ao salvar perfil", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }
    
    if (pageLoading) {
        return <Loader2 className="h-8 w-8 animate-spin" />;
    }
    
    if (!churchId) {
        return (
             <Card className="w-full max-w-lg">
                <CardHeader className="text-center"><CardTitle>Link de Convite Inválido</CardTitle></CardHeader>
                <CardContent><p className="text-center">Este link de convite não é válido. Por favor, peça um novo ao administrador da sua igreja.</p></CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Cadastro de Liderança</CardTitle>
                <CardDescription>
                    Complete seus dados para criar o seu acesso à plataforma da igreja <strong>{churchName}</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="name">Seu Nome Completo</Label>
                                <Input id="name" onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Seu Email de Acesso</Label>
                                <Input id="email" type="email" onChange={handleInputChange} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="role">Sua Função/Cargo</Label>
                                 <Select name="role" onValueChange={(v) => handleSelectChange('role', v)} required>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Selecione o cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pastor">Pastor</SelectItem>
                                        <SelectItem value="Líder de Ministério">Líder de Ministério</SelectItem>
                                        <SelectItem value="Líder de Pequeno Grupo">Líder de Pequeno Grupo</SelectItem>
                                        <SelectItem value="Coordenador">Coordenador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" onChange={handleInputChange} required/>
                            </div>
                            <div className="space-y-2">
                                <Label>Gênero</Label>
                                <RadioGroup onValueChange={(v) => handleRadioChange('gender', v)} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Masculino" id="sex-male" />
                                        <Label htmlFor="sex-male" className="font-normal">Masculino</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Feminino" id="sex-female" />
                                        <Label htmlFor="sex-female" className="font-normal">Feminino</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="marital_status">Estado Civil</Label>
                                <Select name="marital_status" onValueChange={(v) => handleSelectChange('marital_status', v)} required>
                                    <SelectTrigger id="marital_status">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Crie uma Senha</Label>
                            <Input id="password" type="password" onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirme sua Senha</Label>
                            <Input id="confirm_password" type="password" onChange={handleInputChange} required />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                        {loading ? "Finalizando cadastro..." : "Finalizar Cadastro e Acessar"}
                    </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="underline">
                        Faça o login
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

export default function RegisterLeadershipPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <RegisterLeadershipForm />
            </Suspense>
        </div>
    );
}

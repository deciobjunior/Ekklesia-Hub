
'use client';

import Link from "next/link";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function RegisterConsolidatorForm() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const churchId = searchParams.get('church_id');
    const [churchName, setChurchName] = useState('Carregando...');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirm_password: '',
    });
    const supabase = createClient();

    useEffect(() => {
        const fetchChurchName = async () => {
            if (!churchId) {
                setChurchName("Igreja não identificada");
                toast({
                    title: "Erro: Link Inválido",
                    description: "O link de cadastro não contém um ID de igreja. Por favor, solicite um novo link.",
                    variant: 'destructive'
                });
                return;
            }
            const { data, error } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();
            
            if (error || !data) {
                console.error('Error fetching church name:', error);
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(data.name);
            }
        };

        fetchChurchName();
    }, [churchId, toast, supabase]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
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

        if (formData.password !== formData.confirm_password) {
            toast({
                title: "Senhas não coincidem",
                description: "Por favor, verifique se as senhas são iguais.",
                variant: 'destructive'
            });
            setLoading(false);
            return;
        }
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.name,
                }
            }
        });

        if (signUpError) {
             toast({ title: "Erro no Cadastro", description: signUpError.message, variant: "destructive" });
             setLoading(false);
             return;
        }

        if (!signUpData.user) {
            toast({ title: "Erro no Cadastro", description: "Não foi possível criar o usuário. Tente novamente.", variant: "destructive" });
            setLoading(false);
            return;
        }

        try {
            // ALSO insert into members table
            const { error: memberError } = await supabase
                .from('members')
                .insert({
                    id: signUpData.user.id,
                    church_id: churchId,
                    name: formData.name,
                    email: formData.email,
                    role: 'Consolidador',
                });
            if (memberError) throw memberError;


            const { error: profileError } = await supabase
                .from('volunteers')
                .insert({
                    id: signUpData.user.id,
                    church_id: churchId,
                    name: formData.name,
                    email: formData.email,
                    role: 'Consolidador',
                });

            if (profileError) {
                throw new Error(`Seu usuário foi criado, mas não foi possível criar seu perfil. Contate o suporte. Erro: ${'${profileError.message}'}`);
            }
            
            toast({
                title: "Cadastro Realizado!",
                description: "Bem-vindo! Estamos te redirecionando para a plataforma.",
            });

            router.push('/dashboard');

        } catch(error: any) {
             toast({ title: "Erro ao criar perfil", description: error.message, variant: "destructive" });
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
                <CardTitle className="text-2xl">Cadastro de Consolidador</CardTitle>
                <CardDescription>
                    Preencha os dados para criar seu acesso à plataforma de gestão da sua igreja.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="churchId">Sua Igreja</Label>
                            <Input id="church-name" value={churchName} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Seu Nome Completo</Label>
                            <Input id="name" placeholder="Como você se chama?" onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Seu Email de Acesso</Label>
                            <Input id="email" type="email" placeholder="seu.email@example.com" onChange={handleInputChange} required />
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
                    <Button type="submit" className="w-full" size="lg" disabled={loading || !churchId}>
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                        {loading ? "Criando cadastro..." : "Criar Cadastro e Acessar"}
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

export default function RegisterConsolidatorPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <RegisterConsolidatorForm />
            </Suspense>
        </div>
    );
}

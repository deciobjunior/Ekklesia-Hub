

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { counselingTopics } from '@/lib/data';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { MaskedInput } from '@/components/ui/masked-input';

function RegisterCounselorFormComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const churchId = searchParams.get('church_id');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [churchName, setChurchName] = useState('Carregando...');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const supabase = createClient();
    
    useEffect(() => {
        const fetchChurchName = async () => {
            if (!churchId) {
                setChurchName("Igreja não identificada");
                setPageLoading(false);
                return;
            }
            setPageLoading(true);
            const { data, error } = await supabase.from('churches').select('name').eq('id', churchId).single();
            if (error || !data) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(data.name);
            }
            setPageLoading(false);
        };
        fetchChurchName();
    }, [churchId, supabase]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };
    
    const handleRadioChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };
    
    const handleCheckboxChange = (topicLabel: string) => {
        setSelectedTopics(prev =>
            prev.includes(topicLabel)
                ? prev.filter(t => t !== topicLabel)
                : [...prev, topicLabel]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!churchId) {
            toast({ title: 'Erro de Formulário', description: 'ID da Igreja não encontrado.', variant: 'destructive' });
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

        // Step 1: Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.name,
                }
            }
        });

        if (authError) {
            toast({ title: "Erro ao criar usuário", description: authError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        if (!authData.user) {
             toast({ title: "Erro ao criar usuário", description: "Não foi possível criar o usuário. Tente novamente.", variant: 'destructive' });
             setLoading(false);
             return;
        }

        try {
            // Step 2: Insert into members table as a base profile for all users
            const { error: memberError } = await supabase.from('members').insert({
                id: authData.user.id,
                church_id: churchId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                birthdate: formData.birthdate,
                gender: formData.gender,
                marital_status: formData.marital_status,
                role: 'Conselheiro',
            });
            if (memberError) throw memberError;


            // Step 3: Insert counselor profile into the 'counselors' table
            const { error: counselorError } = await supabase.from('counselors').insert({
                id: authData.user.id,
                church_id: churchId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                topics: selectedTopics,
                gender: formData.gender,
            });

            if (counselorError) {
                throw counselorError;
            }

            // Step 4: Send welcome email
            try {
                await sendEmail({
                    to: formData.email,
                    subject: `Bem-vindo(a) à equipe de conselheiros - ${churchName}`,
                    body: `<h1>Olá, ${formData.name}!</h1><p>Seu cadastro como conselheiro(a) na plataforma de gestão da igreja <strong>${churchName}</strong> foi realizado com sucesso!</p><p>Você já pode acessar a plataforma utilizando o e-mail e a senha que você cadastrou.</p><p>Para acessar, <a href="${window.location.origin}/login">clique aqui</a>.</p><br><p>Agradecemos sua disposição em servir!</p><p><strong>Equipe de Liderança - ${churchName}</strong></p>`,
                });
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
                toast({
                    title: "Cadastro Concluído, mas...",
                    description: "Não foi possível enviar o e-mail de boas-vindas. Mesmo assim, seu cadastro foi realizado com sucesso. Por favor, verifique seu e-mail para confirmação da conta.",
                    variant: "default",
                });
            }
            
            toast({
                title: "Cadastro Realizado com Sucesso!",
                description: "Sua conta foi criada. Verifique seu e-mail para confirmação e depois faça o login.",
            });
            router.push('/login');

        } catch (error: any) {
             toast({
                title: "Erro ao salvar perfil",
                description: error.message,
                variant: 'destructive'
            });
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
                <CardHeader>
                    <CardTitle className="text-center">Link Inválido</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-destructive">O link de cadastro que você usou está incompleto. Por favor, solicite um novo link para sua igreja.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-3xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Cadastro de Conselheiro(a)</CardTitle>
                <CardDescription>
                    Preencha os campos abaixo para criar seu acesso e perfil de conselheiro para a igreja {churchName}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Informações Pessoais */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Pessoais</h3>
                         <div className="space-y-2">
                            <Label htmlFor="church-name">Igreja</Label>
                            <Input id="church-name" value={churchName} disabled />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" onChange={handleInputChange} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" onChange={handleInputChange} required/>
                            </div>
                             <div className="space-y-2">
                                <Label>Gênero</Label>
                                <RadioGroup value={formData.gender || ''} onValueChange={(v) => handleRadioChange('gender', v)} className="flex items-center gap-4 pt-2">
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
                                <Select value={formData.marital_status || ''} onValueChange={(v) => handleSelectChange('marital_status', v)}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                                <MaskedInput id="phone" onChange={handleInputChange} required/>
                            </div>
                        </div>
                    </div>
                    
                    {/* Informações de Acesso */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações de Acesso</h3>
                         <div className="grid md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="email">Email de Acesso</Label>
                                <Input id="email" type="email" placeholder="seu.email@example.com" onChange={handleInputChange} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input id="password" type="password" onChange={handleInputChange} required/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                                <Input id="confirm_password" type="password" onChange={handleInputChange} required/>
                            </div>
                         </div>
                    </div>

                    {/* Áreas de Atuação */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Áreas de Atuação</h3>
                        <p className="text-sm text-muted-foreground">Selecione as áreas em que você tem experiência para aconselhamento.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                            {counselingTopics.map((topic) => (
                                <div key={topic.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`topic-${topic.id}`}
                                        checked={selectedTopics.includes(topic.label)}
                                        onCheckedChange={() => handleCheckboxChange(topic.label)}
                                    />
                                    <Label htmlFor={`topic-${topic.id}`} className="font-normal">{topic.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading || pageLoading || !churchId}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? 'Criando Cadastro...' : 'Criar Cadastro'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function RegisterCounselorClientForm() {
    return (
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
            <RegisterCounselorFormComponent />
        </Suspense>
    )
}

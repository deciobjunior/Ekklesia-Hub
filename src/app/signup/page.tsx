'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MaskedInput } from "@/components/ui/masked-input";

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    // Form state
    const [churchName, setChurchName] = useState('');
    const [churchCnpj, setChurchCnpj] = useState('');
    const [churchPhone, setChurchPhone] = useState('');
    const [churchAddress, setChurchAddress] = useState('');
    const [pastorName, setPastorName] = useState('');
    const [pastorEmail, setPastorEmail] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                title: "Erro de Senha",
                description: "As senhas não coincidem.",
                variant: "destructive",
            });
            return;
        }
        setLoading(true);

        // 1. Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: adminEmail,
            password: password,
            options: {
                data: {
                    full_name: adminName,
                }
            }
        });

        if (authError) {
            toast({
                title: "Erro ao criar usuário",
                description: authError.message,
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        if (authData.user) {
             const { error: profileError } = await supabase.from('profiles').insert({
                id: authData.user.id,
                full_name: adminName,
                email: adminEmail,
            });

            if (profileError) {
                 toast({
                    title: "Erro ao criar perfil de usuário",
                    description: profileError.message,
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            // 3. Insert church data into the 'churches' table
            const { data: churchData, error: dbError } = await supabase
                .from('churches')
                .insert([
                    {
                        owner_id: authData.user.id,
                        name: churchName,
                        cnpj: churchCnpj,
                        phone: churchPhone,
                        address: churchAddress,
                        senior_pastor_name: pastorName,
                        senior_pastor_email: pastorEmail,
                    },
                ])
                .select()
                .single();
            
            if (dbError) {
                // Handle potential case where user is created but db insert fails
                toast({
                    title: "Erro ao salvar dados da igreja",
                    description: dbError.message,
                    variant: "destructive",
                });
            } else {
                 // 4. ALSO insert the owner as a member
                const { error: memberError } = await supabase
                    .from('members')
                    .insert({
                        id: authData.user.id,
                        church_id: churchData.id,
                        name: adminName,
                        email: adminEmail,
                        role: 'Administrador'
                    });

                if (memberError) {
                    toast({
                        title: "Erro ao criar perfil de membro",
                        description: `Sua igreja foi criada, mas não foi possível criar seu perfil de membro. Contate o suporte. Erro: ${memberError.message}`,
                        variant: "destructive"
                    });
                } else {
                    toast({
                        title: "Igreja Cadastrada com Sucesso!",
                        description: "Sua igreja foi registrada. Verifique seu e-mail para confirmar a conta.",
                    });
                    router.push('/login');
                }
            }
        }
        setLoading(false);
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Cadastre sua Igreja</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para criar o hub de gerenciamento da sua igreja.
            <br/>
            O primeiro usuário cadastrado será o coordenador principal do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Church Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações da Igreja</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="church-name">Nome da Igreja</Label>
                  <Input id="church-name" placeholder="Ex: Igreja da Comunidade" required value={churchName} onChange={(e) => setChurchName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="church-cnpj">CNPJ</Label>
                  <Input id="church-cnpj" placeholder="00.000.000/0001-00" required value={churchCnpj} onChange={(e) => setChurchCnpj(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="church-phone">Telefone de Contato da Igreja</Label>
                  <MaskedInput id="church-phone" required value={churchPhone} onChange={(e) => setChurchPhone(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="church-address">Endereço Principal</Label>
                  <Input id="church-address" placeholder="Rua, Número, Bairro, Cidade" required value={churchAddress} onChange={(e) => setChurchAddress(e.target.value)} />
                </div>
              </div>
            </div>

             {/* Liderança Principal */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Liderança Principal</h3>
                 <div className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label htmlFor="pastor-name">Nome do Pastor Sênior</Label>
                        <Input id="pastor-name" placeholder="Nome completo do pastor" value={pastorName} onChange={(e) => setPastorName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pastor-email">Email do Pastor Sênior</Label>
                        <Input id="pastor-email" type="email" placeholder="email.pastor@example.com" value={pastorEmail} onChange={(e) => setPastorEmail(e.target.value)} />
                    </div>
                 </div>
            </div>
            
            {/* Admin Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações do Coordenador</h3>
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label htmlFor="admin-name">Seu Nome Completo</Label>
                  <Input id="admin-name" required value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Seu Email</Label>
                  <Input id="admin-email" type="email" placeholder="voce@example.com" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Crie uma Senha</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirme sua Senha</Label>
                  <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta da Igreja'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
                Após o cadastro, você receberá um e-mail para confirmar sua conta antes de poder fazer o login.
            </p>
          </form>
          <div className="mt-6 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Faça o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

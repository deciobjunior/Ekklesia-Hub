
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no Login",
        description: "E-mail ou senha inválidos. Verifique seus dados e tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o dashboard.",
      });
      router.push('/dashboard');
    }
    setLoading(false);
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="mb-4 flex justify-center">
                        <Logo />
                    </div>
                     <CardTitle className="text-2xl">Configuração Incompleta</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erro de Configuração</AlertTitle>
                        <AlertDescription>
                           As credenciais do Supabase não foram encontradas. Por favor, edite o arquivo `.env` com suas chaves válidas e reinicie a aplicação.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center py-12 px-4">
          <div className="mx-auto grid w-[350px] gap-6">
             <div className="grid gap-2 text-center">
                <Logo />
                <h1 className="text-3xl font-bold mt-4">Acesse o HUB</h1>
                 <p className="text-balance text-muted-foreground">
                    Digite seu e-mail para acessar o painel da sua igreja.
                </p>
            </div>
             <form onSubmit={handleLogin}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Senha</Label>
                      <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Login'}
                  </Button>
                </div>
             </form>
             <div className="mt-4 text-center text-sm">
                Sua igreja ainda não tem um HUB?{" "}
                <Link href="/signup" className="underline">
                Cadastre-se
                </Link>
            </div>
          </div>
       </div>
       <div className="hidden bg-muted lg:flex items-center justify-center">
         <Image 
          src="https://rocinehvitcqfstcwntt.supabase.co/storage/v1/object/public/public_assets/Copilot_20250916_013905.png"
          alt="Imagem de uma igreja ou pessoas em comunidade"
          width={800}
          height={1000}
          className="object-cover w-full h-full"
          data-ai-hint="church illustration"
         />
       </div>
    </div>
  );
}

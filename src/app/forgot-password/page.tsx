'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { sendEmail } from '@/ai/flows/send-email-flow';

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const supabase = createClient();

    const handlePasswordResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
            toast({
                title: "Erro ao enviar e-mail",
                description: error.message,
                variant: 'destructive',
            });
        } else {
            setSubmitted(true);
        }
        
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Esqueceu sua Senha?</CardTitle>
                    <CardDescription>
                        {submitted 
                            ? "Um e-mail foi enviado para você com as instruções." 
                            : "Não se preocupe. Digite seu e-mail e enviaremos um link para você redefinir sua senha."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!submitted ? (
                        <form onSubmit={handlePasswordResetRequest} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Seu e-mail de cadastro</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu.email@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Link de Redefinição
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <p className="text-muted-foreground">
                                Se o e-mail estiver correto, você receberá um link em breve. Verifique sua caixa de entrada e pasta de spam.
                            </p>
                        </div>
                    )}
                     <div className="mt-4 text-center text-sm">
                        Lembrou a senha?{" "}
                        <Link href="/login" className="underline">
                            Fazer login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

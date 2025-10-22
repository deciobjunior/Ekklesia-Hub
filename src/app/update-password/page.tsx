'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function UpdatePasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: "Senhas não coincidem",
                description: "Por favor, verifique se as senhas são iguais.",
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            toast({
                title: "Erro ao atualizar senha",
                description: error.message,
                variant: 'destructive',
            });
        } else {
            setMessage('Sua senha foi atualizada com sucesso! Você pode fechar esta janela e fazer o login.');
             toast({
                title: "Senha atualizada!",
                description: "Você já pode fazer login com sua nova senha.",
            });
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
                    <CardTitle className="text-2xl">Redefinir sua Senha</CardTitle>
                    <CardDescription>
                       Digite sua nova senha abaixo para redefinir o acesso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {message ? (
                        <div className="text-center space-y-4">
                            <p className="text-green-600 font-semibold">{message}</p>
                            <Button asChild>
                                <Link href="/login">Ir para Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atualizar Senha
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

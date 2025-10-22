
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function DeprecatedRegisterLeaderPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-12 px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                 <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Logo />
                        </div>
                        <CardTitle>Link de Cadastro Descontinuado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-destructive">
                           Este link de convite foi descontinuado. Por favor, peça ao administrador da sua igreja para gerar um novo link a partir do painel de "Adicionar Pessoa" {'>'} "Equipe/Liderança".
                        </p>
                    </CardContent>
                </Card>
            </Suspense>
        </div>
    );
}



import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { BookingClientForm } from '@/components/auth/booking-client-form';

// This is now a pure Server Component
export default function BookingPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const churchId = searchParams.church_id as string | undefined;

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                {churchId ? (
                     <BookingClientForm churchId={churchId} />
                ) : (
                    <Card className="w-full max-w-2xl">
                        <CardHeader className="text-center">
                            <Logo />
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-destructive font-semibold">Erro: Igreja não identificada.</p>
                            <p className="text-muted-foreground">Por favor, utilize um link de agendamento válido fornecido pela sua igreja.</p>
                        </CardContent>
                    </Card>
                )}
            </Suspense>
        </div>
    );
}

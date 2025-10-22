

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/server';
import { AssociateChurchClientForm } from '@/components/auth/associate-church-client-form';

interface ChurchInfo {
    id: string;
    name: string;
    senior_pastor_name: string;
}

// This is now a Server Component
export default async function AssociateChurchPage() {
    
    // We create a server-side Supabase client to bypass RLS for this specific query.
    // This is safe because we're only reading public information (church names).
    const supabase = createClient();

    const { data, error } = await supabase.from('churches').select('id, name, senior_pastor_name');

    if (error) {
        console.error("Error fetching churches on server:", error.message);
        // We can render an error state or an empty list.
        // For now, we'll let the client component handle the empty state.
    }
    
    const churches: ChurchInfo[] = (data || []).map(church => ({
        id: church.id,
        name: church.name,
        senior_pastor_name: church.senior_pastor_name || 'Não informado',
    }));

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                 <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl">Associe-se a uma Igreja</CardTitle>
                        <CardDescription>
                            Seu usuário não está vinculado a nenhuma igreja. Por favor, selecione a sua comunidade abaixo para continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* The form logic is now in a separate Client Component */}
                        <AssociateChurchClientForm churches={churches} />
                    </CardContent>
                </Card>
            </Suspense>
        </div>
    );
}

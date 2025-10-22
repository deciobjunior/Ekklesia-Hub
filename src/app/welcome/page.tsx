

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { WelcomeClientForm } from '@/components/auth/welcome-client-form';

// This component is now simpler and only passes the churchId down.
export default function WelcomePage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const churchId = searchParams.church_id as string | undefined;

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <WelcomeClientForm churchId={churchId} />
            </Suspense>
        </div>
    );
}

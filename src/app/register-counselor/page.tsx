
'use client';

import { Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';
import { RegisterCounselorClientForm } from '@/components/auth/register-counselor-client-form';

// This page now only acts as a wrapper for the client component.
export default function RegisterCounselorPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-8 px-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <RegisterCounselorClientForm />
            </Suspense>
        </div>
    );
}

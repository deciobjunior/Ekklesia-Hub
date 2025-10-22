
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/communications/chat-interface';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Member } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { AddCommunicationGroupDialog } from '@/components/communications/add-communication-group-dialog';

function CommunicationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { churchId } = useUser();

    const initialConversationId = searchParams.get('conversationId');
    const newConversationWith = searchParams.get('newConversationWith');

    const handleConversationCreated = (newConversationId: string) => {
        router.push(`/communications?conversationId=${newConversationId}`);
    };

    return (
        <div className="h-full">
            <ChatInterface 
                onConversationCreated={handleConversationCreated}
                initialConversationId={initialConversationId}
                newConversationWith={newConversationWith}
            />
        </div>
    );
}

export default function CommunicationsPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <CommunicationPageContent />
        </Suspense>
    );
}

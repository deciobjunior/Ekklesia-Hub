
'use client';

import { redirect } from 'next/navigation';

export default function EditGroupPage() {
    // This page is no longer used, as editing is now handled in a modal.
    // We redirect back to the group details page.
    redirect(`/groups`);
}


'use client';

import { redirect } from 'next/navigation';

export default function EditMemberPage() {
    // This page is no longer used, as editing is now handled in a modal.
    // We redirect back to the main members page.
    redirect('/members');
}

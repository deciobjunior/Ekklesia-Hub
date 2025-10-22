
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page's content has been moved to /counseling/statistics under a tab.
// This file can be removed in the future.
export default function DeprecatedMyStatsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/counseling/statistics');
    }, [router]);

    return null;
}

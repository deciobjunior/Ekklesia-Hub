

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
    id: string;
    name: string;
    description: string;
    avatarUrl: string;
    initials: string;
}

export function RecentActivities() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: church } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
            if (!church) { setLoading(false); return; }

            const { data: newMembers, error } = await supabase
                .from('members')
                .select('id, name')
                .eq('church_id', church.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error fetching recent activities:", error);
                setActivities([]);
            } else {
                const formattedActivities = (newMembers || []).map(member => ({
                    id: member.id,
                    name: member.name,
                    description: 'Novo membro cadastrado',
                    avatarUrl: `https://placehold.co/40x40.png?text=${member.name.charAt(0)}`,
                    initials: member.name.charAt(0),
                }));
                setActivities(formattedActivities);
            }
            setLoading(false);
        };
        fetchActivities();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>Últimos cadastros realizados na plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Carregando atividades...</p>
                    ) : activities.length > 0 ? (
                        activities.map(activity => (
                            <div key={activity.id} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={activity.avatarUrl} alt={activity.name} data-ai-hint="person" />
                                    <AvatarFallback>{activity.initials}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{activity.name}</p>
                                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}



'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import CounselingSchedulesPageContent from './counseling-schedules-page-content';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function SchedulesPageSkeleton() {
    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Agenda de Atendimento Pastoral</h1>
                    <p className="text-muted-foreground">Visualize e gerencie os agendamentos dos conselheiros.</p>
                </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                 <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Selecionar Conselheiro</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardContent className="p-0">
                           <Skeleton className="h-[290px] w-full" />
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agendamentos</CardTitle>
                             <CardDescription>Lista de horários agendados para o dia selecionado.</CardDescription>
                        </CardHeader>
                         <CardContent className="p-6 pt-4">
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                         </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function SchedulesPage() {
    return (
        <Suspense fallback={<SchedulesPageSkeleton />}>
            <CounselingSchedulesPageContent />
        </Suspense>
    )
}

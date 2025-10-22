
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { PendingDisciple } from '@/app/(app)/discipleship/page';
import { AssignDisciplerDialog } from './assign-discipler-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PendingDisciplesCardProps {
    pendingDisciples: PendingDisciple[];
    onUpdate: () => void;
}

export function PendingDisciplesCard({ pendingDisciples, onUpdate }: PendingDisciplesCardProps) {
    const [selectedPendingDisciple, setSelectedPendingDisciple] = useState<PendingDisciple | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const handleAssignClick = (disciple: PendingDisciple) => {
        setSelectedPendingDisciple(disciple);
        setIsAssignDialogOpen(true);
    };

    if (pendingDisciples.length === 0) {
        return null;
    }

    return (
        <>
            <Card className="border-primary/50 bg-primary/5">
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <CollapsibleTrigger asChild>
                        <div className="flex justify-between items-center p-6 cursor-pointer">
                            <div>
                                <CardTitle className="text-primary flex items-center gap-2">
                                    <UserPlus />
                                    Discípulos em Espera ({pendingDisciples.length})
                                </CardTitle>
                                <CardDescription className="pt-1">
                                    Pessoas que vieram do Acolhimento e aguardam um discipulador.
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon">
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent>
                            <div className="space-y-2">
                                {pendingDisciples.map(disciple => (
                                    <div key={disciple.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                                        <p className="font-semibold">{disciple.name}</p>
                                        <Button size="sm" onClick={() => handleAssignClick(disciple)}>
                                            Designar Discipulador
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>

            {selectedPendingDisciple && (
                <AssignDisciplerDialog
                    open={isAssignDialogOpen}
                    onOpenChange={setIsAssignDialogOpen}
                    pendingDisciple={selectedPendingDisciple}
                    onSuccess={() => {
                        setIsAssignDialogOpen(false);
                        setSelectedPendingDisciple(null);
                        onUpdate();
                    }}
                />
            )}
        </>
    );
}


'use client';

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, ListFilter, Search, Trash2, Loader2, Pencil, Crown, CalendarDays } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Counselor } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { EditCounselorDialog } from "@/components/counseling/edit-counselor-dialog";


const dayAbbreviations: { [key: string]: string } = {
    Domingo: 'Dom',
    Segunda: 'Seg',
    Terça: 'Ter',
    Quarta: 'Qua',
    Quinta: 'Qui',
    Sexta: 'Sex',
    Sábado: 'Sáb',
};

export default function CounselorsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();


    const fetchCounselorsAndPermissions = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setLoggedInUserId(user.id);
        
        let churchId: string | null = null;
        
        const { data: profile } = await supabase
            .from('pastors_and_leaders')
            .select('role, church_id')
            .eq('id', user.id)
            .single();

        if (profile && (profile.role === 'Coordenador' || profile.role === 'Pastor')) {
            setCanEdit(true);
            churchId = profile.church_id;
        } else {
            setCanEdit(false);
            const { data: counselorChurch } = await supabase.from('counselors').select('church_id').eq('id', user.id).single();
            if(counselorChurch) {
                churchId = counselorChurch.church_id;
            } else {
                 const { data: ownerChurch } = await supabase.from('churches').select('id').eq('owner_id', user.id).single();
                 if(ownerChurch) churchId = ownerChurch.id;
            }
        }


        if (!churchId) {
            toast({ title: "Erro", description: "Não foi possível encontrar uma igreja associada a este usuário.", variant: "destructive"});
            setLoading(false);
            return;
        }

        const { data: counselorsData, error: counselorsError } = await supabase
            .from('counselors')
            .select('*')
            .eq('church_id', churchId);

        if (counselorsError) {
            toast({ title: "Erro ao buscar conselheiros", description: counselorsError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        const counselorIds = (counselorsData || []).map(c => c.id);
        const { data: pastorsData, error: pastorsError } = await supabase
            .from('pastors_and_leaders')
            .select('id, role')
            .in('id', counselorIds)
            .eq('role', 'Pastor');
            
        const pastorIds = new Set((pastorsData || []).map(p => p.id));

        const formattedData: Counselor[] = (counselorsData || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            avatar: `https://placehold.co/40x40.png?text=${item.name.charAt(0)}`,
            topics: item.topics || [],
            availability: item.availability || '{}',
            gender: item.gender || 'Não informado',
            role: pastorIds.has(item.id) ? 'Pastor' : 'Conselheiro',
        }));
        
        setCounselors(formattedData);
        setLoading(false);
    };

    useEffect(() => {
        fetchCounselorsAndPermissions();
        
        const channel = supabase.channel('counselors-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'counselors',
            },
            (payload) => {
                fetchCounselorsAndPermissions();
            }
        ).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredCounselors = counselors.filter(counselor => {
        const matchesSearchTerm = counselor.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTopics = selectedTopics.length === 0 || selectedTopics.every(topic => (counselor.topics || []).includes(topic));
        return matchesSearchTerm && matchesTopics;
    });

    const allTopics = Array.from(new Set(counselors.flatMap(c => c.topics || [])));

    const handleTopicChange = (topic: string) => {
        setSelectedTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    const handleEdit = (counselor: Counselor) => {
        setSelectedCounselor(counselor);
        setIsEditDialogOpen(true);
    };

    const handleViewSchedule = (counselorId: string) => {
        router.push(`/counseling/schedules?counselor=${counselorId}`);
    };
    
    const openDeleteDialog = (counselor: Counselor) => {
        setSelectedCounselor(counselor);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedCounselor) return;
        
        const { error } = await supabase.from('counselors').delete().eq('id', selectedCounselor.id);
        
        if (error) {
            toast({ title: "Erro ao desativar", description: error.message, variant: 'destructive' });
        } else {
            toast({
                title: "Conselheiro Desativado",
                description: `O conselheiro ${selectedCounselor.name} foi desativado.`,
            });
            fetchCounselorsAndPermissions();
        }
        setIsDeleteDialogOpen(false);
        setSelectedCounselor(null);
    }

    const handleUpdateCounselor = async (updatedCounselor: Counselor) => {
        setIsSaving(true);
        const { error } = await supabase
            .from('counselors')
            .update({
                email: updatedCounselor.email,
                phone: updatedCounselor.phone,
                gender: updatedCounselor.gender,
                topics: updatedCounselor.topics,
                availability: updatedCounselor.availability,
            })
            .eq('id', updatedCounselor.id);
        
        setIsSaving(false);

        if (error) {
             toast({ title: "Erro ao atualizar", description: error.message, variant: 'destructive' });
        } else {
            toast({
                title: "Conselheiro Atualizado!",
                description: `As informações de ${updatedCounselor.name} foram salvas.`,
            });
            setIsEditDialogOpen(false);
            fetchCounselorsAndPermissions();
        }
    }
    
    const userCanEdit = (counselorId: string) => {
        return canEdit || counselorId === loggedInUserId;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Conselheiros</h1>
                        <p className="text-muted-foreground">Gerencie a equipe de conselheiros da sua igreja.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nome..." 
                                className="pl-8 w-48 md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 gap-1">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Filtrar
                                </span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filtrar por área de atuação</DropdownMenuLabel>
                                {allTopics.map(topic => (
                                    <DropdownMenuCheckboxItem 
                                        key={topic}
                                        checked={selectedTopics.includes(topic)}
                                        onCheckedChange={() => handleTopicChange(topic)}
                                    >
                                        {topic}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Conselheiros Cadastrados ({filteredCounselors.length})</CardTitle>
                        <CardDescription>Lista de todos os conselheiros disponíveis para atendimento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                             <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {filteredCounselors.map((counselor) => {
                                    let availabilityDays: string[] = [];
                                    try {
                                        const availabilityObj = typeof counselor.availability === 'string' ? JSON.parse(counselor.availability) : counselor.availability;
                                        availabilityDays = Object.keys(availabilityObj || {}).filter(day => availabilityObj[day]?.length > 0);
                                    } catch (e) {
                                        // Ignore parse error
                                    }

                                    return (
                                    <div key={counselor.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={counselor.avatar} alt={counselor.name} data-ai-hint="person" />
                                                <AvatarFallback>{counselor.name.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-lg">{counselor.name}</p>
                                                    {counselor.role === 'Pastor' && (
                                                        <Badge variant="outline" className="text-primary border-primary/50">
                                                            <Crown className="mr-1 h-3 w-3" />
                                                            Pastor
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{counselor.email}</p>
                                                {(counselor.topics && counselor.topics.length > 0) && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {counselor.topics.slice(0, 3).map(topic => (
                                                            <Badge key={topic} variant="secondary">{topic}</Badge>
                                                        ))}
                                                        {counselor.topics.length > 3 && (
                                                            <Badge variant="outline">+{counselor.topics.length - 3}</Badge>
                                                        )}
                                                    </div>
                                                )}
                                                {availabilityDays.length > 0 && (
                                                     <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                                                         <CalendarDays className="h-3.5 w-3.5" />
                                                         <span className="font-medium">Disponível em:</span>
                                                          {availabilityDays.map(day => (
                                                            <Badge key={day} variant="outline" className="font-normal">{dayAbbreviations[day] || day}</Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 self-end sm:self-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    
                                                    {userCanEdit(counselor.id) && (
                                                        <DropdownMenuItem onClick={() => handleEdit(counselor)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem onClick={() => handleViewSchedule(counselor.id)}>Ver Agenda</DropdownMenuItem>
                                                    
                                                    {canEdit && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(counselor)}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Desativar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )})}
                                {filteredCounselors.length === 0 && !loading && (
                                    <div className="text-center text-muted-foreground py-10">
                                        <p>Nenhum conselheiro encontrado com os filtros selecionados.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá desativar o conselheiro <span className="font-bold">{selectedCounselor?.name}</span>. Ele não aparecerá mais como uma opção para novos agendamentos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Sim, desativar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedCounselor && userCanEdit(selectedCounselor.id) && (
                <EditCounselorDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    counselor={selectedCounselor}
                    onSave={handleUpdateCounselor}
                    isSaving={isSaving}
                />
            )}
        </>
    )
}

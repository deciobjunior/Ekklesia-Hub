
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { HistoryTable } from '@/components/members/history-table';
import { HistoryItem } from '@/app/(app)/members/page';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Loader2, Search, ListFilter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 15;

export default function HistoryPage() {
    const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { churchId, userRole, loading: userLoading } = useUser();
    const supabase = createClient();
    
    // State for filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilters, setSourceFilters] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!churchId) {
                if (!userLoading) setLoading(false);
                return;
            }
            setLoading(true);

            const [acolhimentoRes, ministeriosRes, aconselhamentoRes, membersRes] = await Promise.all([
                supabase.from('new_beginnings').select('id, activities').eq('church_id', churchId),
                supabase.from('pending_registrations').select('id, role, form_data->activities').eq('church_id', churchId).eq('role', 'Ministério'),
                supabase.from('pending_registrations').select('id, role, form_data->activities').eq('church_id', churchId).eq('role', 'Conselheiro'),
                supabase.from('members').select('id, name, created_at').eq('church_id', churchId),
            ]);

            let combinedHistory: HistoryItem[] = [];

            acolhimentoRes.data?.forEach(item => {
                if (item.activities && Array.isArray(item.activities)) {
                    combinedHistory.push(...item.activities.map((act: any) => ({ ...act, source: 'Acolhimento' })));
                }
            });
            ministeriosRes.data?.forEach((item: any) => {
                if (item.activities && Array.isArray(item.activities)) {
                    combinedHistory.push(...item.activities.map((act: any) => ({ ...act, source: 'Ministérios' })));
                }
            });
            aconselhamentoRes.data?.forEach((item: any) => {
                if (item.activities && Array.isArray(item.activities)) {
                    combinedHistory.push(...item.activities.map((act: any) => ({ ...act, source: 'Aconselhamento' })));
                }
            });
            membersRes.data?.forEach(item => {
                combinedHistory.push({
                    id: item.id,
                    timestamp: item.created_at,
                    user: 'Sistema',
                    action: 'member_created',
                    details: `Novo membro ${item.name} foi cadastrado.`,
                    source: 'Membros'
                });
            });

            combinedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            setAllHistory(combinedHistory);
            setLoading(false);
        }

        if (userRole === 'Administrador') {
            fetchHistory();
        } else if (!userLoading) {
            setLoading(false);
        }

    }, [churchId, userLoading, userRole, supabase]);

    const handleSourceFilterChange = (source: string) => {
        setSourceFilters(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
        setCurrentPage(1);
    };

    const filteredHistory = useMemo(() => {
        return allHistory.filter(item => {
            const searchMatch = searchTerm === '' ||
                item.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.details || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const sourceMatch = sourceFilters.length === 0 || sourceFilters.includes(item.source);

            return searchMatch && sourceMatch;
        });
    }, [allHistory, searchTerm, sourceFilters]);

    const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    
    const uniqueSources = Array.from(new Set(allHistory.map(item => item.source)));


    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (userRole !== 'Administrador') {
         return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Histórico de Atividades</h1>
                <p className="text-muted-foreground">Um registro de atividades importantes em diferentes módulos da plataforma.</p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div>
                            <CardTitle>Últimas Atividades ({filteredHistory.length})</CardTitle>
                            <CardDescription>Eventos recentes registrados no sistema.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por usuário ou ação..."
                                    className="pl-8 w-full sm:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-1">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        <span>Módulo</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filtrar por Módulo</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {uniqueSources.map(source => (
                                        <DropdownMenuCheckboxItem
                                            key={source}
                                            checked={sourceFilters.includes(source)}
                                            onCheckedChange={() => handleSourceFilterChange(source)}
                                        >
                                            {source}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <HistoryTable history={paginatedHistory} />
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Próxima
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

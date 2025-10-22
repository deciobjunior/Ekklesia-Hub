
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SmallGroup } from '@/lib/data';
import { User, MapPin, ArrowRight, Loader2, Users, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { AddGroupDialog } from '@/components/groups/add-group-dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';

type SmallGroupWithDetails = SmallGroup & {
  leader_name: string;
  member_count: number;
};

export default function GroupsPage() {
  const { toast } = useToast();
  const { churchId, loading: userLoading } = useUser();
  const [groups, setGroups] = useState<SmallGroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGroups = async (currentChurchId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('small_groups')
      .select(`
        *,
        leader:leader_id( name )
      `)
      .eq('church_id', currentChurchId);
    
    if (error) {
      toast({ title: "Erro ao buscar grupos", description: error.message, variant: 'destructive' });
    } else {
      const formattedGroups: SmallGroupWithDetails[] = data.map((group: any) => ({
        ...group,
        leader_name: group.leader?.name || 'Não definido',
        member_count: (group.member_ids || []).length,
        image_url: group.image_url || 'https://placehold.co/600x400.png',
      }));
      setGroups(formattedGroups);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (churchId) {
      fetchGroups(churchId);

      const channel = supabase.channel('small-groups-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'small_groups' }, 
          (payload) => {
              fetchGroups(churchId);
          })
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
    } else if (!userLoading) {
      setLoading(false);
      toast({ title: "Erro", description: "Igreja não encontrada para este usuário.", variant: "destructive" });
    }
  }, [churchId, userLoading, toast, supabase]);

  const totalMembers = groups.reduce((acc, group) => acc + group.member_count, 0);
  const uniqueLeaders = new Set(groups.map(g => g.leader_id)).size;

  if (loading || userLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Pequenos Grupos</h1>
          <p className="text-muted-foreground">Analise e gerencie os pequenos grupos da sua igreja.</p>
        </div>
        <AddGroupDialog onGroupCreated={() => churchId && fetchGroups(churchId)} />
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{groups.length}</div>
                  <p className="text-xs text-muted-foreground">Pequenos grupos ativos na igreja.</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{totalMembers}</div>
                  <p className="text-xs text-muted-foreground">Pessoas participando dos grupos.</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Líderes</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{uniqueLeaders}</div>
                  <p className="text-xs text-muted-foreground">Líderes de pequenos grupos.</p>
              </CardContent>
          </Card>
      </div>

       <Card>
         <CardHeader>
            <CardTitle>Lista de Grupos</CardTitle>
            <CardDescription>Gerencie todos os pequenos grupos cadastrados.</CardDescription>
         </CardHeader>
         <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10">
                            <AvatarImage src={group.image_url} alt={group.name} data-ai-hint="group people" />
                            <AvatarFallback>{group.name.slice(0,2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{group.leader_name}</TableCell>
                    <TableCell>{group.member_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {group.location}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" asChild>
                          <Link href={`/groups/${group.id}`}>
                            Ver Detalhes
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
         </CardContent>
       </Card>
    </div>
  );
}


'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, MapPin, Calendar, PlusCircle, Pencil, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { SmallGroup, Member } from '@/lib/data';
import { EditGroupDialog } from '@/components/groups/edit-group-dialog';

export type SmallGroupDetails = SmallGroup & {
  leader: Member | null;
  members: Member[];
};

export default function GroupDetailsPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<SmallGroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const supabase = createClient();

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    const { data: groupData, error: groupError } = await supabase
      .from('small_groups')
      .select(`
          *,
          leader:leader_id ( id, name, email, role )
      `)
      .eq('id', groupId)
      .single();
    
    if (groupError || !groupData) {
      setLoading(false);
      notFound();
      return;
    }
    
    const memberIds = groupData.member_ids || [];
    let allUsers: Member[] = [];
    
    if (memberIds.length > 0) {
        const tablesToFetch = ['members', 'pastors_and_leaders', 'volunteers'];
        
        const promises = tablesToFetch.map(async (tableName) => {
            const { data, error } = await supabase.from(tableName).select('*').in('id', memberIds);
            if (error) {
                console.error(`Error fetching from ${tableName}:`, error.message);
                return [];
            }
            return (data || []).map((u: any) => ({ ...u, role: u.role || 'Membro', status: 'Ativo' }));
        });

        const results = await Promise.all(promises);
        const combinedUsers = results.flat();
        const uniqueUsers = Array.from(new Map(combinedUsers.map(item => [item.id, item])).values());
        
        allUsers = uniqueUsers;
    }

    setGroup({
      ...(groupData as SmallGroup),
      leader: groupData.leader ? { ...groupData.leader, status: 'Ativo' } : null,
      members: allUsers,
    });

    setLoading(false);
  }, [groupId, toast, supabase]);

  useEffect(() => {
    fetchGroupDetails();

    const channel = supabase.channel(`group_details_${groupId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'small_groups', filter: `id=eq.${groupId}` }, 
        (payload) => {
            fetchGroupDetails();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [groupId, fetchGroupDetails, supabase]);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!group) {
    return notFound();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
              <Link href="/groups">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Voltar para Grupos</span>
              </Link>
              </Button>
              <div>
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              <p className="text-muted-foreground">Detalhes, membros e atividades do grupo.</p>
              </div>
          </div>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Grupo
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="p-0 overflow-hidden">
                <Image
                  src={group.image_url || `https://placehold.co/800x400.png`}
                  alt={`Imagem do grupo ${group.name}`}
                  width={800}
                  height={400}
                  className="w-full h-60 object-cover"
                  data-ai-hint="group people"
                />
              </CardHeader>
              <CardContent className="p-6">
                  <CardTitle>Membros ({group.members.length})</CardTitle>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                      {group.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg border">
                              <Avatar className="h-10 w-10">
                                  <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person" />
                                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p className="font-semibold">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.role}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Grupo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Líder</p>
                            <p className="font-semibold">{group.leader?.name || 'Não definido'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Localização</p>
                            <p className="font-semibold">{group.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Dia do Encontro</p>
                            <p className="font-semibold">Toda Quinta-feira, 20h</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <p>Nenhuma atividade recente para exibir.</p>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {group && (
        <EditGroupDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          group={group}
          onGroupUpdated={fetchGroupDetails}
        />
      )}
    </>
  );
}

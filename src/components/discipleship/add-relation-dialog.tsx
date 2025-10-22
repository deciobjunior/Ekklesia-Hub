

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type Member = {
  id: string;
  name: string;
};

interface MemberComboboxProps {
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
  placeholder: string;
}

function MemberCombobox({ members, selectedMemberId, onSelectMember, placeholder }: MemberComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMemberId
            ? members.find((member) => member.id === selectedMemberId)?.name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar membro..." />
          <CommandList>
            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => {
                    onSelectMember(member.id === selectedMemberId ? null : member.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMemberId === member.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {member.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface AddRelationDialogProps {
  onRelationCreated: () => void;
}

export function AddRelationDialog({ onRelationCreated }: AddRelationDialogProps) {
  const [open, setOpen] = useState(false);
  const [disciplerId, setDisciplerId] = useState<string | null>(null);
  const [discipleId, setDiscipleId] = useState<string | null>(null);
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('members').select('id, name');
      if (error) {
        toast({ title: "Erro ao buscar membros", description: error.message, variant: "destructive" });
      } else {
        setMembers(data);
      }
      setLoading(false);
    };

    if (open) {
      fetchMembers();
    }
  }, [open, toast]);

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplerId || !discipleId) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione um discipulador e um discípulo.",
        variant: "destructive",
      });
      return;
    }
    if (disciplerId === discipleId) {
       toast({
        title: "Seleção inválida",
        description: "O discipulador e o discípulo não podem ser a mesma pessoa.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: churchData } = await supabase.from('churches').select('id').eq('owner_id', user!.id).single();


    const { error } = await supabase
        .from('pending_registrations')
        .insert({
            church_id: churchData!.id,
            name: `Discipulado ${Date.now()}`,
            role: 'Discipulado',
            status: 'Ativo',
            form_data: {
                discipler_id: disciplerId,
                disciple_id: discipleId,
                meetings: [],
            }
        });

    setSaving(false);

    if (error) {
         toast({
            title: "Erro ao criar relação",
            description: error.message,
            variant: "destructive",
        });
    } else {
        toast({
        title: "Relação de Discipulado Criada!",
        description: "A nova relação foi salva com sucesso.",
        });
        setOpen(false);
        setDisciplerId(null);
        setDiscipleId(null);
        onRelationCreated(); // Call the callback to refresh the parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Relação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>Nova Relação de Discipulado</DialogTitle>
            <DialogDescription>
                Selecione o discipulador(a) e o discípulo(a) para criar uma nova relação.
            </DialogDescription>
        </DialogHeader>
        {loading ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
          <form onSubmit={handleCreateRelation}>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="discipler">Discipulador(a)</Label>
                      <MemberCombobox 
                        members={members}
                        selectedMemberId={disciplerId}
                        onSelectMember={setDisciplerId}
                        placeholder="Selecione o discipulador(a)"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="disciple">Discípulo(a)</Label>
                      <MemberCombobox 
                        members={members}
                        selectedMemberId={discipleId}
                        onSelectMember={setDiscipleId}
                        placeholder="Selecione o discípulo(a)"
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={() => { setDisciplerId(null); setDiscipleId(null); setOpen(false); }}>Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                    {saving ? 'Criando...' : 'Criar Relação'}
                  </Button>
              </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

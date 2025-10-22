
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';

export function AddKidDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateKid = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically gather form data and send it to your backend
    toast({
      title: "Criança Cadastrada!",
      description: "A nova criança foi cadastrada no sistema com sucesso.",
    });
    setOpen(false); // Close the dialog
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Cadastrar Criança
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastro de Criança</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para cadastrar uma nova criança no ministério infantil.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateKid}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="kid-name">Nome Completo da Criança</Label>
              <Input id="kid-name" placeholder="Nome da criança" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kid-birthdate">Data de Nascimento</Label>
              <Input id="kid-birthdate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kid-allergies">Alergias (opcional)</Label>
              <Input id="kid-allergies" placeholder="Ex: Amendoim, glúten, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kid-notes">Observações (opcional)</Label>
              <Textarea id="kid-notes" placeholder="Alguma informação importante sobre a criança?" />
            </div>
            
            <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-semibold text-sm">Informações do Responsável 1</h4>
                <div className="space-y-2">
                    <Label htmlFor="parent1-name">Nome do Responsável</Label>
                    <Input id="parent1-name" placeholder="Nome do pai, mãe ou responsável" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="parent1-phone">Telefone do Responsável (WhatsApp)</Label>
                    <Input id="parent1-phone" type="tel" placeholder="+5511999999999" required />
                </div>
            </div>

            <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-semibold text-sm">Informações do Responsável 2 (Opcional)</h4>
                <div className="space-y-2">
                    <Label htmlFor="parent2-name">Nome do Responsável</Label>
                    <Input id="parent2-name" placeholder="Nome do pai, mãe ou responsável" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="parent2-phone">Telefone do Responsável (WhatsApp)</Label>
                    <Input id="parent2-phone" type="tel" placeholder="+5511999999999" />
                </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Salvar Cadastro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

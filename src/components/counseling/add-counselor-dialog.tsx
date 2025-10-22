

'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { members, Counselor, counselingTopics } from "@/lib/data";
import { useToast } from '@/hooks/use-toast';

export function AddCounselorDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        toast({
            title: "Conselheiro Cadastrado!",
            description: `As informações do novo conselheiro foram salvas.`,
        });
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Conselheiro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Cadastro de Novo Conselheiro</DialogTitle>
                    <DialogDescription>Preencha as informações do conselheiro e suas áreas de atuação.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit}>
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold">Informações do Conselheiro</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="counselor-name">Nome do Conselheiro</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um membro da equipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members.filter(m => m.role === 'Pastor' || m.role === 'Líder').map(member => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="counselor-email">Email de Contato</Label>
                                    <Input id="counselor-email" type="email" placeholder="email.contato@example.com" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-md font-semibold">Áreas de Atuação</h3>
                            <p className="text-sm text-muted-foreground">Selecione as áreas em que o conselheiro tem experiência.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                                {counselingTopics.map((topic) => (
                                    <div key={topic.id} className="flex items-center gap-2">
                                        <Checkbox id={`topic-${topic.id}`} />
                                        <Label htmlFor={`topic-${topic.id}`} className="font-normal">{topic.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-6">
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

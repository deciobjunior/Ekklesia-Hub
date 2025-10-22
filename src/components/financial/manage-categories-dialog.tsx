'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { FinancialCategory } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ManageCategoriesDialogProps {
    categories: FinancialCategory[];
}

export function ManageCategoriesDialog({ categories: initialCategories }: ManageCategoriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'Entrada' | 'Saída'>('Entrada');
  const { toast } = useToast();

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
        toast({
            title: "Nome da categoria é obrigatório",
            variant: "destructive"
        });
        return;
    }
    const newCategory: FinancialCategory = {
        id: `cat-${Date.now()}`,
        name: newCategoryName,
        type: newCategoryType,
    };

    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    toast({
        title: "Categoria Adicionada!",
        description: `A categoria "${newCategoryName}" foi adicionada.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Gerenciar Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias Financeiras</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova as categorias de entradas e saídas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Categorias Atuais</Label>
                <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <div>
                                <span>{cat.name}</span>
                                <Badge variant={cat.type === 'Entrada' ? 'secondary' : 'outline'} className="ml-2">{cat.type}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
             <div className="space-y-3 rounded-md border p-4">
                <h4 className="font-semibold text-foreground">Nova Categoria</h4>
                 <div className="space-y-2">
                    <Label htmlFor="new-category-name">Nome da Categoria</Label>
                    <Input id="new-category-name" placeholder="Ex: Eventos, Doações Especiais" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Tipo</Label>
                     <RadioGroup value={newCategoryType} onValueChange={(value: 'Entrada' | 'Saída') => setNewCategoryType(value)}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Entrada" id="cat-type-income" />
                            <Label htmlFor="cat-type-income" className="font-normal">Entrada</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Saída" id="cat-type-expense" />
                            <Label htmlFor="cat-type-expense" className="font-normal">Saída</Label>
                        </div>
                    </RadioGroup>
                </div>
                 <Button className="w-full" type="button" onClick={handleAddNewCategory}>Adicionar Categoria</Button>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { financialCategories, Transaction } from '@/lib/data';

interface AddTransactionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  transaction?: Transaction | null;
  onSave?: (transaction: Transaction) => void;
}

export function AddTransactionDialog({ open, onOpenChange, transaction, onSave }: AddTransactionDialogProps) {
  const [type, setType] = useState<'Entrada' | 'Saída'>(transaction?.type || 'Entrada');
  const [category, setCategory] = useState(transaction?.category || '');
  
  const isEditing = !!transaction;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setCategory(transaction.category);
    } else {
      setType('Entrada');
      setCategory('');
    }
  }, [transaction]);

  const handleTypeChange = (newType: 'Entrada' | 'Saída') => {
    setType(newType);
    // Reset category when type changes as categories are dependent on type
    setCategory(''); 
  };
  
  const handleSubmit = () => {
    // In a real app, you would handle form submission more robustly
    // For now, we just close the dialog and call the onSave callback if it exists
    if(onSave && transaction) {
      // This is a simplified version. A real implementation would get values from form state.
      onSave(transaction); 
    }
    if (onOpenChange) onOpenChange(false);
  }

  const categories = financialCategories.filter(c => c.type === type);

  // When editing, we need to make sure the selected category is in the list, even if its type is different from the currently selected type. This can happen if the user changes the transaction type.
  if (isEditing && transaction && transaction.type !== type) {
     // If the stored category for the transaction being edited is not of the new type, we don't include it. The user must select a new, valid category.
  } else if (isEditing && transaction && !categories.some(c => c.name === transaction.category)) {
      const existingCategory = financialCategories.find(c => c.name === transaction.category);
      if(existingCategory) categories.push(existingCategory);
  }
  
  const dialogTitle = isEditing ? "Editar Transação" : "Registrar Nova Transação";
  const dialogDescription = isEditing ? "Atualize as informações da transação abaixo." : "Preencha as informações para adicionar uma nova entrada ou saída.";

  const trigger = (
    <DialogTrigger asChild>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        Nova Transação
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEditing && trigger}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Transação</Label>
            <RadioGroup value={type} onValueChange={handleTypeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Entrada" id="r-income" />
                <Label htmlFor="r-income">Entrada</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Saída" id="r-expense" />
                <Label htmlFor="r-expense">Saída</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" defaultValue={transaction?.description} placeholder="Ex: Oferta do culto, Conta de luz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input id="amount" type="number" defaultValue={transaction?.amount} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" defaultValue={transaction?.date.split('T')[0]} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>{isEditing ? "Salvar Alterações" : "Salvar Transação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

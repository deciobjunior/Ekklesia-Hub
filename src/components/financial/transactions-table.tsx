
'use client';

import { useState } from 'react';
import { Transaction } from '@/lib/data';
import { MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions: initialTransactions }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };
  
  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    // In a real app, you would send this to a server.
    // For now, we update the local state.
    setTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    setIsEditDialogOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead className="hidden md:table-cell">Data</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>
                <div className={`flex items-center font-semibold ${transaction.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'Entrada' ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                  R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                 <Badge variant={transaction.type === 'Entrada' ? 'secondary' : 'outline'}>{transaction.category}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">{formatDate(transaction.date)}</TableCell>
              <TableCell className="hidden md:table-cell">
                   <Badge variant={transaction.status === 'Conciliado' ? 'default' : 'destructive'}>{transaction.status}</Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEditClick(transaction)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Marcar como Conciliado</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Deletar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {selectedTransaction && (
        <AddTransactionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          transaction={selectedTransaction}
          onSave={handleUpdateTransaction}
        />
      )}
    </>
  );
}

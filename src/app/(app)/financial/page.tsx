
'use client';

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, PlusCircle, ArrowUpCircle, ArrowDownCircle, FolderOpen, FileUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsTable } from "@/components/financial/transactions-table";
import { transactions, financialCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/financial/add-transaction-dialog";
import { ManageCategoriesDialog } from "@/components/financial/manage-categories-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function FinancialPage() {
  
  const totalIncome = transactions
    .filter(t => t.type === 'Entrada')
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'Saída')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Arquivo Selecionado",
        description: `O arquivo "${file.name}" foi selecionado e está pronto para ser processado.`,
      });
      // Reset the input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Controle as entradas, saídas e o fluxo de caixa da igreja.</p>
        </div>
         <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".csv,.ofx,.txt" 
            />
            <Button variant="outline" onClick={handleImportClick}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar Extrato
            </Button>
            <AddTransactionDialog />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Atual
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
             <p className="text-xs text-muted-foreground">Balanço geral de todas as contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Entradas do Mês
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
             <p className="text-xs text-muted-foreground">+15% em relação ao mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saídas do Mês
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
             <p className="text-xs text-muted-foreground">+8% em relação ao mês passado</p>
          </CardContent>
        </Card>
      </div>

       <Tabs defaultValue="transactions">
        <div className="flex items-center">
            <TabsList>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="transactions">
           <Card>
             <CardHeader>
                <CardTitle>Últimas Transações</CardTitle>
                <CardDescription>Lista das últimas movimentações financeiras registradas.</CardDescription>
             </CardHeader>
             <CardContent>
                <TransactionsTable transactions={transactions} />
             </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="categories">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Categorias Financeiras</CardTitle>
                        <CardDescription>Gerencie as categorias de entradas e saídas.</CardDescription>
                    </div>
                    <ManageCategoriesDialog categories={financialCategories} />
                </CardHeader>
                <CardContent>
                   <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Entradas</h3>
                            <div className="space-y-2">
                                {financialCategories.filter(c => c.type === 'Entrada').map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-md border">
                                        <span>{cat.name}</span>
                                        <Badge variant="secondary">Entrada</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold mb-2">Saídas</h3>
                             <div className="space-y-2">
                                {financialCategories.filter(c => c.type === 'Saída').map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-md border">
                                        <span>{cat.name}</span>
                                         <Badge variant="outline">Saída</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                   </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

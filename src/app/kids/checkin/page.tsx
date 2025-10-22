

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ArrowRight, Loader2, User, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { kids as allKidsData, Kid } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function KidsCheckinPage() {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [foundKids, setFoundKids] = useState<Kid[]>([]);
    const [selectedKids, setSelectedKids] = useState<string[]>([]);


    const handleSearch = () => {
        if (phone.length < 10) {
             toast({
                title: "Telefone Inválido",
                description: "Por favor, insira um número de telefone válido com DDD.",
                variant: 'destructive'
            });
            return;
        }
        setIsLoading(true);
        // Simulate API call to find children by parent's phone
        setTimeout(() => {
            const kidsOfParent = allKidsData.filter(kid => 
                kid.parents.some(p => p.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
            );
            
            if (kidsOfParent.length === 0) {
                toast({
                    title: "Nenhuma criança encontrada",
                    description: "Não encontramos crianças associadas a este número de telefone. Por favor, verifique o número ou cadastre a criança.",
                    variant: "destructive"
                });
            }

            setFoundKids(kidsOfParent);
            setStep(2);
            setIsLoading(false);
        }, 1500);
    };

    const handleConfirmCheckin = async () => {
      if (selectedKids.length === 0) {
        toast({
          title: "Nenhuma criança selecionada",
          description: "Por favor, selecione pelo menos uma criança para fazer o check-in.",
          variant: "destructive",
        });
        return;
      }
      setIsConfirming(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
          title: "Check-in Confirmado! (Simulação)",
          description: "A notificação seria enviada para o seu WhatsApp.",
      });
      setStep(3);
      setIsConfirming(false);
    };

    const toggleKidSelection = (kidId: string) => {
        setSelectedKids(prev => 
            prev.includes(kidId) ? prev.filter(id => id !== kidId) : [...prev, kidId]
        );
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Check-in | Ministério Infantil</CardTitle>
                    <CardDescription>
                        {step === 1 && "Bem-vindo! Vamos começar o processo de check-in das crianças."}
                        {step === 2 && "Selecione as crianças que estão fazendo o check-in hoje."}
                        {step === 3 && "Check-in realizado com sucesso!"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label htmlFor="phone">Qual o seu número de Celular (WhatsApp)?</Label>
                                <Input 
                                    id="phone" 
                                    type="tel" 
                                    placeholder="+5511999999999" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Usaremos este número para identificá-lo e para comunicações importantes.</p>
                            </div>
                            <Button className="w-full" size="lg" onClick={handleSearch} disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        Buscar Crianças
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                         <div className="space-y-4">
                            {foundKids.length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Crianças encontradas:</Label>
                                     <div className="space-y-2 rounded-md border p-2">
                                        {foundKids.map(kid => (
                                            <div key={kid.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => toggleKidSelection(kid.id)}>
                                                <Checkbox
                                                    id={`kid-${kid.id}`}
                                                    checked={selectedKids.includes(kid.id)}
                                                    onCheckedChange={() => toggleKidSelection(kid.id)}
                                                />
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={kid.avatar} alt={kid.name} data-ai-hint="person child" />
                                                    <AvatarFallback>{kid.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <label htmlFor={`kid-${kid.id}`} className="font-medium cursor-pointer">{kid.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground">Nenhuma criança encontrada para este número.</p>
                            )}

                            <Button className="w-full" size="lg" onClick={handleConfirmCheckin} disabled={isConfirming || foundKids.length === 0}>
                                {isConfirming ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    'Confirmar Check-in'
                                )}
                            </Button>
                            <Button variant="link" onClick={() => { setStep(1); setFoundKids([]); }}>Voltar</Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                            <p>O check-in foi concluído e a notificação enviada. Dirija-se à sala correspondente.</p>
                            <Button onClick={() => {
                                setStep(1);
                                setPhone('');
                                setSelectedKids([]);
                                setFoundKids([]);
                            }}>
                                Novo Check-in
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

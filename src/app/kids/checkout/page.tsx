

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { kids as allKidsData, Kid, kidsCheckIns } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


export default function KidsCheckoutPage() {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [checkedInKids, setCheckedInKids] = useState<Kid[]>([]);
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
        // Simulate an API call to find the parent and their checked-in children
        setTimeout(() => {
            const parentPhone = phone.replace(/\D/g, '');
            const checkinsForParent = kidsCheckIns.filter(checkin => 
                checkin.status === 'CheckedIn' &&
                allKidsData.some(kid => 
                    kid.id === checkin.kidId && 
                    kid.parents.some(p => p.phone.replace(/\D/g, '') === parentPhone)
                )
            );

            const kidsToCheckout = allKidsData.filter(kid => 
                checkinsForParent.some(c => c.kidId === kid.id)
            );
            
            setCheckedInKids(kidsToCheckout);
            setStep(2);
            setIsLoading(false);
        }, 1500);
    };
    
    const handleConfirmCheckout = () => {
      if (selectedKids.length === 0) {
        toast({
          title: "Nenhuma criança selecionada",
          description: "Por favor, selecione pelo menos uma criança para fazer o checkout.",
          variant: "destructive",
        });
        return;
      }
      setIsConfirming(true);
      // Simulate API call to process checkout
      setTimeout(() => {
        toast({
            title: "Checkout Confirmado!",
            description: "O registro de saída foi realizado com sucesso.",
        });
        setStep(3);
        setIsConfirming(false);
      }, 1000);
    };

    const toggleKidSelection = (kidId: string) => {
        setSelectedKids(prev => 
            prev.includes(kidId) ? prev.filter(id => id !== kidId) : [...prev, kidId]
        );
    };

    const handleReset = () => {
        setStep(1);
        setPhone('');
        setCheckedInKids([]);
        setSelectedKids([]);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Checkout | Ministério Infantil</CardTitle>
                    <CardDescription>
                         {step === 1 && "Para iniciar a retirada, por favor, identifique-se."}
                         {step === 2 && "Selecione as crianças que estão sendo retiradas."}
                         {step === 3 && "Retirada concluída com sucesso!"}
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
                                <p className="text-xs text-muted-foreground">Usaremos este número para identificá-lo e garantir a segurança na retirada.</p>
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
                            {checkedInKids.length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Crianças com check-in ativo:</Label>
                                     <div className="space-y-2 rounded-md border p-2">
                                        {checkedInKids.map(kid => (
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
                                <p className="text-center text-muted-foreground">Nenhuma criança com check-in ativo encontrada para este número.</p>
                            )}

                            <Button className="w-full" size="lg" onClick={handleConfirmCheckout} disabled={isConfirming || checkedInKids.length === 0}>
                                {isConfirming ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    'Confirmar Checkout'
                                )}
                            </Button>
                            <Button variant="link" onClick={() => setStep(1)}>Voltar</Button>
                        </div>
                    )}
                    
                     {step === 3 && (
                        <div className="text-center space-y-4">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                            <p>Obrigado! Pode buscar sua(s) criança(s) na sala.</p>
                            <Button onClick={handleReset}>
                                Novo Checkout
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

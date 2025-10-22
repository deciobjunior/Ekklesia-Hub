
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kids, kidsCheckIns as initialKidsCheckIns, kidsVolunteers, KidCheckIn, Kid } from "@/lib/data";
import { AlertCircle, Baby, CheckCircle, Clock, Link as LinkIcon, User, Users, MessageSquare, QrCode, LogIn, LogOut } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AddKidDialog } from '@/components/kids/add-kid-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import Link from 'next/link';


export default function KidsPage() {
    const [isClient, setIsClient] = useState(false);
    const [kidsCheckIns, setKidsCheckIns] = useState<KidCheckIn[]>(initialKidsCheckIns);
    const { toast } = useToast();
    const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
    const [selectedKidInfo, setSelectedKidInfo] = useState<{ kid?: Kid; parentPhone?: string; parentName?: string} | null>(null);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [checkinUrl, setCheckinUrl] = useState('');

    useEffect(() => {
        setIsClient(true);
        // Ensure window is defined before using it
        if (typeof window !== 'undefined') {
            setCheckinUrl(`${window.location.origin}/kids/checkin`);
        }
    }, []);

    const getKidById = (id: string) => kids.find(k => k.id === id);

    const handleShareLink = (path: string, type: string) => {
        const link = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copiado!",
            description: `O link para ${type} foi copiado para sua área de transferência.`,
        });
    };
    
    const openNotifyDialog = (checkin: KidCheckIn) => {
        const kid = getKidById(checkin.kidId);
        if (!kid) return;
        
        const parent = kid.parents.find(p => p.name === checkin.checkedInBy);
        setSelectedKidInfo({ kid, parentPhone: parent?.phone, parentName: parent?.name });
        setIsNotifyDialogOpen(true);
    };

    const handleNotify = async () => {
        if (!message || !selectedKidInfo?.parentPhone) {
            toast({
                title: "Erro",
                description: "Mensagem ou telefone do responsável inválido.",
                variant: 'destructive'
            });
            return;
        }

        setIsSending(true);

        // In a real app, you would call your backend/flow here.
        // For now, we simulate the action and show a toast.
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Sending message to ${selectedKidInfo.parentPhone}: ${message}`);
        
        toast({
            title: "Notificação Enviada (Simulação)!",
            description: `Uma mensagem foi enviada para ${selectedKidInfo.parentName}.`,
        });
        
        setMessage('');
        setIsNotifyDialogOpen(false);
        setIsSending(false);
    }

    const handleCheckOut = (checkInId: string) => {
        const kidToCheckOut = kidsCheckIns.find(c => c.checkInId === checkInId);
        if (!kidToCheckOut) return;

        setKidsCheckIns(prev => prev.filter(c => c.checkInId !== checkInId));

        toast({
            title: "Check-out Realizado!",
            description: `A saída de ${getKidById(kidToCheckOut.kidId)?.name} foi registrada.`,
        });
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Ministério Infantil</h1>
                        <p className="text-muted-foreground">Gerencie as crianças, voluntários e o check-in/check-out dos cultos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                           <Link href="/kids/checkin" target="_blank">
                             <LogIn className="mr-2 h-4 w-4" />
                             Abrir Check-in
                           </Link>
                        </Button>
                         <Button variant="outline" asChild>
                           <Link href="/kids/checkout" target="_blank">
                             <LogOut className="mr-2 h-4 w-4" />
                             Abrir Check-out
                           </Link>
                        </Button>
                         <AddKidDialog />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Crianças Cadastradas
                        </CardTitle>
                        <Baby className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kids.length}</div>
                        <p className="text-xs text-muted-foreground">
                        Total de crianças na base de dados.
                        </p>
                    </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                            Crianças Presentes
                            </CardTitle>
                             <Dialog>
                                <DialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <QrCode className="h-4 w-4 text-muted-foreground" />
                                        <span className="sr-only">Mostrar QR Code de Check-in</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xs">
                                    <DialogHeader>
                                        <DialogTitle>QR Code para Check-in</DialogTitle>
                                        <DialogDescription>
                                            Peça para os pais escanearem este código para realizar o check-in.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex items-center justify-center p-4">
                                        {checkinUrl && (
                                            <Image 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkinUrl)}`}
                                                alt="QR Code de Check-in"
                                                width={250}
                                                height={250}
                                                data-ai-hint="qr code"
                                            />
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button className="w-full" onClick={() => handleShareLink('/kids/checkin', 'a página de check-in')}>
                                            <LinkIcon className="mr-2 h-4 w-4"/>
                                            Copiar Link
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kidsCheckIns.filter(c => c.status === 'CheckedIn').length}</div>
                            <p className="text-xs text-muted-foreground">
                            Crianças com check-in ativo no culto de hoje.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Voluntários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kidsVolunteers.length}</div>
                        <p className="text-xs text-muted-foreground">
                        Total de voluntários ativos no ministério.
                        </p>
                    </CardContent>
                    </Card>
                </div>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Controle de Presença - Culto Atual</CardTitle>
                        <CardDescription>Acompanhe em tempo real a entrada e saída das crianças.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Criança</TableHead>
                                    <TableHead>Responsável (Check-in)</TableHead>
                                    <TableHead>Horário (Check-in)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {kidsCheckIns.map((checkin) => {
                                    const kid = getKidById(checkin.kidId);
                                    if (!kid) return null;

                                    return (
                                    <TableRow key={checkin.checkInId}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={kid.avatar} alt={kid.name} data-ai-hint="person child" />
                                                    <AvatarFallback>{kid.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{kid.name}</p>
                                                    {kid.allergies && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {kid.allergies}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground"/>
                                                {checkin.checkedInBy}
                                            </div>
                                        </TableCell>
                                         <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground"/>
                                                {isClient ? format(new Date(checkin.checkInTime), 'HH:mm') : '...'}
                                            </div>
                                         </TableCell>
                                         <TableCell>
                                            <Badge variant={checkin.status === 'CheckedIn' ? 'default' : 'secondary'}>
                                                {checkin.status === 'CheckedIn' ? 'Presente' : 'Retirada'}
                                            </Badge>
                                         </TableCell>
                                         <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => openNotifyDialog(checkin)}>Notificar Responsável</Button>
                                            <Button variant="secondary" size="sm" className="ml-2" onClick={() => handleCheckOut(checkin.checkInId)}>Registrar Saída</Button>
                                         </TableCell>
                                    </TableRow>
                                    );
                                })}
                                 {kidsCheckIns.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Nenhuma criança com check-in ativo no momento.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isNotifyDialogOpen} onOpenChange={(open) => { setIsNotifyDialogOpen(open); if(!open) setMessage(''); }}>
              <DialogContent>
                <DialogHeader>
                   <DialogTitle>Notificar Responsável de {selectedKidInfo?.kid?.name}</DialogTitle>
                   <DialogDescription>
                     A mensagem será enviada via WhatsApp para {selectedKidInfo?.parentName}.
                   </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="space-y-2">
                     <Label htmlFor="whatsapp-message">Mensagem</Label>
                     <Textarea 
                       id="whatsapp-message" 
                       placeholder="Escreva sua mensagem aqui..." 
                       rows={5}
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                     />
                   </div>
                </div>
                <DialogFooter>
                   <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                   </DialogClose>
                   <Button onClick={handleNotify} disabled={isSending}>
                    {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                   </Button>
                </DialogFooter>
              </DialogContent>
           </Dialog>
        </>
    );
}

    
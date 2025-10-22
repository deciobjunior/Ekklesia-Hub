

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AttendanceRegistrationPage() {
    const { toast } = useToast();

    const handleRegisterAttendance = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Frequência Registrada!",
            description: "Obrigado por registrar a frequência do culto.",
        });
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl">Registro de Frequência</CardTitle>
                    <CardDescription>
                        Voluntário, preencha os dados do culto para registrar a presença.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegisterAttendance} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="service-date">Data do Culto</Label>
                                <Input id="service-date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-type">Tipo de Culto</Label>
                                <Select required>
                                    <SelectTrigger id="service-type">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="domingo-manha">Culto de Domingo (Manhã)</SelectItem>
                                        <SelectItem value="domingo-noite">Culto de Domingo (Noite)</SelectItem>
                                        <SelectItem value="oracao">Culto de Oração</SelectItem>
                                        <SelectItem value="jovens">Culto de Jovens</SelectItem>
                                        <SelectItem value="evento-especial">Evento Especial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adults-count">Adultos</Label>
                                <Input id="adults-count" type="number" placeholder="0" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="kids-count">Crianças</Label>
                                <Input id="kids-count" type="number" placeholder="0" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visitors-count">Visitantes</Label>
                                <Input id="visitors-count" type="number" placeholder="0" required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" size="lg">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Frequência
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

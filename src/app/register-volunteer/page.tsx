
'use client';

export const dynamic = 'force-dynamic';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, Suspense, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Upload } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/ui/masked-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FileUploadInput = ({ id, label, required = false, disabled = false, existingUrl }: { id: string, label: string, required?: boolean, disabled?: boolean, existingUrl?: string }) => {
    const [fileName, setFileName] = useState('');
    
    useEffect(() => {
        if (existingUrl) {
            try {
                const url = new URL(existingUrl);
                // A decodificação é importante para nomes de arquivo com espaços ou caracteres especiais
                setFileName(decodeURIComponent(url.pathname.split('/').pop() || ''));
            } catch (e) {
                setFileName('Arquivo existente');
            }
        }
    }, [existingUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        } else if (!existingUrl) {
            setFileName('');
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}{required && <span className="text-destructive">*</span>}</Label>
            <div className="flex items-center justify-center w-full">
                <Label
                    htmlFor={id}
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        {fileName ? (
                             <p className="text-sm text-primary font-semibold truncate px-2" title={fileName}>{fileName}</p>
                        ) : (
                            <p className="mb-1 text-sm text-muted-foreground">
                                <span className="font-semibold">Clique para enviar</span>
                            </p>
                        )}
                    </div>
                    <Input id={id} name={id} type="file" className="hidden" onChange={handleFileChange} disabled={disabled} required={required && !existingUrl} />
                </Label>
            </div>
        </div>
    );
};

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFD") // Decomposes combined characters into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, "") // Removes diacritics
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // Replaces spaces and other special characters with underscore
}


function RegisterVolunteerForm() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const churchIdFromUrl = searchParams.get('church_id');
    const applicationId = searchParams.get('application_id');
    const [churchName, setChurchName] = useState('Carregando...');
    const [churchId, setChurchId] = useState<string | null>(churchIdFromUrl);
    const isEditMode = !!applicationId;
    const [showCriminalRecordUpload, setShowCriminalRecordUpload] = useState(false);
    const supabase = createClient();

     useEffect(() => {
        const fetchInitialData = async () => {
            setPageLoading(true);
            
            let currentChurchId = churchIdFromUrl;

            if (applicationId) {
                const { data: appData, error: appError } = await supabase
                    .from('pending_registrations')
                    .select('church_id, form_data')
                    .eq('id', applicationId)
                    .single();

                if (appError || !appData) {
                    toast({ title: "Erro", description: "Inscrição não encontrada.", variant: "destructive"});
                    setPageLoading(false);
                    return;
                }
                setFormData(appData.form_data);
                currentChurchId = appData.church_id;
                setChurchId(appData.church_id);
            }

            if (!currentChurchId) {
                setChurchName("Igreja não identificada");
                setPageLoading(false);
                return;
            }

            const { data: churchData, error: churchError } = await supabase
                .from('churches')
                .select('name')
                .eq('id', currentChurchId)
                .single();
            
            if (churchError || !churchData) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(churchData.name);
            }

            setPageLoading(false);
        };

        fetchInitialData();
    }, [churchIdFromUrl, applicationId, toast, supabase]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };
    
    const handleRadioChange = (id: string, value: string) => {
        if (id === 'is_member' || id === 'is_baptized' || id === 'is_in_gc') {
            setFormData(prev => ({...prev, [id]: value === 'true' }));
        } else {
            setFormData(prev => ({...prev, [id]: value }));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const currentChurchId = churchId;
        if (!currentChurchId) {
            toast({ title: "Erro: Link inválido", variant: "destructive" });
            setLoading(false);
            return;
        }

        try {
            const finalFormData = { ...formData, id: formData.id || crypto.randomUUID() };
            
            if (isEditMode && applicationId) {
                 const { error: updateError } = await supabase
                    .from('pending_registrations')
                    .update({ form_data: finalFormData, status: 'Em Validação' })
                    .eq('id', applicationId);
                 if (updateError) throw updateError;
                 toast({ title: "Cadastro Atualizado!", description: "Suas informações e documentos foram enviados para validação." });
                 router.push('/login');
            } else {
                // Logic for new public registration
                const { error: pendingRegError } = await supabase
                    .from('pending_registrations')
                    .insert({
                        id: (finalFormData as any).id,
                        church_id: currentChurchId,
                        name: (finalFormData as any).name,
                        email: (finalFormData as any).email,
                        role: 'Voluntário',
                        status: 'Pendente',
                        form_data: finalFormData,
                    });

                if (pendingRegError) throw pendingRegError;
                
                // ALSO create a base record in the members table for this new person
                const { error: memberInsertError } = await supabase
                    .from('members')
                    .insert({
                        id: (finalFormData as any).id,
                        church_id: currentChurchId,
                        name: (finalFormData as any).name,
                        email: (finalFormData as any).email,
                        phone: (finalFormData as any).phone,
                        birthdate: (finalFormData as any).birthdate,
                        gender: (finalFormData as any).gender,
                        marital_status: (finalFormData as any).maritalStatus,
                        role: 'Voluntário', // Initial role
                        status: 'Pendente', // Status of the person, not the application
                    });

                if (memberInsertError) {
                    // This is not a critical failure, but good to log.
                    // The main application is in pending_registrations.
                    console.error("Could not create base member record on volunteer signup:", memberInsertError.message);
                }


                toast({ title: "Inscrição Recebida!", description: "Sua inscrição como voluntário foi recebida e será analisada." });
                router.push('/login');
            }
        } catch (error: any) {
             toast({ title: "Erro ao enviar dados", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    if (pageLoading) {
        return (
             <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                 <CardTitle className="text-2xl">Voluntariado - {churchName}</CardTitle>
                 <div className="text-muted-foreground">
                    {isEditMode 
                        ? 'Complete ou corrija seu cadastro anexando os documentos abaixo.' 
                        : 'Aqui Somos todos Voluntários, e Servimos Por Algo Maior.'
                    }
                    {isEditMode && formData.rejection_reason && (
                        <p className="text-destructive text-sm mt-2">
                            <strong>Pendência:</strong> {formData.rejection_reason}
                        </p>
                    )}
                 </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome completo *</Label>
                        <Input id="name" value={formData.name || ''} onChange={handleInputChange} required disabled={isEditMode} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Telefone (whatsapp) *</Label>
                        <MaskedInput id="phone" value={formData.phone || ''} onChange={handleInputChange} required disabled={isEditMode}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" value={formData.email || ''} onChange={handleInputChange} required disabled={isEditMode}/>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                            <Label htmlFor="birthdate">Data de Nascimento</Label>
                            <Input id="birthdate" type="date" value={formData.birthdate || ''} onChange={handleInputChange} disabled={isEditMode} />
                        </div>
                        <div className="space-y-2">
                            <Label>Gênero</Label>
                            <RadioGroup onValueChange={(v) => handleRadioChange('gender', v)} value={formData.gender || ''} className="flex items-center gap-4 pt-2" disabled={isEditMode}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Masculino" id="gender-male" />
                                    <Label htmlFor="gender-male" className="font-normal">Masculino</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Feminino" id="gender-female" />
                                    <Label htmlFor="gender-female" className="font-normal">Feminino</Label>
                                </div>
                            </RadioGroup>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="maritalStatus">Estado Civil</Label>
                            <Select onValueChange={(v) => handleSelectChange('maritalStatus', v)} value={formData.maritalStatus || ''} disabled={isEditMode}>
                                <SelectTrigger id="maritalStatus"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <Input id="cpf" placeholder="000.000.000-00" value={formData.cpf || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rg">RG</Label>
                            <Input id="rg" placeholder="00.000.000-0" value={formData.rg || ''} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Você já é membro da Igreja Batista da Lagoinha? *</Label>
                        <RadioGroup onValueChange={(v) => handleRadioChange('is_member', v)} value={String(formData.is_member)} className="gap-2" disabled={isEditMode}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="member-yes" /><Label htmlFor="member-yes" className="font-normal">Sim</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="member-no" /><Label htmlFor="member-no" className="font-normal">Não</Label></div>
                        </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Você já é batizado nas águas? *</Label>
                        <RadioGroup onValueChange={(v) => handleRadioChange('is_baptized', v)} value={String(formData.is_baptized)} className="gap-2" disabled={isEditMode}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="baptized-yes" /><Label htmlFor="baptized-yes" className="font-normal">Sim</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="baptized-no" /><Label htmlFor="baptized-no" className="font-normal">Não</Label></div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label>Quanto tempo você está na {churchName}?</Label>
                        <RadioGroup onValueChange={(v) => handleRadioChange('time_in_church', v)} value={formData.time_in_church} className="gap-2" disabled={isEditMode}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Menos de 1 ano" id="time-1" /><Label htmlFor="time-1" className="font-normal">Menos de 1 ano</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="de 1 a 2 anos" id="time-2" /><Label htmlFor="time-2" className="font-normal">de 1 a 2 anos</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="de 3 a 5 anos" id="time-3" /><Label htmlFor="time-3" className="font-normal">de 3 a 5 anos</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="mais de 5 anos" id="time-4" /><Label htmlFor="time-4" className="font-normal">mais de 5 anos</Label></div>
                        </RadioGroup>
                    </div>

                     <div className="space-y-2">
                        <Label>Já participa de algum GC? (grupo de crescimento)</Label>
                        <RadioGroup onValueChange={(v) => handleRadioChange('is_in_gc', v)} value={String(formData.is_in_gc)} className="gap-2" disabled={isEditMode}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="gc-yes" /><Label htmlFor="gc-yes" className="font-normal">Sim</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="gc-no" /><Label htmlFor="gc-no" className="font-normal">Não</Label></div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="service_motivation">Para você, "SERVIR POR ALGO MAIOR" é servir por... *</Label>
                        <Input id="service_motivation" value={formData.service_motivation || ''} onChange={handleInputChange} required disabled={isEditMode} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="conversion_story">Descreva sua experiência de conversão a Jesus *</Label>
                        <div className="text-sm text-muted-foreground">
                            Escreva um breve testemunho pessoal de conversão seguindo o roteiro de perguntas abaixo:
                            <ul className="list-disc pl-5 mt-1">
                                <li>Como você vivia e pensava antes de se encontrar com Jesus?</li>
                                <li>Como Jesus se encontrou com você?</li>
                                <li>O que mudou em sua forma de viver e pensar depois que confiou sua fé a Jesus?</li>
                            </ul>
                        </div>
                        <Textarea id="conversion_story" value={formData.conversion_story || ''} rows={6} onChange={handleInputChange} required disabled={isEditMode} />
                    </div>

                    {isEditMode && (
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-foreground">Upload de Documentos</h3>
                            <div className="text-sm text-muted-foreground">Para finalizar seu cadastro, por favor, envie os documentos abaixo. Se precisar substituir um arquivo, basta enviar um novo no campo correspondente.</div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FileUploadInput id="photo-upload" label="Foto de Rosto" required existingUrl={formData['photo-upload_url']} />
                                <FileUploadInput id="doc-upload" label="Documento (CPF ou RG)" required existingUrl={formData['doc-upload_url']} />
                                <FileUploadInput id="address-proof-upload" label="Comprovante de Residência" required existingUrl={formData['address-proof-upload_url']} />
                                {showCriminalRecordUpload && (
                                    <FileUploadInput 
                                      id="criminal-record-upload" 
                                      label="Atestado de Antecedentes Criminais" 
                                      required={showCriminalRecordUpload} 
                                      existingUrl={formData['criminal-record-upload_url']} 
                                    />
                                )}
                            </div>
                        </div>
                    )}


                    <Button type="submit" className="w-full" size="lg" disabled={loading || pageLoading || (!churchId && !applicationId)}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? 'Enviando...' : isEditMode ? 'Reenviar para Validação' : 'Enviar Inscrição'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RegisterVolunteerPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-8 px-4">
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <RegisterVolunteerForm />
            </Suspense>
        </div>
    );
}

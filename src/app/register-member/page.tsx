

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SmallGroup } from '@/lib/data';
import { MaskedInput } from '@/components/ui/masked-input';

const FileUploadInput = ({ id, label, required = false, disabled = false, existingUrl }: { id: string, label: string, required?: boolean, disabled?: boolean, existingUrl?: string }) => {
    const [fileName, setFileName] = useState('');
    
    useEffect(() => {
        if (existingUrl) {
            try {
                const url = new URL(existingUrl);
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
}


function RegisterMemberForm() {
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
    const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
    const isEditMode = !!applicationId;
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

            const { data, error } = await supabase
                .from('churches')
                .select('name')
                .eq('id', currentChurchId)
                .single();
            
            if (error || !data) {
                setChurchName("Igreja não encontrada");
            } else {
                setChurchName(data.name);
            }

            const { data: groupsData, error: groupsError } = await supabase
                .from('small_groups')
                .select('id, name')
                .eq('church_id', currentChurchId);

            if (groupsError) {
                console.error("Error fetching small groups", groupsError);
            } else {
                setSmallGroups((groupsData || []).map((g: any) => ({ id: g.id, name: g.name, leader_id: '', member_ids: [], location: '', image_url: '' })));
            }
            setPageLoading(false);
        };

        fetchInitialData();
    }, [churchIdFromUrl, applicationId, toast, supabase]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };
    
    const handleRadioChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value}));
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const currentChurchId = churchId;

         if (!currentChurchId) {
            toast({
                title: "Erro: Link Inválido",
                description: "O link de cadastro não contém um ID de igreja. Por favor, solicite um novo link.",
                variant: 'destructive'
            });
            setLoading(false);
            return;
        }
        
        const newMemberId = isEditMode && formData.id ? formData.id : crypto.randomUUID();

        try {
            // Check for duplicate email
            if (formData.email) {
                const { data: existingMember, error: checkError } = await supabase
                    .from('members')
                    .select('id')
                    .eq('email', formData.email)
                    .not('id', 'eq', newMemberId) // Exclude the current user if they are editing
                    .maybeSingle();

                if (checkError) {
                    throw new Error(`Erro ao verificar e-mail: ${checkError.message}`);
                }
                if (existingMember) {
                    toast({
                        title: "E-mail já cadastrado",
                        description: "Este endereço de e-mail já está sendo usado por outro membro. Por favor, use um e-mail diferente.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
            }


            const fileInputs = [
                { id: 'photo-upload', file: (document.getElementById('photo-upload') as HTMLInputElement)?.files?.[0], oldUrlKey: 'photo-upload_url' },
                { id: 'doc-upload', file: (document.getElementById('doc-upload') as HTMLInputElement)?.files?.[0], oldUrlKey: 'doc-upload_url' },
                { id: 'address-proof-upload', file: (document.getElementById('address-proof-upload') as HTMLInputElement)?.files?.[0], oldUrlKey: 'address-proof-upload_url' },
            ];

            const uploadedFileUrls: Record<string, string> = {};
            const bucketName = 'volunteer_documents';

            for (const fileInput of fileInputs) {
                if (fileInput.file) {
                    const safeFileName = sanitizeFileName(fileInput.file.name);
                    const filePath = `${currentChurchId}/${newMemberId}/${fileInput.id}-${safeFileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, fileInput.file, { upsert: true });

                    if (uploadError) {
                        throw new Error(`Erro no upload do arquivo ${fileInput.file.name}: ${uploadError.message}`);
                    }
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(filePath);
                        
                    uploadedFileUrls[fileInput.oldUrlKey] = publicUrl;
                }
            }
            
            const submissionData = {
                ...formData,
                id: newMemberId,
                church_id: currentChurchId,
                is_baptized: formData.is_baptized === 'true',
                ...uploadedFileUrls,
            };

            const memberProfile: any = {
                id: newMemberId,
                church_id: currentChurchId,
                name: (submissionData as any).name,
                email: (submissionData as any).email,
                phone: (submissionData as any).phone,
                birthdate: (submissionData as any).birthdate,
                gender: (submissionData as any).gender,
                marital_status: (submissionData as any).marital_status,
                profession: (submissionData as any).profession,
                address: (submissionData as any).address,
                role: 'Membro',
                status: 'Ativo',
            };
            
            const { error: memberUpsertError } = await supabase.from('members').upsert(memberProfile, { onConflict: 'id' });
            if(memberUpsertError) throw memberUpsertError;
            
            if (isEditMode) {
                 const { error: updateError } = await supabase
                    .from('pending_registrations')
                    .update({ form_data: submissionData, status: 'Em Validação' })
                    .eq('id', applicationId);
                 if (updateError) throw updateError;
                 toast({ title: "Cadastro de Membro Concluído!", description: "Seu perfil de membro foi criado e seu status de voluntário atualizado." });
            } else {
                const { error } = await supabase
                  .from('pending_registrations')
                  .upsert({
                    id: newMemberId,
                    church_id: currentChurchId,
                    name: formData.name,
                    email: formData.email,
                    role: 'Membro',
                    status: 'Pendente',
                    form_data: submissionData,
                  }, { onConflict: 'id' });
                
                if (error) throw error;
                
                toast({
                    title: "Cadastro Enviado para Análise!",
                    description: "Obrigado! Suas informações foram enviadas e aguardam a ativação de um coordenador.",
                });
            }
            router.push('/login');

        } catch (error: any) {
             toast({
                title: "Erro ao salvar o cadastro",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }


    return (
        <Card className="w-full max-w-4xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl">Cadastro de Novo Membro</CardTitle>
                <CardDescription>
                    {isEditMode ? 'Complete ou corrija seu cadastro para continuar.' : 'Preencha os campos abaixo com suas informações. Seu cadastro será enviado para aprovação.'}
                     {isEditMode && formData.rejection_reason && (
                        <div className="text-destructive text-sm mt-2">
                            <strong>Pendência:</strong> {formData.rejection_reason}
                        </div>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                     {/* Informações Pessoais */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Pessoais</h3>
                         <div className="space-y-2">
                            <Label htmlFor="church-name">Igreja</Label>
                            <Input id="church-name" value={churchName} disabled />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" value={formData.name || ''} onChange={handleInputChange} required disabled={isEditMode}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="seu.email@example.com" value={formData.email || ''} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Sexo</Label>
                                <RadioGroup onValueChange={(v) => handleRadioChange('gender', v)} value={formData.gender || ''} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Masculino" id="sex-male" />
                                        <Label htmlFor="sex-male" className="font-normal">Masculino</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Feminino" id="sex-female" />
                                        <Label htmlFor="sex-female" className="font-normal">Feminino</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" value={formData.birthdate || ''} onChange={handleInputChange} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mother_name">Nome Completo da Mãe</Label>
                                <Input id="mother_name" value={formData.mother_name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="father_name">Nome Completo do Pai</Label>
                                <Input id="father_name" value={formData.father_name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="marital_status">Estado Civil</Label>
                                <Select onValueChange={(v) => handleSelectChange('marital_status', v)} value={formData.marital_status || ''}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profession">Profissão</Label>
                                <Input id="profession" value={formData.profession || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                                <MaskedInput id="phone" value={formData.phone || ''} onChange={handleInputChange} required/>
                            </div>
                            
                        </div>
                    </div>

                     {/* Documentação */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Documentação</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input id="cpf" value={formData.cpf || ''} onChange={handleInputChange} required disabled={isEditMode} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rg">RG</Label>
                                <Input id="rg" value={formData.rg || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Endereço</h3>
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="zip_code">CEP</Label>
                                <Input id="zip_code" value={formData.zip_code || ''} placeholder="00000-000" onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2 md:col-span-3">
                                <Label htmlFor="address">Endereço Completo</Label>
                                <Input id="address" value={formData.address || ''} placeholder="Logradouro, número, complemento" onChange={handleInputChange}/>
                            </div>
                        </div>
                    </div>

                    {/* Informações Eclesiásticas */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Eclesiásticas</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Foi Batizado?</Label>
                                <RadioGroup onValueChange={(v) => handleRadioChange('is_baptized', v)} value={String(formData.is_baptized)} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="true" id="baptized-yes" />
                                        <Label htmlFor="baptized-yes" className="font-normal">Sim</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="false" id="baptized-no" />
                                        <Label htmlFor="baptized-no" className="font-normal">Não</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="origin_church">Nome da última igreja que frequentou</Label>
                                <Input id="origin_church" value={formData.origin_church || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="doubts">Dúvidas?</Label>
                                <Textarea id="doubts" value={formData.doubts || ''} placeholder="Deixe suas dúvidas aqui..." rows={3} onChange={handleInputChange}/>
                            </div>
                        </div>
                    </div>

                    {/* Uploads */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Uploads de Documentos</h3>
                         <p className="text-sm text-muted-foreground">Para agilizar seu cadastro, por favor, envie os seguintes documentos.</p>
                        <div className="grid md:grid-cols-3 gap-6">
                            <FileUploadInput id="photo-upload" label="Foto de Rosto" required existingUrl={formData['photo-upload_url']} />
                            <FileUploadInput id="doc-upload" label="Documento (RG/CNH)" required existingUrl={formData['doc-upload_url']} />
                            <FileUploadInput id="address-proof-upload" label="Comprovante de Residência" required existingUrl={formData['address-proof-upload_url']} />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading || pageLoading || (!churchId && !applicationId)}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? 'Enviando...' : 'Enviar Cadastro'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RegisterMemberPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 py-8 px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <RegisterMemberForm />
            </Suspense>
        </div>
    );
}

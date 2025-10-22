
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, ArrowLeft, User, UserPlus, Handshake, Users, HeartHandshake, Upload, Link as LinkIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { ministries, counselingTopics, SmallGroup } from '@/lib/data';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendEmail } from '@/ai/flows/send-email-flow';

type Step = 'initial' | 'member-form' | 'team-form' | 'visitor-form' | 'new-beginning-form' | 'counselor-form';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface AddMemberDialogProps {
  onMemberAdded: () => void;
}

export function AddMemberDialog({ onMemberAdded }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('initial');
  const { toast } = useToast();
  const [churchId, setChurchId] = useState<string | null>(null);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const supabase = createClient();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: church } = await supabase
                .from('churches')
                .select('id')
                .eq('owner_id', user.id)
                .single();
            if (church) {
                setChurchId(church.id);
                 const { data: groupsData, error: groupsError } = await supabase
                    .from('small_groups')
                    .select('id, name')
                    .eq('church_id', church.id);

                if (groupsError) {
                    console.error("Error fetching small groups", groupsError);
                } else {
                    setSmallGroups((groupsData || []).map((g: any) => ({ ...g, leader_id: null, member_ids: [], location: '', image_url: '' })));
                }
            }
        }
    };
    if (open) {
        getInitialData();
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('initial');
        setFormData({});
        setAvailability({});
      }, 300);
    }
    setOpen(isOpen);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({...prev, [e.target.id]: e.target.value}));
  }

  const handleSelectChange = (id: string, value: string) => {
      setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRadioChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFormData(prev => ({...prev, [id]: checked}));
  }
  
  const handleAvailabilityChange = (day: string, period: string, checked: boolean) => {
    setAvailability(prev => {
        const dayAvailability = prev[day] || [];
        if (checked) {
            return { ...prev, [day]: [...dayAvailability, period] };
        } else {
            return { ...prev, [day]: dayAvailability.filter(p => p !== period) };
        }
    });
  };

  const getChurchIdOrThrow = () => {
    if (!churchId) {
        toast({ title: "Erro", description: "ID da Igreja não encontrado. Recarregue a página.", variant: "destructive" });
        throw new Error("Church ID not found");
    }
    return churchId;
  }

  const handleShareLink = (path: string, type: string) => {
    try {
        const currentChurchId = getChurchIdOrThrow();
        const signupUrl = `${window.location.origin}${path}?church_id=${currentChurchId}`;
        navigator.clipboard.writeText(signupUrl);
        toast({
          title: "Link Copiado!",
          description: `O link de cadastro para ${type} foi copiado.`,
        });
        handleOpenChange(false);
    } catch (error: any) {
        // Error is already toasted by getChurchIdOrThrow
    }
  };
  
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Members don't have auth, so we generate a UUID for them
      const newMemberId = crypto.randomUUID();

      const submissionData = {
          id: newMemberId,
          church_id: getChurchIdOrThrow(),
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          birthdate: formData.birthdate || null,
          gender: formData.gender || null,
          marital_status: formData.marital_status || null,
          profession: formData.profession || null,
          mother_name: formData.mother_name || null,
          father_name: formData.father_name || null,
          cpf: formData.cpf || null,
          rg: formData.rg || null,
          zip_code: formData.zip_code || null,
          address: formData.address || null,
          is_baptized: formData.is_baptized === 'sim',
          origin_church: formData.origin_church || null,
          doubts: formData.doubts || null,
          status: 'Ativo',
      };

      // Directly insert into members table since it's an admin action
      const { error } = await supabase.from('members').insert([submissionData]);

      if (error) throw error;
      toast({ title: "Sucesso!", description: `${formData.name} foi adicionado como membro.` });
      onMemberAdded();
      handleOpenChange(false);
    } catch(error: any) {
      toast({ title: "Erro ao cadastrar membro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submissionData = {
          church_id: getChurchIdOrThrow(),
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          how_met_church: formData.how_met_church || null,
          service_visited: formData.service_visited || null,
          small_group_id: formData.small_group_id !== 'none' ? formData.small_group_id : null,
      };
      const { error } = await supabase.from('visitors').insert([submissionData]);
      if (error) throw error;
      toast({ title: "Sucesso!", description: `Visitante ${formData.name} registrado.` });
      onMemberAdded();
      handleOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao registrar visitante", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleNewBeginningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
       const submissionData = {
          church_id: getChurchIdOrThrow(),
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          service_where_decision_was_made: formData.service,
          small_group_id: formData.smallGroupId !== 'none' ? formData.smallGroupId : null,
      };
      const { error } = await supabase.from('new_beginnings').insert([submissionData]);
      if (error) throw error;
      toast({ title: "Sucesso!", description: `Novo começo de ${formData.name} registrado!` });
      onMemberAdded();
      handleOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao registrar novo começo", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }
  
  const handleCounselorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { password, confirm_password, ...restOfData } = formData;
       if (password !== confirm_password) {
        toast({ title: "Senhas não coincidem", description: "As senhas digitadas não são iguais.", variant: "destructive"});
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: { data: { full_name: formData.name } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Criação do usuário falhou.");


      const selectedTopics = Object.entries(formData)
        .filter(([key, value]) => key.startsWith('topic_') && value)
        .map(([key]) => counselingTopics.find(t => `topic_${t.id}` === key)?.label)
        .filter(Boolean);

      const submissionData = {
          id: authData.user.id,
          church_id: getChurchIdOrThrow(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          birthdate: formData.birthdate,
          marital_status: formData.marital_status,
          topics: selectedTopics,
          availability: {},
      };

      const { error: insertError } = await supabase.from('counselors').insert([submissionData]);
      if (insertError) throw insertError;
      
      toast({ title: "Sucesso!", description: `Conselheiro ${formData.name} cadastrado.` });
      onMemberAdded();
      handleOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao cadastrar conselheiro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }


  const renderInitialStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Pessoa</DialogTitle>
        <DialogDescription>
          Que tipo de pessoa você gostaria de cadastrar na plataforma?
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setStep('member-form')}>
          <UserPlus className="h-8 w-8" />
          <span className="text-md">Novo Membro</span>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setStep('team-form')}>
          <User className="h-8 w-8" />
          <span className="text-md">Equipe/Liderança</span>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setStep('counselor-form')}>
          <HeartHandshake className="h-8 w-8" />
          <span className="text-md">Conselheiro</span>
        </Button>
      </div>
    </>
  );

  const renderNewBeginningForm = () => (
     <form onSubmit={handleNewBeginningSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('initial')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          Cadastro de Novo Começo
        </DialogTitle>
        <DialogDescription>
          Registre as informações da pessoa que tomou la decisão por um novo começo.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input id="name" placeholder="Nome completo da pessoa" onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <Input id="phone" placeholder="(00) 00000-0000" onChange={handleInputChange} required/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" onChange={handleInputChange} />
        </div>
         <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="service">Em qual culto tomou a decisão?</Label>
                    <Select onValueChange={(v) => handleSelectChange('service', v)}>
                    <SelectTrigger id="service">
                        <SelectValue placeholder="Selecione um culto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Não sei informar">Não sei informar</SelectItem>
                        <SelectItem value="Culto de Domingo (Manhã)">Culto de Domingo (Manhã)</SelectItem>
                        <SelectItem value="Culto de Domingo (Noite)">Culto de Domingo (Noite)</SelectItem>
                        <SelectItem value="Culto de Oração">Culto de Oração</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="smallGroupId">Faz parte de algum Pequeno Grupo?</Label>
                <Select onValueChange={(v) => handleSelectChange('smallGroupId', v)}>
                    <SelectTrigger id="smallGroupId">
                        <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Não sei informar / Nenhum</SelectItem>
                        {smallGroups.map(group => (
                            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button">Cancelar</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{loading ? 'Salvando...' : 'Cadastrar Decisão'}</Button>
      </DialogFooter>
    </form>
  );

  const renderVisitorForm = () => (
    <form onSubmit={handleVisitorSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('initial')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          Cadastro de Visitante
        </DialogTitle>
        <DialogDescription>
          Preencha os campos abaixo com as informações do visitante.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input id="name" placeholder="Nome completo da pessoa" onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="(00) 00000-0000" onChange={handleInputChange} required/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" onChange={handleInputChange} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="service_visited">Qual culto está visitando?</Label>
                    <Select onValueChange={(v) => handleSelectChange('service_visited', v)}>
                    <SelectTrigger id="service_visited">
                        <SelectValue placeholder="Selecione um culto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Não sei informar">Não sei informar</SelectItem>
                        <SelectItem value="Culto de Domingo (Manhã)">Culto de Domingo (Manhã)</SelectItem>
                        <SelectItem value="Culto de Domingo (Noite)">Culto de Domingo (Noite)</SelectItem>
                        <SelectItem value="Culto de Oração">Culto de Oração</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="small_group_id">Faz parte de algum Pequeno Grupo?</Label>
                <Select onValueChange={(v) => handleSelectChange('small_group_id', v)}>
                    <SelectTrigger id="small_group_id">
                        <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Não sei informar / Nenhum</SelectItem>
                        {smallGroups.map(group => (
                            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
         <div className="space-y-2">
          <Label htmlFor="how_met_church">Como conheceu a igreja?</Label>
          <Input id="how_met_church" placeholder="Ex: Através de um amigo, evento, etc." onChange={handleInputChange}/>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button">Cancelar</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{loading ? 'Salvando...' : 'Cadastrar Visitante'}</Button>
      </DialogFooter>
    </form>
  );

  const FileUploadInput = ({ id, label }: { id: string, label: string }) => (
    <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center justify-center w-full">
            <Label
                htmlFor={id}
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">Clique para enviar</span>
                    </p>
                </div>
                <Input id={id} type="file" className="hidden" />
            </Label>
        </div>
    </div>
);

  const renderMemberForm = () => (
    <>
      <form onSubmit={handleMemberSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('initial')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            Cadastro de Novo Membro
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo com as informações do novo membro.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="personal" className="w-full pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="church-info">Info. Eclesiásticas</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[50vh] mt-4">
            <div className="p-1">
              <TabsContent value="personal">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input id="name" onChange={handleInputChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email de Contato</Label>
                        <Input id="email" type="email" placeholder="email.contato@example.com" onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <RadioGroup onValueChange={(v) => handleRadioChange('gender', v)} className="flex items-center gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="Masculino" id="sex-male" /><Label htmlFor="sex-male" className="font-normal">Masculino</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="Feminino" id="sex-female" /><Label htmlFor="sex-female" className="font-normal">Feminino</Label></div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthdate">Data de Nascimento</Label>
                      <Input id="birthdate" type="date" onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mother_name">Nome Completo da Mãe</Label>
                      <Input id="mother_name" onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="father_name">Nome Completo do Pai</Label>
                      <Input id="father_name" onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marital_status">Estado Civil</Label>
                      <Select onValueChange={(v) => handleSelectChange('marital_status', v)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem><SelectItem value="Casado(a)">Casado(a)</SelectItem><SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem><SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profession">Profissão</Label>
                      <Input id="profession" onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                      <Input id="phone" placeholder="(00) 00000-0000" onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="address">
                 <div className="space-y-6">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-1"><Label htmlFor="zip_code">CEP</Label><Input id="zip_code" placeholder="00000-000" onChange={handleInputChange} /></div>
                        <div className="space-y-2 md:col-span-3"><Label htmlFor="address">Endereço Completo</Label><Input id="address" placeholder="Logradouro, número, complemento" onChange={handleInputChange}/></div>
                    </div>
                     <FileUploadInput id="address-proof-upload" label="Comprovante de Residência" />
                 </div>
              </TabsContent>
              <TabsContent value="church-info">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Foi Batizado?</Label>
                      <RadioGroup onValueChange={(v) => handleRadioChange('is_baptized', v)} className="flex items-center gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="baptized-yes" /><Label htmlFor="baptized-yes" className="font-normal">Sim</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="baptized-no" /><Label htmlFor="baptized-no" className="font-normal">Não</Label></div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origin_church">Nome da última igreja que frequentou</Label>
                      <Input id="origin_church" onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="doubts">Dúvidas?</Label>
                      <Textarea id="doubts" placeholder="Deixe suas dúvidas aqui..." rows={3} onChange={handleInputChange}/>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
        <DialogFooter className="pt-6">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{loading ? 'Salvando...' : 'Cadastrar Membro'}</Button>
        </DialogFooter>
      </form>
    </>
  );

  const renderTeamForm = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('initial')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          Cadastrar Nova Liderança
        </DialogTitle>
        <DialogDescription>
          Envie um convite para o novo membro da sua equipe se cadastrar.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">Clique no botão abaixo para copiar o link de cadastro de liderança. Envie este link para a pessoa que você deseja adicionar à sua equipe.</p>
        <Button onClick={() => handleShareLink('/register-leadership', 'liderança')} className="w-full">
            <LinkIcon className="mr-2 h-4 w-4" />
            Copiar Link de Cadastro de Liderança
        </Button>
      </div>
       <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Fechar</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
  
  const renderCounselorForm = () => (
    <form onSubmit={handleCounselorSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('initial')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          Cadastro de Conselheiro
        </DialogTitle>
        <DialogDescription>
          Preencha as informações do conselheiro para criar seu perfil e acesso à plataforma.
        </DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="personal" className="w-full pt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="access">Acesso</TabsTrigger>
          <TabsTrigger value="topics">Áreas de Atuação</TabsTrigger>
        </TabsList>
        <ScrollArea className="h-[50vh] mt-4">
            <div className="p-1">
                <TabsContent value="personal">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" placeholder="Nome do conselheiro" onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gênero</Label>
                                <Select onValueChange={(v) => handleSelectChange('gender', v)}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="marital_status">Estado Civil</Label>
                                <Select onValueChange={(v) => handleSelectChange('marital_status', v)}>
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
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" type="tel" placeholder="(00) 00000-0000" onChange={handleInputChange} required />
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="access">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <Label htmlFor="email">Email de Acesso</Label>
                          <Input id="email" type="email" placeholder="email.contato@example.com" onChange={handleInputChange} required />
                       </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha</Label>
                          <Input id="password" type="password" onChange={handleInputChange} required />
                       </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password">Confirmar Senha</Label>
                          <Input id="confirm_password" type="password" onChange={handleInputChange} required />
                       </div>
                    </div>
                </TabsContent>
                <TabsContent value="topics">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Selecione as áreas em que o conselheiro tem experiência.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                            {counselingTopics.map((topic) => (
                                <div key={topic.id} className="flex items-center gap-2">
                                    <Checkbox id={`topic_${topic.id}`} onCheckedChange={(c) => handleCheckboxChange(`topic_${topic.id}`, !!c)} />
                                    <Label htmlFor={`topic_${topic.id}`} className="font-normal cursor-pointer">{topic.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </div>
        </ScrollArea>
      </Tabs>
      <DialogFooter className="pt-6">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{loading ? 'Salvando...' : 'Cadastrar Conselheiro'}</Button>
      </DialogFooter>
    </form>
  );

  const renderStep = () => {
    switch (step) {
      case 'initial':
        return renderInitialStep();
      case 'member-form':
        return renderMemberForm();
      case 'team-form':
        return renderTeamForm();
      case 'counselor-form':
        return renderCounselorForm();
      default:
        return renderInitialStep();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Adicionar Pessoa
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl">
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}

    
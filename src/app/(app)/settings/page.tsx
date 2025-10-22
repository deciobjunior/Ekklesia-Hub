'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User as UserIcon, Building, Braces, Palette, Bell, Lock, HeartHandshake } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useUser } from "@/hooks/use-user";
import { counselingTopics } from "@/lib/data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";


interface ChurchData {
  id: string;
  name: string;
  phone: string;
  address: string;
  senior_pastor_name: string;
  senior_pastor_email: string;
  owner_id: string;
}

interface UserPreferences {
  email_notifications: boolean;
  profile_public: boolean;
}

const timeSlots = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); // 08:00 to 22:00
const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const AvailabilitySelector = ({ value, onChange }: { value: Record<string, string[]>, onChange: (newValue: Record<string, string[]>) => void }) => {
    const toggleSlot = (day: string, time: string) => {
        const daySlots = value[day] || [];
        const newDaySlots = daySlots.includes(time)
            ? daySlots.filter(t => t !== time)
            : [...daySlots, time];
        
        onChange({ ...value, [day]: newDaySlots });
    };

    return (
        <Accordion type="multiple" className="w-full">
            {daysOfWeek.map(day => (
                <AccordionItem value={day} key={day}>
                    <AccordionTrigger>{day} ({value[day]?.length || 0} horários)</AccordionTrigger>
                    <AccordionContent>
                        <div className="flex flex-wrap gap-2 p-2">
                            {timeSlots.map(time => {
                                const isSelected = value[day]?.includes(time);
                                return (
                                    <Button
                                        key={time}
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleSlot(day, time)}
                                        className="w-20"
                                    >
                                        {time}
                                    </Button>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};


export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { user, userRole, churchId: userChurchId, authLoading, isCounselorProfileIncomplete, refreshUserData } = useUser();
  
  const rolesWithAvailability = ['Voluntário', 'Consolidador', 'Conselheiro', 'Pastor', 'Líder', 'Coordenador', 'Líder de Pequeno Grupo'];
  const isCounselor = userRole === 'Conselheiro' || (userRole === 'Pastor' && user?.user_metadata?.is_counselor);
  const showAvailabilityTab = userRole && rolesWithAvailability.includes(userRole);
  
  const [activeTab, setActiveTab] = useState('account');
  
  useEffect(() => {
    if (isCounselorProfileIncomplete) {
      setActiveTab('counseling');
    }
  }, [isCounselorProfileIncomplete]);

  const { setTheme } = useTheme();

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [birthdate, setBirthdate] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [churchData, setChurchData] = useState<Partial<ChurchData>>({});
  const [hubAdminName, setHubAdminName] = useState('Carregando...');
  const [hubAdminEmail, setHubAdminEmail] = useState('Carregando...');
  
  const [resendApiKey, setResendApiKey] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({ email_notifications: true, profile_public: true });
  
  // Counselor-specific state
  const [counselorTopics, setCounselorTopics] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});

  const supabase = createClient();
  
  const isOwner = userRole === 'Administrador';

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      setLoading(true);
      
      if (user) {
        setAdminName(user.user_metadata?.full_name || '');
        setAdminEmail(user.email || '');
        setPreferences({
          email_notifications: user.user_metadata?.email_notifications ?? true,
          profile_public: user.user_metadata?.profile_public ?? true,
        });
        
        const { data: memberData } = await supabase.from('members').select('phone, gender, marital_status, birthdate').eq('id', user.id).single();
        if(memberData) {
            setAdminPhone(memberData.phone);
            setGender(memberData.gender);
            setMaritalStatus(memberData.marital_status);
            setBirthdate(memberData.birthdate);
        }

        if (isCounselor) {
             const { data: counselorProfile, error: counselorError } = await supabase
                .from('counselors')
                .select('topics, availability')
                .eq('id', user.id)
                .maybeSingle();

            if (counselorProfile) {
                setCounselorTopics(counselorProfile.topics || []);
                const avData = counselorProfile.availability;
                let initialAvailability = {};
                 if (typeof avData === 'string' && avData.trim().startsWith('{')) {
                    try { initialAvailability = JSON.parse(avData); } catch (e) { console.error(e); }
                } else if (typeof avData === 'object' && avData !== null) {
                    initialAvailability = avData;
                }
                setAvailability(initialAvailability);
            }
        } else if (showAvailabilityTab) {
            const { data: volunteerProfile } = await supabase.from('volunteers').select('availability').eq('id', user.id).maybeSingle();
            if (volunteerProfile) {
                const avData = volunteerProfile.availability;
                let initialAvailability = {};
                 if (typeof avData === 'string' && avData.trim().startsWith('{')) {
                    try { initialAvailability = JSON.parse(avData); } catch (e) { console.error(e); }
                } else if (typeof avData === 'object' && avData !== null) {
                    initialAvailability = avData;
                }
                setAvailability(initialAvailability);
            }
        }

        if(userChurchId) {
            const { data: churches, error: churchError } = await supabase
              .from('churches')
              .select('*')
              .eq('id', userChurchId)
              .limit(1);

            if (churchError) {
                console.error("Error fetching church data:", churchError.message);
            } else if (churches && churches.length > 0) {
              const church = churches[0];
              setChurchData(church);

              // Fetch owner/admin name and email from the pastors_and_leaders table
              const { data: ownerData, error: ownerError } = await supabase
                .from('pastors_and_leaders')
                .select('name, email')
                .eq('id', church.owner_id)
                .single();

              if(ownerError || !ownerData) {
                setHubAdminName('Não encontrado');
                setHubAdminEmail('Não encontrado');
              } else {
                setHubAdminName(ownerData.name || 'Admin sem nome');
                setHubAdminEmail(ownerData.email || 'Email não encontrado');
              }
            }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [authLoading, user, userChurchId, isCounselor, showAvailabilityTab, supabase]);
  

  const handleChurchDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setChurchData(prev => ({...prev, [id]: value }));
  }

  const handleAccountSave = async () => {
     if (!user) return;
     setSaving(true);
     
     const updates: {email?: string, data?: any} = { data: { full_name: adminName } };

     if(adminEmail !== user.email) {
        updates.email = adminEmail;
     }
     
     const { data: userUpdateData, error: userUpdateError } = await supabase.auth.updateUser(updates);

     if (userUpdateError) {
        toast({ title: "Erro ao salvar", description: userUpdateError.message, variant: 'destructive' });
        setSaving(false);
        return;
     }

     const { error: memberUpdateError } = await supabase.from('members').update({ 
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        gender, 
        marital_status: maritalStatus, 
        birthdate 
    }).eq('id', user.id);

    if (memberUpdateError) {
        toast({ title: "Erro ao salvar dados do perfil", description: memberUpdateError.message, variant: 'destructive' });
    } else {
        toast({ title: "Sucesso!", description: "Sua conta foi atualizada." });
        refreshUserData();
    }

     setSaving(false);
  };
  
  const handlePasswordSave = async () => {
      if (!newPassword || !confirmPassword) {
        toast({ title: "Campos Vazios", description: "Por favor, preencha a nova senha e a confirmação.", variant: 'destructive'});
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Senhas não coincidem", description: "A nova senha e a confirmação devem ser iguais.", variant: 'destructive'});
        return;
      }
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: "Erro ao alterar a senha", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "Sucesso!", description: "Sua senha foi alterada." });
        setNewPassword('');
        setConfirmPassword('');
      }
      setSavingPassword(false);
  }

  const handleChurchSave = async () => {
     if (!user || !userChurchId) return;
     setSaving(true);
     const { error } = await supabase
        .from('churches')
        .update({
            name: churchData.name,
            phone: churchData.phone,
            address: churchData.address,
        })
        .eq('id', userChurchId);
    
     if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: 'destructive' });
     } else {
        toast({ title: "Sucesso!", description: "As informações da igreja foram atualizadas." });
        refreshUserData();
     }
     setSaving(false);
  };

  const handleLeadershipSave = async () => {
     if (!user || !userChurchId) return;
     setSaving(true);
     const { error } = await supabase
        .from('churches')
        .update({
            senior_pastor_name: churchData.senior_pastor_name,
            senior_pastor_email: churchData.senior_pastor_email,
        })
        .eq('id', userChurchId);
    
     if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: 'destructive' });
     } else {
        toast({ title: "Sucesso!", description: "As informações da liderança foram salvas." });
        refreshUserData();
     }
     setSaving(false);
  };
  
   const handleIntegrationsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    toast({
        title: "Chave do Resend",
        description: "Esta funcionalidade requer uma atualização no backend para salvar a chave de forma segura.",
      });
    setSaving(false);
  }
  
  const handlePreferencesSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        ...preferences
      }
    });

    if (error) {
      toast({ title: 'Erro ao salvar preferências', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Preferências salvas!', description: 'Suas configurações foram atualizadas.' });
      refreshUserData();
    }
    setSaving(false);
  };
  
  const handleCalendarConnect = () => {
    toast({
        title: "Funcionalidade em Desenvolvimento",
        description: "A conexão com o Google Agenda requer configuração de back-end (OAuth 2.0). Esta interface está pronta para a implementação."
    });
  }
  
  const handleTopicChange = (topicLabel: string, checked: boolean) => {
    setCounselorTopics(prev =>
        checked ? [...prev, topicLabel] : prev.filter(t => t !== topicLabel)
    );
  };
  
  const handleAvailabilitySave = async () => {
      if (!user) return;
      setSaving(true);
      
      const tableName = isCounselor ? 'counselors' : 'volunteers';
      
      const { error } = await supabase
        .from(tableName)
        .update({ availability: availability })
        .eq('id', user.id);
        
      if(error) {
          toast({ title: "Erro ao salvar disponibilidade", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "Disponibilidade salva!", description: "Seus horários de disponibilidade foram atualizados." });
          refreshUserData();
      }
      setSaving(false);
  }


  if (loading || authLoading) {
    return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
  }
  
  const NavItem = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground transition-all hover:text-primary",
            activeTab === id && "bg-muted text-primary font-semibold"
        )}
    >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua igreja e da sua conta.</p>
      </div>
      
      <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
        <nav className="space-y-1">
            <NavItem id="account" label="Sua Conta" icon={UserIcon} />
            {isCounselor && (
              <NavItem id="counseling" label="Aconselhamento" icon={HeartHandshake} />
            )}
            {showAvailabilityTab && !isCounselor && (
              <NavItem id="availability" label="Disponibilidade" icon={HeartHandshake} />
            )}
            <NavItem id="church" label="Igreja" icon={Building} />
            <NavItem id="appearance" label="Aparência" icon={Palette} />
            <NavItem id="notifications" label="Notificações" icon={Bell} />
            {isOwner && (
                <NavItem id="integrations" label="Integrações" icon={Braces} />
            )}
        </nav>

        <div className="grid gap-6">
            {activeTab === 'account' && (
                <div className="grid gap-6">
                    <Card>
                    <CardHeader>
                        <CardTitle>Informações Pessoais</CardTitle>
                        <CardDescription>
                        Gerencie suas informações de acesso à plataforma.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-name">Seu Nome</Label>
                                <Input id="admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Seu Email</Label>
                                <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="admin-phone">Seu Telefone</Label>
                                <MaskedInput id="admin-phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" value={birthdate || ''} onChange={(e) => setBirthdate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Gênero</Label>
                                <Select onValueChange={setGender} value={gender}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Estado Civil</Label>
                                 <Select onValueChange={setMaritalStatus} value={maritalStatus}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleAccountSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </CardFooter>
                    </Card>

                    <Card>
                    <CardHeader>
                        <CardTitle>Alteração de Senha</CardTitle>
                        <CardDescription>
                        Para sua segurança, recomendamos o uso de senhas fortes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="new_password">Nova Senha</Label>
                            <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                            <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handlePasswordSave} disabled={savingPassword}>
                        {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {savingPassword ? 'Salvando...' : 'Alterar Senha'}
                        </Button>
                    </CardFooter>
                    </Card>
                </div>
            )}
            
            {activeTab === 'church' && (
                 <div className="grid gap-6">
                    <Card>
                    <CardHeader>
                        <CardTitle>Informações da Igreja</CardTitle>
                        <CardDescription>
                        Atualize os dados principais da sua igreja. Somente o administrador principal pode editar estas informações.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="name">Nome da Igreja</Label>
                            <Input id="name" value={churchData.name || ''} onChange={handleChurchDataChange} disabled={!isOwner} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="phone">Telefone da Secretaria</Label>
                            <MaskedInput id="phone" value={churchData.phone || ''} onChange={handleChurchDataChange} disabled={!isOwner} />
                            </div>
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="address">Endereço</Label>
                            <Input id="address" value={churchData.address || ''} onChange={handleChurchDataChange} disabled={!isOwner} />
                        </div>
                        </div>
                    </CardContent>
                    {isOwner && (
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleChurchSave} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </CardFooter>
                    )}
                    </Card>

                    <Card>
                    <CardHeader>
                        <CardTitle>Liderança Principal</CardTitle>
                        <CardDescription>
                        Informações do pastor sênior responsável pela igreja. Somente o administrador principal pode editar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="senior_pastor_name">Nome do Pastor Sênior</Label>
                            <Input id="senior_pastor_name" value={churchData.senior_pastor_name || ''} onChange={handleChurchDataChange} disabled={!isOwner} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="senior_pastor_email">Email do Pastor Sênior</Label>
                            <Input id="senior_pastor_email" type="email" value={churchData.senior_pastor_email || ''} onChange={handleChurchDataChange} disabled={!isOwner} />
                        </div>
                        </div>
                    </CardContent>
                    {isOwner && (
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleLeadershipSave} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </CardFooter>
                    )}
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Administração do Hub</CardTitle>
                            <CardDescription>Administrador responsável pela plataforma nesta igreja.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hub_admin_name">Nome do Administrador</Label>
                                    <Input id="hub_admin_name" value={hubAdminName} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hub_admin_email">Email do Administrador</Label>
                                    <Input id="hub_admin_email" value={hubAdminEmail} disabled />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
             {activeTab === 'appearance' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Aparência</CardTitle>
                        <CardDescription>Personalize a aparência da plataforma para o seu gosto.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Tema</Label>
                            <p className="text-sm text-muted-foreground">Selecione o tema de cores para a interface.</p>
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <Button variant="outline" onClick={() => setTheme('light')}>Claro</Button>
                                <Button variant="outline" onClick={() => setTheme('dark')}>Escuro</Button>
                                <Button variant="outline" onClick={() => setTheme('system')}>Sistema</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'notifications' && (
                 <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notificações &amp; Privacidade</CardTitle>
                            <CardDescription>Gerencie como você recebe notificações e como sua informação aparece.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="email_notifications" className="font-semibold">Notificações por E-mail</Label>
                                    <p className="text-sm text-muted-foreground">Receba um resumo de atividades e alertas importantes no seu e-mail.</p>
                                </div>
                                <Switch id="email_notifications" checked={preferences.email_notifications} onCheckedChange={(checked) => setPreferences(p => ({...p, email_notifications: checked}))} />
                           </div>
                           <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="profile_public" className="font-semibold">Perfil Visível</Label>
                                    <p className="text-sm text-muted-foreground">Permitir que outros membros da igreja vejam seu perfil básico.</p>
                                </div>
                                <Switch id="profile_public" checked={preferences.profile_public} onCheckedChange={(checked) => setPreferences(p => ({...p, profile_public: checked}))} />
                           </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 mt-6">
                            <Button disabled={saving} onClick={handlePreferencesSave}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Salvar Preferências
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {activeTab === 'availability' && showAvailabilityTab && (
              <Card>
                <CardHeader>
                  <CardTitle>Disponibilidade</CardTitle>
                  <CardDescription>Defina seus horários disponíveis para servir nos ministérios.</CardDescription>
                </CardHeader>
                <CardContent>
                   <AvailabilitySelector value={availability} onChange={setAvailability} />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button disabled={saving} onClick={handleAvailabilitySave}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Disponibilidade
                  </Button>
                </CardFooter>
              </Card>
            )}

            {activeTab === 'counseling' && isCounselor && (
                <Card>
                     <CardHeader>
                        <CardTitle>Configurações de Aconselhamento</CardTitle>
                        <CardDescription>Defina suas áreas de especialidade e seus horários disponíveis para atendimento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div className="space-y-4">
                            <h3 className="font-medium">Áreas de Atuação</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                                {counselingTopics.map((topic) => (
                                    <div key={topic.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`topic-${topic.id}`}
                                            checked={counselorTopics.includes(topic.label)}
                                            onCheckedChange={(checked) => handleTopicChange(topic.label, !!checked)}
                                        />
                                        <Label htmlFor={`topic-${topic.id}`} className="font-normal cursor-pointer">{topic.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                             <h3 className="font-medium">Disponibilidade para Atendimentos</h3>
                             <div className="w-full rounded-md border p-4">
                                <AvailabilitySelector value={availability} onChange={setAvailability} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button disabled={saving} onClick={handleAvailabilitySave}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar Configurações de Atendimento
                        </Button>
                    </CardFooter>
                </Card>
            )}

            
            {activeTab === 'integrations' && isOwner && (
                 <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Integração com Google Agenda</CardTitle>
                            <CardDescription>
                                Sincronize sua agenda de aconselhamento com o Google Agenda para evitar conflitos de horários.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                                <Image src="/google-calendar-icon.png" alt="Google Calendar Icon" width={40} height={40} data-ai-hint="logo" />
                                <div className="flex-grow">
                                    <h4 className="font-semibold">Google Agenda</h4>
                                    <p className="text-sm text-muted-foreground">Não conectado</p>
                                </div>
                                <Button variant="outline" onClick={handleCalendarConnect}>
                                    Conectar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Integração Resend</CardTitle>
                            <CardDescription>
                            Gerencie sua chave de API para o serviço de envio de e-mails Resend.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleIntegrationsSave}>
                            <CardContent>
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="resend-api-key">Resend API Key</Label>
                                        <Input id="resend-api-key" type="password" placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={resendApiKey} onChange={e => setResendApiKey(e.target.value)} />
                                        <p className="text-xs text-muted-foreground">Você pode obter sua chave no <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">painel do Resend</a>. Ela será salva em um arquivo .env local.</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <Button type="submit" disabled={saving || !resendApiKey}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {saving ? 'Salvando...' : 'Salvar Chave do Resend'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}

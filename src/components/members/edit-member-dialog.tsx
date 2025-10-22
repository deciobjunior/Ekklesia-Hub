
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Member, counselingTopics } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const timeSlots = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); // 08:00 to 22:00

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


interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  onSave: (member: Member) => void;
  defaultTab?: string;
}

export function EditMemberDialog({ open, onOpenChange, member, onSave, defaultTab = 'personal' }: EditMemberDialogProps) {
  const [formData, setFormData] = useState<Member>({} as Member);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (member) {
      const mergedFormData = {
        ...member,
        form_data: {
          ...member.form_data,
          counselor_topics: member.form_data?.counselor_topics || [],
        },
      };
      setFormData(mergedFormData);
      
      const avData = mergedFormData.form_data?.counselor_availability || mergedFormData.form_data?.availability || mergedFormData.availability;
      let initialAvailability = {};

      if (typeof avData === 'string' && avData.trim().startsWith('{')) {
          try {
            initialAvailability = JSON.parse(avData);
          } catch (e) {
            console.error("Failed to parse availability JSON", e);
          }
      } else if (typeof avData === 'object' && avData !== null) {
          initialAvailability = avData;
      }
      setAvailability(initialAvailability);
    }
  }, [member, open]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({...prev, form_data: { ...prev.form_data, [id]: value } }));
  };

  const handleSelectChange = (id: string, value: string) => {
    if (id === 'role') {
        setFormData(prev => ({ ...prev, role: value as Member['role'], form_data: { ...prev.form_data, role: value } }));
    } else {
        setFormData(prev => ({ ...prev, form_data: { ...(prev.form_data || {}), [id]: value } }));
    }
  };
  
  const handleRadioChange = (id: string, value: string) => {
    const boolValue = value === 'true';
    setFormData(prev => ({ ...prev, [id]: boolValue, form_data: { ...(prev.form_data || {}), [id]: boolValue } }));
  };
  
  const handleCounselorTopicChange = (topicLabel: string, checked: boolean) => {
    setFormData(prev => {
      const currentTopics = prev.form_data?.counselor_topics || [];
      const newTopics = checked
        ? [...currentTopics, topicLabel]
        : currentTopics.filter((t: string) => t !== topicLabel);
      return { ...prev, form_data: { ...(prev.form_data || {}), counselor_topics: newTopics } };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalFormData = { 
        ...formData, 
        form_data: {
          ...formData.form_data,
          counselor_availability: availability,
          availability: availability, // Also save at top level for volunteer logic
        },
        role: formData.role, // Make sure role is at the top level
    };
    onSave(finalFormData as Member);
    setSaving(false);
  };
  
  if (!formData || !formData.role) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isPastor = formData.role === 'Pastor';
  const isCounselor = formData.role === 'Conselheiro';
  const showExtraTabs = isCounselor || (isPastor && formData.form_data?.is_counselor);
  const rolesWithAvailability = ['Voluntário', 'Consolidador', 'Conselheiro', 'Pastor', 'Líder', 'Coordenador', 'Líder de Pequeno Grupo'];
  const showAvailabilityTab = rolesWithAvailability.includes(formData.role) || showExtraTabs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Cadastro: {member.name}</DialogTitle>
          <DialogDescription>
            Atualize as informações do cadastro abaixo e salve as alterações.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue={defaultTab} className="w-full pt-4 flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${2 + (showAvailabilityTab ? 1 : 0) + (showExtraTabs ? 1 : 0)}, 1fr)`}}>
                <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
                <TabsTrigger value="church-info">Info. Eclesiásticas</TabsTrigger>
                {showAvailabilityTab && <TabsTrigger value="availability">Disponibilidade</TabsTrigger>}
                 {showExtraTabs && <TabsTrigger value="counselor-settings">Aconselhamento</TabsTrigger>}
              </TabsList>
              <div className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-full pr-4">
                  <div className="p-1">
                      <TabsContent value="personal">
                        <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="name">Nome Completo</Label>
                              <Input id="name" value={formData.form_data?.name || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={formData.form_data?.email || ''} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" value={formData.form_data?.phone || ''} onChange={handleInputChange} placeholder="(00) 00000-0000" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="role">Cargo</Label>
                                <Select onValueChange={(v) => handleSelectChange('role', v)} value={formData.role}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Selecione o cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Membro">Membro</SelectItem>
                                        <SelectItem value="Visitante">Visitante</SelectItem>
                                        <SelectItem value="Voluntário">Voluntário</SelectItem>
                                        <SelectItem value="Consolidador">Consolidador</SelectItem>
                                        <SelectItem value="Conselheiro">Conselheiro</SelectItem>
                                        <SelectItem value="Líder">Líder</SelectItem>
                                        <SelectItem value="Líder de Pequeno Grupo">Líder de Pequeno Grupo</SelectItem>
                                        <SelectItem value="Pastor">Pastor</SelectItem>
                                        <SelectItem value="Coordenador">Coordenador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formData.role === 'Pastor' && (
                                <div className="flex items-center space-x-2 pt-6">
                                    <Checkbox
                                        id="is_counselor"
                                        checked={formData.form_data?.is_counselor}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, form_data: {...(prev.form_data || {}), is_counselor: checked } }))}
                                    />
                                    <label
                                        htmlFor="is_counselor"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Também é Conselheiro(a)
                                    </label>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input id="cpf" value={formData.form_data?.cpf || ''} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="rg">RG</Label>
                                <Input id="rg" value={formData.form_data?.rg || ''} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="birthdate">Data de Nascimento</Label>
                                <Input id="birthdate" type="date" value={formData.form_data?.birthdate || ''} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label>Gênero</Label>
                                <RadioGroup onValueChange={(v) => handleSelectChange('gender', v)} value={formData.form_data?.gender} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Masculino" id="edit-sex-male" /><Label htmlFor="edit-sex-male" className="font-normal">Masculino</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Feminino" id="edit-sex-female" /><Label htmlFor="edit-sex-female" className="font-normal">Feminino</Label></div>
                                </RadioGroup>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="maritalStatus">Estado Civil</Label>
                                <Select onValueChange={(v) => handleSelectChange('maritalStatus', v)} value={formData.form_data?.maritalStatus}>
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
                        </div>
                    </TabsContent>
                    <TabsContent value="church-info">
                        <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label>É membro da igreja?</Label>
                             <RadioGroup onValueChange={(v) => handleRadioChange('is_member', v)} value={String(formData.form_data?.is_member)} className="flex items-center gap-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="edit-member-yes" /><Label htmlFor="edit-member-yes" className="font-normal">Sim</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="edit-member-no" /><Label htmlFor="edit-member-no" className="font-normal">Não</Label></div>
                              </RadioGroup>
                            </div>
                            <div className="space-y-2">
                            <Label>Foi Batizado?</Label>
                            <RadioGroup onValueChange={(v) => handleRadioChange('is_baptized', v)} value={String(formData.form_data?.is_baptized)} className="flex items-center gap-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="edit-baptized-yes" /><Label htmlFor="edit-baptized-yes" className="font-normal">Sim</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="edit-baptized-no" /><Label htmlFor="edit-baptized-no" className="font-normal">Não</Label></div>
                            </RadioGroup>
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="origin_church">Nome da última igreja que frequentou</Label>
                                <Input id="origin_church" value={formData.form_data?.origin_church || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                        </div>
                    </TabsContent>
                     {showAvailabilityTab && (
                        <TabsContent value="availability">
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Selecione os dias e horários em que este membro está disponível para servir.</p>
                                <div className="w-full rounded-md border p-4">
                                    <AvailabilitySelector value={availability} onChange={setAvailability} />
                                </div>
                            </div>
                        </TabsContent>
                    )}
                    {showExtraTabs && (
                         <TabsContent value="counselor-settings">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-md font-semibold">Áreas de Atuação como Conselheiro</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                                        {counselingTopics.map((topic) => (
                                            <div key={topic.id} className="flex items-center gap-2">
                                                <Checkbox 
                                                    id={`counselor-topic-${topic.id}`} 
                                                    checked={formData.form_data?.counselor_topics?.includes(topic.label)}
                                                    onCheckedChange={(checked) => handleCounselorTopicChange(topic.label, !!checked)}
                                                />
                                                <Label htmlFor={`counselor-topic-${topic.id}`} className="font-normal cursor-pointer">{topic.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    )}
                 </div>
              </ScrollArea>
              </div>
          </Tabs>
          <DialogFooter className="pt-4 border-t mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
               {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

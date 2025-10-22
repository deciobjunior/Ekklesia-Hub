
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
import { Checkbox } from '@/components/ui/checkbox';
import { Counselor, counselingTopics } from '@/lib/data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface CounselorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counselor: Counselor;
  onSave: (counselor: Counselor) => void;
  isSaving: boolean;
}

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


export function CounselorDetailsDialog({ open, onOpenChange, counselor, onSave, isSaving }: CounselorDetailsDialogProps) {
  const [formData, setFormData] = useState<Partial<Counselor>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (counselor) {
      setFormData({
        email: counselor.email,
        topics: [...(counselor.topics || [])],
      });
      let initialAvailability = {};
      if (typeof counselor.availability === 'string' && counselor.availability.trim().startsWith('{')) {
        try {
          initialAvailability = JSON.parse(counselor.availability);
        } catch (e) {
          console.error("Failed to parse availability JSON", e);
          initialAvailability = {};
        }
      } else if (typeof counselor.availability === 'object' && counselor.availability !== null) {
        initialAvailability = counselor.availability;
      }
      setSelectedSlots(initialAvailability);
    }
  }, [counselor, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleTopicChange = (topicLabel: string, checked: boolean) => {
    setFormData(prev => {
      const currentTopics = prev.topics || [];
      if (checked) {
        return { ...prev, topics: [...currentTopics, topicLabel] };
      } else {
        return { ...prev, topics: currentTopics.filter(t => t !== topicLabel) };
      }
    });
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const updatedCounselor: Counselor = {
        ...counselor,
        ...formData,
        availability: JSON.stringify(selectedSlots),
    } as Counselor;
    onSave(updatedCounselor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Conselheiro: {counselor.name}</DialogTitle>
          <DialogDescription>
            Atualize as informações, áreas de atuação e disponibilidade.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="topics">Áreas de Atuação</TabsTrigger>
                    <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                </TabsList>
                 <ScrollArea className="h-[60vh]">
                    <div className="p-4">
                        <TabsContent value="info" className="mt-0">
                             <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="counselor-name">Nome do Conselheiro</Label>
                                    <Input id="counselor-name" disabled defaultValue={counselor.name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="counselor-email">Email de Contato</Label>
                                    <Input 
                                      id="email" 
                                      type="email" 
                                      value={formData.email || ''}
                                      onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="topics" className="mt-0">
                            <div className="space-y-4">
                                 <p className="text-sm text-muted-foreground">Selecione as áreas em que o conselheiro tem experiência.</p>
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md border p-4">
                                    {counselingTopics.map((topic) => (
                                        <div key={topic.id} className="flex items-center gap-2">
                                            <Checkbox 
                                              id={`topic-${topic.id}`} 
                                              checked={(formData.topics || []).includes(topic.label)}
                                              onCheckedChange={(checked) => handleTopicChange(topic.label, !!checked)}
                                            />
                                            <Label htmlFor={`topic-${topic.id}`} className="font-normal cursor-pointer">{topic.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="availability" className="mt-0">
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Clique no dia da semana e selecione os horários disponíveis.</p>
                                <div className="w-full rounded-md border p-4">
                                    <AvailabilitySelector value={selectedSlots} onChange={setSelectedSlots} />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </ScrollArea>
            </Tabs>

            <DialogFooter className="border-t pt-6">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

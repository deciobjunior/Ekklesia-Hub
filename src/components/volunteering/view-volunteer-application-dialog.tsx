
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '../ui/badge';
import { differenceInYears } from 'date-fns';

type VolunteerApplication = {
    id: string;
    name: string;
    status: 'Pendente' | 'Em Treinamento' | 'Em Validação' | 'Aprovado' | 'Aguardando regularização';
    created_at: string;
    form_data?: any;
};

interface ViewVolunteerApplicationDialogProps {
  volunteer: VolunteerApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (appId: string, newStatus: string) => void;
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null | boolean, children?: React.ReactNode }) => {
    if (value === null || value === undefined) {
        if (children) {
             // If value is null but there are children, render the children (e.g., for arrays).
        } else {
            return null;
        }
    }
    
    let displayValue: React.ReactNode = String(value);

    if (typeof value === 'boolean') {
        displayValue = value ? 'Sim' : 'Não';
    }

    return (
        <div className="grid grid-cols-3 items-start gap-4">
            <Label className="text-right text-muted-foreground pt-1">{label}</Label>
            <div className="col-span-2">
                {children ? children : <span className="font-medium text-sm">{displayValue}</span>}
            </div>
        </div>
    );
};

const FileDisplayInput = ({ id, label, existingUrl }: { id: string, label: string, existingUrl?: string }) => {
    const fileName = existingUrl ? decodeURIComponent(existingUrl.split('/').pop()?.split('?')[0] || "Arquivo") : "Nenhum arquivo enviado";

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg bg-muted/50">
                <div className="flex flex-col items-center justify-center text-center overflow-hidden">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    {existingUrl ? (
                         <Button asChild variant="link" size="sm" onClick={(e) => e.stopPropagation()}>
                            <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-semibold max-w-full block break-words" title={fileName}>
                                {fileName}
                            </a>
                         </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground">{fileName}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export function ViewVolunteerApplicationDialog({ volunteer, open, onOpenChange, onUpdateStatus }: ViewVolunteerApplicationDialogProps) {
  if (!volunteer || !volunteer.form_data) return null;

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const supabase = createClient();

  const { form_data: application } = volunteer;

  const handleApprove = async () => {
    setLoading(true);

    const { error: volunteerInsertError } = await supabase
      .from('volunteers')
      .insert({
        id: application.id,
        church_id: application.church_id,
        name: application.name,
        email: application.email,
        phone: application.phone,
        availability: application.availability || [],
      });

    if (volunteerInsertError) {
      toast({ title: 'Erro ao criar perfil de voluntário', description: volunteerInsertError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    
    onUpdateStatus(volunteer.id, 'Aprovado');
    setLoading(false);
    onOpenChange(false);
  };
  
  const handleReject = async () => {
      if (!rejectionReason.trim()) {
          toast({ title: "Justificativa obrigatória", description: "Por favor, preencha o motivo da rejeição.", variant: "destructive" });
          return;
      }
      setLoading(true);

      const updatedFormData = { ...application, rejection_reason: rejectionReason };

       const { error } = await supabase
            .from('pending_registrations')
            .update({ status: 'Aguardando regularização', form_data: updatedFormData })
            .eq('id', volunteer.id);
        
        if (error) {
            toast({ title: "Erro ao rejeitar", description: error.message, variant: "destructive"});
        } else {
             const editUrl = `${'${window.location.origin}'}/register-volunteer?application_id=${'${volunteer.id}'}`;
             await sendEmail({ 
                to: application.email, 
                subject: `Pendência em seu cadastro de voluntário`, 
                body: `<h1>Olá, ${'${application.name}'}!</h1><p>Verificamos seu cadastro de voluntário e encontramos uma pendência que precisa ser corrigida.</p><p><strong>Justificativa do coordenador:</strong></p><blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 1rem;">${'${rejectionReason}'}</blockquote><p>Por favor, acesse o link abaixo para corrigir suas informações e reenviar os documentos necessários:</p><p><a href="${'${editUrl}'}">${'${editUrl}'}</a></p><p>Agradecemos a compreensão.</p>`
            });
            toast({ title: "Cadastro Rejeitado", description: `O voluntário foi notificado por e-mail para corrigir a pendência.`});
            onUpdateStatus(volunteer.id, 'Aguardando regularização');
        }

      setLoading(false);
      setIsRejecting(false);
      setRejectionReason('');
      onOpenChange(false);
  }
  
  const age = application.birthdate ? differenceInYears(new Date(), new Date(application.birthdate)) : 'Não informado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Revisão de Cadastro: {volunteer.name}</DialogTitle>
          <DialogDescription>
            Revise as informações enviadas e os documentos. A aprove ou rejeite o cadastro.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="space-y-8 p-4">
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Pessoais</h3>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <DetailItem label="Nome completo" value={application.name} />
                        <DetailItem label="Telefone" value={application.phone} />
                        <DetailItem label="Email" value={application.email} />
                        <DetailItem label="Data de Nascimento" value={application.birthdate ? new Date(application.birthdate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado'} />
                        <DetailItem label="Idade" value={`${'${age}'} anos`} />
                        <DetailItem label="Gênero" value={application.gender} />
                        <DetailItem label="CPF" value={application.cpf} />
                        <DetailItem label="RG" value={application.rg} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Eclesiásticas</h3>
                     <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <DetailItem label="É membro?" value={application.is_member} />
                        <DetailItem label="É batizado(a)?" value={application.is_baptized} />
                        <DetailItem label="Tempo na igreja" value={application.time_in_church} />
                        <DetailItem label="Participa de GC?" value={application.is_in_gc} />
                     </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Interesses e Disponibilidade</h3>
                    <DetailItem label="Ministérios de interesse">
                        <div className="flex flex-wrap gap-1">
                            {(application.ministry_interests || []).map((interest: string) => <Badge key={interest} variant="secondary">{interest}</Badge>)}
                        </div>
                    </DetailItem>
                    <DetailItem label="Disponibilidade" value={application.service_availability} />
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Respostas Pessoais</h3>
                    <div className="space-y-2">
                        <Label className="font-semibold">Para você, "SERVIR POR ALGO MAIOR" é servir por...</Label>
                        <p className="text-sm text-muted-foreground p-2 border rounded-md">{application.service_motivation || 'Não informado'}</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-semibold">Experiência de conversão a Jesus</Label>
                        <p className="text-sm text-muted-foreground p-2 border rounded-md whitespace-pre-wrap">{application.conversion_story || 'Não informado'}</p>
                    </div>
                </div>

                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Documentos Enviados</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FileDisplayInput id="photo-upload" label="Foto de Rosto" existingUrl={application['photo-upload_url']} />
                        <FileDisplayInput id="doc-upload" label="Documento (RG/CNH)" existingUrl={application['doc-upload_url']} />
                        <FileDisplayInput id="address-proof-upload" label="Comprovante de Residência" existingUrl={application['address-proof-upload_url']} />
                        <FileDisplayInput id="criminal-record-upload" label="Atestado de Antecedentes" existingUrl={application['criminal-record-upload_url']} />
                    </div>
                 </div>
            </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <AlertDialog open={isRejecting} onOpenChange={setIsRejecting}>
             <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>Rejeitar</Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rejeitar Cadastro de {volunteer.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Descreva o motivo da rejeição. O voluntário será notificado por e-mail para corrigir a pendência.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="py-4 space-y-2">
                    <Label htmlFor="rejection-reason">Justificativa</Label>
                    <Textarea 
                        id="rejection-reason"
                        placeholder="Ex: Documento ilegível, foto inadequada, dados inconsistentes..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReject} disabled={loading || !rejectionReason}>
                         {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Enviar Justificativa
                    </AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
          </AlertDialog>
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading}>Aprovar Cadastro</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é definitiva. Ao aprovar, o cadastro do voluntário será ativado e ele não poderá mais retornar para a etapa de validação. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sim, aprovar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
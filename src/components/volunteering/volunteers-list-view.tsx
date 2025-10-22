
'use client';

import { VolunteerApplication } from '@/app/(app)/volunteering/new-volunteers/page';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '../ui/table';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal, Eye, Mail, Send, AlertTriangle, UserCheck, Link as LinkIcon, Handshake, Trash2, GraduationCap } from 'lucide-react';

interface VolunteersListViewProps {
  data: VolunteerApplication[];
  actions: {
    onViewDetails: (volunteer: VolunteerApplication) => void;
    onAssignToMinistry: (volunteer: VolunteerApplication) => void;
    handleRequestDocuments: (volunteer: VolunteerApplication) => void;
    onSendToAdmin: (volunteer: VolunteerApplication) => void;
    onSendRegistrationLink: (volunteer: VolunteerApplication) => void;
    onSendToWelcome: (volunteer: VolunteerApplication) => void;
    onSendMemberForm: (volunteer: VolunteerApplication) => void;
    onDelete: (volunteer: VolunteerApplication) => void;
    onUpdateStatus: (appIds: string[], newStatus: string) => void;
  };
  onUpdate: () => void;
}

export function VolunteersListView({ data, actions, onUpdate }: VolunteersListViewProps) {
  
  const getStatusInfo = (status: VolunteerApplication['status']) => {
    switch (status) {
      case 'Pendente':
        return { text: 'Inscrição Recebida', variant: 'outline' };
      case 'Em Treinamento':
        return { text: 'Em Treinamento', variant: 'secondary' };
      case 'Aguardando Documentos':
        return { text: 'Aguardando Documentos', variant: 'secondary' };
      case 'Em Validação':
        return { text: 'Pronto para Revisão', variant: 'default' };
      case 'Aguardando regularização':
        return { text: 'Com Pendência', variant: 'destructive' };
      case 'Aprovado':
        return { text: 'Cadastro Aprovado', variant: 'default' };
      case 'Com Retorno':
         return { text: 'Recusado pelo Ministério', variant: 'destructive' };
      case 'Aguardando Aprovação do Líder':
        return { text: 'Alocado', variant: 'secondary' };
      case 'Alocado':
        return { text: 'Alocado', variant: 'secondary' };
      default:
        return { text: status, variant: 'outline' };
    }
  };
  
  const getActionForStatus = (item: VolunteerApplication) => {
    const isNotBaptizedAndNotSent = item.isStillNotBaptized && !item.form_data?.sent_to_welcome;
    const isNotMember = item.form_data?.is_member === false && !item.form_data?.member_form_sent && item.status !== 'Em Validação' && item.status !== 'Aprovado' && item.status !== 'Alocado' && item.status !== 'Aguardando Aprovação do Líder';
    
    let menuItems = [];

    if (isNotBaptizedAndNotSent) {
      menuItems.push(<DropdownMenuItem key="send-to-welcome" onClick={() => actions.onSendToWelcome(item)}><Handshake className="mr-2 h-4 w-4"/>Enviar para Acolhimento</DropdownMenuItem>);
    }

    switch (item.status) {
      case 'Pendente':
        if (isNotMember) {
            menuItems.push(<DropdownMenuItem key="send-member-form" onClick={() => actions.onSendMemberForm(item)}><Mail className="mr-2 h-4 w-4"/>Enviar Formulário de Membro</DropdownMenuItem>);
        }
        if (item.form_data?.source === 'Acolhimento') {
          menuItems.push(<DropdownMenuItem key="send-registration-link" onClick={() => actions.onSendRegistrationLink(item)}><LinkIcon className="mr-2 h-4 w-4"/>Enviar Link de Inscrição</DropdownMenuItem>);
        }
        // Se não tiver nenhuma pendência, a próxima etapa é o treinamento
        if (!isNotBaptizedAndNotSent && !isNotMember && item.form_data?.source !== 'Acolhimento') {
          menuItems.push(<DropdownMenuItem key="start-training" onClick={() => actions.onUpdateStatus([item.id], 'Em Treinamento')}><GraduationCap className="mr-2 h-4 w-4"/>Iniciar Treinamento</DropdownMenuItem>);
        }
        break;
      case 'Em Treinamento':
        menuItems.push(<DropdownMenuItem key="request-docs" onClick={() => actions.handleRequestDocuments(item)}><Mail className="mr-2 h-4 w-4"/>Solicitar Documentos</DropdownMenuItem>);
        break;
      case 'Em Validação':
      case 'Aguardando regularização':
      case 'Aguardando Documentos':
        menuItems.push(<DropdownMenuItem key="review-application" onClick={() => actions.onViewDetails(item)}><Eye className="mr-2 h-4 w-4"/>Revisar Inscrição</DropdownMenuItem>);
        break;
      case 'Aprovado':
        menuItems.push(<DropdownMenuItem key="assign-ministry" onClick={() => actions.onAssignToMinistry(item)}><Send className="mr-2 h-4 w-4"/>Direcionar para Ministério</DropdownMenuItem>);
        break;
      case 'Com Retorno':
        menuItems.push(<DropdownMenuItem key="assign-ministry" onClick={() => actions.onAssignToMinistry(item)}><Send className="mr-2 h-4 w-4"/>Direcionar para Ministério</DropdownMenuItem>);
        break;
      default:
        break;
    }
    
    if(menuItems.length > 0) {
      return (
        <>
          <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
          {menuItems}
        </>
      );
    }
    return null;
  }

  return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ministérios de Interesse</TableHead>
              <TableHead>Data da Inscrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => {
                const statusInfo = getStatusInfo(item.status);
                const isNotBaptized = item.isStillNotBaptized;
                const isNotMember = item.form_data?.is_member === false && !item.form_data?.member_form_sent && item.status !== 'Em Validação' && item.status !== 'Aprovado' && item.status !== 'Alocado' && item.status !== 'Aguardando Aprovação do Líder';
                const actionItems = getActionForStatus(item);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Button variant="link" className="p-0 h-auto font-medium" onClick={() => actions.onViewDetails(item)}>
                          {item.name}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <Badge variant={statusInfo.variant as any}>{statusInfo.text}</Badge>
                          {isNotBaptized && (
                              <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-white">
                                  <AlertTriangle className="mr-1 h-3 w-3"/>
                                  Não Batizado
                              </Badge>
                          )}
                          {isNotMember && <Badge variant="destructive">Não Membro</Badge>}
                          {item.form_data?.sent_to_admin && <Badge variant="outline">Enviado Admin</Badge>}
                          {item.form_data?.sent_to_welcome && <Badge variant="outline">No Acolhimento</Badge>}
                          {item.form_data?.member_form_sent && <Badge variant="outline">Form. Membro Enviado</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                          {(item.form_data?.ministry_interests || []).map((interest: string) => (
                              <Badge key={interest} variant="secondary" className="font-normal">{interest}</Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {actionItems ? actionItems : <DropdownMenuLabel>Nenhuma ação disponível</DropdownMenuLabel>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => actions.onDelete(item)} className="text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4"/> Deletar Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhuma inscrição de voluntário encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
  );
}

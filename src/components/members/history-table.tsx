
'use client';

import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistoryItem } from "@/app/(app)/members/page";
import { BookOpen, Handshake, HeartHandshake, User, UserCheck, Trash2, Send, Tag, MessageSquare, PlusCircle, UserCog, ArrowRightLeft, CalendarClock, XCircle, Briefcase, History as HistoryIcon, UserPlus } from "lucide-react";

const getActionIcon = (action: string) => {
    switch (action) {
      case 'status_change': return <Tag className="h-4 w-4" />;
      case 'add_meeting':
      case 'edit_meeting': return <BookOpen className="h-4 w-4" />;
      case 'created': return <PlusCircle className="h-4 w-4" />;
      case 'ownership_taken': return <UserCheck className="h-4 w-4" />;
      case 'sent_to_counseling': return <HeartHandshake className="h-4 w-4" />;
      case 'sent_to_discipleship': return <Handshake className="h-4 w-4" />;
      case 'sent_to_volunteer_hub': return <Briefcase className="h-4 w-4" />;
      case 'volunteer_approved': return <UserCheck className="h-4 w-4" />;
      case 'volunteer_removed': return <Trash2 className="h-4 w-4" />;
      case 'volunteer_transferred': return <ArrowRightLeft className="h-4 w-4" />;
      case 'assigned_counselor': return <UserCog className="h-4 w-4" />;
      case 'rescheduled': return <CalendarClock className="h-4 w-4" />;
      case 'canceled': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'contact_registered': return <MessageSquare className="h-4 w-4" />;
      case 'member_created': return <UserPlus className="h-4 w-4" />;
      default: return <HistoryIcon className="h-4 w-4" />;
    }
};

const getSourceVariant = (source: string) => {
    switch (source) {
        case 'Acolhimento': return 'secondary';
        case 'Ministérios': return 'outline';
        case 'Aconselhamento': return 'default';
        case 'Membros': return 'default';
        default: return 'secondary';
    }
};

export function HistoryTable({ history }: { history: HistoryItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Módulo</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead className="text-right">Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.length > 0 ? history.map((item, index) => (
          <TableRow key={`${item.id}-${index}`}>
            <TableCell>
              <Badge variant={getSourceVariant(item.source)}>{item.source}</Badge>
            </TableCell>
            <TableCell className="font-medium">{item.user}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                  {getActionIcon(item.action)}
                  <span>{item.details || item.action}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR })}
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">Nenhum histórico encontrado para os filtros selecionados.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

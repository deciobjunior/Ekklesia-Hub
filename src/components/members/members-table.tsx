

import {
  MoreHorizontal,
  Briefcase,
  Users,
  HeartHandshake,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Member } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dispatch, SetStateAction } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { SortConfig } from '@/app/(app)/members/page';


interface MembersTableProps {
    members: Member[];
    actions: {
        onEdit: (member: Member) => void;
        onSendMessage: (member: Member) => void;
        onDelete: (member: Member) => void;
    };
    canDelete?: boolean;
    selectedMemberIds: string[];
    onSelectedMemberIdsChange: Dispatch<SetStateAction<string[]>>;
    sortConfig: SortConfig;
    onSort: (key: keyof Member) => void;
}

export function MembersTable({ members, actions, canDelete = false, selectedMemberIds, onSelectedMemberIdsChange, sortConfig, onSort }: MembersTableProps) {
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      onSelectedMemberIdsChange(members.map(m => m.id));
    } else {
      onSelectedMemberIdsChange([]);
    }
  }

  const handleSelectRow = (memberId: string, checked: boolean) => {
    if (checked) {
      onSelectedMemberIdsChange(prev => [...prev, memberId]);
    } else {
      onSelectedMemberIdsChange(prev => prev.filter(id => id !== memberId));
    }
  }

  const renderSortArrow = (key: keyof Member) => {
    if (sortConfig?.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />;
  };
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {canDelete && (
               <TableHead className="w-[40px]">
                 <Checkbox 
                    checked={selectedMemberIds.length > 0 && selectedMemberIds.length === members.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                 />
               </TableHead>
            )}
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Avatar</span>
            </TableHead>
            <TableHead>
                <Button variant="ghost" onClick={() => onSort('name')}>
                    Nome {renderSortArrow('name')}
                </Button>
            </TableHead>
            <TableHead>
                <Button variant="ghost" onClick={() => onSort('role')}>
                    Cargo {renderSortArrow('role')}
                </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
                 <Button variant="ghost" onClick={() => onSort('status')}>
                    Status {renderSortArrow('status')}
                </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
                <Button variant="ghost" onClick={() => onSort('lastSeen')}>
                    Última visita {renderSortArrow('lastSeen')}
                </Button>
            </TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length > 0 ? (
            members.map((member) => (
              <TableRow key={member.id}>
                {canDelete && (
                  <TableCell>
                    <Checkbox 
                      checked={selectedMemberIds.includes(member.id)}
                      onCheckedChange={(checked) => handleSelectRow(member.id, !!checked)}
                      aria-label={`Selecionar ${member.name}`}
                    />
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar} alt="Avatar" data-ai-hint="person" />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground md:hidden">{member.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{member.role}</span>
                     {(member.role === 'Voluntário' || member.role === 'Consolidador') && member.ministryCount && member.ministryCount > 0 && (
                        <Badge variant={member.ministryCount > 1 ? "destructive" : "secondary"} className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {member.ministryCount} {member.ministryCount > 1 ? 'Ministérios' : 'Ministério'}
                        </Badge>
                    )}
                    {member.isInSmallGroup && (
                       <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> Pequeno Grupo
                       </Badge>
                    )}
                    {member.form_data?.source === 'Acolhimento' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                            <HeartHandshake className="mr-1 h-3 w-3" />
                            Novo Convertido
                        </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={member.status === 'Ativo' ? 'secondary' : 'outline'}>{member.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {member.lastSeen}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => actions.onEdit(member)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onSendMessage(member)}>Enviar Mensagem</DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => actions.onDelete(member)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={canDelete ? 7 : 6} className="h-24 text-center">
                Nenhum membro encontrado com os filtros selecionados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

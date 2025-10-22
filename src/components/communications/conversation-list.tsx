
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from './chat-interface';
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

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (phone: string) => void;
  loading: boolean;
  onNewConversation: () => void;
  onDeleteConversation: (phone: string) => void;
}

export function ConversationList({ 
  conversations, 
  selectedConversationId, 
  onConversationSelect, 
  loading,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(c =>
    (c.contactName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Conversas</h2>
            <Button variant="ghost" size="icon" onClick={onNewConversation}>
                <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar conversas..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <p>Nenhuma conversa encontrada.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations
                .filter(conv => conv?.id) 
                .map((conv) => (
                  <div key={conv.id} className="group relative">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-auto justify-start p-2 gap-3",
                        selectedConversationId === conv.id && "bg-muted"
                      )}
                      onClick={() => onConversationSelect(conv.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={conv.contactAvatar} 
                          alt={conv.contactName} 
                          data-ai-hint="person" 
                        />
                        <AvatarFallback>
                          {conv.contactName?.charAt(0) || 'G'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="font-semibold truncate">{conv.contactName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end text-xs text-muted-foreground">
                        <span>{conv.lastMessageTime}</span>
                        {conv.unreadCount > 0 && (
                          <div className="mt-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </Button>

                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Conversa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Esta ação é permanente e irá apagar todo o histórico de mensagens com <strong>{conv.contactName}</strong>. Deseja continuar?
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteConversation(conv.phone)} className="bg-destructive hover:bg-destructive/90">
                                  Sim, Excluir
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
    </div>
  );
}

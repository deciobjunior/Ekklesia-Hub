
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import type { Member, Message } from '@/lib/data';
import { ConversationList } from '@/components/communications/conversation-list';
import { ChatView } from '@/components/communications/chat-view';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getConversationList } from '@/helpers/getConversationList';
import { getConversationMessages } from '@/helpers/getConversationMessages';
import { markMessagesAsRead } from '@/helpers/markMessagesAsRead';
import { AddCommunicationGroupDialog } from './add-communication-group-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { getContacts } from '@/helpers/getContacts';

export type Conversation = {
  id: string;
  contactName: string;
  phone: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lastActivityTime: Date;
  isGroup: boolean;
};

interface ChatInterfaceProps {
  onConversationCreated: (conversationId: string) => void;
  initialConversationId?: string | null;
  newConversationWith?: string | null;
}

export function ChatInterface({
  onConversationCreated,
  initialConversationId = null,
  newConversationWith = null,
}: ChatInterfaceProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const { churchId, user } = useUser();
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fetchAllMembers = useCallback(async () => {
      if (!churchId) return;
      setLoadingMembers(true);
      const members = await getContacts('all', churchId);
      setAllMembers(members as any);
      setLoadingMembers(false);
    }, [churchId]);

  const fetchConversations = useCallback(async () => {
    if (!churchId || !user) return;
    setLoadingConversations(true);

    const convListData = await getConversationList(churchId);

    const formattedConversations: Conversation[] = (convListData || []).map((c: any) => ({
      id: c.phone,
      contactName: c.contact_name || 'Desconhecido',
      phone: c.phone,
      contactAvatar: `https://placehold.co/40x40.png?text=${c.contact_name?.charAt(0) || 'D'}`,
      lastMessage: c.last_message || 'Nenhuma mensagem ainda',
      lastMessageTime: c.last_message_at
        ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })
        : '',
      unreadCount: c.unread_count || 0,
      lastActivityTime: new Date(c.last_message_at || 0),
      isGroup: false,
    }));

    setConversations(formattedConversations);
    setLoadingConversations(false);
  }, [churchId, user]);

  const fetchMessages = useCallback(
    async (phone: string) => {
      if (!user || !churchId) return;
      setLoadingMessages(true);

      const messageData = await getConversationMessages(churchId, phone);
      
      const formattedMessages: Message[] = (messageData || []).map((msg: any) => ({
        id: msg.id,
        conversationId: msg.phone,
        sender: msg.direction === 'sent' ? 'me' : msg.contact_name,
        content: msg.message,
        timestamp: msg.timestamp,
      }));

      setMessages(formattedMessages);
      setLoadingMessages(false);
    },
    [user, churchId]
  );
  
 const handleIndividualSelected = useCallback(async (memberId: string) => {
    if (!user || !churchId) return;

    const member = allMembers.find(m => m.id === memberId);
    
    if (!member) {
        toast({ title: 'Erro', description: 'Membro não encontrado.', variant: 'destructive' });
        return;
    }
    
    if (!member.phone) {
        toast({ title: 'Erro', description: 'Não é possível iniciar a conversa. O membro selecionado não possui um número de telefone cadastrado.', variant: 'destructive' });
        return;
    }

    const phone = member.phone.replace(/\D/g, ''); 
    const existingConversation = conversations.find((c) => c.phone.replace(/\D/g, '') === phone);

    if (existingConversation) {
        setSelectedConversationId(existingConversation.id);
    } else {
        const newConv: Conversation = {
            id: phone,
            contactName: member.name,
            phone: member.phone,
            contactAvatar: member.avatar || `https://placehold.co/40x40.png?text=${member.name.charAt(0)}`,
            lastMessage: 'Inicie a conversa...',
            lastMessageTime: '',
            unreadCount: 0,
            lastActivityTime: new Date(),
            isGroup: false,
        };
        setConversations(prev => [newConv, ...prev].sort((a, b) => b.lastActivityTime.getTime() - a.lastActivityTime.getTime()));
        setSelectedConversationId(newConv.id);
    }
}, [user, churchId, allMembers, conversations, toast]);


  useEffect(() => {
    const newConversationMemberId = searchParams.get('newConversationWith');
    if (newConversationMemberId && allMembers.length > 0) {
      handleIndividualSelected(newConversationMemberId);
       // Clean the URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('newConversationWith');
      router.replace(newUrl.toString(), { scroll: false });
    }
  }, [searchParams, allMembers, handleIndividualSelected, router]);
  
  useEffect(() => {
    if (churchId) {
      fetchAllMembers();
    }
  }, [churchId, fetchAllMembers]);


  useEffect(() => {
    if (!churchId) return;

    fetchConversations();

    const messagesChannel = supabase
      .channel('all-messages-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbound_messages' },
        (payload) => {
          fetchConversations();
          if (selectedConversationId && payload.new.phone === selectedConversationId) {
            fetchMessages(selectedConversationId);
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_history' },
        (payload) => {
           fetchConversations();
           if (selectedConversationId && payload.new.member_phone === selectedConversationId) {
             fetchMessages(selectedConversationId);
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [churchId, fetchConversations, supabase, selectedConversationId, fetchMessages]);

  useEffect(() => {
    if (selectedConversationId) {
      setMessages([]);
      fetchMessages(selectedConversationId);
      markMessagesAsRead(churchId!, selectedConversationId);
       setConversations(prevConvs =>
        prevConvs.map(c =>
          c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, [selectedConversationId, fetchMessages, churchId]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  const handleSelectConversation = (phone: string) => {
    setSelectedConversationId(phone);
  };
  
   const handleDeleteConversation = async (phone: string) => {
    if (!churchId) return;

    try {
      const { error: historyError } = await supabase
        .from('message_history')
        .delete()
        .eq('church_id', churchId)
        .eq('member_phone', phone);
      if (historyError) throw historyError;
      
      const { error: inboundError } = await supabase
        .from('inbound_messages')
        .delete()
        .eq('church_id', churchId)
        .eq('phone', phone);
      if (inboundError) throw inboundError;

      toast({ title: 'Conversa Deletada', description: 'Todo o histórico da conversa foi removido.' });

      setConversations(prev => prev.filter(c => c.phone !== phone));
      if (selectedConversationId === phone) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    }
  };


  const layout = [320, 1110];
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
        <ResizablePanel
          defaultSize={layout[0]}
          minSize={30}
          maxSize={40}
          className={cn('h-full min-w-[280px] max-w-[400px]')}
        >
          <div className="flex h-full flex-col bg-card border-r">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onConversationSelect={handleSelectConversation}
              loading={loadingConversations}
              onNewConversation={() => setIsAddGroupOpen(true)}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={layout[1]} minSize={60}>
          <ChatView
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            onMessageSent={() => {
              if (selectedConversationId) fetchMessages(selectedConversationId);
               fetchConversations();
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <AddCommunicationGroupDialog
        open={isAddGroupOpen}
        onOpenChange={setIsAddGroupOpen}
        onSuccess={() => {
          fetchConversations();
          setIsAddGroupOpen(false);
        }}
        onIndividualSelected={handleIndividualSelected}
        allMembers={allMembers}
        loadingMembers={loadingMembers}
      />
    </>
  );
}

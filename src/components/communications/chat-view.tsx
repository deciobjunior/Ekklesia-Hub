
'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, Info } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { sendWhatsappMessage } from '@/helpers/sendWhatsappMessage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/data';
import type { Conversation } from './chat-interface';

interface ChatViewProps {
  conversation: Conversation | undefined;
  messages: Message[];
  loading: boolean;
  onMessageSent: () => void;
}

export function ChatView({ conversation, messages, loading, onMessageSent }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user, churchId } = useUser();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if(viewport) {
              viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !conversation || !user || !churchId) {
        toast({ title: "Erro", description: "Não foi possível enviar a mensagem. Informações da conversa ou do usuário estão ausentes.", variant: 'destructive' });
        return;
    }
    setIsSending(true);

    try {
      // 1. Save message to DB with 'pending' status
      const { data, error: insertError } = await supabase.from('message_history').insert({
        church_id: churchId,
        member_phone: conversation.phone,
        member_name: conversation.contactName,
        message_body: input,
        status: 'pending',
        sent_by: user.user_metadata.full_name || 'System',
        campaign_id: crypto.randomUUID(), // Or a more meaningful campaign ID if available
      }).select().single();

      if (insertError) throw insertError;
      
      const sentMessageId = data.id;

      // 2. Call the webhook to send the message
      await sendWhatsappMessage(conversation.phone, input);

      // 3. Update the message status to 'sent'
      await supabase.from('message_history').update({ status: 'sent' }).eq('id', sentMessageId);

      setInput('');
      onMessageSent(); // This will trigger a re-fetch of messages and conversations
    
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao Enviar",
        description: `Não foi possível enviar a mensagem: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };


  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/50">
        <div className="text-center text-muted-foreground">
          <Info className="mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-medium">Selecione uma conversa</h3>
          <p className="mt-1 text-sm">Escolha uma conversa da lista para ver as mensagens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contactAvatar} alt={conversation.contactName} data-ai-hint="person" />
            <AvatarFallback>{conversation.contactName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{conversation.contactName}</h3>
            <p className="text-xs text-muted-foreground">{conversation.phone}</p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {loading ? (
             <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
            </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-3 ${message.sender === 'me' ? 'justify-end' : ''}`}
              >
                {message.sender !== 'me' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={conversation.contactAvatar} alt={message.sender} data-ai-hint="person" />
                    <AvatarFallback>{message.sender?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-md">
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'me'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.content}</p>
                  </div>
                   <p className={`text-xs text-muted-foreground mt-1 ${message.sender === 'me' ? 'text-right' : 'text-left'}`}>
                     {format(new Date(message.timestamp), 'dd/MM, HH:mm', { locale: ptBR })}
                   </p>
                </div>
                {message.sender === 'me' && user && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.user_metadata.avatar_url} alt="User Avatar" data-ai-hint="person" />
                    <AvatarFallback>{user.user_metadata.full_name?.charAt(0) || 'V'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSending) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Digite sua mensagem..."
            className="pr-12"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

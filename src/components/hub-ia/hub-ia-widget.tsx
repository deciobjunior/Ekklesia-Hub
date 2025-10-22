
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-react';
import { askHubIa } from '@/ai/flows/hub-ia-flow';
import { useToast } from '@/hooks/use-toast';
import Markdown from 'react-markdown';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function HubIaWidget({ user }: { user: SupabaseUser | null }) {
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);


    const handleSendMessage = async () => {
        if (!input.trim() || !user) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const historyForApi = messages.map(msg => ({
                role: msg.role,
                content: [{ text: msg.content }]
            }));
            
            const response = await askHubIa({
                history: historyForApi,
                prompt: input,
                userId: user.id
            });

            const modelMessage: Message = { role: 'model', content: response };
            setMessages(prev => [...prev, modelMessage]);

        } catch (error) {
            console.error("Error calling Hub IA:", error);
            toast({
                title: "Erro ao se comunicar com a IA",
                description: "Não foi possível obter uma resposta. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
      if(isOpen && messages.length === 0) {
        setMessages([
          { role: 'model', content: 'Olá! Sou o assistente de IA do Ekklesia Hub. Como posso te ajudar a usar a plataforma hoje?'}
        ])
      }
    }, [isOpen, messages.length]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button className="fixed bottom-6 right-20 h-14 w-14 rounded-full shadow-lg" size="icon">
                <Bot className="h-7 w-7" />
                <span className="sr-only">Ekklesia Hub IA</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-[380px] p-0 border-none rounded-lg shadow-2xl mr-4 mb-2">
            <h2 className="sr-only">Chat com Assistente Hub IA</h2>
            <div className="flex flex-col h-[60vh] bg-card rounded-lg">
                <header className="p-4 border-b flex items-center justify-between bg-muted/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <Bot className="h-6 w-6 text-primary" />
                        <h3 className="font-semibold text-lg">Assistente Hub IA</h3>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </header>

                <ScrollArea className="flex-grow p-4">
                    <div className="space-y-6">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                {message.role === 'model' && (
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                                    message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                }`}>
                                    <div className="prose prose-sm prose-p:my-0">
                                        <Markdown>{message.content}</Markdown>
                                    </div>
                                </div>
                                {message.role === 'user' && (
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg px-4 py-3 bg-muted flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Pensando...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-3 border-t">
                    <div className="relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) handleSendMessage(); }}
                            placeholder="Faça sua pergunta..."
                            className="pr-12"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar</span>
                        </Button>
                    </div>
                </div>
            </div>
          </PopoverContent>
      </Popover>
    );
}

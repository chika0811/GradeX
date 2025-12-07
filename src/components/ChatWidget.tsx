import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Sparkles, Bookmark, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SavedResponses, saveResponse } from '@/components/SavedResponses';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const { user } = useAuth();
  const { getCGPA, getCarryovers, getCurrentGPA } = useCourses();
  const { toast } = useToast();
  const { isOpen, setIsOpen } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // ... (keeping existing logic for cgpa, userContext, etc.)
  const cgpa = getCGPA();
  const carryovers = getCarryovers();
  const currentGPA = getCurrentGPA();

  const userContext = {
    name: user?.name || 'Student',
    cgpa,
    carryoversCount: carryovers.length,
    currentGPA,
    level: user?.level,
    semester: user?.semester,
  };

  useEffect(() => {
    if (isOpen && !hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      const welcomeContent = cgpa > 0 
        ? `Hello ${userContext.name}!\n\nI'm Liona AI. I can see your current CGPA is ${cgpa.toFixed(2)}${carryovers.length > 0 ? ` with ${carryovers.length} carryover(s)` : ''}.\n\nHow can I help you today?`
        : `Hello ${userContext.name}!\n\nI'm Liona AI. I help students understand and improve their academic performance.\n\nWhat would you like help with?`;
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, cgpa, carryovers.length, userContext.name]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    
    // Immediate blinking cursor
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gradex-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          userContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch {}
          }
        }
        if (done) break;
      }

      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < fullContent.length) {
          const displayedContent = fullContent.slice(0, currentIndex + 1);
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: displayedContent } : m
          ));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsLoading(false);
        }
      }, 20);

    } catch (error) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to get AI response',
        variant: 'destructive',
      });
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: "I'm having trouble connecting right now. Please try again in a moment." } : m
      ));
    }
  };

  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!user || !isOpen) return null;

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-ai flex items-center justify-center shadow-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Liona AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SavedResponses />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className={`p-3 rounded-2xl text-sm ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-muted/50 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                      {isLoading && message.role === 'assistant' && message.id === messages[messages.length - 1].id && message.content.length === 0 && (
                        <span className="inline-block w-[2px] h-4 ml-1 bg-foreground align-middle cursor-blink" />
                      )}
                    </p>
                  </div>
                  {message.role === 'assistant' && message.content.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] self-start px-2" onClick={() => { saveResponse(message.content); toast({ title: 'Saved!', description: 'Response saved.' }); }}>
                      <Bookmark className="w-3 h-3 mr-1" /> Save
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted/50 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-background/50 rounded-b-xl">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about CGPA..."
                className="flex-1 h-10 text-sm"
                disabled={isLoading}
              />
              <Button size="icon" className="h-10 w-10" onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="mt-2 text-center">
              <p className="text-[10px] text-muted-foreground">
                Powered by <span className="font-semibold text-primary">NoskyTech</span>
              </p>
            </div>
          </div>
        </div>
  );
}

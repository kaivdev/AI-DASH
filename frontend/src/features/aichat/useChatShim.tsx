import { useState, useCallback, useEffect, useRef } from 'react';
import { aiApi, chatApi } from '@/lib/api'
import { useAuth } from '@/stores/useAuth'

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

export interface UseChatOptions {
  initialMessages?: Message[];
  onFinish?: (message: Message) => void;
}

export interface UseChatHelpers {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  append: (message: Omit<Message, 'id'>) => void;
  setInput: (input: string) => void;
  isLoading: boolean;
  reload: () => void;
  stop: () => void;
  // server-managed
  sessionId?: string;
  selectSession: (id: string) => Promise<void>;
}

export function useChat(options: UseChatOptions = {}): UseChatHelpers {
  const { initialMessages = [], onFinish } = options;
  const token = useAuth((s) => s.token)
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const bootstrapped = useRef(false)
  // freeze initialMessages to avoid recreating callbacks
  const initialMessagesRef = useRef<Message[]>(initialMessages)

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const append = useCallback(async (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    if (message.role === 'user') {
      if (!sessionId) return; // guard: should not happen after bootstrap
      try {
        setIsLoading(true)
        const resp = await aiApi.chat(message.content, sessionId)
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: resp.message,
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
        if (onFinish) onFinish(assistantMessage)
      } catch (e) {
        console.error('chat error', e)
      } finally {
        setIsLoading(false)
      }
    }
  }, [onFinish, sessionId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

  append({
      role: 'user',
      content: input.trim(),
    });
    
    setInput('');
  }, [input, isLoading, append]);

  const reload = useCallback(() => {
    // В реальном приложении здесь будет перезагрузка последнего сообщения
    console.log('Reload functionality not implemented yet');
  }, []);

  const stop = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Select/load a session
  const selectSession = useCallback(async (id: string) => {
    setSessionId(id)
    try {
      const rows = await chatApi.messages(id) as any[]
      const mapped: Message[] = rows.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at ? new Date(m.created_at) : undefined }))
      setMessages(mapped.length ? mapped : initialMessagesRef.current)
    } catch (e) {
      console.error('load messages failed', e)
      setMessages(initialMessagesRef.current)
    }
  }, [])

  // Bootstrap: ensure a session exists and handle pending query
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    ;(async () => {
      if (!token) return
      try {
        const sessions = await chatApi.sessions() as any[]
        let sid: string | undefined
        if (sessions && sessions.length) {
          sid = sessions[0].id
        } else {
          const s = await chatApi.create('Новый чат') as any
          sid = s.id
        }
        if (!sid) return
        await selectSession(sid)
        // Pending query from Topbar
        const pending = localStorage.getItem('pendingChatQuery')
        if (pending && pending.trim()) {
          localStorage.removeItem('pendingChatQuery')
          setInput('')
          await append({ role: 'user', content: pending.trim() })
        }
      } catch (e) {
        console.error('bootstrap chat failed', e)
      }
    })()
  }, [token, append, selectSession])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    setInput,
    isLoading,
    reload,
    stop,
    sessionId,
    selectSession,
  };
}
"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./sidebar";
import { useChat } from "./useChatShim";
import { ChatInterface } from "./chat-interface";
import { chatApi } from '@/lib/api'

export default function AiChat() {
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [chats, setChats] = useState<{ id: string; title: string; preview: string; timestamp: Date }[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, selectSession, sessionId } = useChat({
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Привет! Я ваш ИИ-помощник. Чем могу помочь сегодня? Могу помочь с задачами, проектами, заметками или просто ответить на вопросы."
      }
    ]
  });

  // Load sessions list once
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const sessions = await chatApi.sessions() as any[]
        if (!mounted) return
        const mapped = sessions.map((s) => ({ id: s.id, title: s.title || 'Новый чат', preview: '', timestamp: new Date(s.updated_at || s.created_at) }))
        setChats(mapped)
        if (sessions[0]?.id) {
          setSelectedChatId((prev) => prev || sessions[0].id)
        }
      } catch (e) {
        console.error('load sessions failed', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleNewChat = () => {
    (async () => {
      try {
        const s = await chatApi.create('Новый чат') as any
        const newChat = { id: s.id, title: s.title || 'Новый чат', preview: '', timestamp: new Date(s.updated_at || s.created_at) }
        setChats(prev => [newChat, ...prev])
        setSelectedChatId(s.id)
        await selectSession(s.id)
      } catch (e) {
        console.error('new chat failed', e)
      }
    })()
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    selectSession(chatId)
  };

  const handleDeleteChat = (chatId: string) => {
    (async () => {
      try {
        await chatApi.remove(chatId)
        setChats(prev => prev.filter(chat => chat.id !== chatId))
        if (selectedChatId === chatId) {
          const remaining = chats.filter((c) => c.id !== chatId)
          if (remaining.length) {
            setSelectedChatId(remaining[0].id)
            await selectSession(remaining[0].id)
          } else {
            handleNewChat()
          }
        }
      } catch (e) {
        console.error('delete chat failed', e)
      }
    })()
  };

  const handleSuggestionClick = (suggestion: string) => {
    // In a real app, this would start a new chat with the suggestion
    setSelectedChatId("new");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      <Sidebar
        chats={chats}
  selectedChatId={selectedChatId || sessionId || ''}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      <div className="flex flex-1 flex-col border-l min-h-0 overflow-hidden">
        <ChatInterface
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

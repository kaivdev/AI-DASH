"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Star,
  Archive,
  Puzzle,
  Search,
  MessageCircle,
  Settings,
  HelpCircle,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

interface SidebarProps {
  chats: Chat[];
  selectedChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function Sidebar({ chats, selectedChatId, onNewChat, onSelectChat, onDeleteChat }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} д назад`;
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background flex w-80 flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <Button 
          className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" 
          variant="outline"
          onClick={onNewChat}>
          <Plus className="mr-2 h-4 w-4" />
          Новый чат
        </Button>
      </div>

      {/* Recent Chats */}
      <div className="flex min-h-0 flex-col flex-1 overflow-hidden">
        <div className="px-4 py-3 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>
        
        <div className="px-4 py-3 flex-shrink-0">
          <h3 className="text-muted-foreground text-sm font-medium">
            Недавние чаты
          </h3>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 pb-4 px-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative rounded-lg hover:bg-muted/60 transition-colors",
                    selectedChatId === chat.id && "bg-muted/80 border border-border"
                  )}>
                  <Button
                    variant="ghost"
                    onClick={() => onSelectChat(chat.id)}
                    className="h-auto w-full justify-start p-3 text-left">
                    <div className="flex w-full items-start gap-3">
                      <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="truncate text-sm font-medium">{chat.title}</div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="text-muted-foreground truncate text-xs flex-1">
                            {chat.preview}
                          </div>
                          <div className="text-muted-foreground text-xs flex-shrink-0">
                            {formatTime(chat.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Button>
                  {/* Delete button - показывается при наведении */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border/20 shadow-sm z-10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-1 border-t p-4 flex-shrink-0">
        <Button variant="ghost" className="text-muted-foreground w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button variant="ghost" className="text-muted-foreground w-full justify-start gap-2">
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </Button>
      </div>
    </div>
  );
}

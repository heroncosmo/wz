import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageCircle, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation } from "@shared/schema";
import { useState } from "react";

interface ConversationsListProps {
  connectionId?: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationsList({
  connectionId,
  selectedConversationId,
  onSelectConversation,
}: ConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!connectionId,
  });

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.contactName?.toLowerCase().includes(searchLower) ||
      conv.contactNumber.includes(searchLower) ||
      conv.lastMessageText?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h2 className="font-semibold text-lg">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!connectionId ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-sm mb-2">WhatsApp não conectado</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-3">Conecte seu WhatsApp para começar a receber conversas.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.querySelector('[data-testid="button-nav-connection"]') as HTMLButtonElement;
                el?.click();
              }}
              data-testid="button-minimal-connect-whatsapp-list"
            >
              Conectar WhatsApp
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-sm mb-2">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {searchQuery
                ? "Tente buscar por outro termo"
                : "As conversas aparecerão aqui quando você receber mensagens"}
            </p>
          </div>
        ) : (
          <div className="divide-y" data-testid="list-conversations">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full p-4 text-left hover-elevate active-elevate-2 transition-colors ${
                  selectedConversationId === conversation.id
                    ? "bg-sidebar-accent"
                    : ""
                }`}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {conversation.contactName
                        ? conversation.contactName.charAt(0).toUpperCase()
                        : conversation.contactNumber.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {conversation.contactName || conversation.contactNumber}
                      </h3>
                      {conversation.lastMessageTime && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessageText || "Sem mensagens"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="flex-shrink-0 h-5 min-w-5 px-1.5 text-xs"
                          data-testid={`badge-unread-${conversation.id}`}
                        >
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

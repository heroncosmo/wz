import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Settings, LogOut, Smartphone, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationsList } from "@/components/conversations-list";
import { ChatArea } from "@/components/chat-area";
import { ConnectionPanel } from "@/components/connection-panel";
import { DashboardStats } from "@/components/dashboard-stats";
import MyAgent from "@/pages/my-agent";
import type { WhatsappConnection } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedView, setSelectedView] = useState<"conversations" | "connection" | "stats" | "agent">("conversations");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa fazer login. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: connection } = useQuery<WhatsappConnection>({
    queryKey: ["/api/whatsapp/connection"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <div className="w-16 border-r bg-sidebar flex flex-col items-center py-4 gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <Button
            size="icon"
            variant={selectedView === "stats" ? "default" : "ghost"}
            onClick={() => setSelectedView("stats")}
            data-testid="button-nav-stats"
            className="rounded-md"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant={selectedView === "conversations" ? "default" : "ghost"}
            onClick={() => setSelectedView("conversations")}
            data-testid="button-nav-conversations"
            className="rounded-md"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant={selectedView === "connection" ? "default" : "ghost"}
            onClick={() => setSelectedView("connection")}
            data-testid="button-nav-connection"
            className="rounded-md"
          >
            <Smartphone className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant={selectedView === "agent" ? "default" : "ghost"}
            onClick={() => setSelectedView("agent")}
            data-testid="button-nav-agent"
            className="rounded-md"
          >
            <Bot className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-settings"
            className="rounded-md"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <a href="/api/logout">
            <Button
              size="icon"
              variant="ghost"
              data-testid="button-logout"
              className="rounded-md"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {selectedView === "stats" && (
          <div className="flex-1 overflow-auto">
            <DashboardStats connection={connection} />
          </div>
        )}

        {selectedView === "connection" && (
          <div className="flex-1 overflow-auto">
            <ConnectionPanel />
          </div>
        )}

        {selectedView === "agent" && (
          <div className="flex-1 overflow-auto">
            <MyAgent />
          </div>
        )}

        {selectedView === "conversations" && (
          <>
            {/* Conversations List */}
            <div className="w-80 border-r bg-card flex flex-col">
              <ConversationsList
                connectionId={connection?.id}
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
              />
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <ChatArea
                conversationId={selectedConversationId}
                connectionId={connection?.id}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

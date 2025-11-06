import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { MessageCircle, Users, CheckCircle, Clock } from "lucide-react";
import type { WhatsappConnection } from "@shared/schema";

interface DashboardStatsProps {
  connection?: WhatsappConnection;
}

interface Stats {
  totalConversations: number;
  unreadMessages: number;
  todayMessages: number;
}

export function DashboardStats({ connection }: DashboardStatsProps) {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    enabled: !!connection?.isConnected,
  });

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-6xl mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas conversas no WhatsApp
          </p>
        </div>

        {!connection?.isConnected ? (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">WhatsApp não conectado</h3>
            <p className="text-sm text-muted-foreground">
              Conecte seu WhatsApp para visualizar as estatísticas
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Conversas</p>
                  <p className="text-3xl font-bold" data-testid="stat-total-conversations">
                    {stats?.totalConversations || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Não Lidas</p>
                  <p className="text-3xl font-bold" data-testid="stat-unread">
                    {stats?.unreadMessages || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
                  <p className="text-3xl font-bold" data-testid="stat-today">
                    {stats?.todayMessages || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-xl font-semibold text-primary">Conectado</p>
                </div>
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

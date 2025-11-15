import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, QrCode, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminWhatsappConnection {
  id?: string;
  adminId?: string;
  phoneNumber?: string;
  isConnected: boolean;
  qrCode?: string;
}

interface AdminSession {
  authenticated: boolean;
  adminId: string;
  adminRole?: string;
}

export default function AdminWhatsappPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Buscar sessão do admin para obter o adminId real
  const { data: adminSession } = useQuery<AdminSession>({
    queryKey: ["/api/admin/session"],
  });

  // Buscar status da conexão
  const { data: connection, isLoading } = useQuery<AdminWhatsappConnection>({
    queryKey: ["/api/admin/whatsapp/connection"],
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Mutation para conectar
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/whatsapp/connect", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao conectar WhatsApp");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conectando WhatsApp",
        description: "Aguarde o QR Code aparecer...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/connection"] });
      
      // Conectar WebSocket para receber QR Code
      connectWebSocket();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para desconectar
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/whatsapp/disconnect", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao desconectar WhatsApp");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp desconectado",
        description: "Sua conexão foi encerrada com sucesso.",
      });
      setQrCode(null);
      setIsConnecting(false);
      if (ws) {
        ws.close();
        setWs(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/connection"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Conectar WebSocket
  const connectWebSocket = () => {
    // Obter adminId da sessão
    if (!adminSession?.adminId) {
      console.error("Admin ID não disponível");
      toast({
        title: "Erro",
        description: "Não foi possível obter o ID do administrador",
        variant: "destructive",
      });
      return;
    }

    const adminId = adminSession.adminId;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?adminId=${encodeURIComponent(adminId)}`;

    console.log(`Conectando WebSocket com adminId: ${adminId}`);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log(`Admin WebSocket conectado com adminId: ${adminId}`);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Admin WebSocket message:", data);

        if (data.type === "qr") {
          console.log("QR Code recebido!");
          setQrCode(data.qr);
          setIsConnecting(false);
        } else if (data.type === "connecting") {
          console.log("WhatsApp conectando...");
          setQrCode(null);
          setIsConnecting(true);
          toast({
            title: "Conectando...",
            description: "Aguarde enquanto estabelecemos a conexão",
          });
        } else if (data.type === "connected") {
          setQrCode(null);
          setIsConnecting(false);
          toast({
            title: "WhatsApp conectado!",
            description: `Número: ${data.phoneNumber}`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/connection"] });
        } else if (data.type === "disconnected") {
          setQrCode(null);
          setIsConnecting(false);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp/connection"] });
        }
      } catch (error) {
        console.error("Erro ao processar mensagem WebSocket:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
    };

    websocket.onclose = () => {
      console.log("Admin WebSocket desconectado");
    };

    setWs(websocket);
  };

  // Limpar WebSocket ao desmontar
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp do Administrador
            </CardTitle>
            <CardDescription>
              Conecte seu WhatsApp para enviar mensagens de boas-vindas aos novos clientes
            </CardDescription>
          </div>
          {connection?.isConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Desconectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection?.isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Número conectado:</p>
              <p className="text-lg font-semibold">{connection.phoneNumber || "Carregando..."}</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="w-full"
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                "Desconectar WhatsApp"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isConnecting ? (
              <div className="flex flex-col items-center space-y-4 p-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">Conectando...</p>
                  <p className="text-sm text-muted-foreground">
                    Aguarde enquanto estabelecemos a conexão com o WhatsApp
                  </p>
                </div>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-blue-900">Como conectar seu WhatsApp:</h4>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                    <li>Toque em <strong>Menu</strong> (⋮) ou <strong>Configurações</strong></li>
                    <li>Toque em <strong>Aparelhos conectados</strong></li>
                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                    <li>Aponte a câmera do celular para este QR Code</li>
                  </ol>
                </div>
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium flex items-center justify-center gap-2 text-primary">
                    <QrCode className="w-4 h-4" />
                    Escaneie o QR Code acima
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="w-full"
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


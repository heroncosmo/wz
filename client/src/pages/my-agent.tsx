import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, TestTube, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiAgentConfig } from "@shared/schema";

export default function MyAgent() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");

  const { data: config, isLoading } = useQuery<AiAgentConfig | null>({
    queryKey: ["/api/agent/config"],
  });

  useEffect(() => {
    if (config) {
      setPrompt(config.prompt || "");
      setIsActive(config.isActive || false);
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/agent/config", {
        prompt,
        isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/config"] });
      toast({
        title: "Configuração Salva",
        description: "Agente IA configurado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testAgentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/agent/test", {
        message: testMessage,
      });
      return response;
    },
    onSuccess: (data: any) => {
      setTestResponse(data.response || "Sem resposta");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao testar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Meu Agente IA</h1>
              <p className="text-muted-foreground">
                Configure o agente inteligente para responder seus clientes automaticamente
              </p>
            </div>
          </div>
        </div>

        {!config && (
          <Card className="p-6 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  Configure seu Agente IA
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Você ainda não configurou seu agente IA. Configure agora para começar a usar respostas automáticas!
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="agent-active" className="text-base font-semibold">
                  Status do Agente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ative ou desative o agente para todas as conversas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="gap-1"
                  data-testid="badge-agent-status"
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Inativo
                    </>
                  )}
                </Badge>
                <Switch
                  id="agent-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  data-testid="switch-agent-active"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-prompt" className="text-base font-semibold">
                Instruções do Agente
              </Label>
              <p className="text-sm text-muted-foreground">
                Defina como o agente deve se comportar e responder. Seja específico sobre o tom, estilo e informações que deve fornecer.
              </p>
              <Textarea
                id="agent-prompt"
                placeholder="Exemplo: Você é um assistente de atendimento ao cliente profissional e simpático. Responda perguntas sobre produtos, preços e horários de funcionamento. Seja breve e direto, mas sempre educado. Se não souber alguma coisa, peça para o cliente aguardar que um atendente humano irá responder em breve."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                className="resize-none"
                data-testid="textarea-agent-prompt"
              />
            </div>

            <Button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending || !prompt.trim()}
              className="w-full"
              size="lg"
              data-testid="button-save-config"
            >
              {saveConfigMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </Card>

        {config && (
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Testar Agente</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie uma mensagem de teste para ver como o agente responde
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-message">Mensagem de Teste</Label>
                <Textarea
                  id="test-message"
                  placeholder="Digite uma mensagem de teste..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-test-message"
                />
              </div>

              <Button
                onClick={() => testAgentMutation.mutate()}
                disabled={testAgentMutation.isPending || !testMessage.trim()}
                variant="outline"
                className="w-full"
                data-testid="button-test-agent"
              >
                {testAgentMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Gerando resposta...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Testar Agente
                  </>
                )}
              </Button>

              {testResponse && (
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <Label className="text-sm font-semibold">Resposta do Agente:</Label>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-test-response">
                    {testResponse}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

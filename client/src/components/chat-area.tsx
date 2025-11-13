import { useEffect, useRef, useState } from "react";import { useEffect, useRef, useState } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";import { Textarea } from "@/components/ui/textarea";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";import { Badge } from "@/components/ui/badge";

import { Switch } from "@/components/ui/switch";import { Switch } from "@/components/ui/switch";

import { Send, MessageCircle, Bot, BotOff, Smartphone } from "lucide-react";import { Send, MessageCircle, Bot, BotOff, Smartphone } from "lucide-react";

import { useToast } from "@/hooks/use-toast";import { useToast } from "@/hooks/use-toast";

import { apiRequest, queryClient } from "@/lib/queryClient";import { apiRequest, queryClient } from "@/lib/queryClient";

import { format } from "date-fns";import { format } from "date-fns";

import { ptBR } from "date-fns/locale";import { ptBR } from "date-fns/locale";

import type { Message, Conversation, AiAgentConfig } from "@shared/schema";import type { Message, Conversation, AiAgentConfig } from "@shared/schema";



interface ChatAreaProps {interface ChatAreaProps {

  conversationId: string | null;  conversationId: string | null;

  connectionId?: string;  connectionId?: string;

}}



export function ChatArea({ conversationId, connectionId }: ChatAreaProps) {export function ChatArea({ conversationId, connectionId }: ChatAreaProps) {

  const { toast } = useToast();  const { toast } = useToast();

  const [messageText, setMessageText] = useState("");  const [messageText, setMessageText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);  const messagesEndRef = useRef<HTMLDivElement>(null);



  const { data: conversation } = useQuery<Conversation>({  const { data: conversation } = useQuery<Conversation>({

    queryKey: ["/api/conversation", conversationId],    queryKey: ["/api/conversation", conversationId],

    enabled: !!conversationId,    enabled: !!conversationId,

  });  });



  const { data: messages = [], isLoading } = useQuery<Message[]>({  const { data: messages = [], isLoading } = useQuery<Message[]>({

    queryKey: ["/api/messages", conversationId],    queryKey: ["/api/messages", conversationId],

    enabled: !!conversationId,    enabled: !!conversationId,

    refetchInterval: 2000, // Poll every 2 seconds    refetchInterval: 2000, // Poll every 2 seconds

  });  });



  const { data: agentConfig } = useQuery<AiAgentConfig | null>({  const { data: agentConfig } = useQuery<AiAgentConfig | null>({

    queryKey: ["/api/agent/config"],    queryKey: ["/api/agent/config"],

  });  });



  const { data: agentStatus } = useQuery<{ isDisabled: boolean }>({  const { data: agentStatus } = useQuery<{ isDisabled: boolean }>({

    queryKey: ["/api/agent/status", conversationId],    queryKey: ["/api/agent/status", conversationId],

    enabled: !!conversationId,    enabled: !!conversationId,

  });  });



  const toggleAgentMutation = useMutation({  const toggleAgentMutation = useMutation({

    mutationFn: async (disable: boolean) => {    mutationFn: async (disable: boolean) => {

      return await apiRequest("POST", `/api/agent/toggle/${conversationId}`, {      return await apiRequest("POST", `/api/agent/toggle/${conversationId}`, {

        disable,        disable,

      });      });

    },    },

    onSuccess: () => {    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/agent/status", conversationId] });      queryClient.invalidateQueries({ queryKey: ["/api/agent/status", conversationId] });

      toast({      toast({

        title: agentStatus?.isDisabled ? "Agente Ativado" : "Agente Desativado",        title: agentStatus?.isDisabled ? "Agente Ativado" : "Agente Desativado",

        description: agentStatus?.isDisabled         description: agentStatus?.isDisabled 

          ? "O agente voltara a responder automaticamente"           ? "O agente voltará a responder automaticamente" 

          : "O agente nao respondera mais nesta conversa",          : "O agente não responderá mais nesta conversa",

      });      });

    },    },

    onError: (error: Error) => {    onError: (error: Error) => {

      toast({      toast({

        title: "Erro ao alterar agente",        title: "Erro ao alterar agente",

        description: error.message,        description: error.message,

        variant: "destructive",        variant: "destructive",

      });      });

    },    },

  });  });



  const sendMutation = useMutation({  const sendMutation = useMutation({

    mutationFn: async (text: string) => {    mutationFn: async (text: string) => {

      return await apiRequest("POST", "/api/messages/send", {      return await apiRequest("POST", "/api/messages/send", {

        conversationId,        conversationId,

        text,        text,

      });      });

    },    },

    onSuccess: () => {    onSuccess: () => {

      setMessageText("");      setMessageText("");

      queryClient.invalidateQueries({ queryKey: ["/api/messages", conversationId] });      queryClient.invalidateQueries({ queryKey: ["/api/messages", conversationId] });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

    },    },

    onError: (error: Error) => {    onError: (error: Error) => {

      toast({      toast({

        title: "Erro ao enviar mensagem",        title: "Erro ao enviar mensagem",

        description: error.message,        description: error.message,

        variant: "destructive",        variant: "destructive",

      });      });

    },    },

  });  });



  const handleSend = () => {  const handleSend = () => {

    if (!messageText.trim() || !conversationId) return;    if (!messageText.trim() || !conversationId) return;

    sendMutation.mutate(messageText);    sendMutation.mutate(messageText);

  };  };



  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {

    if (e.key === "Enter" && !e.shiftKey) {    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault();      e.preventDefault();

      handleSend();      handleSend();

    }    }

  };  };



  useEffect(() => {  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);  }, [messages]);



  // Minimalist onboarding: Agent CTA should have priority on the right side  // Minimalist onboarding: Agent CTA should have priority on the right side

  if (!conversationId && (!agentConfig || !(agentConfig as any).isActive)) {  if (!conversationId && (!agentConfig || !(agentConfig as any).isActive)) {

    return (    return (

      <div className="flex items-center justify-center h-full bg-muted/20">      <div className="flex items-center justify-center h-full bg-muted/20">

        <div className="text-center space-y-4 max-w-sm p-8">        <div className="text-center space-y-4 max-w-sm p-8">

          <Bot className="w-16 h-16 mx-auto text-muted-foreground" />          <Bot className="w-16 h-16 mx-auto text-muted-foreground" />

          <div className="space-y-2">          <div className="space-y-2">

            <h3 className="font-semibold text-lg">Configure seu Agente IA</h3>            <h3 className="font-semibold text-lg">Configure seu Agente IA</h3>

            <p className="text-sm text-muted-foreground">Defina seu agente para automatizar respostas.</p>            <p className="text-sm text-muted-foreground">Defina seu agente para automatizar respostas.</p>

            <Button            <Button

              variant="outline"              variant="outline"

              size="sm"              size="sm"

              onClick={() => {              onClick={() => {

                const el = document.querySelector('[data-testid="button-nav-agent"]') as HTMLButtonElement;                const el = document.querySelector('[data-testid=\"button-nav-agent\"]') as HTMLButtonElement;

                el?.click();                el?.click();

              }}              }}

              data-testid="button-minimal-configure-agent"              data-testid="button-minimal-configure-agent"

            >            >

              <Bot className="w-4 h-4 mr-2" />              <Bot className="w-4 h-4 mr-2" />

              Configurar Agente              Configurar Agente

            </Button>            </Button>

          </div>          </div>

        </div>        </div>

      </div>      </div>

    );    );

  }  }



  // Minimalist onboarding: WhatsApp connection CTA when nothing selected  // Minimalist onboarding: WhatsApp connection CTA when nothing selected

  if (!conversationId && !connectionId) {  if (!conversationId && !connectionId) {

    return (    return (

      <div className="flex items-center justify-center h-full bg-muted/20">      <div className="flex items-center justify-center h-full bg-muted/20">

        <div className="flex flex-col items-center justify-center h-full p-8 text-center">        <div className="flex flex-col items-center justify-center h-full p-8 text-center">

          <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />          <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />

          <h3 className="font-medium text-sm mb-2">WhatsApp nao conectado</h3>          <h3 className="font-medium text-sm mb-2">WhatsApp n�o conectado</h3>

          <p className="text-xs text-muted-foreground max-w-xs mb-3">          <p className="text-xs text-muted-foreground max-w-xs mb-3">

            Conecte seu WhatsApp para visualizar e responder mensagens.            Conecte seu WhatsApp para visualizar e responder mensagens.

          </p>          </p>

          <Button          <Button

            variant="outline"            variant="outline"

            size="sm"            size="sm"

            onClick={() => {            onClick={() => {

              const el = document.querySelector('[data-testid="button-nav-connection"]') as HTMLButtonElement;              const el = document.querySelector('[data-testid="button-nav-connection"]') as HTMLButtonElement;

              el?.click();              el?.click();

            }}            }}

            data-testid="button-minimal-connect-whatsapp"            data-testid="button-minimal-connect-whatsapp"

          >          >

            Conectar WhatsApp            Conectar WhatsApp

          </Button>          </Button>

        </div>        </div>

      </div>      </div>

    );    );

  }  }



  // Minimal onboarding when agent is not configured  // Minimal onboarding when agent is not configured

  if (!conversationId && (!agentStatus || agentStatus === undefined)) {  if (!conversationId && (!agentStatus || agentStatus === undefined)) {

    // Fallback: show standard message; agent status is per conversation, so we also check global config below    // Fallback: show standard message; agent status is per conversation, so we also check global config below

  }  }



  // If no conversation selected and agent not configured globally, show minimal CTA  // If no conversation selected and agent not configured globally, show minimal CTA

  // Note: relies on `/api/agent/config` query above  // Note: relies on `/api/agent/config` query above

  // @ts-ignore - `agentConfig` is added when available  // @ts-ignore - `agentConfig` is added when available

  if (!conversationId && (typeof agentConfig === 'undefined' || !(agentConfig && (agentConfig as any).isActive))) {  if (!conversationId && (typeof agentConfig === 'undefined' || !(agentConfig && (agentConfig as any).isActive))) {

    return (    return (

      <div className="flex items-center justify-center h-full bg-muted/20">      <div className="flex items-center justify-center h-full bg-muted/20">

        <div className="text-center space-y-4 max-w-sm p-8">        <div className="text-center space-y-4 max-w-sm p-8">

          <Bot className="w-16 h-16 mx-auto text-muted-foreground" />          <Bot className="w-16 h-16 mx-auto text-muted-foreground" />

          <div className="space-y-2">          <div className="space-y-2">

            <h3 className="font-semibold text-lg">Configure seu Agente IA</h3>            <h3 className="font-semibold text-lg">Configure seu Agente IA</h3>

            <p className="text-sm text-muted-foreground">Defina seu agente para automatizar respostas.</p>            <p className="text-sm text-muted-foreground">Defina seu agente para automatizar respostas.</p>

            <Button            <Button

              variant="outline"              variant="outline"

              size="sm"              size="sm"

              onClick={() => {              onClick={() => {

                const el = document.querySelector('[data-testid="button-nav-agent"]') as HTMLButtonElement;                const el = document.querySelector('[data-testid="button-nav-agent"]') as HTMLButtonElement;

                el?.click();                el?.click();

              }}              }}

              data-testid="button-minimal-configure-agent"              data-testid="button-minimal-configure-agent"

            >            >

              <Bot className="w-4 h-4 mr-2" />              <Bot className="w-4 h-4 mr-2" />

              Configurar Agente              Configurar Agente

            </Button>            </Button>

          </div>          </div>

        </div>        </div>

      </div>      </div>

    );    );

  }  }



  if (!conversationId) {  if (!conversationId) {

    return (    return (

      <div className="flex items-center justify-center h-full bg-muted/20">      <div className="flex items-center justify-center h-full bg-muted/20">

        <div className="text-center space-y-4 max-w-sm p-8">        <div className="text-center space-y-4 max-w-sm p-8">

          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />

          <div className="space-y-2">          <div className="space-y-2">

            <h3 className="font-semibold text-lg">Selecione uma conversa</h3>            <h3 className="font-semibold text-lg">Selecione uma conversa</h3>

            <p className="text-sm text-muted-foreground">            <p className="text-sm text-muted-foreground">

              Escolha uma conversa da lista para comeco a visualizar e responder mensagens              Escolha uma conversa da lista para come�ar a visualizar e responder mensagens

            </p>            </p>

          </div>          </div>

        </div>        </div>

      </div>      </div>

    );    );

  }  }



  if (!connectionId) {  if (!connectionId) {

    return (    return (

      <div className="flex items-center justify-center h-full bg-muted/20">      <div className="flex items-center justify-center h-full bg-muted/20">

        <div className="text-center space-y-4 max-w-sm p-8">        <div className="text-center space-y-4 max-w-sm p-8">

          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />

          <div className="space-y-2">          <div className="space-y-2">

            <h3 className="font-semibold text-lg">WhatsApp nao conectado</h3>            <h3 className="font-semibold text-lg">WhatsApp n�o conectado</h3>

            <p className="text-sm text-muted-foreground">            <p className="text-sm text-muted-foreground">

              Conecte seu WhatsApp primeiro para visualizar as conversas              Conecte seu WhatsApp primeiro para visualizar as conversas

            </p>            </p>

          </div>          </div>

        </div>        </div>

      </div>      </div>

    );    );

  }  }



  return (  return (

    <div className="flex flex-col h-full">    <div className="flex flex-col h-full">

      {/* Chat Header */}      {/* Chat Header */}

      <div className="p-4 border-b flex items-center gap-3">      <div className="p-4 border-b flex items-center gap-3">

        <Avatar className="w-10 h-10">        <Avatar className="w-10 h-10">

          <AvatarFallback className="bg-primary/10 text-primary font-semibold">          <AvatarFallback className="bg-primary/10 text-primary font-semibold">

            {conversation?.contactName            {conversation?.contactName

              ? conversation.contactName.charAt(0).toUpperCase()              ? conversation.contactName.charAt(0).toUpperCase()

              : conversation?.contactNumber.charAt(0)}              : conversation?.contactNumber.charAt(0)}

          </AvatarFallback>          </AvatarFallback>

        </Avatar>        </Avatar>

        <div className="flex-1 min-w-0">        <div className="flex-1 min-w-0">

          <h3 className="font-semibold truncate" data-testid="text-contact-name">          <h3 className="font-semibold truncate" data-testid="text-contact-name">

            {conversation?.contactName || conversation?.contactNumber}            {conversation?.contactName || conversation?.contactNumber}

          </h3>          </h3>

          <p className="text-xs text-muted-foreground font-mono">          <p className="text-xs text-muted-foreground font-mono">

            {conversation?.contactNumber}            {conversation?.contactNumber}

          </p>          </p>

        </div>        </div>

        <div className="flex items-center gap-3">        <div className="flex items-center gap-3">

          <Badge          <Badge

            variant={agentStatus?.isDisabled ? "secondary" : "default"}            variant={agentStatus?.isDisabled ? "secondary" : "default"}

            className="gap-1"            className="gap-1"

            data-testid="badge-agent-status-chat"            data-testid="badge-agent-status-chat"

          >          >

            {agentStatus?.isDisabled ? (            {agentStatus?.isDisabled ? (

              <>              <>

                <BotOff className="w-3 h-3" />                <BotOff className="w-3 h-3" />

                Agente Desativado                Agente Desativado

              </>              </>

            ) : (            ) : (

              <>              <>

                <Bot className="w-3 h-3" />                <Bot className="w-3 h-3" />

                Agente Ativo                Agente Ativo

              </>              </>

            )}            )}

          </Badge>          </Badge>

          <Switch          <Switch

            checked={!agentStatus?.isDisabled}            checked={!agentStatus?.isDisabled}

            onCheckedChange={(checked) => toggleAgentMutation.mutate(!checked)}            onCheckedChange={(checked) => toggleAgentMutation.mutate(!checked)}

            disabled={toggleAgentMutation.isPending}            disabled={toggleAgentMutation.isPending}

            data-testid="switch-agent-chat"            data-testid="switch-agent-chat"

          />          />

        </div>        </div>

      </div>      </div>



      {/* Messages Area */}      {/* Messages Area */}

      <div className="flex-1 overflow-auto p-4 space-y-4" data-testid="container-messages">      <div className="flex-1 overflow-auto p-4 space-y-4" data-testid="container-messages">

        {isLoading ? (        {isLoading ? (

          <div className="flex items-center justify-center h-full">          <div className="flex items-center justify-center h-full">

            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />

          </div>          </div>

        ) : messages.length === 0 ? (        ) : messages.length === 0 ? (

          <div className="flex items-center justify-center h-full">          <div className="flex items-center justify-center h-full">

            <div className="text-center space-y-2">            <div className="text-center space-y-2">

              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>

            </div>            </div>

          </div>          </div>

        ) : (        ) : (

          messages.map((message) => (          messages.map((message) => (

            <div            <div

              key={message.id}              key={message.id}

              className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}              className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}

              data-testid={`message-${message.id}`}              data-testid={`message-${message.id}`}

            >            >

              <div              <div

                className={`max-w-md rounded-md px-4 py-2 ${                className={`max-w-md rounded-md px-4 py-2 ${

                  message.fromMe                  message.fromMe

                    ? "bg-primary text-primary-foreground ml-auto"                    ? "bg-primary text-primary-foreground ml-auto"

                    : "bg-muted mr-auto"                    : "bg-muted mr-auto"

                }`}                }`}

              >              >

                {message.isFromAgent && (                {message.isFromAgent && (

                  <div className="flex items-center gap-1 mb-1">                  <div className="flex items-center gap-1 mb-1">

                    <Bot className="w-3 h-3 text-primary" />                    <Bot className="w-3 h-3 text-primary" />

                    <span className="text-xs font-semibold text-primary">Agente IA</span>                    <span className="text-xs font-semibold text-primary">Agente IA</span>

                  </div>                  </div>

                )}                )}

                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>

                <p                <p

                  className={`text-xs mt-1 ${                  className={`text-xs mt-1 ${

                    message.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"                    message.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"

                  }`}                  }`}

                >                >

                  {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}                  {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}

                </p>                </p>

              </div>              </div>

            </div>            </div>

          ))          ))

        )}        )}

        <div ref={messagesEndRef} />        <div ref={messagesEndRef} />

      </div>      </div>



      {/* Message Input */}      {/* Message Input */}

      <div className="p-4 border-t bg-background">      <div className="p-4 border-t bg-background">

        <div className="flex gap-2">        <div className="flex gap-2">

          <Textarea          <Textarea

            placeholder="Digite sua mensagem..."            placeholder="Digite sua mensagem..."

            value={messageText}            value={messageText}

            onChange={(e) => setMessageText(e.target.value)}            onChange={(e) => setMessageText(e.target.value)}

            onKeyDown={handleKeyPress}            onKeyDown={handleKeyPress}

            className="resize-none min-h-12 max-h-32"            className="resize-none min-h-12 max-h-32"

            data-testid="input-message"            data-testid="input-message"

          />          />

          <Button          <Button

            size="icon"            size="icon"

            onClick={handleSend}            onClick={handleSend}

            disabled={!messageText.trim() || sendMutation.isPending}            disabled={!messageText.trim() || sendMutation.isPending}

            data-testid="button-send"            data-testid="button-send"

          >          >

            <Send className="w-4 h-4" />            <Send className="w-4 h-4" />

          </Button>          </Button>

        </div>        </div>

      </div>      </div>

    </div>    </div>

  );  );

}}



import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import {
  Filter,
  GitMerge,
  GitPullRequest,
  History,
  Layers,
  Settings,
  Zap,
} from "lucide-react";
import PremiumBlocked from "@/components/premium-overlay";

type Stage = {
  id: string;
  nome: string;
  descricao: string;
  color: string;
  automations: number;
  position: number;
};

type Funnel = {
  id: string;
  nome: string;
  produto: string;
  responsavel: string;
  conversao: number;
  receitaPrevista: string;
  stages: Stage[];
};

type Deal = {
  id: string;
  contato: string;
  empresa: string;
  valor: string;
  prioridade: "Alta" | "Média" | "Baixa";
  responsavel: string;
  ultimoContato: string;
  stageId: string;
};

const funnels: Funnel[] = [
  {
    id: "whatsapp-padrao",
    nome: "Funil Comercial WhatsApp",
    produto: "Assinaturas CRM",
    responsavel: "Squad Inside Sales",
    conversao: 32,
    receitaPrevista: "R$ 148.500",
    stages: [
      {
        id: "stage-lead",
        nome: "Lead",
        descricao: "Entrou via captura ou importação",
        color: "bg-slate-100 text-slate-700",
        automations: 2,
        position: 1,
      },
      {
        id: "stage-contato",
        nome: "Contato realizado",
        descricao: "Primeiro WhatsApp enviado",
        color: "bg-blue-100 text-blue-700",
        automations: 3,
        position: 2,
      },
      {
        id: "stage-qualificado",
        nome: "Qualificado",
        descricao: "Respondeu e validou fit",
        color: "bg-amber-100 text-amber-800",
        automations: 1,
        position: 3,
      },
      {
        id: "stage-proposta",
        nome: "Proposta enviada",
        descricao: "Aguardando aceite",
        color: "bg-purple-100 text-purple-700",
        automations: 4,
        position: 4,
      },
      {
        id: "stage-negociacao",
        nome: "Negociação",
        descricao: "Ajustes de preço e timing",
        color: "bg-orange-100 text-orange-700",
        automations: 2,
        position: 5,
      },
      {
        id: "stage-ganho",
        nome: "Ganho",
        descricao: "Cliente ativo",
        color: "bg-emerald-100 text-emerald-700",
        automations: 3,
        position: 6,
      },
      {
        id: "stage-perdido",
        nome: "Perdido",
        descricao: "Sem interesse ou timing",
        color: "bg-rose-100 text-rose-700",
        automations: 1,
        position: 7,
      },
    ],
  },
  {
    id: "suporte",
    nome: "Suporte VIP",
    produto: "Planos enterprise",
    responsavel: "CS Premium",
    conversao: 68,
    receitaPrevista: "R$ 52.900",
    stages: [
      {
        id: "stage-suporte-triagem",
        nome: "Triagem",
        descricao: "Caso recebido",
        color: "bg-slate-100 text-slate-700",
        automations: 1,
        position: 1,
      },
      {
        id: "stage-suporte-solucao",
        nome: "Em solução",
        descricao: "Time técnico atuando",
        color: "bg-blue-100 text-blue-700",
        automations: 2,
        position: 2,
      },
      {
        id: "stage-suporte-validacao",
        nome: "Validação cliente",
        descricao: "Aguardando retorno",
        color: "bg-amber-100 text-amber-800",
        automations: 2,
        position: 3,
      },
      {
        id: "stage-suporte-concluido",
        nome: "Concluído",
        descricao: "Caso resolvido",
        color: "bg-emerald-100 text-emerald-700",
        automations: 1,
        position: 4,
      },
    ],
  },
];

const deals: Deal[] = [
  {
    id: "OPP-9010",
    contato: "Marina Costa",
    empresa: "Canal Digital",
    valor: "R$ 1.200 / mês",
    prioridade: "Alta",
    responsavel: "João Ribeiro",
    ultimoContato: "Hoje • 09:32",
    stageId: "stage-qualificado",
  },
  {
    id: "OPP-9011",
    contato: "AgroMix LTDA",
    empresa: "AgroMix LTDA",
    valor: "R$ 2.990 / mês",
    prioridade: "Média",
    responsavel: "Patrícia Lopes",
    ultimoContato: "Ontem • 18:44",
    stageId: "stage-proposta",
  },
  {
    id: "OPP-9012",
    contato: "André Ferreira",
    empresa: "AF Contabilidade",
    valor: "R$ 890 / mês",
    prioridade: "Alta",
    responsavel: "Equipe Inside Sales",
    ultimoContato: "2 dias",
    stageId: "stage-lead",
  },
  {
    id: "OPP-9013",
    contato: "Larissa Prado",
    empresa: "Studio Prado",
    valor: "R$ 1.500 / mês",
    prioridade: "Baixa",
    responsavel: "Bruno Lima",
    ultimoContato: "3 dias",
    stageId: "stage-negociacao",
  },
  {
    id: "OPP-9014",
    contato: "E-commerce Veloz",
    empresa: "E-commerce Veloz",
    valor: "R$ 5.290 / mês",
    prioridade: "Alta",
    responsavel: "Ana Costa",
    ultimoContato: "Hoje • 08:10",
    stageId: "stage-contato",
  },
];

const priorityColors: Record<Deal["prioridade"], string> = {
  Alta: "bg-red-100 text-red-700 border-red-200",
  Média: "bg-amber-100 text-amber-700 border-amber-200",
  Baixa: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function FunnelPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFunnelId, setSelectedFunnelId] = useState("whatsapp-padrao");
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  const selectedFunnel = funnels.find((funnel) => funnel.id === selectedFunnelId)!;

  const requireSubscription = () =>
    toast({
      title: "Recurso Premium",
      description:
        "Esta funcionalidade requer assinatura de um plano. Por favor, assine um plano para ter acesso.",
      action: (
        <ToastAction altText="Ver Planos" onClick={() => setLocation("/plans")}>
          Ver Planos
        </ToastAction>
      ),
    });

  const metrics = useMemo(() => {
    const totalDeals = deals.length;
    const stuck = deals.filter((deal) => deal.ultimoContato.includes("dias")).length;
    return {
      totalDeals,
      stuck,
      conversion: selectedFunnel.conversao,
      revenue: selectedFunnel.receitaPrevista,
    };
  }, [selectedFunnel]);

  const handleDragStart = (dealId: string) => setDraggedDeal(dealId);
  const handleDrop = (stageId: string) => {
    if (!draggedDeal) return;
    requireSubscription();
    setDraggedDeal(null);
  };

  const filteredDeals = deals.filter((deal) =>
    selectedFunnel.stages.some((stage) => stage.id === deal.stageId)
  );

  const stageDeals = (stageId: string) => filteredDeals.filter((deal) => deal.stageId === stageId);

  return (
    <PremiumBlocked
      title="Funil de Vendas"
      subtitle="Pipelines e estágios personalizáveis para cada operação"
      description="Movimente oportunidades, ative automações por estágio e acompanhe métricas de conversão em um só lugar."
      ctaLabel="Desbloquear Ferramenta"
    >
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Funis e Pipelines</h1>
            <p className="text-muted-foreground">
              Configure múltiplos pipelines comerciais com automações ligadas ao WhatsApp.
            </p>
          </div>
          <Button onClick={requireSubscription}>
            <GitPullRequest className="w-4 h-4 mr-2" />
            Novo funil
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2 space-y-2">
                <CardTitle>Selecione um funil</CardTitle>
                <select
                  value={selectedFunnelId}
                  onChange={(event) => setSelectedFunnelId(event.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {funnels.map((funnel) => (
                    <option key={funnel.id} value={funnel.id}>
                      {funnel.nome}
                    </option>
                  ))}
                </select>
                <CardDescription>
                  {selectedFunnel.produto} • Gestão: {selectedFunnel.responsavel}
                </CardDescription>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Conversão média</p>
                <p className="text-3xl font-bold">{metrics.conversion}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Receita prevista</p>
                <p className="text-3xl font-bold">{metrics.revenue}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Estágios do funil</CardTitle>
                <CardDescription>
                  Organize etapas, cores, automações e gatilhos de mensagens.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={requireSubscription}>
                Reordenar estágios
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {selectedFunnel.stages
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <article key={stage.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{stage.nome}</p>
                      <p className="text-xs text-muted-foreground">{stage.descricao}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${stage.color}`}>
                      #{stage.position}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <History className="w-4 h-4" />
                    {stage.automations} automações ativas
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={requireSubscription} className="flex-1">
                      <Settings className="w-3 h-3 mr-1" />
                      Configurar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={requireSubscription}>
                      Remover
                    </Button>
                  </div>
                </article>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Pipeline visual</CardTitle>
                <CardDescription>
                  Arraste oportunidades entre estágios e acompanhe indicadores críticos.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={requireSubscription}>
                  Exportar dados
                </Button>
                <Button onClick={requireSubscription}>
                  <Layers className="w-4 h-4 mr-2" />
                  Nova oportunidade
                </Button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              <Card className="bg-muted">
                <CardHeader className="pb-2">
                  <CardDescription>Total de deals ativos</CardDescription>
                  <CardTitle className="text-3xl">{metrics.totalDeals}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-muted">
                <CardHeader className="pb-2">
                  <CardDescription>Deals travados (&gt;48h)</CardDescription>
                  <CardTitle className="text-3xl">{metrics.stuck}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-muted">
                <CardHeader className="pb-2">
                  <CardDescription>Mensagens automáticas ativas</CardDescription>
                  <CardTitle className="text-3xl">12</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-muted">
                <CardHeader className="pb-2">
                  <CardDescription>Tempo médio por estágio</CardDescription>
                  <CardTitle className="text-3xl">2,4 dias</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-h-[320px]">
              {selectedFunnel.stages
                .filter((stage) => stage.position <= 4)
                .map((stage) => (
                  <section
                    key={stage.id}
                    className="flex flex-col rounded-lg border bg-background"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(stage.id)}
                  >
                    <header className="p-4 border-b flex items-center justify_between">
                      <div>
                        <p className="font-semibold">{stage.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {stageDeals(stage.id).length} oportunidade(s)
                        </p>
                      </div>
                      <Badge variant="secondary">{stage.automations} aut.</Badge>
                    </header>
                    <div className="flex-1 space-y-3 p-4">
                      {stageDeals(stage.id).map((deal) => (
                        <article
                          key={deal.id}
                          draggable
                          onDragStart={() => handleDragStart(deal.id)}
                          className="rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{deal.contato}</p>
                              <p className="text-xs text-muted-foreground">{deal.empresa}</p>
                            </div>
                            <Badge className={`border ${priorityColors[deal.prioridade]}`}>
                              {deal.prioridade}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm font-medium">{deal.valor}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Responsável: {deal.responsavel}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Último contato: {deal.ultimoContato}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={requireSubscription}>
                              Timeline
                            </Button>
                            <Button size="sm" onClick={requireSubscription}>
                              WhatsApp
                            </Button>
                          </div>
                        </article>
                      ))}
                      {stageDeals(stage.id).length === 0 && (
                        <div className="rounded-md border border-dashed text-sm text-center text-muted-foreground p-4">
                          Nenhuma oportunidade nesta etapa.
                        </div>
                      )}
                    </div>
                  </section>
                ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
    </PremiumBlocked>
  );
}

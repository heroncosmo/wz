import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import { Megaphone, PlayCircle, PauseCircle } from "lucide-react";
import PremiumBlocked from "@/components/premium-overlay";

export default function CampaignsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const campaigns = [
    { nome: "Boas-vindas novos leads", status: "Rodando", disparos: 1250, taxa: 48 },
    { nome: "Recuperação de carrinho", status: "Pausado", disparos: 530, taxa: 32 },
    { nome: "Lançamento Black Friday", status: "Preparando", disparos: 0, taxa: 0 },
  ];

  return (
    <PremiumBlocked
      title="Campanhas WhatsApp"
      subtitle="Jornadas automatizadas de relacionamento"
      description="Crie fluxos, agende envios, faça segmentação avançada e acompanhe conversões com painéis inteligentes."
      ctaLabel="Desbloquear Ferramenta"
    >
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              <Megaphone className="w-4 h-4" /> Campanhas WhatsApp
            </div>
            <h1 className="text-3xl font-bold mt-1">Campanhas</h1>
            <p className="text-muted-foreground">
              Crie jornadas que disparam mensagens personalizadas para múltiplos contatos simultaneamente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={requireSubscription}>
              Importar contatos
            </Button>
            <Button onClick={requireSubscription}>
              Nova Campanha
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Rápido</CardTitle>
            <CardDescription>Simulação visual de desempenho.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {[
              { label: "Mensagens enviadas", value: "5.320", delta: "+320" },
              { label: "Conversões", value: "712", delta: "+12%" },
              { label: "Campanhas ativas", value: 4, delta: "2 pausadas" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-4 space-y-1">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.delta}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo Visual</CardTitle>
              <CardDescription>Defina etapa e conteúdo antes de ativar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Nome da campanha" disabled />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-semibold">Segmento</p>
                  <p className="text-sm text-muted-foreground">Clientes com 30 dias sem compras</p>
                  <Button size="sm" variant="outline" onClick={requireSubscription}>
                    Editar filtros
                  </Button>
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-semibold">Mensagem</p>
                  <p className="text-sm text-muted-foreground">Cupom personalizado com variáveis</p>
                  <Button size="sm" variant="outline" onClick={requireSubscription}>
                    Editar texto
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-semibold">Sequência</p>
                <p className="text-sm text-muted-foreground">Dia 0: mensagem principal · Dia 2: lembrete · Dia 5: oferta final</p>
                <Button size="sm" onClick={requireSubscription}>
                  Ativar automação
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas Recentes</CardTitle>
              <CardDescription>Ações rápidas demonstrativas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.nome} className="rounded-md border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{campaign.nome}</p>
                      <p className="text-sm text-muted-foreground">{campaign.disparos} disparos · taxa {campaign.taxa}%</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                  <Progress value={campaign.taxa} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={requireSubscription}>
                      <PlayCircle className="w-4 h-4 mr-1" /> Iniciar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={requireSubscription}>
                      <PauseCircle className="w-4 h-4 mr-1" /> Pausar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Envios programados</CardTitle>
            <CardDescription>Mock de grade para revisar lotes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { nome: "Promoção Primavera", data: "12/11 08:00", segmento: "Clientes RJ", volume: 800 },
                  { nome: "Lembrete Consultas", data: "13/11 09:30", segmento: "Pacientes inativos", volume: 230 },
                  { nome: "Follow-up Propostas", data: "14/11 14:00", segmento: "Leads quentes", volume: 150 },
                ].map((row) => (
                  <TableRow key={row.nome}>
                    <TableCell>{row.nome}</TableCell>
                    <TableCell>{row.data}</TableCell>
                    <TableCell>{row.segmento}</TableCell>
                    <TableCell>{row.volume}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={requireSubscription}>
                        Ajustar envio
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
    </PremiumBlocked>
  );
}

import { useMemo, useState } from "react";
import { Kanban as KanbanIcon, Search, Filter } from "lucide-react";
import PremiumBlocked from "@/components/premium-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Priority = "alta" | "media" | "baixa";

type Ticket = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
  prioridade: Priority;
  responsavel: string;
  historico: string[];
  colunaId: string;
  criadoEm: string;
  atualizadoEm: string;
};

const columns = [
  { id: "novos", titulo: "Novos Contatos", descricao: "Leads que acabaram de chegar pelo WhatsApp" },
  { id: "atendimento", titulo: "Em Atendimento", descricao: "Analistas respondendo clientes" },
  { id: "aguardando", titulo: "Aguardando Resposta", descricao: "Clientes que precisam retornar" },
  { id: "resolvido", titulo: "Resolvido", descricao: "Solicitações concluídas" },
  { id: "fechado", titulo: "Fechado", descricao: "Casos finalizados" },
];

const initialTickets: Ticket[] = [
  {
    id: "C001",
    nome: "Marina Costa",
    telefone: "+55 11 98877-1122",
    email: "marina.costa@example.com",
    status: "Problema com boleto",
    prioridade: "alta",
    responsavel: "Paulo Silva",
    historico: ["08:10 Marina enviou print do erro", "08:15 Paulo solicitou novo boleto"],
    colunaId: "novos",
    criadoEm: "2025-11-08T08:05:00",
    atualizadoEm: "2025-11-08T08:15:00",
  },
  {
    id: "C002",
    nome: "João Pereira",
    telefone: "+55 21 99988-6622",
    email: "joao.pereira@example.com",
    status: "Setup de integração",
    prioridade: "media",
    responsavel: "Aline Figueiredo",
    historico: ["Ontem 17:00 Aline enviou tutorial", "Hoje 09:20 cliente pediu call"],
    colunaId: "atendimento",
    criadoEm: "2025-11-07T16:30:00",
    atualizadoEm: "2025-11-08T09:20:00",
  },
  {
    id: "C003",
    nome: "Bruno Almeida",
    telefone: "+55 31 97770-5566",
    email: "bruno.almeida@example.com",
    status: "Upgrade de plano",
    prioridade: "baixa",
    responsavel: "Equipe Comercial",
    historico: ["06/11 Lead solicitou proposta", "07/11 aguardando aprovação interna"],
    colunaId: "aguardando",
    criadoEm: "2025-11-06T14:00:00",
    atualizadoEm: "2025-11-07T11:40:00",
  },
  {
    id: "C004",
    nome: "Fernanda Dias",
    telefone: "+55 41 98123-7744",
    email: "fernanda.dias@example.com",
    status: "Reclamação resolvida",
    prioridade: "alta",
    responsavel: "Suporte Premium",
    historico: ["05/11 ticket aberto", "07/11 acompanhamento pós atendimento"],
    colunaId: "resolvido",
    criadoEm: "2025-11-05T09:10:00",
    atualizadoEm: "2025-11-07T18:10:00",
  },
  {
    id: "C005",
    nome: "AgroMix LTDA",
    telefone: "+55 62 91234-5566",
    email: "contato@agromix.com",
    status: "Treinamento entregue",
    prioridade: "media",
    responsavel: "Consultoria",
    historico: ["01/11 treinamento agendado", "03/11 finalizado e aprovado"],
    colunaId: "fechado",
    criadoEm: "2025-11-01T11:00:00",
    atualizadoEm: "2025-11-03T16:30:00",
  },
];

const priorityMap: Record<Priority, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700 border-red-200" },
  media: { label: "Média", color: "bg-amber-100 text-amber-700 border-amber-200" },
  baixa: { label: "Baixa", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export default function KanbanPage() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const owners = useMemo(() => Array.from(new Set(tickets.map((ticket) => ticket.responsavel))), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        ticket.nome.toLowerCase().includes(term) ||
        ticket.email.toLowerCase().includes(term) ||
        ticket.telefone.toLowerCase().includes(term) ||
        ticket.status.toLowerCase().includes(term);
      const matchesPriority = priorityFilter === "all" || ticket.prioridade === priorityFilter;
      const matchesOwner = ownerFilter === "all" || ticket.responsavel === ownerFilter;
      return matchesSearch && matchesPriority && matchesOwner;
    });
  }, [tickets, search, priorityFilter, ownerFilter]);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDrop = (columnId: string) => {
    if (!draggedId) return;
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === draggedId
          ? { ...ticket, colunaId: columnId, atualizadoEm: new Date().toISOString() }
          : ticket
      )
    );
    setDraggedId(null);
  };

  const filteredByColumn = (columnId: string) => filteredTickets.filter((ticket) => ticket.colunaId === columnId);

  const Column = ({ columnId }: { columnId: string }) => {
    const column = columns.find((col) => col.id === columnId)!;
    const columnTickets = filteredByColumn(columnId);

    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{column.titulo}</CardTitle>
              <CardDescription>{column.descricao}</CardDescription>
            </div>
            <Badge variant="secondary">{columnTickets.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div
            className="space-y-3 min-h-[120px]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(columnId)}
          >
            {columnTickets.map((ticket) => (
              <article
                key={ticket.id}
                draggable
                onDragStart={() => handleDragStart(ticket.id)}
                className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-tight">{ticket.nome}</p>
                    <p className="text-xs text-muted-foreground">{ticket.status}</p>
                  </div>
                  <Badge className={cn("border", priorityMap[ticket.prioridade].color)}>
                    {priorityMap[ticket.prioridade].label}
                  </Badge>
                </div>
                <div className="mt-3 text-xs space-y-1 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Telefone:</span> {ticket.telefone}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">E-mail:</span> {ticket.email}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Responsável:</span> {ticket.responsavel}
                  </p>
                </div>
                <div className="mt-3 text-xs">
                  <p className="font-medium">Histórico recente</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                    {ticket.historico.slice(0, 3).map((item, index) => (
                      <li key={`${ticket.id}-hist-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground flex justify-between">
                  <span>Criado: {formatDate(ticket.criadoEm)}</span>
                  <span>Atualizado: {formatDate(ticket.atualizadoEm)}</span>
                </div>
              </article>
            ))}
            {columnTickets.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3 text-center">
                Nenhum contato nesta etapa.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PremiumBlocked
      title="Kanban de Atendimento"
      subtitle="Pipeline visual para organizar clientes e oportunidades"
      description="Arraste e solte entre etapas, defina prioridades, veja tempo em cada estágio e acelere seu ciclo de atendimento."
      ctaLabel="Assinar Plano Premium"
    >
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Kanban</h1>
            <p className="text-muted-foreground">
              CRM completo para acompanhar atendimentos do WhatsApp e funil de clientes.
            </p>
          </div>
          <Button variant="outline">
            <KanbanIcon className="w-4 h-4 mr-2" />
            Nova coluna
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Central de Atendimento</CardTitle>
              <CardDescription>Organize cada cliente por estágio, prioridade e responsável.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome, e-mail, telefone ou status"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as Priority | "all")}
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="all">Todas as prioridades</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="all">Todos os responsáveis</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {columns.map((column) => (
                <Column key={column.id} columnId={column.id} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PremiumBlocked>
  );
}

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Send, Upload, Tag, Users, Kanban, GitBranch, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import PremiumBlocked from "@/components/premium-overlay";

type SourceKey = "contatos" | "funil" | "kanban";

const SOURCE_DATA: Record<SourceKey, { label: string; description: string; icon: typeof Users; count: number; numbers: string[]; tags: string[] }> = {
  contatos: {
    label: "Lista de Contatos",
    description: "Clientes existentes sincronizados do CRM",
    icon: Users,
    count: 128,
    numbers: ["5511987654321", "5511945678901", "5511960023411"],
    tags: ["Clientes", "Ativos"],
  },
  funil: {
    label: "Funil de Vendas",
    description: "Leads qualificados por etapa do funil",
    icon: GitBranch,
    count: 54,
    numbers: ["5511977001234", "5511977005678"],
    tags: ["Oportunidades", "Negociação"],
  },
  kanban: {
    label: "Kanban",
    description: "Tarefas e atendimentos em aberto",
    icon: Kanban,
    count: 32,
    numbers: ["551195551234", "551195559876"],
    tags: ["Suporte", "Priorizado"],
  },
};

export default function MassSendPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [campaignName, setCampaignName] = useState("Campanha de fidelização");
  const [message, setMessage] = useState(
    "Olá {{nome}}, estamos com condições especiais para você. Responda esta mensagem para saber mais."
  );
  const [numbersInput, setNumbersInput] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [manualNumber, setManualNumber] = useState("");
  const [tags, setTags] = useState<string[]>(["VIP", "Promo novembro"]);
  const [tagInput, setTagInput] = useState("");
  const [selectedSources, setSelectedSources] = useState<Record<SourceKey, boolean>>({
    contatos: true,
    funil: false,
    kanban: false,
  });
  const [csvImportInfo, setCsvImportInfo] = useState<{ file?: string; imported?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const normalizePhone = (value: string) => value.replace(/\D+/g, "");
  const isValidPhone = (value: string) => value.length >= 10 && value.length <= 13;

  const addNumbers = (candidates: string[]) => {
    const valid: string[] = [];
    const invalid: string[] = [];

    candidates.forEach((candidate) => {
      const digits = normalizePhone(candidate);
      if (!digits) return;
      if (isValidPhone(digits)) {
        valid.push(digits);
      } else {
        invalid.push(candidate.trim());
      }
    });

    setNumbers((prev) => Array.from(new Set([...prev, ...valid])));
    if (invalid.length) {
      setInvalidNumbers((prev) => Array.from(new Set([...prev, ...invalid])));
    }
  };

  useEffect(() => {
    addNumbers(SOURCE_DATA.contatos.numbers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // importa lista base ao carregar

  const processNumbersFromText = () => {
    if (!numbersInput.trim()) return;
    const candidates = numbersInput.split(/[\n,;]+/);
    addNumbers(candidates);
    setNumbersInput("");
  };

  const handleManualAdd = () => {
    if (!manualNumber.trim()) return;
    addNumbers([manualNumber]);
    setManualNumber("");
  };

  const handleCSVUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = text.split(/\r?\n/);
      const cells = rows.flatMap((row) => row.split(/[,;]+/));
      addNumbers(cells);
      setCsvImportInfo({ file: file.name, imported: cells.length });
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleToggleSource = (key: SourceKey, checked: boolean) => {
    setSelectedSources((prev) => ({ ...prev, [key]: checked }));
    const numbersFromSource = SOURCE_DATA[key].numbers;
    if (checked) {
      addNumbers(numbersFromSource);
    } else {
      setNumbers((prev) => prev.filter((phone) => !numbersFromSource.includes(phone)));
    }
  };

  const handleAddTag = () => {
    const formatted = tagInput.trim();
    if (!formatted) return;
    setTags((prev) => Array.from(new Set([...prev, formatted])));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const numbersPreview = useMemo(() => numbers.slice(0, 6), [numbers]);

  return (
    <PremiumBlocked
      title="Envio em Massa"
      subtitle="Mensagens personalizadas para grandes listas com segurança"
      description="Gerencie campanhas em larga escala com segmentação, variáveis e regras de envio. Acompanhe desempenho e amplie resultados com IA."
      ctaLabel="Assinar Plano Premium"
    >
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Envio em Massa</h1>
            <p className="text-muted-foreground">
              Construa campanhas completas, organize destinatários e sincronize com o WhatsApp.
            </p>
          </div>
          <Button onClick={requireSubscription} data-testid="button-masssend-new">
            <Send className="w-4 h-4 mr-2" />
            Disparar Campanha
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Esboço de Campanha</CardTitle>
            <CardDescription>Nome, mensagem e controles básicos do disparo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Nome da campanha" />
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem" />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Importar CSV
              </Button>
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleCSVUpload} />
              <Button variant="outline" onClick={requireSubscription}>
                Adicionar Anexo
              </Button>
              <Button onClick={requireSubscription}>Enviar Teste</Button>
            </div>
            {csvImportInfo && (
              <p className="text-xs text-muted-foreground">
                Último upload: <strong>{csvImportInfo.file}</strong> ({csvImportInfo.imported} linhas processadas)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinatários</CardTitle>
            <CardDescription>Copie e cole números, importe listas e acompanhe o resultado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <Textarea
                  rows={6}
                  value={numbersInput}
                  onChange={(e) => setNumbersInput(e.target.value)}
                  placeholder="Cole números separados por vírgula, salto de linha ou ponto e vírgula."
                />
                <div className="flex gap-2">
                  <Input
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="Adicionar número manualmente"
                  />
                  <Button variant="outline" onClick={handleManualAdd}>
                    Inserir
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={processNumbersFromText}>
                    Processar números
                  </Button>
                  <Button variant="ghost" onClick={() => setNumbers([])}>
                    Limpar lista
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{numbers.length} destinatários válidos</p>
                    <p className="text-sm text-muted-foreground">
                      Mostrando os primeiros {numbersPreview.length} números
                    </p>
                  </div>
                  <Badge variant="outline">Pré-visualização</Badge>
                </div>
                <div className="border rounded-md p-3 h-40 overflow-y-auto text-sm space-y-1">
                  {numbers.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum número processado ainda.</p>
                  ) : (
                    numbersPreview.map((phone) => (
                      <div key={phone} className="flex items-center justify-between">
                        <span>{phone}</span>
                        <Badge variant="secondary">BR</Badge>
                      </div>
                    ))
                  )}
                  {numbers.length > numbersPreview.length && (
                    <p className="text-xs text-muted-foreground">
                      +{numbers.length - numbersPreview.length} números adicionais ocultos.
                    </p>
                  )}
                </div>
                {invalidNumbers.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      Números ignorados
                    </div>
                    <p className="text-xs leading-relaxed">
                      {invalidNumbers.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importação de outras fontes</CardTitle>
            <CardDescription>Ative as origens para complementar a lista de destinatários.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {(Object.keys(SOURCE_DATA) as SourceKey[]).map((key) => {
              const data = SOURCE_DATA[key];
              const Icon = data.icon;
              return (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">{data.label}</p>
                        <p className="text-xs text-muted-foreground">{data.description}</p>
                      </div>
                    </div>
                    <Switch checked={selectedSources[key]} onCheckedChange={(checked) => handleToggleSource(key, checked)} />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>{data.count}</strong> registros disponíveis
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {data.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={requireSubscription}>
                      Sincronizar detalhes
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiquetas e segmentação</CardTitle>
            <CardDescription>Organize os destinatários com tags para relatórios e automações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Adicionar nova etiqueta" />
              <Button variant="outline" onClick={handleAddTag}>
                <Plus className="w-4 h-4 mr-2" />
                Criar etiqueta
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma etiqueta selecionada.</p>}
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={requireSubscription}>
                Sincronizar etiquetas com CRM
              </Button>
              <Button variant="ghost" onClick={() => setTags(["VIP", "Promo novembro"]) }>
                Resetar sugestão
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pronto para enviar?</CardTitle>
            <CardDescription>Revise os dados acima antes de disparar para {numbers.length || "__"} contatos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={requireSubscription}>Disparar via WhatsApp</Button>
            <Button variant="outline" onClick={requireSubscription}>
              Programar envio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </PremiumBlocked>
  );
}

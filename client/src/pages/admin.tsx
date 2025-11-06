import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, Plus, Trash2, Check, DollarSign, Users, CreditCard } from "lucide-react";
import type { Plan, Subscription, Payment, User } from "@shared/schema";

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: stats } = useQuery<{ totalUsers: number; totalRevenue: number; activeSubscriptions: number }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const { data: subscriptions } = useQuery<(Subscription & { plan: Plan; user: User })[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const { data: pendingPayments } = useQuery<(Payment & { subscription: Subscription & { user: User; plan: Plan } })[]>({
    queryKey: ["/api/admin/payments/pending"],
  });

  const { data: config } = useQuery<{ mistral_api_key: string }>({
    queryKey: ["/api/admin/config"],
  });

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">Gerenciar planos, usuários e pagamentos</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Usuários</TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-plans">Planos</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="config" data-testid="tab-config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-testid="card-stat-users">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">
                    {stats?.totalUsers || 0}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-revenue">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    R$ {stats?.totalRevenue?.toFixed(2) || "0.00"}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-subscriptions">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-subscriptions">
                    {stats?.activeSubscriptions || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card data-testid="card-users-list">
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>Lista completa de usuários do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: User) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                        <TableCell>{user.firstName} {user.lastName}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "owner" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <PlansManager plans={plans} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentsManager pendingPayments={pendingPayments} />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <ConfigManager config={config} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PlansManager({ plans }: { plans: Plan[] | undefined }) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setIsCreateOpen(false);
      toast({ title: "Plano criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar plano", variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/admin/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setEditingPlan(null);
      toast({ title: "Plano atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar plano", variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({ title: "Plano deletado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar plano", variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-plans-manager">
      <CardHeader className="flex flex-row items-center justify-between gap-1">
        <div>
          <CardTitle>Gerenciar Planos</CardTitle>
          <CardDescription>Criar, editar e remover planos de assinatura</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-plan">
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-plan">
            <PlanForm
              onSubmit={(data) => createPlanMutation.mutate(data)}
              isPending={createPlanMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Limite Conversas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans?.map((plan) => (
              <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                <TableCell data-testid={`text-plan-name-${plan.id}`}>{plan.nome}</TableCell>
                <TableCell>R$ {plan.valor}</TableCell>
                <TableCell>{plan.periodicidade}</TableCell>
                <TableCell>{plan.limiteConversas}</TableCell>
                <TableCell>
                  <Badge variant={plan.ativo ? "default" : "secondary"}>
                    {plan.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePlanMutation.mutate(plan.id)}
                    data-testid={`button-delete-plan-${plan.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlanForm({ 
  onSubmit, 
  isPending, 
  initialData 
}: { 
  onSubmit: (data: any) => void; 
  isPending: boolean;
  initialData?: Plan;
}) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    valor: initialData?.valor || "",
    periodicidade: initialData?.periodicidade || "mensal",
    limiteConversas: initialData?.limiteConversas || 100,
    limiteAgentes: initialData?.limiteAgentes || 1,
    ativo: initialData?.ativo ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Editar Plano" : "Criar Novo Plano"}</DialogTitle>
        <DialogDescription>Preencha as informações do plano</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="nome">Nome do Plano</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Básico, Profissional"
            required
            data-testid="input-plan-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            placeholder="99.90"
            required
            data-testid="input-plan-value"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="periodicidade">Periodicidade</Label>
          <Select 
            value={formData.periodicidade} 
            onValueChange={(value) => setFormData({ ...formData, periodicidade: value as "mensal" | "anual" })}
          >
            <SelectTrigger data-testid="select-plan-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="limiteConversas">Limite de Conversas</Label>
          <Input
            id="limiteConversas"
            type="number"
            value={formData.limiteConversas}
            onChange={(e) => setFormData({ ...formData, limiteConversas: parseInt(e.target.value) })}
            required
            data-testid="input-plan-conversations-limit"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="limiteAgentes">Limite de Agentes</Label>
          <Input
            id="limiteAgentes"
            type="number"
            value={formData.limiteAgentes}
            onChange={(e) => setFormData({ ...formData, limiteAgentes: parseInt(e.target.value) })}
            required
            data-testid="input-plan-agents-limit"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="ativo"
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            data-testid="switch-plan-active"
          />
          <Label htmlFor="ativo">Plano Ativo</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending} data-testid="button-submit-plan">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Atualizar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PaymentsManager({ 
  pendingPayments 
}: { 
  pendingPayments: (Payment & { subscription: Subscription & { user: User; plan: Plan } })[] | undefined 
}) {
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/payments/approve/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Pagamento aprovado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao aprovar pagamento", variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-pending-payments">
      <CardHeader>
        <CardTitle>Pagamentos Pendentes</CardTitle>
        <CardDescription>Aprovar pagamentos PIX manualmente</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingPayments?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum pagamento pendente
                </TableCell>
              </TableRow>
            )}
            {pendingPayments?.map((payment) => (
              <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                <TableCell data-testid={`text-payment-user-${payment.id}`}>
                  {payment.subscription.user.email}
                </TableCell>
                <TableCell>{payment.subscription.plan.nome}</TableCell>
                <TableCell>R$ {payment.valor}</TableCell>
                <TableCell>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("pt-BR") : "-"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(payment.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-payment-${payment.id}`}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Aprovar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ConfigManager({ config }: { config: { mistral_api_key: string; pix_key?: string } | undefined }) {
  const { toast } = useToast();
  const [mistralKey, setMistralKey] = useState(config?.mistral_api_key || "");
  const [pixKey, setPixKey] = useState(config?.pix_key || "");

  const updateConfigMutation = useMutation({
    mutationFn: async (data: { mistral_api_key: string; pix_key: string }) => {
      return await apiRequest("PUT", "/api/admin/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "Configuração atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar configuração", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate({ mistral_api_key: mistralKey, pix_key: pixKey });
  };

  return (
    <Card data-testid="card-system-config">
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>Chave API Mistral, chave PIX e outras configurações</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="mistralKey">Mistral API Key</Label>
            <Input
              id="mistralKey"
              type="password"
              value={mistralKey}
              onChange={(e) => setMistralKey(e.target.value)}
              placeholder="sk-..."
              data-testid="input-mistral-key"
            />
            <p className="text-sm text-muted-foreground">
              Chave API usada por todos os agentes IA do sistema
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="email@example.com ou CPF/CNPJ ou telefone"
              data-testid="input-pix-key"
            />
            <p className="text-sm text-muted-foreground">
              Chave PIX usada para receber pagamentos de assinaturas
            </p>
          </div>

          <Button type="submit" disabled={updateConfigMutation.isPending} data-testid="button-save-config">
            {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Configurações
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

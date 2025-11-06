import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Check, Loader2 } from "lucide-react";
import type { Plan, Subscription } from "@shared/schema";

export default function PlansPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery<(Subscription & { plan: Plan }) | null>({
    queryKey: ["/api/subscriptions/current"],
  });

  const createSubscriptionMutation = useMutation<Subscription, Error, string>({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/subscriptions/create", { planId });
      const data = await response.json();
      return data as Subscription;
    },
    onSuccess: (data: Subscription) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      toast({ title: "Assinatura criada! Agora realize o pagamento." });
      setLocation(`/subscribe/${data.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar assinatura", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasActiveSubscription = currentSubscription?.status === "active";

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold" data-testid="text-plans-title">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-muted-foreground">
            Selecione o plano ideal para sua operação de WhatsApp
          </p>
        </div>

        {hasActiveSubscription && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-center text-green-700 dark:text-green-300">
              Você já possui uma assinatura ativa do plano <strong>{currentSubscription.plan.nome}</strong>
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <Card 
              key={plan.id} 
              className="flex flex-col" 
              data-testid={`card-plan-${plan.id}`}
            >
              <CardHeader>
                <CardTitle className="text-2xl" data-testid={`text-plan-name-${plan.id}`}>
                  {plan.nome}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">R$ {plan.valor}</span>
                  <span className="text-muted-foreground">/{plan.periodicidade === "mensal" ? "mês" : "ano"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{plan.limiteConversas} conversas simultâneas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{plan.limiteAgentes} agente{plan.limiteAgentes > 1 ? "s" : ""} IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Respostas automáticas ilimitadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Suporte técnico</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => createSubscriptionMutation.mutate(plan.id)}
                  disabled={createSubscriptionMutation.isPending || hasActiveSubscription}
                  data-testid={`button-subscribe-${plan.id}`}
                >
                  {createSubscriptionMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {hasActiveSubscription ? "Plano Ativo" : "Assinar Agora"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {(!plans || plans.length === 0) && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Nenhum plano disponível no momento. Entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

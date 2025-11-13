import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import { Tags as TagsIcon, Plus } from "lucide-react";
import PremiumBlocked from "@/components/premium-overlay";

export default function TagsPage() {
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

  const tags = ["VIP", "Suporte", "Lead Frio", "RJ", "SP", "Fechado"];

  return (
    <PremiumBlocked
      title="Etiquetas"
      subtitle="Organize e segmente contatos em um clique"
      description="Crie e gerencie tags para relatórios, campanhas e automações de atendimento."
      ctaLabel="Assinar Plano Premium"
    >
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Etiquetas</h1>
            <p className="text-muted-foreground">
              Organize contatos e conversas usando etiquetas.
            </p>
          </div>
          <Button onClick={requireSubscription}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Etiqueta
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <TagsIcon className="w-5 h-5" />
                Etiquetas Cadastradas
              </span>
            </CardTitle>
            <CardDescription>Exemplo visual de etiquetas do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="cursor-pointer" onClick={requireSubscription}>
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PremiumBlocked>
  );
}

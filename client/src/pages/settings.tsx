import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Phone } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setTelefone(user.telefone || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; telefone?: string; firstName?: string; lastName?: string }) => {
      const response = await apiRequest("PUT", "/api/user/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao atualizar perfil", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ email, telefone, firstName, lastName });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <Card data-testid="card-profile-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Atualize seu email, nome e telefone</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  data-testid="input-email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="João"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Silva"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-phone"
                />
              </div>

              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

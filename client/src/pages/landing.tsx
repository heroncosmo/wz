import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">WhatsApp CRM</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">Entrar</Button>
          </a>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Gerencie todas as suas{" "}
              <span className="text-primary">conversas do WhatsApp</span> em um só lugar
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Conecte seu WhatsApp e responda seus clientes de forma profissional através da nossa plataforma CRM completa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/api/login">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                  Começar Agora
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6">
              <div className="w-12 h-12 mx-auto rounded-md bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Conexão Rápida</h3>
              <p className="text-sm text-muted-foreground">
                Conecte seu WhatsApp em segundos usando QR Code. Simples e seguro.
              </p>
            </div>

            <div className="text-center space-y-4 p-6">
              <div className="w-12 h-12 mx-auto rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Gestão Centralizada</h3>
              <p className="text-sm text-muted-foreground">
                Visualize e responda todas as conversas em uma interface limpa e organizada.
              </p>
            </div>

            <div className="text-center space-y-4 p-6">
              <div className="w-12 h-12 mx-auto rounded-md bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Seguro e Confiável</h3>
              <p className="text-sm text-muted-foreground">
                Suas conversas e dados protegidos com criptografia de ponta a ponta.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-muted/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <BarChart3 className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Pronto para melhorar seu atendimento?
              </h2>
              <p className="text-muted-foreground text-lg">
                Comece a usar o WhatsApp CRM hoje e transforme a forma como você se comunica com seus clientes.
              </p>
              <a href="/api/login">
                <Button size="lg" data-testid="button-cta">
                  Acessar Plataforma
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 WhatsApp CRM. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

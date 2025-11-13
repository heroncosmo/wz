import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type PremiumOverlayProps = {
  title: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  children: ReactNode;
};

export default function PremiumBlocked({
  title,
  subtitle,
  description,
  ctaLabel = "Assinar Plano Premium",
  children,
}: PremiumOverlayProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="relative">
      {/* Mantém o conteúdo visível, mas sem interação */}
      <div className="pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay fixa sobre a área do conteúdo.
          No mobile, deixa espaço para a bottom-nav (72px). */}
      <div className="fixed top-0 right-0 left-0 bottom-[72px] md:bottom-0 md:left-[var(--sidebar-width)] z-40 flex items-center justify-center">
        <Card className="max-w-xl shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {subtitle && <CardDescription className="text-base">{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
            <Button size="lg" onClick={() => setLocation("/plans")}>
              {ctaLabel}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Conteúdo exibido para demonstração. Assine para desbloquear todos os recursos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

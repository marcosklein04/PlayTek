import { ContractCustomizationConfig } from "@/api/contracts";
import { SectionCard } from "@/components/contract-customization/shared";
import { Input } from "@/components/ui/input";

export function PuzzleTextsSection({
  config,
  onUpdateField,
}: {
  config: ContractCustomizationConfig;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}) {
  return (
    <SectionCard title="Textos" description="Ajustá la narrativa del juego: portada, CTA y mensaje final.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Título principal</label>
          <Input value={config.texts.welcome_title} onChange={(event) => onUpdateField(["texts", "welcome_title"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Texto del botón</label>
          <Input value={config.texts.cta_button} onChange={(event) => onUpdateField(["texts", "cta_button"], event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-muted-foreground">Subtítulo</label>
          <Input value={config.texts.welcome_subtitle} onChange={(event) => onUpdateField(["texts", "welcome_subtitle"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Título de finalización</label>
          <Input value={config.texts.completion_title || ""} onChange={(event) => onUpdateField(["texts", "completion_title"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Subtítulo de finalización</label>
          <Input value={config.texts.completion_subtitle || ""} onChange={(event) => onUpdateField(["texts", "completion_subtitle"], event.target.value)} />
        </div>
      </div>
    </SectionCard>
  );
}

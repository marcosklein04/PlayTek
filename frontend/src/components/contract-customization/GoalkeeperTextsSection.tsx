import { ContractCustomizationConfig } from "@/api/contracts";
import { SectionCard } from "@/components/contract-customization/shared";
import { Input } from "@/components/ui/input";

export function GoalkeeperTextsSection({
  config,
  onUpdateField,
}: {
  config: ContractCustomizationConfig;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}) {
  return (
    <SectionCard title="Textos" description="Configurá el mensaje de arranque, instrucciones, sponsors y cierre del juego.">
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
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-muted-foreground">Instrucción de juego</label>
          <Input value={config.texts.instructions_text || ""} onChange={(event) => onUpdateField(["texts", "instructions_text"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Título final</label>
          <Input value={config.texts.completion_title || ""} onChange={(event) => onUpdateField(["texts", "completion_title"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Texto del botón final</label>
          <Input value={config.texts.play_again_button || ""} onChange={(event) => onUpdateField(["texts", "play_again_button"], event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-muted-foreground">Subtítulo final</label>
          <Input value={config.texts.completion_subtitle || ""} onChange={(event) => onUpdateField(["texts", "completion_subtitle"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Sponsor superior izquierdo</label>
          <Input value={config.content?.sponsor_top_left || ""} onChange={(event) => onUpdateField(["content", "sponsor_top_left"], event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Sponsor superior derecho</label>
          <Input value={config.content?.sponsor_top_right || ""} onChange={(event) => onUpdateField(["content", "sponsor_top_right"], event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm text-muted-foreground">Sponsor inferior</label>
          <Input value={config.content?.sponsor_bottom || ""} onChange={(event) => onUpdateField(["content", "sponsor_bottom"], event.target.value)} />
        </div>
      </div>
    </SectionCard>
  );
}

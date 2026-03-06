import { TriviaCustomization } from "@/api/contracts";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/contract-customization/shared";

type SparkleIntroSectionProps = {
  config: TriviaCustomization;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
};

export function SparkleIntroSection({ config, onUpdateField }: SparkleIntroSectionProps) {
  return (
    <SectionCard
      title="Pantalla de inicio"
      description="Editá los textos que ve el jugador antes de empezar la partida."
    >
      <div className="grid gap-4">
        <div>
          <label className="text-sm text-muted-foreground">Título</label>
          <Input
            value={config.texts.welcome_title}
            onChange={(e) => onUpdateField(["texts", "welcome_title"], e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Subtítulo</label>
          <Input
            value={config.texts.welcome_subtitle}
            onChange={(e) => onUpdateField(["texts", "welcome_subtitle"], e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Texto del botón principal</label>
          <Input value={config.texts.cta_button} onChange={(e) => onUpdateField(["texts", "cta_button"], e.target.value)} />
        </div>
      </div>
    </SectionCard>
  );
}

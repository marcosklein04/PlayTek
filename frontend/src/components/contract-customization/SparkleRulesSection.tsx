import { TriviaCustomization } from "@/api/contracts";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/contract-customization/shared";

type SparkleRulesSectionProps = {
  config: TriviaCustomization;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
};

export function SparkleRulesSection({ config, onUpdateField }: SparkleRulesSectionProps) {
  return (
    <SectionCard title="Reglas del juego" description="Configurá el ritmo de la partida y cómo se puntúa.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Mostrar temporizador</span>
          <Switch checked={config.rules.show_timer} onCheckedChange={(checked) => onUpdateField(["rules", "show_timer"], checked)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Segundos por pregunta</label>
          <Input
            type="number"
            min={5}
            value={config.rules.timer_seconds}
            onChange={(e) => onUpdateField(["rules", "timer_seconds"], Number(e.target.value || 0))}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Puntos por respuesta correcta</label>
          <Input
            type="number"
            min={0}
            value={config.rules.points_per_correct}
            onChange={(e) => onUpdateField(["rules", "points_per_correct"], Number(e.target.value || 0))}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Preguntas por partida</label>
          <Input
            type="number"
            min={1}
            value={config.rules.max_questions}
            onChange={(e) => onUpdateField(["rules", "max_questions"], Number(e.target.value || 0))}
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Usar vidas</span>
          <Switch checked={config.rules.use_lives} onCheckedChange={(checked) => onUpdateField(["rules", "use_lives"], checked)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Cantidad de vidas</label>
          <Input
            type="number"
            min={0}
            max={10}
            disabled={!config.rules.use_lives}
            value={config.rules.lives}
            onChange={(e) => onUpdateField(["rules", "lives"], Number(e.target.value || 0))}
          />
        </div>
      </div>
    </SectionCard>
  );
}

import { ContractCustomizationConfig } from "@/api/contracts";
import { SectionCard } from "@/components/contract-customization/shared";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function GoalkeeperRulesSection({
  config,
  onUpdateField,
}: {
  config: ContractCustomizationConfig;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}) {
  return (
    <SectionCard title="Reglas del arcade" description="Ajustá duración, dificultad y métricas visibles para el jugador.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Duración (segundos)</label>
          <Input type="number" min={15} max={300} value={config.rules.timer_seconds} onChange={(event) => onUpdateField(["rules", "timer_seconds"], Number(event.target.value || 0))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Puntos por atajada</label>
          <Input type="number" min={1} max={100} value={config.rules.points_per_save || 10} onChange={(event) => onUpdateField(["rules", "points_per_save"], Number(event.target.value || 0))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Ancho del arquero</label>
          <Input type="number" min={80} max={220} value={config.rules.goalkeeper_width || 120} onChange={(event) => onUpdateField(["rules", "goalkeeper_width"], Number(event.target.value || 0))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Intervalo base de spawn (ms)</label>
          <Input type="number" min={250} max={2000} step={50} value={config.rules.spawn_interval_ms || 800} onChange={(event) => onUpdateField(["rules", "spawn_interval_ms"], Number(event.target.value || 0))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Velocidad mínima de balón</label>
          <Input type="number" min={1} max={20} step={0.5} value={config.rules.ball_speed_min || 4} onChange={(event) => onUpdateField(["rules", "ball_speed_min"], Number(event.target.value || 0))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Velocidad máxima de balón</label>
          <Input type="number" min={1} max={20} step={0.5} value={config.rules.ball_speed_max || 8} onChange={(event) => onUpdateField(["rules", "ball_speed_max"], Number(event.target.value || 0))} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Mostrar reloj</span>
          <Switch checked={config.rules.show_timer} onCheckedChange={(checked) => onUpdateField(["rules", "show_timer"], checked)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Mostrar puntaje</span>
          <Switch checked={Boolean(config.rules.show_score)} onCheckedChange={(checked) => onUpdateField(["rules", "show_score"], checked)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4 md:col-span-2 xl:col-span-2">
          <span className="text-sm">Mostrar cantidad de atajadas</span>
          <Switch checked={Boolean(config.rules.show_saves)} onCheckedChange={(checked) => onUpdateField(["rules", "show_saves"], checked)} />
        </div>
      </div>
    </SectionCard>
  );
}

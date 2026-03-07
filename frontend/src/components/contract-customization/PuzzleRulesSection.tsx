import { ContractCustomizationConfig } from "@/api/contracts";
import { SectionCard } from "@/components/contract-customization/shared";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function PuzzleRulesSection({
  config,
  onUpdateField,
}: {
  config: ContractCustomizationConfig;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}) {
  const gridSize = Number(config.rules.grid_size || 3);

  return (
    <SectionCard title="Reglas del puzzle" description="Configurá tamaño del tablero, tiempo objetivo y métricas visibles.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Tamaño del puzzle</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={String(gridSize)}
            onChange={(event) => onUpdateField(["rules", "grid_size"], Number(event.target.value))}
          >
            <option value="3">3 x 3</option>
            <option value="4">4 x 4</option>
            <option value="5">5 x 5</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Tiempo objetivo (segundos)</label>
          <Input
            type="number"
            min={30}
            max={1200}
            value={config.rules.timer_seconds}
            onChange={(event) => onUpdateField(["rules", "timer_seconds"], Number(event.target.value || 0))}
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Mostrar tiempo</span>
          <Switch checked={config.rules.show_timer} onCheckedChange={(checked) => onUpdateField(["rules", "show_timer"], checked)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
          <span className="text-sm">Mostrar movimientos</span>
          <Switch checked={Boolean(config.rules.show_moves)} onCheckedChange={(checked) => onUpdateField(["rules", "show_moves"], checked)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4 md:col-span-2 xl:col-span-2">
          <span className="text-sm">Mostrar progreso de piezas correctas</span>
          <Switch checked={Boolean(config.rules.show_progress)} onCheckedChange={(checked) => onUpdateField(["rules", "show_progress"], checked)} />
        </div>
      </div>
    </SectionCard>
  );
}

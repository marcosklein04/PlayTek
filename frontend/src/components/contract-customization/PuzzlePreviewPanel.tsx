import { ContractCustomizationConfig } from "@/api/contracts";

function pieceBackgroundPosition(pieceIndex: number, gridSize: number) {
  const row = Math.floor(pieceIndex / gridSize);
  const col = pieceIndex % gridSize;
  const denominator = Math.max(gridSize - 1, 1);
  return {
    backgroundPosition: `${(col * 100) / denominator}% ${(row * 100) / denominator}%`,
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
  };
}

export function PuzzlePreviewPanel({ config }: { config: ContractCustomizationConfig }) {
  const gridSize = Math.max(3, Math.min(5, Number(config.rules.grid_size || 3)));
  const puzzleImage = config.content?.puzzle_image_url || config.branding.welcome_image_url || "/img/puzzle-mundial.jpeg";
  const panelBackground = config.visual.panel_bg_color || config.branding.secondary_color;
  const panelBorder = config.visual.panel_border_color || config.visual.question_border_color;
  const textColor = config.visual.text_color || config.visual.question_text_color;
  const accentColor = config.visual.accent_color || config.branding.primary_color;
  const title = config.texts.welcome_title.trim() || "Puzzle Mundial";
  const subtitle = config.texts.welcome_subtitle.trim() || "Armá la imagen del mundial pieza por pieza.";

  return (
    <aside className="space-y-4 xl:sticky xl:top-8">
      <div className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Vista previa rápida</h2>
          <p className="text-sm text-muted-foreground">Resumen de portada y tablero modelo del Puzzle Mundial.</p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background/30 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="space-y-5 bg-black/20 p-5">
            <div className="space-y-3 rounded-3xl border border-white/10 bg-black/20 p-5">
              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ backgroundColor: accentColor, color: config.branding.secondary_color }}>
                Puzzle Mundial
              </span>
              <div>
                <h3 className="text-2xl font-display font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/70">{subtitle}</p>
              </div>
              <img src={config.branding.welcome_image_url || puzzleImage} alt={title} className="h-32 w-full rounded-2xl border border-white/10 object-cover" />
            </div>

            <div className="rounded-3xl p-5" style={{ backgroundColor: panelBackground, border: `1px solid ${panelBorder}`, color: textColor }}>
              <div className="mb-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-white/70">
                <span>{gridSize} x {gridSize}</span>
                <span>{config.rules.show_timer ? `${config.rules.timer_seconds}s objetivo` : "Tiempo oculto"}</span>
                <span>{config.rules.show_moves ? "Con movimientos" : "Sin movimientos"}</span>
              </div>

              <div className="grid gap-1.5 rounded-2xl bg-black/15 p-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridSize * gridSize }, (_, pieceIndex) => (
                  <div
                    key={pieceIndex}
                    className="aspect-square rounded-lg border border-white/10"
                    style={{
                      backgroundImage: `url(${puzzleImage})`,
                      backgroundRepeat: "no-repeat",
                      ...pieceBackgroundPosition(pieceIndex, gridSize),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

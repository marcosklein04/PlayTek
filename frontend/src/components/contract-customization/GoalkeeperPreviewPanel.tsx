import { ContractCustomizationConfig } from "@/api/contracts";

function KeeperPreviewSvg({ jersey, detail, glove }: { jersey: string; detail: string; glove: string }) {
  return (
    <svg viewBox="0 0 120 150" className="h-40 w-32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="100" rx="30" ry="35" fill={jersey} />
      <ellipse cx="60" cy="95" rx="25" ry="28" fill={detail} />
      <rect x="50" y="66" width="20" height="54" fill={jersey} />
      <ellipse cx="18" cy="84" rx="18" ry="10" fill={detail} />
      <circle cx="6" cy="84" r="10" fill="#F4C7A0" />
      <circle cx="6" cy="84" r="8" fill={glove} />
      <ellipse cx="102" cy="84" rx="18" ry="10" fill={detail} />
      <circle cx="114" cy="84" r="10" fill="#F4C7A0" />
      <circle cx="114" cy="84" r="8" fill={glove} />
      <circle cx="60" cy="46" r="25" fill="#F4C7A0" />
      <ellipse cx="60" cy="30" rx="22" ry="12" fill="#4A3728" />
      <circle cx="52" cy="42" r="3" fill="#1F2937" />
      <circle cx="68" cy="42" r="3" fill="#1F2937" />
      <path d="M54 55C58 58 62 58 66 55" stroke="#9A5C42" strokeWidth="3" strokeLinecap="round" />
      <rect x="40" y="120" width="40" height="18" rx="5" fill="#1F2937" />
      <rect x="42" y="136" width="14" height="12" rx="3" fill="#F4C7A0" />
      <rect x="64" y="136" width="14" height="12" rx="3" fill="#F4C7A0" />
      <text x="60" y="104" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">1</text>
    </svg>
  );
}

export function GoalkeeperPreviewPanel({ config }: { config: ContractCustomizationConfig }) {
  const title = config.texts.welcome_title.trim() || "SÚPER PORTERO";
  const subtitle = config.texts.welcome_subtitle.trim() || "Mové al arquero y atajá todos los remates.";
  const duration = config.rules.timer_seconds || 60;
  const points = config.rules.points_per_save || 10;

  return (
    <aside className="space-y-4 xl:sticky xl:top-8">
      <div className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Vista previa rápida</h2>
          <p className="text-sm text-muted-foreground">Portada, score y sponsors del arcade del portero.</p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-border/70 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div
            className="space-y-4 p-5"
            style={{
              background: `linear-gradient(180deg, ${config.visual.field_dark_color || "#0b3b23"} 0%, ${config.visual.field_green_color || "#2b8a3e"} 30%, ${config.visual.field_green_color || "#2b8a3e"} 70%, ${config.visual.field_dark_color || "#0b3b23"} 100%)`,
              color: config.visual.question_text_color,
            }}
          >
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ backgroundColor: config.branding.primary_color, color: "#111" }}>
                World Cup Arcade
              </span>
              {config.branding.welcome_image_url ? (
                <img src={config.branding.welcome_image_url} alt={title} className="mt-4 h-24 w-full rounded-2xl object-cover" />
              ) : null}
              <h3 className="mt-4 text-3xl font-display font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{subtitle}</p>
            </div>

            <div className="flex justify-between gap-2 text-center">
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Puntos</p>
                <strong className="text-2xl text-white">120</strong>
              </div>
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Tiempo</p>
                <strong className="text-2xl text-white">0:{String(duration).padStart(2, "0")}</strong>
              </div>
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Atajadas</p>
                <strong className="text-2xl text-white">9</strong>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/15 px-4 pb-24 pt-8">
              <div className="absolute left-4 top-4 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-white/70">{config.content?.sponsor_top_left || "PATROCINADOR"}</div>
              <div className="absolute right-4 top-4 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-white/70">{config.content?.sponsor_top_right || "PATROCINADOR"}</div>
              <div className="mx-auto flex h-48 items-end justify-center rounded-full border border-white/10 bg-white/5">
                <KeeperPreviewSvg
                  jersey={config.visual.goalkeeper_jersey_color || "#2563eb"}
                  detail={config.visual.goalkeeper_detail_color || "#3b82f6"}
                  glove={config.visual.goalkeeper_glove_color || "#22c55e"}
                />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-dashed border-white/20 px-4 py-2 text-xs text-white/70">
                {config.content?.sponsor_bottom || "TU MARCA AQUÍ"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80">
              Duración {duration}s · {points} puntos por atajada · movimiento libre del arquero.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

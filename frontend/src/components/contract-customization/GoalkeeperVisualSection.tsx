import { ContractCustomizationConfig } from "@/api/contracts";
import { ColorField, SectionCard } from "@/components/contract-customization/shared";

export function GoalkeeperVisualSection({
  config,
  onUpdateField,
}: {
  config: ContractCustomizationConfig;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
}) {
  return (
    <SectionCard title="Visual del juego" description="Controlá el look del campo, del scoreboard, de los sponsors y del arquero.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ColorField label="Líneas del campo" value={config.visual.line_color || "#f4f6f2"} onChange={(value) => onUpdateField(["visual", "line_color"], value)} />
        <ColorField label="Panel de score" value={config.visual.score_panel_bg || "#111111"} onChange={(value) => onUpdateField(["visual", "score_panel_bg"], value)} />
        <ColorField label="Fondo sponsors" value={config.visual.sponsor_bg_color || "#ffffff"} onChange={(value) => onUpdateField(["visual", "sponsor_bg_color"], value)} />
        <ColorField label="Texto sponsors" value={config.visual.sponsor_text_color || "#d6e7db"} onChange={(value) => onUpdateField(["visual", "sponsor_text_color"], value)} />
        <ColorField label="Camiseta" value={config.visual.goalkeeper_jersey_color || "#2563eb"} onChange={(value) => onUpdateField(["visual", "goalkeeper_jersey_color"], value)} />
        <ColorField label="Detalle camiseta" value={config.visual.goalkeeper_detail_color || "#3b82f6"} onChange={(value) => onUpdateField(["visual", "goalkeeper_detail_color"], value)} />
        <ColorField label="Guantes" value={config.visual.goalkeeper_glove_color || "#22c55e"} onChange={(value) => onUpdateField(["visual", "goalkeeper_glove_color"], value)} />
        <ColorField label="Acento / oro" value={config.visual.accent_color || config.branding.primary_color} onChange={(value) => onUpdateField(["visual", "accent_color"], value)} />
      </div>
    </SectionCard>
  );
}

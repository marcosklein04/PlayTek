import { TriviaCustomization } from "@/api/contracts";
import { ColorField, SectionCard } from "@/components/contract-customization/shared";

type SparkleVisualSectionProps = {
  config: TriviaCustomization;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
};

export function SparkleVisualSection({ config, onUpdateField }: SparkleVisualSectionProps) {
  return (
    <SectionCard
      title="Apariencia de preguntas"
      description="Ajustá solo los colores que impactan visualmente en el juego."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="Fondo de pantalla"
          value={config.visual.screen_background_color}
          onChange={(value) => onUpdateField(["visual", "screen_background_color"], value)}
        />
        <ColorField
          label="Fondo de pregunta"
          value={config.visual.question_bg_color}
          onChange={(value) => onUpdateField(["visual", "question_bg_color"], value)}
        />
        <ColorField
          label="Borde de pregunta"
          value={config.visual.question_border_color}
          onChange={(value) => onUpdateField(["visual", "question_border_color"], value)}
        />
        <ColorField
          label="Texto de pregunta"
          value={config.visual.question_text_color}
          onChange={(value) => onUpdateField(["visual", "question_text_color"], value)}
        />
        <ColorField
          label="Fondo de respuestas"
          value={config.visual.option_bg_color}
          onChange={(value) => onUpdateField(["visual", "option_bg_color"], value)}
        />
        <ColorField
          label="Borde de respuestas"
          value={config.visual.option_border_color}
          onChange={(value) => onUpdateField(["visual", "option_border_color"], value)}
        />
      </div>
    </SectionCard>
  );
}

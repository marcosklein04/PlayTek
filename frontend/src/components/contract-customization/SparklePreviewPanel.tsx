import { ContractSparkleQuestion, TriviaCustomization } from "@/api/contracts";

type SparklePreviewPanelProps = {
  config: TriviaCustomization;
  questions: ContractSparkleQuestion[];
};

const FALLBACK_TEXT_CHOICES = ["Opción A", "Opción B", "Opción C", "Opción D"];

export function SparklePreviewPanel({ config, questions }: SparklePreviewPanelProps) {
  const title = config.texts.welcome_title.trim() || "TRIVIA SPARKLE";
  const subtitle = config.texts.welcome_subtitle.trim() || "Competi con tu equipo en tiempo real";
  const buttonLabel = config.texts.cta_button.trim() || "Comenzar";
  const sampleQuestion = questions.find((question) => question.prompt.trim()) ?? questions[0];
  const sampleTitle = sampleQuestion?.prompt.trim() || "¿Cuál de estas opciones representa mejor el estilo de tu evento?";
  const isImageAnswers = sampleQuestion?.type === "image_answers";
  const visibleAnswers = (sampleQuestion?.answers || []).slice(0, 4);

  const screenBackground = config.branding.background_url
    ? `linear-gradient(180deg, rgba(5,14,26,0.55), rgba(5,14,26,0.82)), url(${config.branding.background_url}) center/cover`
    : config.visual.screen_background_color;

  return (
    <aside className="xl:sticky xl:top-8 space-y-4">
      <div className="glass-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Vista previa rápida</h2>
          <p className="text-sm text-muted-foreground">Resumen visual de portada y una pregunta modelo.</p>
        </div>

        <div
          className="overflow-hidden rounded-[28px] border border-border/70 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
          style={{ background: screenBackground }}
        >
          <div className="space-y-6 bg-black/20 p-5">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
                    style={{ backgroundColor: config.branding.primary_color, color: config.branding.secondary_color }}
                  >
                    Trivia Sparkle
                  </span>
                  <h3 className="text-2xl font-display font-bold leading-tight text-white">{title}</h3>
                  <p className="max-w-xs text-sm text-white/70">{subtitle}</p>
                </div>
                {config.branding.logo_url ? (
                  <img src={config.branding.logo_url} alt="Logo" className="h-12 w-20 object-contain" />
                ) : null}
              </div>

              {config.branding.welcome_image_url ? (
                <img
                  src={config.branding.welcome_image_url}
                  alt="Bienvenida"
                  className="mb-4 h-32 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : null}

              <button
                type="button"
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                style={{
                  background: `linear-gradient(135deg, ${config.branding.primary_color}, ${config.branding.secondary_color})`,
                  color: config.visual.question_text_color,
                }}
              >
                {buttonLabel}
              </button>
            </div>

            <div
              className="rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.28)]"
              style={{
                background: config.visual.container_bg_image_url
                  ? `linear-gradient(180deg, rgba(5,14,26,0.74), rgba(5,14,26,0.9)), url(${config.visual.container_bg_image_url}) center/cover`
                  : config.visual.question_bg_color,
                border: `1px solid ${config.visual.question_border_color}`,
                color: config.visual.question_text_color,
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
                <span>{config.rules.show_timer ? `${config.rules.timer_seconds}s` : "Sin timer"}</span>
                <span>{config.rules.points_per_correct} pts</span>
              </div>

              {sampleQuestion?.questionImageUrl ? (
                <img
                  src={sampleQuestion.questionImageUrl}
                  alt={sampleTitle}
                  className="mb-4 h-28 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : null}

              <p className="text-base font-semibold leading-relaxed" style={{ color: config.visual.question_text_color }}>
                {sampleTitle}
              </p>

              <div className={`mt-4 grid gap-3 ${isImageAnswers ? "grid-cols-2" : "grid-cols-1"}`}>
                {(visibleAnswers.length > 0 ? visibleAnswers : FALLBACK_TEXT_CHOICES.map((label, index) => ({ id: String(index), label, imageUrl: "" }))).map(
                  (answer, index) => (
                    <div
                      key={`${answer.id}-${index}`}
                      className="rounded-2xl border px-3 py-2 text-sm"
                      style={{
                        backgroundColor: config.visual.option_bg_color,
                        borderColor: config.visual.option_border_color,
                        color: config.visual.question_text_color,
                      }}
                    >
                      {isImageAnswers && answer.imageUrl ? (
                        <img src={answer.imageUrl} alt={answer.label} className="mb-2 h-20 w-full rounded-xl object-cover" />
                      ) : null}
                      <span>{answer.label}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

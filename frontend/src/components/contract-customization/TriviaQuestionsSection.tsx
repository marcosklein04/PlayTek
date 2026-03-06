import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BulkTriviaQuestionForm, MAX_BULK_QUESTIONS, MAX_FORM_CHOICES } from "@/components/contract-customization/triviaQuestionForms";

type TriviaQuestionsSectionProps = {
  title: string;
  description: string;
  questionCount: string;
  forms: BulkTriviaQuestionForm[];
  loading: boolean;
  saving: boolean;
  onQuestionCountChange: (value: string) => void;
  onApplyQuestionCount: () => void;
  onQuestionTextChange: (questionIndex: number, value: string) => void;
  onChoiceTextChange: (questionIndex: number, choiceIndex: number, value: string) => void;
  onSetCorrectChoice: (questionIndex: number, choiceIndex: number) => void;
  onAddChoice: (questionIndex: number) => void;
  onRemoveChoice: (questionIndex: number, choiceIndex: number) => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onSaveAll: () => void;
};

export function TriviaQuestionsSection({
  title,
  description,
  questionCount,
  forms,
  loading,
  saving,
  onQuestionCountChange,
  onApplyQuestionCount,
  onQuestionTextChange,
  onChoiceTextChange,
  onSetCorrectChoice,
  onAddChoice,
  onRemoveChoice,
  onRemoveQuestion,
  onSaveAll,
}: TriviaQuestionsSectionProps) {
  return (
    <section className="glass-card p-5 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
          <div>
            <label className="text-sm text-muted-foreground">Cantidad de preguntas</label>
            <Input
              type="number"
              min={1}
              max={MAX_BULK_QUESTIONS}
              value={questionCount}
              onChange={(e) => onQuestionCountChange(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onApplyQuestionCount}>
              Generar formularios
            </Button>
            <Button variant="hero" disabled={saving || forms.length === 0} onClick={onSaveAll}>
              {saving ? "Guardando..." : "Guardar preguntas"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Definí cuántas preguntas querés cargar y completá cada tarjeta. Al guardar, el contrato se actualiza con este set.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando preguntas...</p>}

      {!loading && forms.length > 0 && (
        <div className="space-y-4">
          {forms.map((form, questionIndex) => (
            <div key={`bulk-question-${questionIndex}`} className="rounded-2xl border border-border/70 bg-background/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Pregunta {questionIndex + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    Marcá una sola respuesta correcta. Podés usar entre 2 y {MAX_FORM_CHOICES} opciones.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={forms.length <= 1}
                  onClick={() => onRemoveQuestion(questionIndex)}
                >
                  Eliminar pregunta
                </Button>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Enunciado</label>
                <Input
                  value={form.text}
                  onChange={(e) => onQuestionTextChange(questionIndex, e.target.value)}
                  placeholder={`Escribe la pregunta ${questionIndex + 1}...`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Respuestas</label>
                {form.choices.map((choice, choiceIndex) => (
                  <div key={`bulk-choice-${questionIndex}-${choiceIndex}`} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`bulk-correct-choice-${questionIndex}`}
                      checked={choice.is_correct}
                      onChange={() => onSetCorrectChoice(questionIndex, choiceIndex)}
                      className="h-4 w-4 accent-primary"
                    />
                    <Input
                      value={choice.text}
                      onChange={(e) => onChoiceTextChange(questionIndex, choiceIndex, e.target.value)}
                      placeholder={`Respuesta ${choiceIndex + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={form.choices.length <= 2}
                      onClick={() => onRemoveChoice(questionIndex, choiceIndex)}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={form.choices.length >= MAX_FORM_CHOICES}
                onClick={() => onAddChoice(questionIndex)}
              >
                Agregar respuesta
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

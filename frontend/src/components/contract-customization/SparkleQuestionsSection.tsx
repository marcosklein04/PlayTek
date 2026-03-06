import { ContractSparkleQuestion } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/contract-customization/shared";
import { MAX_SPARKLE_ANSWERS, MAX_SPARKLE_QUESTIONS } from "@/components/contract-customization/sparkleQuestionForms";

type SparkleQuestionsSectionProps = {
  questionCount: string;
  questions: ContractSparkleQuestion[];
  loading: boolean;
  saving: boolean;
  uploadingImageKey: string | null;
  onQuestionCountChange: (value: string) => void;
  onApplyQuestionCount: () => void;
  onPromptChange: (questionIndex: number, value: string) => void;
  onTypeChange: (questionIndex: number, value: "text_answers" | "image_answers") => void;
  onQuestionImageUpload: (questionIndex: number, file?: File | null) => void;
  onQuestionImageClear: (questionIndex: number) => void;
  onAnswerLabelChange: (questionIndex: number, answerIndex: number, value: string) => void;
  onAnswerImageUpload: (questionIndex: number, answerIndex: number, file?: File | null) => void;
  onAnswerImageClear: (questionIndex: number, answerIndex: number) => void;
  onSetCorrectAnswer: (questionIndex: number, answerId: string) => void;
  onAddAnswer: (questionIndex: number) => void;
  onRemoveAnswer: (questionIndex: number, answerIndex: number) => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onSaveQuestions: () => void;
};

export function SparkleQuestionsSection({
  questionCount,
  questions,
  loading,
  saving,
  uploadingImageKey,
  onQuestionCountChange,
  onApplyQuestionCount,
  onPromptChange,
  onTypeChange,
  onQuestionImageUpload,
  onQuestionImageClear,
  onAnswerLabelChange,
  onAnswerImageUpload,
  onAnswerImageClear,
  onSetCorrectAnswer,
  onAddAnswer,
  onRemoveAnswer,
  onRemoveQuestion,
  onSaveQuestions,
}: SparkleQuestionsSectionProps) {
  return (
    <SectionCard
      title="Preguntas"
      description="Trivia Sparkle admite pregunta en texto, imagen principal opcional y respuestas en texto o con imagen."
    >
      <div className="rounded-2xl border border-border/70 bg-background/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
          <div>
            <label className="text-sm text-muted-foreground">Cantidad de preguntas</label>
            <Input
              type="number"
              min={1}
              max={MAX_SPARKLE_QUESTIONS}
              value={questionCount}
              onChange={(e) => onQuestionCountChange(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onApplyQuestionCount}>
              Generar formularios
            </Button>
            <Button variant="hero" disabled={saving || questions.length === 0} onClick={onSaveQuestions}>
              {saving ? "Guardando..." : "Guardar preguntas Sparkle"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Si elegís respuestas con imagen, cada respuesta necesita una imagen cargada. La imagen principal de la pregunta es opcional.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando preguntas...</p>}

      {!loading && (
        <div className="space-y-4">
          {questions.map((question, questionIndex) => {
            const questionImageKey = `question-${question.id}`;
            const isImageAnswers = question.type === "image_answers";
            return (
              <div key={question.id} className="rounded-2xl border border-border/70 bg-background/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pregunta {questionIndex + 1}</p>
                    <p className="text-xs text-muted-foreground">Elegí si las respuestas se muestran en texto o con imagen.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={questions.length <= 1}
                    onClick={() => onRemoveQuestion(questionIndex)}
                  >
                    Eliminar pregunta
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <div>
                    <label className="text-sm text-muted-foreground">Enunciado</label>
                    <Textarea
                      value={question.prompt}
                      onChange={(e) => onPromptChange(questionIndex, e.target.value)}
                      placeholder={`Escribe la pregunta ${questionIndex + 1}...`}
                      className="min-h-[96px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Tipo de respuestas</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-border bg-input/50 px-4 py-2 text-sm text-foreground"
                      value={question.type}
                      onChange={(e) => onTypeChange(questionIndex, e.target.value as "text_answers" | "image_answers")}
                    >
                      <option value="text_answers">Texto</option>
                      <option value="image_answers">Imagen</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Imagen principal de la pregunta</p>
                      <p className="text-xs text-muted-foreground">Opcional. Se muestra arriba del enunciado en el runner.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!question.questionImageUrl || uploadingImageKey === questionImageKey}
                      onClick={() => onQuestionImageClear(questionIndex)}
                    >
                      Quitar imagen
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImageKey === questionImageKey}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onQuestionImageUpload(questionIndex, file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {question.questionImageUrl ? (
                    <img src={question.questionImageUrl} alt={`Pregunta ${questionIndex + 1}`} className="h-32 w-full rounded-xl object-cover" />
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Respuestas</p>
                      <p className="text-xs text-muted-foreground">
                        Marcá una sola como correcta. Podés usar hasta {MAX_SPARKLE_ANSWERS} respuestas.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={question.answers.length >= MAX_SPARKLE_ANSWERS}
                      onClick={() => onAddAnswer(questionIndex)}
                    >
                      Agregar respuesta
                    </Button>
                  </div>

                  {question.answers.map((answer, answerIndex) => {
                    const answerImageKey = `answer-${question.id}-${answer.id}`;
                    return (
                      <div key={answer.id} className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-medium text-foreground">Respuesta {answerIndex + 1}</label>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="radio"
                                name={`sparkle-correct-${question.id}`}
                                checked={question.correctAnswerId === answer.id}
                                onChange={() => onSetCorrectAnswer(questionIndex, answer.id)}
                                className="h-4 w-4 accent-primary"
                              />
                              Correcta
                            </label>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={question.answers.length <= 2}
                              onClick={() => onRemoveAnswer(questionIndex, answerIndex)}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-muted-foreground">Texto de apoyo</label>
                          <Input
                            value={answer.label}
                            onChange={(e) => onAnswerLabelChange(questionIndex, answerIndex, e.target.value)}
                            placeholder={`Respuesta ${answerIndex + 1}`}
                          />
                        </div>

                        {isImageAnswers ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-sm text-muted-foreground">Imagen de respuesta</label>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!answer.imageUrl || uploadingImageKey === answerImageKey}
                                onClick={() => onAnswerImageClear(questionIndex, answerIndex)}
                              >
                                Quitar imagen
                              </Button>
                            </div>
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImageKey === answerImageKey}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                onAnswerImageUpload(questionIndex, answerIndex, file);
                                e.currentTarget.value = "";
                              }}
                            />
                            {answer.imageUrl ? (
                              <img src={answer.imageUrl} alt={answer.label || `Respuesta ${answerIndex + 1}`} className="h-28 w-full rounded-xl object-cover" />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

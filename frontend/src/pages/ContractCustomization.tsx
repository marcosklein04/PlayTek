import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ContractAssetKey,
  ContractTriviaQuestion,
  TriviaCustomization,
  createContractTriviaQuestion,
  deleteContractTriviaQuestion,
  deleteContractAsset,
  fetchContractCustomization,
  fetchContractTriviaQuestions,
  importContractTriviaCsv,
  launchContractByDate,
  saveContractCustomization,
  startContractPreview,
  updateContractTriviaQuestion,
  uploadContractAsset,
} from "@/api/contracts";

type TriviaQuestionForm = {
  text: string;
  choices: Array<{ text: string; is_correct: boolean }>;
};

const MAX_FORM_CHOICES = 6;

function buildEmptyQuestionForm(): TriviaQuestionForm {
  return {
    text: "",
    choices: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  };
}

function questionToForm(question: ContractTriviaQuestion): TriviaQuestionForm {
  const choices = question.choices.map((choice) => ({
    text: choice.text,
    is_correct: choice.is_correct,
  }));
  while (choices.length < 4) {
    choices.push({ text: "", is_correct: false });
  }
  return {
    text: question.text,
    choices,
  };
}

export default function ContractCustomization() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const validId = Number.isFinite(contractId) && contractId > 0;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<ContractAssetKey | null>(null);
  const [gameSlug, setGameSlug] = useState("");
  const [config, setConfig] = useState<TriviaCustomization | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsSaving, setQuestionsSaving] = useState(false);
  const [questions, setQuestions] = useState<ContractTriviaQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionSetId, setQuestionSetId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<TriviaQuestionForm>(buildEmptyQuestionForm());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvReplaceExisting, setCsvReplaceExisting] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);

  const disabled = useMemo(
    () => !config || saving || starting || uploadingAsset !== null || questionsSaving || csvUploading,
    [config, saving, starting, uploadingAsset, questionsSaving, csvUploading],
  );
  const watermarkOpacityLabel = useMemo(() => {
    if (!config) return "0.00";
    const value = Number(config.watermark.opacity || 0);
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  }, [config]);

  useEffect(() => {
    if (!validId) {
      toast({ title: "Contrato invalido", description: "No se pudo abrir la customizacion.", variant: "destructive" });
      navigate("/my-games", { replace: true });
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await fetchContractCustomization(contractId);
        setGameSlug(res.game_slug);
        setConfig(res.config);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error cargando customizacion";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [contractId, validId, navigate, toast]);

  useEffect(() => {
    if (!validId || gameSlug !== "trivia") return;

    (async () => {
      try {
        setQuestionsLoading(true);
        const res = await fetchContractTriviaQuestions(contractId);
        setQuestions(res.questions || []);
        setQuestionSetId(res.question_set_id ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar las preguntas";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setQuestionsLoading(false);
      }
    })();
  }, [contractId, validId, gameSlug, toast]);

  const updateField = (path: string[], value: string | number | boolean) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      let cursor: any = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]];
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const updateQuestionChoice = (choiceIndex: number, value: string) => {
    setQuestionForm((prev) => {
      const next = structuredClone(prev);
      next.choices[choiceIndex].text = value;
      return next;
    });
  };

  const setCorrectChoice = (choiceIndex: number) => {
    setQuestionForm((prev) => {
      const next = structuredClone(prev);
      next.choices = next.choices.map((choice, index) => ({
        ...choice,
        is_correct: index === choiceIndex,
      }));
      return next;
    });
  };

  const addChoiceField = () => {
    setQuestionForm((prev) => {
      if (prev.choices.length >= MAX_FORM_CHOICES) return prev;
      return {
        ...prev,
        choices: [...prev.choices, { text: "", is_correct: false }],
      };
    });
  };

  const removeChoiceField = (choiceIndex: number) => {
    setQuestionForm((prev) => {
      if (prev.choices.length <= 2) return prev;
      const nextChoices = prev.choices.filter((_, index) => index !== choiceIndex);
      if (!nextChoices.some((choice) => choice.is_correct)) {
        nextChoices[0].is_correct = true;
      }
      return {
        ...prev,
        choices: nextChoices,
      };
    });
  };

  const handleSave = async () => {
    if (!config || !validId) return;
    try {
      setSaving(true);
      await saveContractCustomization(contractId, config);
      toast({ title: "Guardado", description: "La customizacion quedo lista para el evento." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!validId) return;

    const text = questionForm.text.trim();
    const choices = questionForm.choices
      .map((choice) => ({ ...choice, text: choice.text.trim() }))
      .filter((choice) => choice.text.length > 0);

    if (!text) {
      toast({ title: "Falta la pregunta", description: "Escribe el texto de la pregunta.", variant: "destructive" });
      return;
    }
    if (choices.length < 2) {
      toast({
        title: "Opciones insuficientes",
        description: "Debes cargar al menos 2 opciones con texto.",
        variant: "destructive",
      });
      return;
    }
    const correctCount = choices.filter((choice) => choice.is_correct).length;
    if (correctCount !== 1) {
      toast({
        title: "Respuesta correcta",
        description: "Marca exactamente una opcion correcta.",
        variant: "destructive",
      });
      return;
    }

    try {
      setQuestionsSaving(true);
      if (editingQuestionId) {
        const res = await updateContractTriviaQuestion(contractId, editingQuestionId, { text, choices });
        setQuestions((prev) => prev.map((question) => (question.id === editingQuestionId ? res.question : question)));
        toast({ title: "Pregunta actualizada", description: "Cambios guardados correctamente." });
      } else {
        const res = await createContractTriviaQuestion(contractId, { text, choices });
        setQuestions((prev) => [...prev, res.question]);
        setQuestionSetId(res.question_set_id);
        toast({ title: "Pregunta creada", description: "Se agrego al contrato." });
      }

      setEditingQuestionId(null);
      setQuestionForm(buildEmptyQuestionForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la pregunta";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setQuestionsSaving(false);
    }
  };

  const handleEditQuestion = (question: ContractTriviaQuestion) => {
    setEditingQuestionId(question.id);
    setQuestionForm(questionToForm(question));
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(buildEmptyQuestionForm());
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!validId) return;
    try {
      setQuestionsSaving(true);
      await deleteContractTriviaQuestion(contractId, questionId);
      setQuestions((prev) => prev.filter((question) => question.id !== questionId));
      if (editingQuestionId === questionId) {
        handleCancelEditQuestion();
      }
      toast({ title: "Pregunta eliminada", description: "La pregunta fue removida del contrato." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la pregunta";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setQuestionsSaving(false);
    }
  };

  const handleImportCsv = async () => {
    if (!validId || !csvFile) {
      toast({
        title: "Selecciona un archivo",
        description: "Debes elegir un CSV antes de importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCsvUploading(true);
      const res = await importContractTriviaCsv(contractId, csvFile, csvReplaceExisting);
      setQuestions(res.questions || []);
      setQuestionSetId(res.question_set_id);
      setCsvFile(null);
      toast({
        title: "CSV importado",
        description: `Preguntas importadas: ${res.imported}. Errores: ${res.errors.length}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo importar el CSV";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setCsvUploading(false);
    }
  };

  const handleUploadAsset = async (assetKey: ContractAssetKey, file?: File | null) => {
    if (!validId || !file) return;
    try {
      setUploadingAsset(assetKey);
      const res = await uploadContractAsset(contractId, assetKey, file);
      setConfig(res.config);
      toast({ title: "Asset subido", description: "Se actualizo la customizacion del contrato." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir el archivo";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleDeleteAsset = async (assetKey: ContractAssetKey) => {
    if (!validId) return;
    try {
      setUploadingAsset(assetKey);
      const res = await deleteContractAsset(contractId, assetKey);
      setConfig(res.config);
      toast({ title: "Asset eliminado", description: "Se borro el archivo del contrato." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el archivo";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setUploadingAsset(null);
    }
  };

  const handlePreview = async () => {
    if (!validId) return;
    try {
      setStarting(true);
      const res = await startContractPreview(contractId);
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar preview";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleLaunchAuto = async () => {
    if (!validId) return;
    try {
      setStarting(true);
      const res = await launchContractByDate(contractId);
      if (res.preview_mode) {
        toast({
          title: "Modo preview",
          description: "Fuera de fecha de evento: se abrio con watermark.",
        });
      }
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar evento";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Customizacion</h1>
          <p className="text-muted-foreground mt-1">
            Contrato #{validId ? contractId : "-"} {gameSlug ? `· ${gameSlug}` : ""}
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Cargando configuracion...</p>}

        {!loading && config && (
          <div className="space-y-6">
            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Branding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Color primario</label>
                  <Input
                    value={config.branding.primary_color}
                    onChange={(e) => updateField(["branding", "primary_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Color secundario</label>
                  <Input
                    value={config.branding.secondary_color}
                    onChange={(e) => updateField(["branding", "secondary_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Logo URL</label>
                  <Input
                    value={config.branding.logo_url}
                    onChange={(e) => updateField(["branding", "logo_url"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Background URL</label>
                  <Input
                    value={config.branding.background_url}
                    onChange={(e) => updateField(["branding", "background_url"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Imagen bienvenida URL</label>
                  <Input
                    value={config.branding.welcome_image_url}
                    onChange={(e) => updateField(["branding", "welcome_image_url"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Texto de watermark (modo prueba)</label>
                  <Input
                    value={config.branding.watermark_text}
                    onChange={(e) => updateField(["branding", "watermark_text"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-2">Assets del Contrato</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sube imagenes para logo, portada y fondos. Se guardan directo en este contrato.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-border p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Logo</p>
                    <p className="text-xs text-muted-foreground">Formato recomendado: PNG transparente.</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAsset === "logo"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleUploadAsset("logo", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {config.branding.logo_url && (
                    <img
                      src={config.branding.logo_url}
                      alt="Logo contrato"
                      className="h-24 w-full rounded-md border border-border object-contain bg-muted/20"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!config.branding.logo_url || uploadingAsset === "logo"}
                    onClick={() => void handleDeleteAsset("logo")}
                  >
                    {uploadingAsset === "logo" ? "Procesando..." : "Eliminar logo"}
                  </Button>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Imagen de bienvenida</p>
                    <p className="text-xs text-muted-foreground">Se usa en la cabecera del runner.</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAsset === "welcome_image"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleUploadAsset("welcome_image", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {config.branding.welcome_image_url && (
                    <img
                      src={config.branding.welcome_image_url}
                      alt="Welcome contrato"
                      className="h-24 w-full rounded-md border border-border object-cover bg-muted/20"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!config.branding.welcome_image_url || uploadingAsset === "welcome_image"}
                    onClick={() => void handleDeleteAsset("welcome_image")}
                  >
                    {uploadingAsset === "welcome_image" ? "Procesando..." : "Eliminar imagen"}
                  </Button>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Fondo principal</p>
                    <p className="text-xs text-muted-foreground">Se aplica al fondo de pantalla del juego.</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAsset === "background"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleUploadAsset("background", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {config.branding.background_url && (
                    <img
                      src={config.branding.background_url}
                      alt="Background contrato"
                      className="h-24 w-full rounded-md border border-border object-cover bg-muted/20"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!config.branding.background_url || uploadingAsset === "background"}
                    onClick={() => void handleDeleteAsset("background")}
                  >
                    {uploadingAsset === "background" ? "Procesando..." : "Eliminar fondo"}
                  </Button>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Fondo de contenedor</p>
                    <p className="text-xs text-muted-foreground">Se aplica a la tarjeta de pregunta.</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAsset === "container_background"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleUploadAsset("container_background", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {config.visual.container_bg_image_url && (
                    <img
                      src={config.visual.container_bg_image_url}
                      alt="Container background contrato"
                      className="h-24 w-full rounded-md border border-border object-cover bg-muted/20"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!config.visual.container_bg_image_url || uploadingAsset === "container_background"}
                    onClick={() => void handleDeleteAsset("container_background")}
                  >
                    {uploadingAsset === "container_background" ? "Procesando..." : "Eliminar fondo"}
                  </Button>
                </div>
              </div>
            </section>

            {gameSlug === "trivia" && (
              <section className="glass-card p-5 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">Preguntas de Trivia</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea y edita las preguntas especificas de este contrato.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Question set: {questionSetId ?? "Se crea automaticamente al guardar la primera pregunta"}
                  </p>
                </div>

                <div className="rounded-md border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Importar CSV</h3>
                  <p className="text-xs text-muted-foreground">
                    Columnas requeridas: question, option_1, option_2, correct_option (indice 1-based o texto exacto).
                  </p>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={csvUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCsvFile(file);
                    }}
                  />
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <span className="text-sm">Reemplazar preguntas actuales</span>
                    <Switch
                      checked={csvReplaceExisting}
                      onCheckedChange={(checked) => setCsvReplaceExisting(checked)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={csvUploading || !csvFile}
                    onClick={() => void handleImportCsv()}
                  >
                    {csvUploading ? "Importando..." : "Importar CSV"}
                  </Button>
                </div>

                <div className="rounded-md border border-border p-4 space-y-4">
                  <h3 className="text-sm font-semibold">
                    {editingQuestionId ? `Editar pregunta #${editingQuestionId}` : "Nueva pregunta"}
                  </h3>

                  <div>
                    <label className="text-sm text-muted-foreground">Pregunta</label>
                    <Input
                      value={questionForm.text}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
                      placeholder="Escribe la pregunta..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Opciones (marca una correcta)</label>
                    {questionForm.choices.map((choice, index) => (
                      <div key={`choice-${index}`} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="trivia-correct-choice"
                          checked={choice.is_correct}
                          onChange={() => setCorrectChoice(index)}
                        />
                        <Input
                          value={choice.text}
                          onChange={(e) => updateQuestionChoice(index, e.target.value)}
                          placeholder={`Opcion ${index + 1}`}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={questionForm.choices.length <= 2}
                          onClick={() => removeChoiceField(index)}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={questionForm.choices.length >= MAX_FORM_CHOICES}
                      onClick={addChoiceField}
                    >
                      Agregar opcion
                    </Button>
                    <Button variant="hero" disabled={questionsSaving} onClick={() => void handleSaveQuestion()}>
                      {questionsSaving ? "Guardando..." : editingQuestionId ? "Actualizar pregunta" : "Guardar pregunta"}
                    </Button>
                    {editingQuestionId && (
                      <Button variant="outline" onClick={handleCancelEditQuestion}>
                        Cancelar edicion
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Preguntas cargadas ({questions.length})</h3>
                  {questionsLoading && <p className="text-sm text-muted-foreground">Cargando preguntas...</p>}
                  {!questionsLoading && questions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aun no hay preguntas para este contrato.</p>
                  )}
                  {!questionsLoading &&
                    questions.map((question) => (
                      <div key={question.id} className="rounded-md border border-border p-4">
                        <p className="font-medium text-foreground">{question.text}</p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {question.choices.map((choice) => (
                            <li key={choice.id} className={choice.is_correct ? "text-primary font-medium" : "text-muted-foreground"}>
                              {choice.is_correct ? "✓ " : "• "}
                              {choice.text}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditQuestion(question)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={questionsSaving}
                            onClick={() => void handleDeleteQuestion(question.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Textos</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Titulo de bienvenida</label>
                  <Input
                    value={config.texts.welcome_title}
                    onChange={(e) => updateField(["texts", "welcome_title"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Subtitulo</label>
                  <Input
                    value={config.texts.welcome_subtitle}
                    onChange={(e) => updateField(["texts", "welcome_subtitle"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Texto boton CTA</label>
                  <Input
                    value={config.texts.cta_button}
                    onChange={(e) => updateField(["texts", "cta_button"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Reglas de Trivia</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Mostrar timer</span>
                  <Switch
                    checked={config.rules.show_timer}
                    onCheckedChange={(checked) => updateField(["rules", "show_timer"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Segundos por pregunta</label>
                  <Input
                    type="number"
                    min={5}
                    value={config.rules.timer_seconds}
                    onChange={(e) => updateField(["rules", "timer_seconds"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Puntos por respuesta correcta</label>
                  <Input
                    type="number"
                    min={0}
                    value={config.rules.points_per_correct}
                    onChange={(e) => updateField(["rules", "points_per_correct"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cantidad maxima de preguntas</label>
                  <Input
                    type="number"
                    min={1}
                    value={config.rules.max_questions}
                    onChange={(e) => updateField(["rules", "max_questions"], Number(e.target.value || 0))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Usar vidas</span>
                  <Switch
                    checked={config.rules.use_lives}
                    onCheckedChange={(checked) => updateField(["rules", "use_lives"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cantidad de vidas</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    disabled={!config.rules.use_lives}
                    value={config.rules.lives}
                    onChange={(e) => updateField(["rules", "lives"], Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Visual de Preguntas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de pantalla</label>
                  <Input
                    type="color"
                    value={config.visual.screen_background_color}
                    onChange={(e) => updateField(["visual", "screen_background_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_bg_color}
                    onChange={(e) => updateField(["visual", "question_bg_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Borde de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_border_color}
                    onChange={(e) => updateField(["visual", "question_border_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Texto de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_text_color}
                    onChange={(e) => updateField(["visual", "question_text_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de opciones</label>
                  <Input
                    type="color"
                    value={config.visual.option_bg_color}
                    onChange={(e) => updateField(["visual", "option_bg_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Borde de opciones</label>
                  <Input
                    type="color"
                    value={config.visual.option_border_color}
                    onChange={(e) => updateField(["visual", "option_border_color"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Fuente de pregunta</label>
                  <Input
                    value={config.visual.question_font_family}
                    onChange={(e) => updateField(["visual", "question_font_family"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Imagen fondo del contenedor URL</label>
                  <Input
                    value={config.visual.container_bg_image_url}
                    onChange={(e) => updateField(["visual", "container_bg_image_url"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Watermark de Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Mostrar watermark</span>
                  <Switch
                    checked={config.watermark.enabled}
                    onCheckedChange={(checked) => updateField(["watermark", "enabled"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Color</label>
                  <Input
                    type="color"
                    value={config.watermark.color}
                    onChange={(e) => updateField(["watermark", "color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Opacidad ({watermarkOpacityLabel})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.watermark.opacity}
                    onChange={(e) => updateField(["watermark", "opacity"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Posicion</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={config.watermark.position}
                    onChange={(e) => updateField(["watermark", "position"], e.target.value)}
                  >
                    <option value="top-left">Arriba izquierda</option>
                    <option value="top-right">Arriba derecha</option>
                    <option value="bottom-left">Abajo izquierda</option>
                    <option value="bottom-right">Abajo derecha</option>
                    <option value="center">Centro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tamano fuente</label>
                  <Input
                    type="number"
                    min={12}
                    max={200}
                    value={config.watermark.font_size}
                    onChange={(e) => updateField(["watermark", "font_size"], Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate("/my-games")}>
                Volver
              </Button>
              <Button variant="outline" disabled={disabled} onClick={handlePreview}>
                {starting ? "Abriendo..." : "Preview con watermark"}
              </Button>
              <Button variant="hero" disabled={disabled} onClick={handleLaunchAuto}>
                {starting ? "Abriendo..." : "Iniciar segun fecha"}
              </Button>
              <Button variant="glow" disabled={disabled} onClick={handleSave}>
                {saving ? "Guardando..." : "Guardar customizacion"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

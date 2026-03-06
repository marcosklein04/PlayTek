import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ContractAssetKey,
  ContractSparkleQuestion,
  ContractTriviaQuestion,
  TriviaCustomization,
  createContractTriviaQuestion,
  deleteContractAsset,
  deleteContractTriviaQuestion,
  fetchContractCustomization,
  fetchContractSparkleQuestions,
  fetchContractTriviaQuestions,
  launchContractByDate,
  saveContractCustomization,
  saveContractSparkleQuestions,
  startContractPreview,
  updateContractTriviaQuestion,
  uploadContractAsset,
  uploadContractSparkleImage,
} from "@/api/contracts";
import { SparkleBrandingSection } from "@/components/contract-customization/SparkleBrandingSection";
import { SparkleIntroSection } from "@/components/contract-customization/SparkleIntroSection";
import { SparklePreviewPanel } from "@/components/contract-customization/SparklePreviewPanel";
import { SparkleQuestionsSection } from "@/components/contract-customization/SparkleQuestionsSection";
import { SparkleRulesSection } from "@/components/contract-customization/SparkleRulesSection";
import { SparkleVisualSection } from "@/components/contract-customization/SparkleVisualSection";
import {
  MAX_SPARKLE_QUESTIONS,
  buildEmptySparkleAnswer,
  buildEmptySparkleQuestion,
  buildSparkleQuestionForms,
} from "@/components/contract-customization/sparkleQuestionForms";
import { TriviaQuestionsSection } from "@/components/contract-customization/TriviaQuestionsSection";
import {
  BulkTriviaQuestionForm,
  MAX_BULK_QUESTIONS,
  MAX_FORM_CHOICES,
  buildBulkQuestionForm,
  buildBulkQuestionForms,
} from "@/components/contract-customization/triviaQuestionForms";

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

  const [triviaQuestionsLoading, setTriviaQuestionsLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [triviaQuestions, setTriviaQuestions] = useState<ContractTriviaQuestion[]>([]);
  const [bulkQuestionCount, setBulkQuestionCount] = useState("1");
  const [bulkQuestionForms, setBulkQuestionForms] = useState<BulkTriviaQuestionForm[]>([buildBulkQuestionForm()]);

  const [sparkleQuestionsLoading, setSparkleQuestionsLoading] = useState(false);
  const [sparkleSaving, setSparkleSaving] = useState(false);
  const [sparkleUploadingImageKey, setSparkleUploadingImageKey] = useState<string | null>(null);
  const [sparkleQuestions, setSparkleQuestions] = useState<ContractSparkleQuestion[]>([]);
  const [sparkleQuestionCount, setSparkleQuestionCount] = useState("1");
  const [sparkleQuestionForms, setSparkleQuestionForms] = useState<ContractSparkleQuestion[]>([buildEmptySparkleQuestion()]);

  const normalizedGameSlug = gameSlug.trim().toLowerCase();
  const isTriviaSparkle = normalizedGameSlug === "trivia-sparkle";
  const supportsTriviaQuestions = normalizedGameSlug === "trivia";
  const supportsSparkleQuestions = isTriviaSparkle;

  const configuredQuestionsCount = supportsSparkleQuestions ? sparkleQuestionForms.length : bulkQuestionForms.length;

  const disabled = useMemo(
    () => !config || saving || starting || uploadingAsset !== null || bulkSaving || sparkleSaving || sparkleUploadingImageKey !== null,
    [config, saving, starting, uploadingAsset, bulkSaving, sparkleSaving, sparkleUploadingImageKey],
  );

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
  }, [contractId, navigate, toast, validId]);

  useEffect(() => {
    if (!validId || !supportsTriviaQuestions) {
      setTriviaQuestions([]);
      setBulkQuestionCount("1");
      setBulkQuestionForms([buildBulkQuestionForm()]);
      return;
    }

    (async () => {
      try {
        setTriviaQuestionsLoading(true);
        const res = await fetchContractTriviaQuestions(contractId);
        const nextQuestions = res.questions || [];
        const initialCount = Math.max(1, nextQuestions.length);
        setTriviaQuestions(nextQuestions);
        setBulkQuestionCount(String(initialCount));
        setBulkQuestionForms(buildBulkQuestionForms(initialCount, nextQuestions));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar las preguntas";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setTriviaQuestionsLoading(false);
      }
    })();
  }, [contractId, supportsTriviaQuestions, toast, validId]);

  useEffect(() => {
    if (!validId || !supportsSparkleQuestions) {
      setSparkleQuestions([]);
      setSparkleQuestionCount("1");
      setSparkleQuestionForms([buildEmptySparkleQuestion()]);
      return;
    }

    (async () => {
      try {
        setSparkleQuestionsLoading(true);
        const res = await fetchContractSparkleQuestions(contractId);
        const nextQuestions = res.questions || [];
        const initialCount = Math.max(1, nextQuestions.length);
        setSparkleQuestions(nextQuestions);
        setSparkleQuestionCount(String(initialCount));
        setSparkleQuestionForms(buildSparkleQuestionForms(initialCount, nextQuestions));
        setConfig((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev);
          next.content = {
            ...(next.content || {}),
            sparkle_questions: nextQuestions,
          };
          return next;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar las preguntas de Sparkle";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setSparkleQuestionsLoading(false);
      }
    })();
  }, [contractId, supportsSparkleQuestions, toast, validId]);

  const updateField = (path: string[], value: string | number | boolean) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>;

      for (let index = 0; index < path.length - 1; index += 1) {
        cursor = cursor[path[index]] as Record<string, unknown>;
      }

      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const syncSparkleQuestionsIntoConfig = (questions: ContractSparkleQuestion[]) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.content = {
        ...(next.content || {}),
        sparkle_questions: questions,
      };
      return next;
    });
  };

  const applyPlayteckPalette = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.branding.primary_color = "#00f5e9";
      next.branding.secondary_color = "#081a2b";
      next.visual.screen_background_color = "#050e1a";
      next.visual.question_bg_color = "#0f2034";
      next.visual.question_border_color = "#1f6f90";
      next.visual.question_text_color = "#e7f6ff";
      next.visual.option_bg_color = "#12324a";
      next.visual.option_border_color = "#1f6f90";
      next.watermark.color = "#00f5e9";
      return next;
    });

    toast({
      title: "Paleta Playteck aplicada",
      description: "Ajustamos colores para Trivia Sparkle. Guarda para confirmar.",
    });
  };

  const updateBulkQuestionText = (questionIndex: number, value: string) => {
    setBulkQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]) return prev;
      next[questionIndex].text = value;
      return next;
    });
  };

  const updateBulkChoiceText = (questionIndex: number, choiceIndex: number, value: string) => {
    setBulkQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]?.choices[choiceIndex]) return prev;
      next[questionIndex].choices[choiceIndex].text = value;
      return next;
    });
  };

  const setBulkCorrectChoice = (questionIndex: number, choiceIndex: number) => {
    setBulkQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question) return prev;
      question.choices = question.choices.map((choice, index) => ({
        ...choice,
        is_correct: index === choiceIndex,
      }));
      return next;
    });
  };

  const addBulkChoiceField = (questionIndex: number) => {
    setBulkQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question || question.choices.length >= MAX_FORM_CHOICES) return prev;
      question.choices.push({ text: "", is_correct: false });
      return next;
    });
  };

  const removeBulkChoiceField = (questionIndex: number, choiceIndex: number) => {
    setBulkQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question || question.choices.length <= 2) return prev;

      const nextChoices = question.choices.filter((_, index) => index !== choiceIndex);
      if (!nextChoices.some((choice) => choice.is_correct)) {
        nextChoices[0].is_correct = true;
      }
      question.choices = nextChoices;
      return next;
    });
  };

  const handleRemoveBulkQuestion = (questionIndex: number) => {
    const nextForms =
      bulkQuestionForms.length <= 1
        ? [buildBulkQuestionForm()]
        : bulkQuestionForms.filter((_, index) => index !== questionIndex);

    setBulkQuestionForms(nextForms);
    setBulkQuestionCount(String(nextForms.length));
  };

  const handleApplyBulkQuestionCount = () => {
    const parsed = Number.parseInt(bulkQuestionCount, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa un número mayor o igual a 1.",
        variant: "destructive",
      });
      return;
    }

    const bounded = Math.min(MAX_BULK_QUESTIONS, parsed);
    if (bounded !== parsed) {
      toast({
        title: "Cantidad ajustada",
        description: `Máximo permitido: ${MAX_BULK_QUESTIONS} preguntas.`,
      });
    }

    setBulkQuestionCount(String(bounded));
    setBulkQuestionForms(buildBulkQuestionForms(bounded, triviaQuestions));
  };

  const handleSaveAllQuestions = async () => {
    if (!validId) return;
    if (bulkQuestionForms.length === 0) {
      toast({
        title: "Sin preguntas",
        description: "Primero define cuántas preguntas vas a cargar.",
        variant: "destructive",
      });
      return;
    }

    const normalizedPayload: Array<{
      questionId: number | null;
      text: string;
      choices: Array<{ text: string; is_correct: boolean }>;
    }> = [];

    for (let index = 0; index < bulkQuestionForms.length; index += 1) {
      const form = bulkQuestionForms[index];
      const text = form.text.trim();
      const choices = form.choices
        .map((choice) => ({ ...choice, text: choice.text.trim() }))
        .filter((choice) => choice.text.length > 0);

      if (!text) {
        toast({
          title: "Pregunta incompleta",
          description: `Completa el texto en la pregunta ${index + 1}.`,
          variant: "destructive",
        });
        return;
      }

      if (choices.length < 2) {
        toast({
          title: "Opciones insuficientes",
          description: `La pregunta ${index + 1} necesita al menos 2 opciones.`,
          variant: "destructive",
        });
        return;
      }

      const correctCount = choices.filter((choice) => choice.is_correct).length;
      if (correctCount !== 1) {
        toast({
          title: "Respuesta correcta inválida",
          description: `La pregunta ${index + 1} debe tener exactamente una respuesta correcta.`,
          variant: "destructive",
        });
        return;
      }

      normalizedPayload.push({
        questionId: form.questionId,
        text,
        choices,
      });
    }

    try {
      setBulkSaving(true);
      const savedQuestions: ContractTriviaQuestion[] = [];

      for (const item of normalizedPayload) {
        if (item.questionId) {
          const res = await updateContractTriviaQuestion(contractId, item.questionId, {
            text: item.text,
            choices: item.choices,
          });
          savedQuestions.push(res.question);
          continue;
        }

        const res = await createContractTriviaQuestion(contractId, {
          text: item.text,
          choices: item.choices,
        });
        savedQuestions.push(res.question);
      }

      const savedIds = new Set(savedQuestions.map((question) => question.id));
      const staleQuestions = triviaQuestions.filter((question) => !savedIds.has(question.id));
      for (const staleQuestion of staleQuestions) {
        await deleteContractTriviaQuestion(contractId, staleQuestion.id);
      }

      setTriviaQuestions(savedQuestions);
      setBulkQuestionForms(savedQuestions.map((question) => buildBulkQuestionForm(question)));
      setBulkQuestionCount(String(savedQuestions.length));

      toast({
        title: "Preguntas guardadas",
        description: `Se guardaron ${savedQuestions.length} preguntas correctamente.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron guardar todas las preguntas";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  };

  const updateSparklePrompt = (questionIndex: number, value: string) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]) return prev;
      next[questionIndex].prompt = value;
      return next;
    });
  };

  const updateSparkleType = (questionIndex: number, value: "text_answers" | "image_answers") => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question) return prev;
      question.type = value;
      if (value === "text_answers") {
        question.answers = question.answers.map((answer) => ({ ...answer, imageUrl: "" }));
      }
      return next;
    });
  };

  const updateSparkleAnswerLabel = (questionIndex: number, answerIndex: number, value: string) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]?.answers[answerIndex]) return prev;
      next[questionIndex].answers[answerIndex].label = value;
      return next;
    });
  };

  const setSparkleCorrectAnswer = (questionIndex: number, answerId: string) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]) return prev;
      next[questionIndex].correctAnswerId = answerId;
      return next;
    });
  };

  const addSparkleAnswer = (questionIndex: number) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question || question.answers.length >= MAX_SPARKLE_ANSWERS) return prev;
      question.answers.push(buildEmptySparkleAnswer());
      return next;
    });
  };

  const removeSparkleAnswer = (questionIndex: number, answerIndex: number) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      const question = next[questionIndex];
      if (!question || question.answers.length <= 2) return prev;
      const removed = question.answers[answerIndex];
      question.answers = question.answers.filter((_, index) => index !== answerIndex);
      if (removed && question.correctAnswerId === removed.id) {
        question.correctAnswerId = question.answers[0].id;
      }
      return next;
    });
  };

  const handleRemoveSparkleQuestion = (questionIndex: number) => {
    const nextQuestions =
      sparkleQuestionForms.length <= 1
        ? [buildEmptySparkleQuestion()]
        : sparkleQuestionForms.filter((_, index) => index !== questionIndex);
    setSparkleQuestionForms(nextQuestions);
    setSparkleQuestionCount(String(nextQuestions.length));
  };

  const handleApplySparkleQuestionCount = () => {
    const parsed = Number.parseInt(sparkleQuestionCount, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa un número mayor o igual a 1.",
        variant: "destructive",
      });
      return;
    }

    const bounded = Math.min(MAX_SPARKLE_QUESTIONS, parsed);
    if (bounded !== parsed) {
      toast({
        title: "Cantidad ajustada",
        description: `Máximo permitido: ${MAX_SPARKLE_QUESTIONS} preguntas.`,
      });
    }

    setSparkleQuestionCount(String(bounded));
    setSparkleQuestionForms(buildSparkleQuestionForms(bounded, sparkleQuestions));
  };

  const handleSparkleQuestionImageUpload = async (questionIndex: number, file?: File | null) => {
    if (!validId || !file) return;
    const question = sparkleQuestionForms[questionIndex];
    if (!question) return;

    try {
      setSparkleUploadingImageKey(`question-${question.id}`);
      const response = await uploadContractSparkleImage(contractId, file);
      setSparkleQuestionForms((prev) => {
        const next = structuredClone(prev);
        if (!next[questionIndex]) return prev;
        next[questionIndex].questionImageUrl = response.image_url;
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSparkleUploadingImageKey(null);
    }
  };

  const handleSparkleAnswerImageUpload = async (questionIndex: number, answerIndex: number, file?: File | null) => {
    if (!validId || !file) return;
    const question = sparkleQuestionForms[questionIndex];
    const answer = question?.answers[answerIndex];
    if (!question || !answer) return;

    try {
      setSparkleUploadingImageKey(`answer-${question.id}-${answer.id}`);
      const response = await uploadContractSparkleImage(contractId, file);
      setSparkleQuestionForms((prev) => {
        const next = structuredClone(prev);
        if (!next[questionIndex]?.answers[answerIndex]) return prev;
        next[questionIndex].answers[answerIndex].imageUrl = response.image_url;
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSparkleUploadingImageKey(null);
    }
  };

  const clearSparkleQuestionImage = (questionIndex: number) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]) return prev;
      next[questionIndex].questionImageUrl = "";
      return next;
    });
  };

  const clearSparkleAnswerImage = (questionIndex: number, answerIndex: number) => {
    setSparkleQuestionForms((prev) => {
      const next = structuredClone(prev);
      if (!next[questionIndex]?.answers[answerIndex]) return prev;
      next[questionIndex].answers[answerIndex].imageUrl = "";
      return next;
    });
  };

  const handleSaveSparkleQuestions = async () => {
    if (!validId) return;

    const normalizedQuestions: ContractSparkleQuestion[] = [];
    for (let index = 0; index < sparkleQuestionForms.length; index += 1) {
      const question = sparkleQuestionForms[index];
      const prompt = question.prompt.trim();
      const answers = question.answers
        .map((answer) => ({ ...answer, label: answer.label.trim(), imageUrl: answer.imageUrl.trim() }))
        .filter((answer) => answer.label.length > 0 || answer.imageUrl.length > 0);

      if (!prompt) {
        toast({
          title: "Pregunta incompleta",
          description: `Completa el enunciado de la pregunta ${index + 1}.`,
          variant: "destructive",
        });
        return;
      }

      if (answers.length < 2) {
        toast({
          title: "Respuestas insuficientes",
          description: `La pregunta ${index + 1} necesita al menos 2 respuestas.`,
          variant: "destructive",
        });
        return;
      }

      if (question.type === "image_answers" && answers.some((answer) => !answer.imageUrl)) {
        toast({
          title: "Faltan imágenes",
          description: `Cada respuesta con imagen de la pregunta ${index + 1} debe tener su imagen cargada.`,
          variant: "destructive",
        });
        return;
      }

      if (answers.some((answer) => !answer.label)) {
        toast({
          title: "Falta texto de apoyo",
          description: `Cada respuesta de la pregunta ${index + 1} necesita un texto corto.`,
          variant: "destructive",
        });
        return;
      }

      if (!answers.some((answer) => answer.id === question.correctAnswerId)) {
        toast({
          title: "Respuesta correcta inválida",
          description: `Marca una respuesta correcta en la pregunta ${index + 1}.`,
          variant: "destructive",
        });
        return;
      }

      normalizedQuestions.push({
        ...question,
        prompt,
        questionImageUrl: question.questionImageUrl.trim(),
        answers,
      });
    }

    try {
      setSparkleSaving(true);
      const response = await saveContractSparkleQuestions(contractId, normalizedQuestions);
      const nextQuestions = response.questions || [];
      const nextCount = Math.max(1, nextQuestions.length);
      setSparkleQuestions(nextQuestions);
      setSparkleQuestionCount(String(nextCount));
      setSparkleQuestionForms(buildSparkleQuestionForms(nextCount, nextQuestions));
      syncSparkleQuestionsIntoConfig(nextQuestions);
      toast({
        title: "Preguntas guardadas",
        description: `Se guardaron ${nextQuestions.length} preguntas de Trivia Sparkle.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron guardar las preguntas de Sparkle";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSparkleSaving(false);
    }
  };

  const handleSave = async () => {
    if (!config || !validId) return;
    try {
      setSaving(true);
      await saveContractCustomization(contractId, config);
      toast({ title: "Guardado", description: "La customizacion quedó lista para el evento." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAsset = async (assetKey: ContractAssetKey, file?: File | null) => {
    if (!validId || !file) return;
    try {
      setUploadingAsset(assetKey);
      const res = await uploadContractAsset(contractId, assetKey, file);
      setConfig(res.config);
      toast({ title: "Asset subido", description: "Se actualizó la customización del contrato." });
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
      toast({ title: "Asset eliminado", description: "Se borró el archivo del contrato." });
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
          description: "Fuera de fecha de evento: se abrió con watermark.",
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
      <main className="ml-64 p-8 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isTriviaSparkle ? "Personalizar Trivia Sparkle" : "Customización del contrato"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Contrato #{validId ? contractId : "-"} {gameSlug ? `· ${gameSlug}` : ""}
            </p>
          </div>
          {(supportsTriviaQuestions || supportsSparkleQuestions) && !loading && (
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preguntas configuradas</p>
              <p className="text-2xl font-semibold text-foreground">{configuredQuestionsCount}</p>
            </div>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Cargando configuración...</p>}

        {!loading && config && (
          <div className="space-y-6">
            {isTriviaSparkle ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                  <SparkleBrandingSection
                    config={config}
                    uploadingAsset={uploadingAsset}
                    onApplyPlayteckPalette={applyPlayteckPalette}
                    onUpdateField={updateField}
                    onUploadAsset={handleUploadAsset}
                    onDeleteAsset={handleDeleteAsset}
                  />
                  <SparkleIntroSection config={config} onUpdateField={updateField} />
                  <SparkleRulesSection config={config} onUpdateField={updateField} />
                  <SparkleQuestionsSection
                    questionCount={sparkleQuestionCount}
                    questions={sparkleQuestionForms}
                    loading={sparkleQuestionsLoading}
                    saving={sparkleSaving}
                    uploadingImageKey={sparkleUploadingImageKey}
                    onQuestionCountChange={setSparkleQuestionCount}
                    onApplyQuestionCount={handleApplySparkleQuestionCount}
                    onPromptChange={updateSparklePrompt}
                    onTypeChange={updateSparkleType}
                    onQuestionImageUpload={handleSparkleQuestionImageUpload}
                    onQuestionImageClear={clearSparkleQuestionImage}
                    onAnswerLabelChange={updateSparkleAnswerLabel}
                    onAnswerImageUpload={handleSparkleAnswerImageUpload}
                    onAnswerImageClear={clearSparkleAnswerImage}
                    onSetCorrectAnswer={setSparkleCorrectAnswer}
                    onAddAnswer={addSparkleAnswer}
                    onRemoveAnswer={removeSparkleAnswer}
                    onRemoveQuestion={handleRemoveSparkleQuestion}
                    onSaveQuestions={handleSaveSparkleQuestions}
                  />
                  <SparkleVisualSection config={config} onUpdateField={updateField} />
                </div>

                <SparklePreviewPanel config={config} questions={sparkleQuestionForms} />
              </div>
            ) : (
              supportsTriviaQuestions && (
                <TriviaQuestionsSection
                  title="Preguntas de Trivia"
                  description="Definí la cantidad de preguntas del contrato y completá todas las respuestas desde una sola vista."
                  questionCount={bulkQuestionCount}
                  forms={bulkQuestionForms}
                  loading={triviaQuestionsLoading}
                  saving={bulkSaving}
                  onQuestionCountChange={setBulkQuestionCount}
                  onApplyQuestionCount={handleApplyBulkQuestionCount}
                  onQuestionTextChange={updateBulkQuestionText}
                  onChoiceTextChange={updateBulkChoiceText}
                  onSetCorrectChoice={setBulkCorrectChoice}
                  onAddChoice={addBulkChoiceField}
                  onRemoveChoice={removeBulkChoiceField}
                  onRemoveQuestion={handleRemoveBulkQuestion}
                  onSaveAll={handleSaveAllQuestions}
                />
              )
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate("/my-games")}>
                Volver
              </Button>
              <Button variant="outline" disabled={disabled} onClick={handlePreview}>
                {starting ? "Abriendo..." : "Vista previa"}
              </Button>
              <Button variant="hero" disabled={disabled} onClick={handleLaunchAuto}>
                {starting ? "Abriendo..." : "Iniciar según fecha"}
              </Button>
              {isTriviaSparkle && (
                <Button variant="glow" disabled={disabled} onClick={handleSave}>
                  {saving ? "Guardando..." : "Guardar customización"}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

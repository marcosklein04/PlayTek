import { ContractSparkleQuestion } from "@/api/contracts";

export const MAX_SPARKLE_QUESTIONS = 50;
export const MAX_SPARKLE_ANSWERS = 6;

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildEmptySparkleAnswer() {
  return {
    id: createLocalId("answer"),
    label: "",
    imageUrl: "",
  };
}

export function buildEmptySparkleQuestion(): ContractSparkleQuestion {
  const answers = [buildEmptySparkleAnswer(), buildEmptySparkleAnswer(), buildEmptySparkleAnswer(), buildEmptySparkleAnswer()];
  return {
    id: createLocalId("question"),
    type: "text_answers",
    prompt: "",
    questionImageUrl: "",
    correctAnswerId: answers[0].id,
    answers,
  };
}

export function normalizeSparkleQuestion(question: ContractSparkleQuestion): ContractSparkleQuestion {
  const answers = question.answers.map((answer) => ({
    id: answer.id || createLocalId("answer"),
    label: answer.label || "",
    imageUrl: answer.imageUrl || "",
  }));

  while (answers.length < 4) {
    answers.push(buildEmptySparkleAnswer());
  }

  const correctAnswerId = answers.some((answer) => answer.id === question.correctAnswerId)
    ? question.correctAnswerId
    : answers[0].id;

  return {
    id: question.id || createLocalId("question"),
    type: question.type === "image_answers" ? "image_answers" : "text_answers",
    prompt: question.prompt || "",
    questionImageUrl: question.questionImageUrl || "",
    correctAnswerId,
    answers,
  };
}

export function buildSparkleQuestionForms(count: number, sourceQuestions: ContractSparkleQuestion[]): ContractSparkleQuestion[] {
  const safeCount = Math.max(1, Math.min(MAX_SPARKLE_QUESTIONS, count));
  return Array.from({ length: safeCount }, (_, index) => {
    const sourceQuestion = sourceQuestions[index];
    return sourceQuestion ? normalizeSparkleQuestion(sourceQuestion) : buildEmptySparkleQuestion();
  });
}

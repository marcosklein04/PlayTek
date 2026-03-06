import { ContractTriviaQuestion } from "@/api/contracts";

export type TriviaQuestionForm = {
  text: string;
  choices: Array<{ text: string; is_correct: boolean }>;
};

export type BulkTriviaQuestionForm = TriviaQuestionForm & {
  questionId: number | null;
};

export const MAX_FORM_CHOICES = 6;
export const MAX_BULK_QUESTIONS = 50;

export function buildEmptyQuestionForm(): TriviaQuestionForm {
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

export function questionToForm(question: ContractTriviaQuestion): TriviaQuestionForm {
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

export function buildBulkQuestionForm(question?: ContractTriviaQuestion): BulkTriviaQuestionForm {
  if (!question) {
    return { questionId: null, ...buildEmptyQuestionForm() };
  }

  return {
    questionId: question.id,
    ...questionToForm(question),
  };
}

export function buildBulkQuestionForms(count: number, sourceQuestions: ContractTriviaQuestion[]): BulkTriviaQuestionForm[] {
  const safeCount = Math.max(1, Math.min(MAX_BULK_QUESTIONS, count));
  return Array.from({ length: safeCount }, (_, index) => buildBulkQuestionForm(sourceQuestions[index]));
}

import { apiFetch } from "@/api/client";

type CreateContractPayload = {
  slug: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_evento?: string;
};

export type ContractGame = {
  id: number;
  juego: {
    slug: string;
    nombre: string;
  };
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  creado_en: string;
  customization_updated_at?: string | null;
  trivia_question_set_id?: number | null;
  has_trivia_questions?: boolean;
};

export type CreateContractResponse = {
  ok: boolean;
  contrato: {
    id: number;
    game_slug: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    costo_total: number;
  };
  saldo_restante: number;
};

export async function createGameContract(payload: CreateContractPayload) {
  return apiFetch<CreateContractResponse>("/api/contracts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type TriviaCustomization = {
  branding: {
    primary_color: string;
    secondary_color: string;
    logo_url: string;
    background_url: string;
    welcome_image_url: string;
    watermark_text: string;
  };
  texts: {
    welcome_title: string;
    welcome_subtitle: string;
    cta_button: string;
  };
  rules: {
    show_timer: boolean;
    timer_seconds: number;
    points_per_correct: number;
    max_questions: number;
    use_lives: boolean;
    lives: number;
  };
  visual: {
    question_bg_color: string;
    question_border_color: string;
    question_text_color: string;
    question_font_family: string;
    option_border_color: string;
    option_bg_color: string;
    screen_background_color: string;
    container_bg_image_url: string;
  };
  watermark: {
    enabled: boolean;
    color: string;
    opacity: number;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    font_size: number;
  };
};

export type ContractCustomizationResponse = {
  ok: boolean;
  contract_id: number;
  game_slug: string;
  config: TriviaCustomization;
};

export type ContractAssetKey =
  | "logo"
  | "welcome_image"
  | "background"
  | "container_background";

export type ContractTriviaChoice = {
  id: number;
  text: string;
  is_correct: boolean;
};

export type ContractTriviaQuestion = {
  id: number;
  text: string;
  is_active: boolean;
  choices: ContractTriviaChoice[];
};

export type ContractTriviaQuestionsResponse = {
  ok: boolean;
  contract_id: number;
  question_set_id: number | null;
  questions: ContractTriviaQuestion[];
};

export async function fetchMyContracts() {
  return apiFetch<{ resultados: ContractGame[] }>("/api/contracts/mine", {
    method: "GET",
  });
}

export async function fetchContractCustomization(contractId: number) {
  return apiFetch<ContractCustomizationResponse>(`/api/contracts/${contractId}/customization`, {
    method: "GET",
  });
}

export async function saveContractCustomization(contractId: number, config: TriviaCustomization) {
  return apiFetch<ContractCustomizationResponse>(`/api/contracts/${contractId}/customization/save`, {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}

export async function uploadContractAsset(contractId: number, assetKey: ContractAssetKey, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ContractCustomizationResponse>(`/api/contracts/${contractId}/assets/${assetKey}`, {
    method: "POST",
    body,
  });
}

export async function deleteContractAsset(contractId: number, assetKey: ContractAssetKey) {
  return apiFetch<ContractCustomizationResponse>(`/api/contracts/${contractId}/assets/${assetKey}`, {
    method: "DELETE",
  });
}

export type UpsertTriviaQuestionPayload = {
  text: string;
  choices: Array<{
    text: string;
    is_correct: boolean;
  }>;
};

export async function fetchContractTriviaQuestions(contractId: number) {
  return apiFetch<ContractTriviaQuestionsResponse>(`/api/contracts/${contractId}/trivia/questions`, {
    method: "GET",
  });
}

export async function createContractTriviaQuestion(contractId: number, payload: UpsertTriviaQuestionPayload) {
  return apiFetch<{ ok: boolean; contract_id: number; question_set_id: number; question: ContractTriviaQuestion }>(
    `/api/contracts/${contractId}/trivia/questions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateContractTriviaQuestion(
  contractId: number,
  questionId: number,
  payload: UpsertTriviaQuestionPayload,
) {
  return apiFetch<{ ok: boolean; contract_id: number; question_set_id: number; question: ContractTriviaQuestion }>(
    `/api/contracts/${contractId}/trivia/questions/${questionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteContractTriviaQuestion(contractId: number, questionId: number) {
  return apiFetch<{ ok: boolean; question_id: number }>(`/api/contracts/${contractId}/trivia/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function importContractTriviaCsv(contractId: number, file: File, replace = false) {
  const body = new FormData();
  body.append("file", file);
  body.append("replace", String(replace));
  return apiFetch<{
    ok: boolean;
    contract_id: number;
    question_set_id: number;
    imported: number;
    errors: Array<{ line: number; error: string }>;
    questions: ContractTriviaQuestion[];
  }>(`/api/contracts/${contractId}/trivia/questions/import-csv`, {
    method: "POST",
    body,
  });
}

export type ContractStartResponse = {
  ok: boolean;
  preview_mode: boolean;
  launch_mode: "preview" | "event";
  contract_id: number;
  juego: {
    slug: string;
    nombre: string;
    runner_url: string;
  };
  id_sesion: string;
};

export async function startContractEvent(contractId: number) {
  return apiFetch<ContractStartResponse>(`/api/contracts/${contractId}/start`, {
    method: "POST",
  });
}

export async function startContractPreview(contractId: number) {
  return apiFetch<ContractStartResponse>(`/api/contracts/${contractId}/preview`, {
    method: "POST",
  });
}

export async function launchContractByDate(contractId: number) {
  return apiFetch<ContractStartResponse>(`/api/contracts/${contractId}/launch`, {
    method: "POST",
  });
}

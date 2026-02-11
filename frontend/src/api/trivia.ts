// src/api/trivia.ts
import { http } from "./http";

export type TriviaRunnerParams = {
  session_id: string;
  user_id: number;
  session_token: string;
};

export function triviaState(p: TriviaRunnerParams) {
  const qs = `session_id=${p.session_id}&user_id=${p.user_id}&session_token=${encodeURIComponent(p.session_token)}`;
  return http<{ trivia: any }>(`/runner/trivia/state?${qs}`);
}

export function triviaNext(p: TriviaRunnerParams) {
  const qs = `session_id=${p.session_id}&user_id=${p.user_id}&session_token=${encodeURIComponent(p.session_token)}`;
  return http<{ question?: any; finished?: boolean; result?: any; error?: any }>(
    `/runner/trivia/next?${qs}`
  );
}

export function triviaAnswer(p: TriviaRunnerParams & { choice_id: number }) {
  return http<{
    ok: boolean;
    correct: boolean;
    score: number;
    answered: number;
    correct_count: number;
  }>(`/runner/trivia/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}

export function triviaFinish(p: TriviaRunnerParams) {
  return http<{ ok: boolean; result: any }>(`/runner/trivia/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
}

export function triviaRanking(p: TriviaRunnerParams) {
  const qs = `session_id=${p.session_id}&user_id=${p.user_id}&session_token=${encodeURIComponent(p.session_token)}`;
  return http<{ ranking: any[] }>(`/runner/trivia/ranking?${qs}`);
}
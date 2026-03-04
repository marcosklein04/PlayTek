const ENABLED_GAME_SLUGS = new Set(["trivia", "trivia-sparkle"]);

export function isGameAvailable(gameId: string) {
  return ENABLED_GAME_SLUGS.has(gameId);
}

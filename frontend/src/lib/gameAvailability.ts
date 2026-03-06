const ENABLED_GAME_SLUGS = new Set(["trivia", "trivia-sparkle"]);

export function isGameAvailable(gameId: string, role: "admin" | "client" | undefined = "client") {
  if (role === "admin") {
    return true;
  }
  return ENABLED_GAME_SLUGS.has(gameId);
}

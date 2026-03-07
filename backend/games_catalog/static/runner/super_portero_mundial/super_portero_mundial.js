(function () {
  const SESSION = window.SESSION || {};

  const state = {
    config: null,
    previewMode: false,
    contractId: null,
    score: 0,
    saves: 0,
    missed: 0,
    timeLeft: 60,
    balls: [],
    gameState: "start",
    sessionFinished: false,
    isDragging: false,
    goalkeeperX: window.innerWidth / 2,
    nextBallId: 1,
    animationFrame: null,
    spawnInterval: null,
    timerInterval: null,
    isScoreAnimating: false,
  };

  const el = {};

  function qs(params) {
    return new URLSearchParams(params).toString();
  }

  async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function getSessionState() {
    const url = `/runner/sesiones/${SESSION.sessionId}?` + qs({
      user_id: SESSION.userId,
      session_token: SESSION.sessionToken,
    });
    return fetchJSON(url);
  }

  async function finishSession(payload) {
    if (state.sessionFinished) {
      return null;
    }
    state.sessionFinished = true;

    const url = `/runner/sesiones/${SESSION.sessionId}/finalizar`;
    const body = {
      user_id: Number(SESSION.userId),
      session_token: SESSION.sessionToken,
      ...payload,
    };

    const { response, data } = await fetchJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      state.sessionFinished = false;
    }
    return data;
  }

  function defaultConfig() {
    return {
      branding: {
        primary_color: "#f7c948",
        secondary_color: "#0f3d26",
        logo_url: "",
        background_url: "",
        welcome_image_url: "",
        watermark_text: "MODO PRUEBA",
      },
      texts: {
        welcome_title: "SÚPER PORTERO",
        welcome_subtitle: "Mové al arquero de lado a lado y atajá todos los remates.",
        cta_button: "Tocar para jugar",
        completion_title: "FIN DEL JUEGO",
        completion_subtitle: "Tus reflejos definieron el resultado.",
        instructions_text: "Arrastrá al portero a izquierda y derecha para parar los balones.",
        play_again_button: "Jugar de nuevo",
      },
      rules: {
        show_timer: true,
        timer_seconds: 60,
        show_score: true,
        show_saves: true,
        goalkeeper_width: 120,
        points_per_save: 10,
        ball_speed_min: 4,
        ball_speed_max: 8,
        spawn_interval_ms: 800,
      },
      visual: {
        screen_background_color: "#102a1a",
        field_green_color: "#2b8a3e",
        field_dark_color: "#0b3b23",
        line_color: "#f4f6f2",
        score_panel_bg: "#111111",
        sponsor_bg_color: "rgba(255, 255, 255, 0.10)",
        sponsor_text_color: "#d6e7db",
        goalkeeper_jersey_color: "#2563eb",
        goalkeeper_detail_color: "#3b82f6",
        goalkeeper_glove_color: "#22c55e",
        accent_color: "#f7c948",
      },
      watermark: {
        enabled: true,
        color: "#f7c948",
        opacity: 0.18,
        font_size: 96,
      },
      content: {
        sponsor_top_left: "PATROCINADOR",
        sponsor_top_right: "PATROCINADOR",
        sponsor_bottom: "TU MARCA AQUÍ",
      },
    };
  }

  function deepMerge(base, patch) {
    const output = structuredClone(base);
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object") {
        output[key] = deepMerge(output[key], value);
        return;
      }
      output[key] = value;
    });
    return output;
  }

  function safeText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  function highScoreKey() {
    return `super-portero-mundial:${state.contractId || 'preview'}:highscore`;
  }

  function getHighScore() {
    const raw = window.localStorage.getItem(highScoreKey());
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setHighScore(value) {
    window.localStorage.setItem(highScoreKey(), String(value));
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function setStatus(message) {
    el.statusLine.textContent = message || "";
  }

  function showScreen(name) {
    el.startScreen.classList.toggle("hidden", name !== "start");
    el.gameScreen.classList.toggle("hidden", name !== "game");
    el.gameOverScreen.classList.toggle("hidden", name !== "gameover");
    state.gameState = name;
  }

  function updateScoreUi() {
    el.scoreValue.textContent = String(state.score);
    el.savesValue.textContent = String(state.saves);
    el.timerValue.textContent = formatTime(state.timeLeft);
    el.scoreBox.classList.toggle("hidden", !state.config.rules.show_score);
    el.savesBox.classList.toggle("hidden", !state.config.rules.show_saves);
  }

  function clampGoalkeeperX(clientX) {
    const halfWidth = safeNumber(state.config.rules.goalkeeper_width, 120) / 2;
    const padding = Math.max(halfWidth, 60);
    return Math.max(padding, Math.min(window.innerWidth - padding, clientX));
  }

  function renderGoalkeeper() {
    const jersey = safeText(state.config.visual.goalkeeper_jersey_color, "#2563eb");
    const detail = safeText(state.config.visual.goalkeeper_detail_color, "#3b82f6");
    const glove = safeText(state.config.visual.goalkeeper_glove_color, "#22c55e");
    const width = safeNumber(state.config.rules.goalkeeper_width, 120);

    el.goalkeeper.style.left = `${state.goalkeeperX}px`;
    el.goalkeeper.style.width = `${width}px`;
    el.goalkeeper.innerHTML = `
      <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="60" cy="100" rx="30" ry="35" fill="${jersey}" />
        <ellipse cx="60" cy="95" rx="25" ry="28" fill="${detail}" />
        <rect x="50" y="66" width="20" height="54" fill="${jersey}" />
        <ellipse cx="18" cy="84" rx="18" ry="10" fill="${detail}" />
        <circle cx="6" cy="84" r="10" fill="#F4C7A0" />
        <circle cx="6" cy="84" r="8" fill="${glove}" />
        <ellipse cx="102" cy="84" rx="18" ry="10" fill="${detail}" />
        <circle cx="114" cy="84" r="10" fill="#F4C7A0" />
        <circle cx="114" cy="84" r="8" fill="${glove}" />
        <circle cx="60" cy="46" r="25" fill="#F4C7A0" />
        <ellipse cx="60" cy="30" rx="22" ry="12" fill="#4A3728" />
        <circle cx="52" cy="42" r="3" fill="#1F2937" />
        <circle cx="68" cy="42" r="3" fill="#1F2937" />
        <ellipse cx="60" cy="53" rx="6" ry="3" fill="#E5A080" />
        <rect x="48" y="36" width="8" height="2" rx="1" fill="#4A3728" transform="rotate(-10 48 36)" />
        <rect x="64" y="36" width="8" height="2" rx="1" fill="#4A3728" transform="rotate(10 64 36)" />
        <rect x="40" y="120" width="40" height="18" rx="5" fill="#1F2937" />
        <rect x="42" y="136" width="14" height="12" rx="3" fill="#F4C7A0" />
        <rect x="64" y="136" width="14" height="12" rx="3" fill="#F4C7A0" />
        <text x="60" y="104" text-anchor="middle" fill="white" font-size="16" font-weight="bold">1</text>
      </svg>`;
  }

  function createBall(x, speed) {
    const node = document.createElement("div");
    node.className = "ball";
    el.ballsLayer.appendChild(node);
    return {
      id: state.nextBallId++,
      x,
      y: -60,
      speed,
      rotation: 0,
      node,
    };
  }

  function spawnBall() {
    const padding = 60;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const speedMin = safeNumber(state.config.rules.ball_speed_min, 4);
    const speedMax = safeNumber(state.config.rules.ball_speed_max, 8);
    const speed = speedMin + Math.random() * Math.max(0.5, speedMax - speedMin);
    state.balls.push(createBall(x, speed));
  }

  function clearBalls() {
    state.balls.forEach((ball) => ball.node.remove());
    state.balls = [];
  }

  function removeBall(ball) {
    ball.node.remove();
    state.balls = state.balls.filter((item) => item.id !== ball.id);
  }

  function handleBallReachedGoal(ball) {
    const keeperWidth = safeNumber(state.config.rules.goalkeeper_width, 120);
    const distance = Math.abs(ball.x - state.goalkeeperX);
    const saved = distance < keeperWidth / 2 + 25;

    removeBall(ball);

    if (saved) {
      state.score += safeNumber(state.config.rules.points_per_save, 10);
      state.saves += 1;
      setStatus("¡Atajada!");
    } else {
      state.missed += 1;
      setStatus("Gol recibido");
    }

    updateScoreUi();
  }

  function animate() {
    if (state.gameState !== "game") {
      return;
    }

    const bottomLimit = window.innerHeight - 140;
    state.balls.slice().forEach((ball) => {
      ball.y += ball.speed;
      ball.rotation += ball.speed * 2;
      ball.node.style.left = `${ball.x}px`;
      ball.node.style.top = `${ball.y}px`;
      ball.node.style.transform = `translate(-50%, -50%) rotate(${ball.rotation}deg)`;

      if (ball.y > bottomLimit) {
        handleBallReachedGoal(ball);
      }
    });

    state.animationFrame = window.requestAnimationFrame(animate);
  }

  function startSpawning() {
    const interval = Math.max(300, safeNumber(state.config.rules.spawn_interval_ms, 800));
    window.clearInterval(state.spawnInterval);
    spawnBall();
    state.spawnInterval = window.setInterval(() => {
      const elapsed = safeNumber(state.config.rules.timer_seconds, 60) - state.timeLeft;
      const spawnChance = Math.min(0.8, 0.3 + elapsed * 0.01);
      if (Math.random() < spawnChance) {
        spawnBall();
      }
    }, interval);
  }

  async function endGame(reason) {
    window.clearInterval(state.timerInterval);
    window.clearInterval(state.spawnInterval);
    window.cancelAnimationFrame(state.animationFrame);

    const highScore = getHighScore();
    const isNewHighScore = state.score > highScore;
    if (isNewHighScore) {
      setHighScore(state.score);
    }

    await finishSession({
      result: {
        outcome: reason,
        score: state.score,
        saves: state.saves,
        missed: state.missed,
        duration_seconds: safeNumber(state.config.rules.timer_seconds, 60),
      },
      estado_cliente: {
        super_portero_mundial: {
          outcome: reason,
          score: state.score,
          saves: state.saves,
          missed: state.missed,
        },
      },
    });

    el.finalScore.textContent = String(state.score);
    el.finalSaves.textContent = String(state.saves);
    el.finalMissed.textContent = String(state.missed);
    el.newRecordBadge.classList.toggle("hidden", !isNewHighScore);
    el.completionTitle.textContent = safeText(state.config.texts.completion_title, "FIN DEL JUEGO");
    el.completionSubtitle.textContent = safeText(state.config.texts.completion_subtitle, "Tus reflejos definieron el resultado.");
    el.btnRestart.textContent = safeText(state.config.texts.play_again_button, "Jugar de nuevo");
    showScreen("gameover");
  }

  function startGame() {
    state.score = 0;
    state.saves = 0;
    state.missed = 0;
    state.timeLeft = safeNumber(state.config.rules.timer_seconds, 60);
    state.sessionFinished = false;
    state.goalkeeperX = window.innerWidth / 2;
    clearBalls();
    renderGoalkeeper();
    updateScoreUi();
    setStatus("Atajá todo lo que puedas");
    showScreen("game");

    startSpawning();
    state.animationFrame = window.requestAnimationFrame(animate);
    state.timerInterval = window.setInterval(() => {
      state.timeLeft -= 1;
      updateScoreUi();
      if (state.timeLeft <= 0) {
        void endGame("timeout");
      }
    }, 1000);
  }

  async function exitToPlayteck(outcome) {
    if (!state.sessionFinished) {
      window.clearInterval(state.timerInterval);
      window.clearInterval(state.spawnInterval);
      window.cancelAnimationFrame(state.animationFrame);
      await finishSession({
        result: {
          outcome,
          score: state.score,
          saves: state.saves,
          missed: state.missed,
        },
        estado_cliente: {
          super_portero_mundial: {
            outcome,
            score: state.score,
            saves: state.saves,
            missed: state.missed,
          },
        },
      });
    }

    window.location.href = SESSION.returnTo || "/my-games";
  }

  function bindPointerControls() {
    const moveKeeper = (clientX) => {
      if (state.gameState !== "game") return;
      state.goalkeeperX = clampGoalkeeperX(clientX);
      renderGoalkeeper();
    };

    el.gameScreen.addEventListener("pointerdown", (event) => {
      state.isDragging = true;
      moveKeeper(event.clientX);
    });
    el.gameScreen.addEventListener("pointermove", (event) => {
      if (!state.isDragging) return;
      moveKeeper(event.clientX);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      el.gameScreen.addEventListener(type, () => {
        state.isDragging = false;
      });
    });

    window.addEventListener("resize", () => {
      state.goalkeeperX = clampGoalkeeperX(state.goalkeeperX);
      renderGoalkeeper();
    });
  }

  function applyCustomization() {
    const branding = state.config.branding;
    const texts = state.config.texts;
    const visual = state.config.visual;
    const rules = state.config.rules;
    const content = state.config.content || {};
    const watermark = state.config.watermark || {};

    document.documentElement.style.setProperty("--keeper-primary", safeText(branding.primary_color, "#f7c948"));
    document.documentElement.style.setProperty("--keeper-secondary", safeText(branding.secondary_color, "#0f3d26"));
    document.documentElement.style.setProperty("--keeper-field-green", safeText(visual.field_green_color, "#2b8a3e"));
    document.documentElement.style.setProperty("--keeper-field-dark", safeText(visual.field_dark_color, "#0b3b23"));
    document.documentElement.style.setProperty("--keeper-line", safeText(visual.line_color, "#f4f6f2"));
    document.documentElement.style.setProperty("--keeper-score-bg", safeText(visual.score_panel_bg, "rgba(0,0,0,0.55)"));
    document.documentElement.style.setProperty("--keeper-text", safeText(visual.question_text_color, "#ffffff"));
    document.documentElement.style.setProperty("--keeper-muted", safeText(visual.sponsor_text_color, "rgba(255,255,255,0.78)"));
    document.documentElement.style.setProperty("--keeper-jersey", safeText(visual.goalkeeper_jersey_color, "#2563eb"));
    document.documentElement.style.setProperty("--keeper-jersey-detail", safeText(visual.goalkeeper_detail_color, "#3b82f6"));
    document.documentElement.style.setProperty("--keeper-glove", safeText(visual.goalkeeper_glove_color, "#22c55e"));
    document.documentElement.style.setProperty("--keeper-sponsor-bg", safeText(visual.sponsor_bg_color, "rgba(255,255,255,0.10)"));
    document.documentElement.style.setProperty("--keeper-sponsor-text", safeText(visual.sponsor_text_color, "#d6e7db"));

    document.body.style.backgroundImage = branding.background_url
      ? `linear-gradient(180deg, rgba(11, 59, 35, 0.28), rgba(11, 59, 35, 0.52)), url(${branding.background_url})`
      : `linear-gradient(180deg, ${safeText(visual.screen_background_color, '#102a1a')}, ${safeText(visual.screen_background_color, '#102a1a')})`;

    el.logo.classList.toggle("hidden", !branding.logo_url);
    if (branding.logo_url) {
      el.logo.src = branding.logo_url;
    }

    el.heroImage.classList.toggle("hidden", !branding.welcome_image_url);
    if (branding.welcome_image_url) {
      el.heroImage.src = branding.welcome_image_url;
    }

    el.title.textContent = safeText(texts.welcome_title, "SÚPER PORTERO");
    el.subtitle.textContent = safeText(texts.welcome_subtitle, "Mové al arquero de lado a lado y atajá todos los remates.");
    el.instructions.textContent = safeText(texts.instructions_text, "Arrastrá al portero a izquierda y derecha para parar los balones.");
    el.btnStart.textContent = safeText(texts.cta_button, "Tocar para jugar");
    el.metaDuration.textContent = `${safeNumber(rules.timer_seconds, 60)}s`;
    el.metaPoints.textContent = String(safeNumber(rules.points_per_save, 10));
    el.metaHighScore.textContent = String(getHighScore());
    el.sponsorLeft.textContent = safeText(content.sponsor_top_left, "PATROCINADOR");
    el.sponsorRight.textContent = safeText(content.sponsor_top_right, "PATROCINADOR");
    el.sponsorBottom.textContent = safeText(content.sponsor_bottom, "TU MARCA AQUÍ");

    el.watermark.classList.toggle("hidden", !(state.previewMode && watermark.enabled));
    if (state.previewMode && watermark.enabled) {
      el.watermark.textContent = safeText(branding.watermark_text, "MODO PRUEBA");
      el.watermark.style.color = safeText(watermark.color, branding.primary_color || "#f7c948");
      el.watermark.style.opacity = String(safeNumber(watermark.opacity, 0.18));
      el.watermark.style.fontSize = `${safeNumber(watermark.font_size, 96)}px`;
    }

    updateScoreUi();
    renderGoalkeeper();
  }

  function cacheDom() {
    el.watermark = document.getElementById("watermark");
    el.startScreen = document.getElementById("startScreen");
    el.gameScreen = document.getElementById("gameScreen");
    el.gameOverScreen = document.getElementById("gameOverScreen");
    el.logo = document.getElementById("logo");
    el.heroImage = document.getElementById("heroImage");
    el.title = document.getElementById("title");
    el.subtitle = document.getElementById("subtitle");
    el.instructions = document.getElementById("instructions");
    el.metaDuration = document.getElementById("metaDuration");
    el.metaPoints = document.getElementById("metaPoints");
    el.metaHighScore = document.getElementById("metaHighScore");
    el.btnStart = document.getElementById("btnStart");
    el.btnExitStart = document.getElementById("btnExitStart");
    el.scoreBox = document.getElementById("scoreBox");
    el.savesBox = document.getElementById("savesBox");
    el.scoreValue = document.getElementById("scoreValue");
    el.timerValue = document.getElementById("timerValue");
    el.savesValue = document.getElementById("savesValue");
    el.sponsorLeft = document.getElementById("sponsorLeft");
    el.sponsorRight = document.getElementById("sponsorRight");
    el.sponsorBottom = document.getElementById("sponsorBottom");
    el.statusLine = document.getElementById("statusLine");
    el.ballsLayer = document.getElementById("ballsLayer");
    el.goalkeeper = document.getElementById("goalkeeper");
    el.newRecordBadge = document.getElementById("newRecordBadge");
    el.completionTitle = document.getElementById("completionTitle");
    el.completionSubtitle = document.getElementById("completionSubtitle");
    el.finalScore = document.getElementById("finalScore");
    el.finalSaves = document.getElementById("finalSaves");
    el.finalMissed = document.getElementById("finalMissed");
    el.btnRestart = document.getElementById("btnRestart");
    el.btnExitCompletion = document.getElementById("btnExitCompletion");
  }

  function bindUi() {
    el.btnStart.addEventListener("click", startGame);
    el.btnRestart.addEventListener("click", startGame);
    el.btnExitStart.addEventListener("click", () => {
      void exitToPlayteck("cancelled_before_start");
    });
    el.btnExitCompletion.addEventListener("click", () => {
      void exitToPlayteck("completed_exit");
    });
    bindPointerControls();
  }

  async function init() {
    cacheDom();

    if (!SESSION.sessionId || !SESSION.userId || !SESSION.sessionToken) {
      el.startScreen.innerHTML = '<div class="hero-card"><p>Sesión inválida. Volvé a iniciar el juego desde Playteck.</p></div>';
      return;
    }

    const { response, data } = await getSessionState();
    if (!response.ok) {
      el.startScreen.innerHTML = '<div class="hero-card"><p>No se pudo validar la sesión del juego.</p></div>';
      return;
    }

    const clientState = data?.sesion?.estado_cliente || {};
    state.previewMode = !!clientState.preview_mode;
    state.contractId = clientState.contract_id || null;
    state.config = deepMerge(defaultConfig(), clientState.customization || {});
    state.timeLeft = safeNumber(state.config.rules.timer_seconds, 60);
    state.goalkeeperX = window.innerWidth / 2;

    applyCustomization();
    bindUi();
    showScreen("start");
  }

  document.addEventListener("DOMContentLoaded", () => {
    void init();
  });
})();

const BASE_CUSTOMIZATION = {
  branding: {
    primary_color: "#0EA5E9",
    secondary_color: "#111827",
    logo_url: "",
    background_url: "",
    welcome_image_url: "",
    watermark_text: "MODO PRUEBA",
  },
  texts: {
    welcome_title: "Trivia Runner",
    welcome_subtitle: "",
    cta_button: "Siguiente",
  },
  rules: {
    show_timer: true,
    timer_seconds: 20,
    points_per_correct: 100,
    max_questions: 10,
    use_lives: true,
    lives: 3,
  },
  visual: {
    question_bg_color: "#ffffff",
    question_border_color: "#dbeafe",
    question_text_color: "#0f172a",
    question_font_family: "system-ui, Arial, sans-serif",
    option_border_color: "#dbeafe",
    option_bg_color: "#eff6ff",
    screen_background_color: "#ffffff",
    container_bg_image_url: "",
  },
  watermark: {
    enabled: true,
    color: "#ff0000",
    opacity: 0.28,
    position: "center",
    font_size: 96,
  },
};

let runtimeRules = { ...BASE_CUSTOMIZATION.rules };
let runtimeVisual = { ...BASE_CUSTOMIZATION.visual };
let timerIntervalId = null;
let timerRemaining = 0;

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, patch) {
  const merged = { ...base };
  Object.keys(patch || {}).forEach((key) => {
    const patchValue = patch[key];
    const baseValue = merged[key];
    if (isObject(baseValue) && isObject(patchValue)) {
      merged[key] = deepMerge(baseValue, patchValue);
    } else {
      merged[key] = patchValue;
    }
  });
  return merged;
}

function normalizeCustomization(raw) {
  if (!isObject(raw)) {
    return deepMerge(BASE_CUSTOMIZATION, {});
  }
  return deepMerge(BASE_CUSTOMIZATION, raw);
}

function qs(params) {
  return new URLSearchParams(params).toString();
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function applyWatermarkPosition(watermarkEl, position) {
  watermarkEl.style.top = "";
  watermarkEl.style.right = "";
  watermarkEl.style.bottom = "";
  watermarkEl.style.left = "";
  watermarkEl.style.transform = "";

  switch (position) {
    case "top-left":
      watermarkEl.style.top = "16px";
      watermarkEl.style.left = "16px";
      break;
    case "top-right":
      watermarkEl.style.top = "16px";
      watermarkEl.style.right = "16px";
      break;
    case "bottom-left":
      watermarkEl.style.bottom = "16px";
      watermarkEl.style.left = "16px";
      break;
    case "bottom-right":
      watermarkEl.style.bottom = "16px";
      watermarkEl.style.right = "16px";
      break;
    case "center":
    default:
      watermarkEl.style.top = "50%";
      watermarkEl.style.left = "50%";
      watermarkEl.style.transform = "translate(-50%, -50%)";
      break;
  }
}

function applyChoiceStyles(btn) {
  btn.style.background = runtimeVisual.option_bg_color;
  btn.style.borderColor = runtimeVisual.option_border_color;
  btn.style.color = runtimeVisual.question_text_color;
}

function stopTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function updateTimerLabel() {
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  if (timerRemaining <= 0) {
    timerEl.textContent = "Tiempo agotado";
    timerEl.classList.add("timer-expired");
    return;
  }

  timerEl.classList.remove("timer-expired");
  timerEl.textContent = `Tiempo restante: ${timerRemaining}s`;
}

function startTimer() {
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  stopTimer();

  if (!runtimeRules.show_timer) {
    timerEl.classList.add("hidden");
    timerEl.textContent = "";
    return;
  }

  timerRemaining = Number(runtimeRules.timer_seconds || 20);
  if (!Number.isFinite(timerRemaining) || timerRemaining <= 0) {
    timerRemaining = 20;
  }

  timerEl.classList.remove("hidden");
  updateTimerLabel();

  timerIntervalId = setInterval(() => {
    timerRemaining -= 1;
    updateTimerLabel();
    if (timerRemaining <= 0) {
      stopTimer();
      setText("status", "Tiempo agotado. Responde o presiona siguiente.");
    }
  }, 1000);
}

function applyCustomization(customization, previewMode) {
  const normalized = normalizeCustomization(customization);
  const branding = isObject(normalized.branding) ? normalized.branding : BASE_CUSTOMIZATION.branding;
  const texts = isObject(normalized.texts) ? normalized.texts : BASE_CUSTOMIZATION.texts;
  const rules = isObject(normalized.rules) ? normalized.rules : BASE_CUSTOMIZATION.rules;
  const visual = isObject(normalized.visual) ? normalized.visual : BASE_CUSTOMIZATION.visual;
  const watermarkConfig = isObject(normalized.watermark) ? normalized.watermark : BASE_CUSTOMIZATION.watermark;

  runtimeRules = {
    ...runtimeRules,
    ...rules,
    show_timer: !!rules.show_timer,
    timer_seconds: Number(rules.timer_seconds || 20),
  };
  runtimeVisual = { ...runtimeVisual, ...visual };

  setVar("--trivia-primary", branding.primary_color || BASE_CUSTOMIZATION.branding.primary_color);
  setVar("--trivia-secondary", branding.secondary_color || BASE_CUSTOMIZATION.branding.secondary_color);
  setVar("--trivia-question-bg", visual.question_bg_color || BASE_CUSTOMIZATION.visual.question_bg_color);
  setVar("--trivia-question-border", visual.question_border_color || BASE_CUSTOMIZATION.visual.question_border_color);
  setVar("--trivia-question-text", visual.question_text_color || BASE_CUSTOMIZATION.visual.question_text_color);
  setVar("--trivia-option-border", visual.option_border_color || BASE_CUSTOMIZATION.visual.option_border_color);
  setVar("--trivia-option-bg", visual.option_bg_color || BASE_CUSTOMIZATION.visual.option_bg_color);
  setVar("--trivia-screen-bg", visual.screen_background_color || BASE_CUSTOMIZATION.visual.screen_background_color);

  document.body.style.fontFamily = visual.question_font_family || BASE_CUSTOMIZATION.visual.question_font_family;

  if (branding.background_url) {
    document.body.style.backgroundImage = `url(${branding.background_url})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  } else {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
  }

  const logoEl = document.getElementById("logo");
  if (logoEl) {
    if (branding.logo_url) {
      logoEl.setAttribute("src", branding.logo_url);
      logoEl.classList.remove("hidden");
    } else {
      logoEl.classList.add("hidden");
      logoEl.removeAttribute("src");
    }
  }

  const heroEl = document.getElementById("hero");
  if (heroEl) {
    if (branding.welcome_image_url) {
      heroEl.style.backgroundImage = `url(${branding.welcome_image_url})`;
      heroEl.classList.add("hero-has-image");
    } else {
      heroEl.style.backgroundImage = "";
      heroEl.classList.remove("hero-has-image");
    }
  }

  const questionBoxEl = document.getElementById("questionBox");
  if (questionBoxEl) {
    if (visual.container_bg_image_url) {
      questionBoxEl.style.backgroundImage = `url(${visual.container_bg_image_url})`;
      questionBoxEl.style.backgroundSize = "cover";
      questionBoxEl.style.backgroundPosition = "center";
    } else {
      questionBoxEl.style.backgroundImage = "";
      questionBoxEl.style.backgroundSize = "";
      questionBoxEl.style.backgroundPosition = "";
    }
  }

  setText("title", texts.welcome_title || BASE_CUSTOMIZATION.texts.welcome_title);
  setText("subtitle", texts.welcome_subtitle || BASE_CUSTOMIZATION.texts.welcome_subtitle);
  setText("btnNext", texts.cta_button || BASE_CUSTOMIZATION.texts.cta_button);

  const watermark = document.getElementById("watermark");
  if (!watermark) return;

  const showWatermark = previewMode && watermarkConfig.enabled !== false;
  if (!showWatermark) {
    watermark.classList.add("hidden");
    return;
  }

  const wmText = branding.watermark_text || BASE_CUSTOMIZATION.branding.watermark_text;
  const wmColor = watermarkConfig.color || BASE_CUSTOMIZATION.watermark.color;
  const wmOpacity = Number(watermarkConfig.opacity);
  const wmFontSize = Number(watermarkConfig.font_size);
  const wmPosition = watermarkConfig.position || BASE_CUSTOMIZATION.watermark.position;

  watermark.textContent = wmText;
  watermark.style.color = wmColor;
  watermark.style.opacity = String(Number.isFinite(wmOpacity) ? wmOpacity : BASE_CUSTOMIZATION.watermark.opacity);
  watermark.style.fontSize = `${Number.isFinite(wmFontSize) ? wmFontSize : BASE_CUSTOMIZATION.watermark.font_size}px`;
  applyWatermarkPosition(watermark, wmPosition);
  watermark.classList.remove("hidden");
}

function renderChoices(choices, onPick) {
  const wrap = document.getElementById("choices");
  wrap.innerHTML = "";

  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice.text;
    applyChoiceStyles(btn);
    btn.addEventListener("click", () => onPick(choice.id));
    wrap.appendChild(btn);
  });
}

async function getState() {
  const url =
    `/runner/trivia/state?` +
    qs({
      session_id: SESSION.sessionId,
      user_id: SESSION.userId,
      session_token: SESSION.sessionToken,
    });
  return fetchJSON(url);
}

async function getNext() {
  const url =
    `/runner/trivia/next?` +
    qs({
      session_id: SESSION.sessionId,
      user_id: SESSION.userId,
      session_token: SESSION.sessionToken,
    });
  return fetchJSON(url);
}

async function postAnswer(choiceId) {
  const url = `/runner/trivia/answer`;
  const payload = {
    session_id: SESSION.sessionId,
    user_id: Number(SESSION.userId),
    session_token: SESSION.sessionToken,
    choice_id: Number(choiceId),
  };
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!SESSION?.sessionId || !SESSION?.userId || !SESSION?.sessionToken) {
    setText("status", "Sesion invalida. Inicia desde el catalogo.");
    return;
  }

  const btnNext = document.getElementById("btnNext");

  const stateResp = await getState();
  if (stateResp.res.ok) {
    applyCustomization(stateResp.data.customization || {}, !!stateResp.data.preview_mode);
  }

  async function loadQuestion() {
    stopTimer();
    setText("status", "Cargando...");

    const { res, data } = await getNext();
    if (!res.ok) {
      setText("status", `Error: ${data?.error || res.status}`);
      return;
    }

    if (data.finished) {
      setText("status", `Finalizado · Score ${data?.result?.score ?? 0}`);
      setText("questionText", "Juego terminado");
      document.getElementById("choices").innerHTML = "";
      btnNext.disabled = true;
      const timerEl = document.getElementById("timer");
      if (timerEl) {
        timerEl.classList.add("hidden");
        timerEl.textContent = "";
      }
      return;
    }

    const q = data.question;
    setText("status", "");
    setText("questionText", q.text);

    renderChoices(q.choices, async (pickedChoiceId) => {
      stopTimer();
      const choices = document.querySelectorAll(".choice");
      choices.forEach((btn) => {
        btn.setAttribute("disabled", "disabled");
      });

      setText("status", "Validando...");
      const r = await postAnswer(pickedChoiceId);
      if (!r.res.ok) {
        setText("status", `Error respuesta: ${r.data?.error || r.res.status}`);
        return;
      }

      setText(
        "status",
        r.data.correct ? `Correcto (score ${r.data.score})` : `Incorrecto (score ${r.data.score})`
      );
    });

    startTimer();
  }

  btnNext.addEventListener("click", loadQuestion);
  await loadQuestion();
});

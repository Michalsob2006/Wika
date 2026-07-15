const WEB3FORMS_ACCESS_KEY = "a04d2cdd-c7e7-4406-8c63-6609703a6ece";

const STORAGE_KEY = "randka-wikusia-state";
const QUIZ_LOCK_KEY = "wikaQuizLocked";
const QUIZ_PASS_KEY = "wikaQuizPassed";
const START_DATE = "2026-07-20";
const END_DATE = "2026-07-31";
const TOTAL_STEPS = 6;
const NO_MOVE_COOLDOWN_MS = 520;
const NO_MESSAGE_COOLDOWN_MS = 1700;
const FOOD_EMOJIS = {
  "Włoskie": "🍝",
  "Sushi": "🍣",
  "Burgery": "🍔",
  "Azjatyckie": "🥡",
  "Pad Thai": "🍜",
  "Bar": "🍸"
};

const desktopNoMessages = [
  "Nie tak szybko 😌",
  "Oj, chyba nie ten przycisk 🌸",
  "Wikusiu, dobrze się zastanów 💗",
  "Ten przycisk chyba nie działa 🤭",
  "Spróbuj tego różowego obok 😇",
  "Pozostaje chyba tylko TAK 💕"
];

const touchNoMessages = [
  "Oj, chyba kliknęłaś nie ten przycisk… spróbuj ponownie 🌸",
  "Na pewno chciałaś kliknąć właśnie tutaj? 🤨",
  "Ten przycisk jest tylko ozdobą 🤭",
  "Daj spokój, Wikusiu… kliknij TAK 💗",
  "Nie poddaję się tak łatwo 😌",
  "Ostatnia szansa na poprawną odpowiedź 🌸"
];

const state = {
  step: 1,
  selectedDate: "",
  selectedTime: "",
  selectedFood: "",
  extraMessage: ""
};

const quizState = {
  currentQuestion: 0,
  busy: false,
  locked: false
};

let noAttempts = 0;
let isSubmitting = false;
let lastNoMoveAt = 0;
let lastNoMessageAt = 0;
let noMoveFrame = 0;
let lastPointer = { x: 0, y: 0 };
let noCornerIndex = 0;

const elements = {
  quizSteps: [...document.querySelectorAll(".quiz-step")],
  quizProgress: document.querySelector("#quizProgress"),
  quizProgressText: document.querySelector("#quizProgressText"),
  quizDots: [...document.querySelectorAll(".quiz-dot")],
  startQuizButton: document.querySelector("#startQuizButton"),
  quizCalendarGrid: document.querySelector("#quizCalendarGrid"),
  quizFeedbacks: [
    document.querySelector("#quizFeedback1"),
    document.querySelector("#quizFeedback2"),
    document.querySelector("#quizFeedback3"),
    document.querySelector("#quizFeedback4")
  ],
  emojiChoices: [...document.querySelectorAll("[data-quiz-emoji]")],
  songChoices: [...document.querySelectorAll("[data-quiz-song]")],
  legoForm: document.querySelector("#legoQuizForm"),
  legoAnswer: document.querySelector("#legoAnswer"),
  legoSubmitButton: document.querySelector("#legoSubmitButton"),
  steps: [...document.querySelectorAll(".step")],
  progressDots: [...document.querySelectorAll(".progress-dot")],
  progressText: document.querySelector("#progressText"),
  yesButton: document.querySelector("#yesButton"),
  noButton: document.querySelector("#noButton"),
  noMessage: document.querySelector("#noMessage"),
  answerArena: document.querySelector("#answerArena"),
  dateGrid: document.querySelector("#dateGrid"),
  timeGrid: document.querySelector("#timeGrid"),
  timeHint: document.querySelector("#timeHint"),
  dateValidation: document.querySelector("#dateValidation"),
  foodGrid: document.querySelector("#foodGrid"),
  foodValidation: document.querySelector("#foodValidation"),
  foodNextButton: document.querySelector("#foodNextButton"),
  dateNextButton: document.querySelector("#dateNextButton"),
  form: document.querySelector("#dateForm"),
  extraMessage: document.querySelector("#extraMessage"),
  charCounter: document.querySelector("#charCounter"),
  sendStatus: document.querySelector("#sendStatus"),
  submitButton: document.querySelector("#submitButton"),
  summaryDate: document.querySelector("#summaryDate"),
  summaryTime: document.querySelector("#summaryTime"),
  summaryFood: document.querySelector("#summaryFood"),
  restartButton: document.querySelector("#restartButton"),
  toast: document.querySelector("#toast"),
  particleLayer: document.querySelector("#particleLayer")
};

function init() {
  renderDates();
  renderFoods();
  renderTimes();
  renderMessage();
  renderQuizCalendar();
  bindEvents();
  initializeQuizGate();
}

function bindEvents() {
  elements.startQuizButton.addEventListener("click", startQuiz);
  elements.quizCalendarGrid.addEventListener("click", handleCalendarAnswer);
  elements.emojiChoices.forEach((button) => {
    button.addEventListener("click", () => handleEmojiAnswer(button));
  });
  elements.songChoices.forEach((button) => {
    button.addEventListener("click", () => handleSongAnswer(button));
  });
  elements.legoForm.addEventListener("submit", handleLegoAnswer);
  elements.legoAnswer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleLegoAnswer(event);
  });

  elements.yesButton.addEventListener("click", () => {
    celebrate(34);
    showStep(2);
  });

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => showStep(Number(button.dataset.next)));
  });

  elements.noButton.addEventListener("click", handleNoClick);
  elements.noButton.addEventListener("pointerenter", handleNoEscape);
  elements.noButton.addEventListener("pointerdown", handleNoClick);
  document.addEventListener("pointermove", handleNoEscape);
  window.addEventListener("resize", resetNoButtonPosition);

  elements.dateGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    chooseDate(button.dataset.date);
  });

  elements.timeGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button) return;
    chooseTime(button.dataset.time);
  });

  elements.dateNextButton.addEventListener("click", validateDateStep);

  elements.foodGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-food]");
    if (!button) return;
    chooseFood(button.dataset.food);
  });

  elements.foodNextButton.addEventListener("click", validateFoodStep);

  elements.extraMessage.addEventListener("input", () => {
    state.extraMessage = elements.extraMessage.value;
    renderMessage();
    saveState();
  });

  elements.form.addEventListener("submit", submitChoices);

  elements.restartButton.addEventListener("click", () => {
    const confirmed = window.confirm("Na pewno zacząć od początku i wyczyścić wybory?");
    if (!confirmed) return;
    resetState();
    showStep(1);
    showToast("Zaczynamy od początku 🌸");
  });

  document.addEventListener("keydown", handleRadioKeyboard);
}

function initializeQuizGate() {
  if (localStorage.getItem(QUIZ_LOCK_KEY) === "true") {
    showQuizLock();
    return;
  }

  if (sessionStorage.getItem(QUIZ_PASS_KEY) === "true") {
    restoreState();
    startInvitation({ animate: false, useCurrentStep: true });
    return;
  }

  showQuizScreen("welcome", { progress: false });
}

function startQuiz() {
  if (quizState.busy || quizState.locked) return;
  showQuizQuestion(1);
}

function showQuizQuestion(questionNumber) {
  quizState.currentQuestion = questionNumber;
  quizState.busy = false;
  showQuizScreen(`q${questionNumber}`, { progress: true, questionNumber });
}

function showQuizScreen(screen, options = {}) {
  document.body.classList.remove("quiz-pending", "quiz-active", "quiz-locked", "invitation-ready");
  document.body.classList.add(screen === "locked" ? "quiz-locked" : screen === "welcome" ? "quiz-pending" : "quiz-active");

  elements.steps.forEach((step) => {
    step.hidden = true;
    step.classList.remove("is-active", "is-leaving");
  });

  elements.quizSteps.forEach((step) => {
    const isTarget = step.dataset.quizScreen === screen;
    step.hidden = !isTarget;
    step.classList.toggle("is-active", isTarget);
  });

  elements.quizProgress.hidden = !options.progress;
  if (options.progress) {
    updateQuizProgress(options.questionNumber);
  }
}

function updateQuizProgress(questionNumber) {
  elements.quizProgressText.textContent = `${questionNumber} z 4`;
  elements.quizDots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index + 1 === questionNumber);
    dot.classList.toggle("is-complete", index + 1 < questionNumber);
  });
}

function renderQuizCalendar() {
  const blanksBeforeOctober = 3;
  const blanks = Array.from({ length: blanksBeforeOctober }, () => '<span class="quiz-calendar-empty" aria-hidden="true"></span>');
  const days = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    return `<button class="quiz-day" type="button" data-quiz-day="${day}" aria-label="${day} października">${day}</button>`;
  });

  elements.quizCalendarGrid.innerHTML = blanks.concat(days).join("");
}

function handleCalendarAnswer(event) {
  const button = event.target.closest("[data-quiz-day]");
  if (!button || quizState.busy) return;
  quizState.busy = true;
  disableQuizControls("[data-quiz-day]");

  if (Number(button.dataset.quizDay) !== 8) {
    lockQuiz();
    return;
  }

  button.classList.add("is-selected");
  markQuizAnswerCorrect(1, "Dobrze! Tego dnia zawsze robi się cieplej na sercu 💗", () => showQuizQuestion(2));
}

function handleEmojiAnswer(button) {
  if (quizState.busy) return;
  quizState.busy = true;
  disableQuizControls("[data-quiz-emoji]");

  if (button.dataset.quizEmoji !== "🍄") {
    lockQuiz();
    return;
  }

  button.classList.add("is-selected");
  markQuizAnswerCorrect(2, "Oczywiście, że grzybek 🍄💗", () => showQuizQuestion(3));
}

function handleSongAnswer(button) {
  if (quizState.busy) return;
  quizState.busy = true;
  disableQuizControls("[data-quiz-song]");

  if (button.dataset.quizSong !== "Sebiksy") {
    lockQuiz();
    return;
  }

  button.classList.add("is-selected");
  markQuizAnswerCorrect(3, "Tego nie dało się pomylić 🎵💗", () => showQuizQuestion(4));
}

function handleLegoAnswer(event) {
  event.preventDefault();
  if (quizState.busy) return;
  quizState.busy = true;

  const normalizedAnswer = elements.legoAnswer.value
    .trim()
    .toLocaleLowerCase("pl-PL");

  elements.legoAnswer.disabled = true;
  elements.legoSubmitButton.disabled = true;

  if (!isBatmanAnswer(normalizedAnswer)) {
    lockQuiz();
    return;
  }

  markQuizAnswerCorrect(4, "Batman! Wiedziałem, że będziesz pamiętać 🦇💗", completeQuiz, 1200);
}

function disableQuizControls(selector) {
  document.querySelectorAll(selector).forEach((control) => {
    control.disabled = true;
  });
}

function isBatmanAnswer(answer) {
  return [
    "batman",
    "batmana",
    "batmanowi",
    "batmanem",
    "batmanie",
    "batmanu"
  ].includes(answer);
}

function markQuizAnswerCorrect(questionNumber, message, nextAction, delay = 950) {
  const feedback = elements.quizFeedbacks[questionNumber - 1];
  feedback.textContent = message;
  feedback.classList.remove("is-good");
  void feedback.offsetWidth;
  feedback.classList.add("is-good");
  celebrate(14);
  window.setTimeout(nextAction, delay);
}

function lockQuiz() {
  quizState.locked = true;
  quizState.busy = true;
  localStorage.setItem(QUIZ_LOCK_KEY, "true");
  sessionStorage.removeItem(QUIZ_PASS_KEY);
  showQuizLock();
}

function showQuizLock() {
  quizState.locked = true;
  quizState.busy = true;
  showQuizScreen("locked", { progress: false });
}

function completeQuiz() {
  sessionStorage.setItem(QUIZ_PASS_KEY, "true");
  localStorage.removeItem(QUIZ_LOCK_KEY);
  state.step = 1;
  saveState();
  startInvitation({ animate: true, useCurrentStep: false });
}

function startInvitation(options = {}) {
  document.body.classList.remove("quiz-pending", "quiz-active", "quiz-locked");
  document.body.classList.add("invitation-ready");
  elements.quizProgress.hidden = true;
  elements.quizSteps.forEach((step) => {
    step.hidden = true;
    step.classList.remove("is-active");
  });
  renderDates();
  renderFoods();
  renderTimes();
  renderMessage();
  showStep(options.useCurrentStep ? state.step : 1, { animate: options.animate !== false });
}

function showStep(nextStep, options = {}) {
  const animate = options.animate !== false;
  const current = document.querySelector(".step.is-active");
  const target = document.querySelector(`[data-step="${nextStep}"]`);
  if (!target || state.step === nextStep && target.classList.contains("is-active")) {
    updateProgress();
    return;
  }

  const finish = () => {
    elements.steps.forEach((step) => {
      step.hidden = true;
      step.classList.remove("is-active", "is-leaving");
    });
    target.hidden = false;
    target.classList.add("is-active");
    state.step = nextStep;
    resetNoButtonPosition();
    updateProgress();
    renderSummary();
    saveState();
    target.focus?.();
  };

  if (animate && current) {
    current.classList.add("is-leaving");
    window.setTimeout(finish, 220);
  } else {
    finish();
  }

  if (nextStep === 6) {
    window.setTimeout(() => celebrate(46), 260);
  }
}

function updateProgress() {
  elements.progressDots.forEach((dot) => {
    const stepNumber = Number(dot.dataset.progress);
    dot.classList.toggle("is-active", stepNumber === state.step);
    dot.classList.toggle("is-complete", stepNumber < state.step);
    dot.textContent = stepNumber <= state.step ? "♥" : "♡";
  });
  elements.progressText.textContent = `Krok ${state.step} z ${TOTAL_STEPS}`;
}

function handleNoClick(event) {
  event.preventDefault();
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (isTouch || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showNoMessage(touchNoMessages, { force: true });
    elements.noButton.classList.remove("is-shaking");
    void elements.noButton.offsetWidth;
    elements.noButton.classList.add("is-shaking");
    return;
  }

  showNoMessage(desktopNoMessages, { force: true });
  moveNoButton(getPointerPosition(event), { force: true });
}

function handleNoEscape(event) {
  if (state.step !== 1) return;
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (event.pointerType && event.pointerType !== "mouse") return;

  lastPointer = getPointerPosition(event);
  if (noMoveFrame) return;

  noMoveFrame = window.requestAnimationFrame(() => {
    noMoveFrame = 0;
    maybeMoveNoButton(lastPointer);
  });
}

function maybeMoveNoButton(pointer) {
  const rect = elements.noButton.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
  const dangerZone = elements.noButton.classList.contains("is-runaway") ? 190 : 155;

  if (distance < dangerZone) {
    if (moveNoButton(pointer)) {
      showNoMessage(desktopNoMessages);
    }
  }
}

function showNoMessage(messages, options = {}) {
  const now = Date.now();
  if (!options.force && now - lastNoMessageAt < NO_MESSAGE_COOLDOWN_MS) return;

  elements.noMessage.textContent = messages[noAttempts % messages.length];
  noAttempts += 1;
  lastNoMessageAt = now;
}

function getPointerPosition(event) {
  return {
    x: event.clientX ?? lastPointer.x,
    y: event.clientY ?? lastPointer.y
  };
}

function resetNoButtonPosition() {
  if (!elements.noButton || !elements.answerArena) return;
  if (elements.noButton.parentElement !== elements.answerArena) {
    elements.answerArena.append(elements.noButton);
  }
  elements.noButton.classList.remove("is-runaway");
  elements.noButton.style.removeProperty("--runaway-left");
  elements.noButton.style.removeProperty("--runaway-top");
  elements.noButton.style.removeProperty("left");
  elements.noButton.style.removeProperty("top");
  const isSmall = window.matchMedia("(max-width: 680px)").matches;
  elements.noButton.style.top = isSmall ? "24px" : "38px";
}

function moveNoButton(pointer = lastPointer, options = {}) {
  const now = Date.now();
  if (!options.force && now - lastNoMoveAt < NO_MOVE_COOLDOWN_MS) return false;
  lastNoMoveAt = now;

  const noRect = elements.noButton.getBoundingClientRect();
  const buttonWidth = noRect.width;
  const buttonHeight = noRect.height;
  const padding = 18;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const maxX = Math.max(padding, viewportWidth - buttonWidth - padding);
  const maxY = Math.max(padding, viewportHeight - buttonHeight - padding);
  const blockedRects = getNoButtonBlockedRects(buttonWidth, buttonHeight);
  const next = getNextRunawayCorner(blockedRects, buttonWidth, buttonHeight, padding, maxX, maxY, pointer);

  if (elements.noButton.parentElement !== document.body) {
    document.body.append(elements.noButton);
  }
  elements.noButton.classList.add("is-runaway");
  elements.noButton.style.left = `${Math.round(next.x)}px`;
  elements.noButton.style.top = `${Math.round(next.y)}px`;
  elements.noButton.style.setProperty("--runaway-left", `${Math.round(next.x)}px`);
  elements.noButton.style.setProperty("--runaway-top", `${Math.round(next.y)}px`);
  return true;
}

function getNoButtonBlockedRects(buttonWidth, buttonHeight) {
  const safeGap = 24;
  const yesRect = inflateRect(elements.yesButton.getBoundingClientRect(), safeGap);
  const messageRect = inflateRect(elements.noMessage.getBoundingClientRect(), 10);

  return [yesRect, messageRect].filter((rect) => {
    return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }).map((rect) => ({
    left: rect.left,
    top: rect.top,
    right: rect.right + buttonWidth / 2,
    bottom: rect.bottom + buttonHeight / 2
  }));
}

function getNextRunawayCorner(blockedRects, buttonWidth, buttonHeight, padding, maxX, maxY, pointer) {
  const jitterX = Math.min(90, Math.max(16, (maxX - padding) * 0.16));
  const jitterY = Math.min(80, Math.max(16, (maxY - padding) * 0.14));
  const corners = [
    { x: padding, y: padding },
    { x: maxX, y: maxY },
    { x: maxX, y: padding },
    { x: padding, y: maxY }
  ];

  for (let offset = 0; offset < corners.length; offset += 1) {
    const index = (noCornerIndex + offset) % corners.length;
    const corner = corners[index];
    const candidate = {
      x: clamp(corner.x + (corner.x === padding ? randomBetween(0, jitterX) : randomBetween(-jitterX, 0)), padding, maxX),
      y: clamp(corner.y + (corner.y === padding ? randomBetween(0, jitterY) : randomBetween(-jitterY, 0)), padding, maxY)
    };

    if (isSafeNoPosition(candidate, blockedRects, buttonWidth, buttonHeight) && distanceFromPointer(candidate, buttonWidth, buttonHeight, pointer) > 145) {
      noCornerIndex = (index + 1) % corners.length;
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = {
      x: randomBetween(padding, maxX),
      y: randomBetween(padding, maxY)
    };

    if (isSafeNoPosition(candidate, blockedRects, buttonWidth, buttonHeight) && distanceFromPointer(candidate, buttonWidth, buttonHeight, pointer) > 180) {
      return candidate;
    }
  }

  return corners[noCornerIndex++ % corners.length];
}

function isSafeNoPosition(position, blockedRects, buttonWidth, buttonHeight) {
  const rect = {
    left: position.x,
    top: position.y,
    right: position.x + buttonWidth,
    bottom: position.y + buttonHeight
  };
  return !blockedRects.some((blocked) => rectsOverlap(blocked, rect));
}

function distanceFromPointer(position, buttonWidth, buttonHeight, pointer) {
  const centerX = position.x + buttonWidth / 2;
  const centerY = position.y + buttonHeight / 2;
  return Math.hypot(pointer.x - centerX, pointer.y - centerY);
}

function inflateRect(rect, amount) {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function renderDates() {
  const dates = getDatesBetween(START_DATE, END_DATE);
  elements.dateGrid.innerHTML = dates.map((date) => {
    const dateKey = toDateKey(date);
    const isSelected = dateKey === state.selectedDate;
    return `
      <button class="date-option ${isSelected ? "is-selected" : ""}" type="button" data-date="${dateKey}" role="radio" aria-checked="${isSelected}">
        <strong>${date.getDate()}</strong>
        <span>${formatWeekday(date, "short")}</span>
      </button>
    `;
  }).join("");
}

function chooseDate(dateKey) {
  const previousTime = state.selectedTime;
  state.selectedDate = dateKey;
  const available = getAvailableTimes(dateKey).map((item) => item.value);
  if (!available.includes(previousTime)) {
    state.selectedTime = "";
  }
  elements.dateValidation.textContent = "";
  renderDates();
  renderTimes();
  saveState();
}

function renderTimes() {
  if (!state.selectedDate) {
    elements.timeHint.textContent = "Najpierw wybierz dzień, a pokażę dostępne godziny.";
    elements.timeGrid.innerHTML = "";
    return;
  }

  const date = parseLocalDate(state.selectedDate);
  elements.timeHint.textContent = `${formatWeekday(date, "long")}: dostępne godziny dla tego dnia.`;
  elements.timeGrid.innerHTML = getAvailableTimes(state.selectedDate).map((time) => {
    const isSelected = time.value === state.selectedTime;
    return `
      <button class="time-option ${isSelected ? "is-selected" : ""}" type="button" data-time="${time.value}" role="radio" aria-checked="${isSelected}">
        <span>${time.label}</span>
      </button>
    `;
  }).join("");
}

function chooseTime(time) {
  state.selectedTime = time;
  elements.dateValidation.textContent = "";
  renderTimes();
  saveState();
}

function validateDateStep() {
  if (!state.selectedDate || !state.selectedTime) {
    elements.dateValidation.textContent = "Wybierz najpierw dzień i godzinę 🌸";
    return;
  }
  showStep(4);
}

function getAvailableTimes(dateKey) {
  if (!isAllowedDate(dateKey)) return [];
  const ranges = [[10 * 60, 14 * 60], [21 * 60, 24 * 60]];

  return ranges.flatMap(([start, end]) => {
    const times = [];
    for (let minutes = start; minutes <= end; minutes += 30) {
      const value = formatTimeValue(minutes);
      times.push({
        value,
        label: value === "24:00" ? "24:00 — północ" : value
      });
    }
    return times;
  });
}

function formatTimeValue(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function renderFoods() {
  document.querySelectorAll(".food-tile").forEach((tile) => {
    const isSelected = tile.dataset.food === state.selectedFood;
    tile.classList.toggle("is-selected", isSelected);
    tile.setAttribute("aria-checked", String(isSelected));
    tile.querySelector("em").textContent = isSelected ? "✓" : "♡";
  });
}

function chooseFood(food) {
  state.selectedFood = food;
  elements.foodValidation.textContent = "";
  renderFoods();
  saveState();
}

function validateFoodStep() {
  if (!state.selectedFood) {
    elements.foodValidation.textContent = "Wybierz najpierw, na co masz ochotę 🌸";
    return;
  }
  showStep(5);
}

function renderMessage() {
  elements.extraMessage.value = state.extraMessage;
  elements.charCounter.textContent = `${state.extraMessage.length} / 300`;
}

async function submitChoices(event) {
  event.preventDefault();
  if (isSubmitting) return;

  state.extraMessage = elements.extraMessage.value;
  renderMessage();
  saveState();

  if (document.querySelector("#botcheck").checked) return;
  if (!state.selectedDate || !state.selectedTime || !state.selectedFood) {
    elements.sendStatus.textContent = "Brakuje wyborów z poprzednich kroków. Wróćmy na chwilę wcześniej 🌸";
    return;
  }

  setSubmitting(true);
  elements.sendStatus.textContent = "";

  try {
    const payload = buildPayload();
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Błąd wysyłania");
    }

    localStorage.removeItem(STORAGE_KEY);
    showStep(6);
  } catch (error) {
    elements.sendStatus.textContent = "Coś się nie wysłało… spróbujmy jeszcze raz 💗";
    setSubmitting(false);
  }
}

function buildPayload() {
  const date = parseLocalDate(state.selectedDate);
  const readableDate = formatReadableDate(date);
  const weekday = formatWeekday(date, "long");

  return {
    access_key: WEB3FORMS_ACCESS_KEY,
    botcheck: "",
    subject: "Wikusia odpowiedziała na zaproszenie na randkę 💗",
    from_name: "Randka z Wikusią",
    odpowiedź: "TAK",
    imię: "Wikusia",
    "wybrana data": `${readableDate}, ${weekday}`,
    "techniczna data": state.selectedDate,
    "polska nazwa dnia tygodnia": weekday,
    "wybrana godzina": state.selectedTime === "24:00" ? "24:00 — północ" : state.selectedTime,
    "wybrane jedzenie lub miejsce": state.selectedFood,
    "dodatkowa wiadomość": state.extraMessage || "Brak dodatkowej wiadomości",
    "data i godzina przesłania formularza": new Date().toLocaleString("pl-PL"),
    "user agent urządzenia": navigator.userAgent
  };
}

function setSubmitting(isBusy) {
  isSubmitting = isBusy;
  elements.submitButton.disabled = isBusy;
  elements.submitButton.classList.toggle("is-loading", isBusy);
  elements.submitButton.textContent = isBusy ? "Wysyłam… 💌" : "Wyślij moje wybory 💗";
}

function renderSummary() {
  if (!state.selectedDate) return;
  const date = parseLocalDate(state.selectedDate);
  elements.summaryDate.textContent = `${formatReadableDate(date)}, ${formatWeekday(date, "long")}`;
  elements.summaryTime.textContent = state.selectedTime === "24:00" ? "24:00 — północ" : state.selectedTime || "-";
  const emoji = FOOD_EMOJIS[state.selectedFood] || "";
  elements.summaryFood.textContent = `${state.selectedFood || "-"} ${emoji}`.trim();
}

function handleRadioKeyboard(event) {
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
  const current = event.target.closest('[role="radio"]');
  if (!current) return;

  const group = current.closest('[role="radiogroup"]');
  if (!group) return;

  const radios = [...group.querySelectorAll('[role="radio"]')];
  const index = radios.indexOf(current);
  if (index === -1) return;

  event.preventDefault();
  const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
  const next = radios[(index + direction + radios.length) % radios.length];
  next.focus();
  next.click();
}

function getDatesBetween(startKey, endKey) {
  const dates = [];
  const current = parseLocalDate(startKey);
  const end = parseLocalDate(endKey);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function parseLocalDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekday(date, style) {
  return new Intl.DateTimeFormat("pl-PL", { weekday: style }).format(date);
}

function formatReadableDate(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function saveState() {
  if (state.step === 6) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    Object.assign(state, {
      step: clampStep(saved.step),
      selectedDate: isAllowedDate(saved.selectedDate) ? saved.selectedDate : "",
      selectedTime: typeof saved.selectedTime === "string" ? saved.selectedTime : "",
      selectedFood: FOOD_EMOJIS[saved.selectedFood] ? saved.selectedFood : "",
      extraMessage: typeof saved.extraMessage === "string" ? saved.extraMessage.slice(0, 300) : ""
    });
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function resetState() {
  Object.assign(state, {
    step: 1,
    selectedDate: "",
    selectedTime: "",
    selectedFood: "",
    extraMessage: ""
  });
  noAttempts = 0;
  localStorage.removeItem(STORAGE_KEY);
  elements.noMessage.textContent = "";
  elements.dateValidation.textContent = "";
  elements.foodValidation.textContent = "";
  elements.sendStatus.textContent = "";
  setSubmitting(false);
  renderDates();
  renderTimes();
  renderFoods();
  renderMessage();
  resetNoButtonPosition();
}

function clampStep(step) {
  const number = Number(step);
  if (!Number.isFinite(number)) return 1;
  return Math.min(Math.max(Math.trunc(number), 1), 5);
}

function isAllowedDate(dateKey) {
  return typeof dateKey === "string" && dateKey >= START_DATE && dateKey <= END_DATE;
}

function celebrate(count) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const symbols = ["💗", "🌸", "✨", "♡", "💕"];
  elements.particleLayer.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.textContent = symbols[index % symbols.length];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.setProperty("--drift", `${randomBetween(-120, 120)}px`);
    particle.style.setProperty("--duration", `${randomBetween(1800, 3600)}ms`);
    particle.style.animationDelay = `${randomBetween(0, 420)}ms`;
    elements.particleLayer.append(particle);
  }

  window.setTimeout(() => {
    elements.particleLayer.innerHTML = "";
  }, 4300);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

init();

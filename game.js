"use strict";

const PHASES = Object.freeze({
  idle: "idle",
  choosingAction: "choosingAction",
  awaitingResponse: "awaitingResponse",
  resolvingDelay: "resolvingDelay",
  applyingEffects: "applyingEffects",
  matchEnd: "matchEnd"
});

const MATCH_SETTINGS = Object.freeze({
  START_HP: 5,
  START_GOLD: 2,
  MAX_ROUNDS: 10,
  ACTIONS_PER_ROUND: 2,
  HUMAN_TIMER_SECONDS: 120,
  BOT_THINK_MIN_MS: 500,
  BOT_THINK_MAX_MS: 900,
  RESOLUTION_DELAY_MS: 2500,
  MAX_EVENT_ENTRIES: 200,
  MATCH_XP_REWARD: 100,
  LEVEL_UP_XP: 100,
  MAX_LEVEL: 2
});

const ROLE_CONFIG = Object.freeze({
  SIREN: Object.freeze({ name: "SIREN", cost: 0, description: "Skip next turn", passive: false, unlockedAtLevel: 1 }),
  DWARF: Object.freeze({ name: "DWARF", cost: 1, description: "Shield next ⚔️", passive: false, unlockedAtLevel: 1 }),
  KNIGHT: Object.freeze({ name: "KNIGHT", cost: 2, description: "2 ⚔️", passive: false, unlockedAtLevel: 1 }),
  GOBLIN: Object.freeze({
    name: "GOBLIN",
    cost: 0,
    description: "Steal 1 🪙",
    maxUses: 3,
    passive: false,
    unlockedAtLevel: 1
  }),
  ENT: Object.freeze({ name: "ENT", cost: 2, description: "+2 ❤️", passive: false, unlockedAtLevel: 1 }),
  ELF: Object.freeze({
    name: "ELF",
    cost: 0,
    description: "Passive: +1 🪙 on defend",
    passive: true,
    unlockedAtLevel: 1
  }),
  PIRATE: Object.freeze({
    name: "PIRATE",
    cost: 0,
    description: "1 ⚔️ +1 🪙",
    maxUses: 2,
    passive: false,
    unlockedAtLevel: 2
  })
});

const BASIC_ACTIONS = Object.freeze({
  INTEREST: Object.freeze({ id: "INTEREST", cost: 0, description: "+1 🪙", challengeable: false }),
  STRIKE: Object.freeze({ id: "STRIKE", cost: 2, description: "Deal 1 ⚔️", challengeable: false })
});

const DEV = {
  enabled: false,
  forceStartingActor: null,
  forceRoles: {
    human: { real: ["SIREN", "ELF"], fake: ["DWARF", "GOBLIN"] },
    bot: { real: ["KNIGHT", "ENT"], fake: ["SIREN", "DWARF"] }
  }
};

const PROGRESS_STORAGE_KEY = "claim_duel_progress_v1";
const ui = {};
const cardArtStatus = Object.create(null);
const modalState = { activeModal: null };

const state = {
  view: "menu",
  phase: PHASES.idle,
  round: 1,
  roundActionCounter: 0,
  roundStarter: null,
  previousRoundStarter: null,
  currentActor: null,
  startingActor: "human",
  lastPerformedActor: null,
  thinking: false,
  matchWinner: null,
  matchEndReason: "",
  pendingAction: null,
  pendingResponder: null,
  pendingChallengeResult: null,
  currentActionText: "Ready.",
  events: [],
  resolutionToken: 0,
  progression: loadProgression(),
  progressionAwarded: false,
  timer: { mode: null, remaining: 0, expiresAt: 0, intervalId: null, timeoutId: null, token: 0 },
  ai: { suspicion: createSuspicionMap() },
  players: { human: createPlayerState("human"), bot: createPlayerState("bot") }
};

function createPlayerState(key) {
  return {
    key,
    hp: MATCH_SETTINGS.START_HP,
    gold: MATCH_SETTINGS.START_GOLD,
    shield: false,
    blockedActions: 0,
    realRoles: [],
    fakeRoles: [],
    roleUses: Object.create(null),
    cards: []
  };
}

function createSuspicionMap() {
  return { SIREN: 0.35, DWARF: 0.35, KNIGHT: 0.35, GOBLIN: 0.35, ENT: 0.35, PIRATE: 0.35 };
}

function loadProgression() {
  const fallback = { level: 1, xp: 0 };
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const level = clamp(Number(parsed.level) || 1, 1, MATCH_SETTINGS.MAX_LEVEL);
    let xp = clamp(Number(parsed.xp) || 0, 0, MATCH_SETTINGS.LEVEL_UP_XP);
    if (level >= MATCH_SETTINGS.MAX_LEVEL) xp = MATCH_SETTINGS.LEVEL_UP_XP;
    return { level, xp };
  } catch (_e) {
    return fallback;
  }
}

function saveProgression() {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.progression));
  } catch (_e) {
    // Ignore.
  }
}

function awardMatchProgression() {
  if (state.progressionAwarded) return;
  state.progressionAwarded = true;
  const p = state.progression;
  if (p.level >= MATCH_SETTINGS.MAX_LEVEL) {
    p.level = MATCH_SETTINGS.MAX_LEVEL;
    p.xp = MATCH_SETTINGS.LEVEL_UP_XP;
    saveProgression();
    return;
  }
  p.xp += MATCH_SETTINGS.MATCH_XP_REWARD;
  if (p.level === 1 && p.xp >= MATCH_SETTINGS.LEVEL_UP_XP) {
    p.level = 2;
    p.xp = MATCH_SETTINGS.LEVEL_UP_XP;
  } else {
    p.xp = clamp(p.xp, 0, MATCH_SETTINGS.LEVEL_UP_XP);
  }
  if (p.level >= MATCH_SETTINGS.MAX_LEVEL) p.xp = MATCH_SETTINGS.LEVEL_UP_XP;
  saveProgression();
}

function opponentOf(key) {
  return key === "human" ? "bot" : "human";
}

function actorLabel(key) {
  return key === "human" ? "YOU" : "BOT";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function shuffle(list) {
  return shuffleInPlace([...list]);
}

function cancelResolutionQueue() {
  state.resolutionToken += 1;
}

function pushDebugLog(message) {
  state.events.push(message);
  if (state.events.length > MATCH_SETTINGS.MAX_EVENT_ENTRIES) state.events.shift();
}

function setCurrentAction(message) {
  state.currentActionText = message;
  pushDebugLog(message);
  updateUI();
}

function clearTimer() {
  if (state.timer.intervalId) clearInterval(state.timer.intervalId);
  if (state.timer.timeoutId) clearTimeout(state.timer.timeoutId);
  state.timer.intervalId = null;
  state.timer.timeoutId = null;
  state.timer.mode = null;
  state.timer.remaining = 0;
  state.timer.expiresAt = 0;
  state.timer.token += 1;
}

function runHumanTimer(mode, seconds, onExpire) {
  clearTimer();
  state.timer.mode = mode;
  state.timer.remaining = seconds;
  state.timer.expiresAt = Date.now() + seconds * 1000;
  state.timer.token += 1;
  const token = state.timer.token;
  state.timer.intervalId = setInterval(() => {
    if (token !== state.timer.token) return;
    const remaining = Math.max(0, Math.ceil((state.timer.expiresAt - Date.now()) / 1000));
    if (remaining !== state.timer.remaining) {
      state.timer.remaining = remaining;
      updateUI();
    }
  }, 200);
  state.timer.timeoutId = setTimeout(() => {
    if (token !== state.timer.token) return;
    clearTimer();
    onExpire();
  }, seconds * 1000);
  updateUI();
}

function getRoleMeta(role) {
  return ROLE_CONFIG[role] || null;
}

function toRoleName(role) {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toUpperCase();
  return ROLE_CONFIG[normalized] ? normalized : null;
}

function getPlayableRolesForPlayer(playerKey) {
  const level = state.progression.level;
  return Object.keys(ROLE_CONFIG).filter((role) => {
    const meta = ROLE_CONFIG[role];
    if (meta.passive) return false;
    if (playerKey === "bot" && role === "PIRATE") return false;
    return level >= meta.unlockedAtLevel;
  });
}

function getAllRolesForPlayer(playerKey) {
  const pool = [...getPlayableRolesForPlayer(playerKey), "ELF"];
  return pool.filter((role, idx, list) => list.indexOf(role) === idx);
}

function normalizeForcedRoles(playerKey, forcedRoles) {
  if (!forcedRoles || typeof forcedRoles !== "object") return null;
  const real = Array.isArray(forcedRoles.real) ? forcedRoles.real.map(toRoleName) : [];
  const fake = Array.isArray(forcedRoles.fake) ? forcedRoles.fake.map(toRoleName) : [];
  if (real.length !== 2 || fake.length !== 2 || real.includes(null) || fake.includes(null)) return null;
  if (new Set(real).size !== 2 || new Set(fake).size !== 2) return null;
  const allPool = new Set(getAllRolesForPlayer(playerKey));
  const fakePool = new Set(getPlayableRolesForPlayer(playerKey));
  if (real.some((r) => !allPool.has(r))) return null;
  if (fake.some((r) => !fakePool.has(r))) return null;
  if (real.some((r) => fake.includes(r))) return null;
  return { real, fake };
}

function pickUnique(pool, count) {
  return shuffle(pool).slice(0, count);
}

function createCard(role, isReal, index) {
  return { role, isReal, index, revealedUsed: false, confirmed: false };
}

function assignRolesToPlayer(playerKey) {
  const player = state.players[playerKey];
  const forced = DEV.enabled ? normalizeForcedRoles(playerKey, DEV.forceRoles[playerKey]) : null;
  let realRoles;
  let fakeRoles;
  if (forced) {
    realRoles = [...forced.real];
    fakeRoles = [...forced.fake];
  } else {
    const allPool = getAllRolesForPlayer(playerKey);
    const fakePool = getPlayableRolesForPlayer(playerKey);
    realRoles = pickUnique(allPool, 2);
    fakeRoles = pickUnique(
      fakePool.filter((role) => !realRoles.includes(role)),
      2
    );
  }
  player.realRoles = realRoles;
  player.fakeRoles = fakeRoles;
  player.shield = false;
  player.blockedActions = 0;
  player.roleUses = Object.create(null);
  const cards = [];
  realRoles.forEach((role, idx) => cards.push(createCard(role, true, idx)));
  fakeRoles.forEach((role, idx) => cards.push(createCard(role, false, idx + 2)));
  const ordered = playerKey === "bot" ? shuffle(cards) : cards;
  player.cards = ordered.map((card, idx) => ({ ...card, index: idx }));
}

function getRoleUsesLeft(playerKey, role) {
  const meta = getRoleMeta(role);
  if (!meta || typeof meta.maxUses !== "number") return null;
  const used = state.players[playerKey].roleUses[role] || 0;
  return Math.max(0, meta.maxUses - used);
}

function canUseRoleByUses(playerKey, role) {
  const left = getRoleUsesLeft(playerKey, role);
  return left === null ? true : left > 0;
}

function consumeRoleUse(playerKey, role) {
  const meta = getRoleMeta(role);
  if (!meta || typeof meta.maxUses !== "number") return;
  const player = state.players[playerKey];
  player.roleUses[role] = (player.roleUses[role] || 0) + 1;
}

function resetMatchState() {
  clearTimer();
  cancelResolutionQueue();
  state.players.human = createPlayerState("human");
  state.players.bot = createPlayerState("bot");
  assignRolesToPlayer("human");
  assignRolesToPlayer("bot");
  state.ai.suspicion = createSuspicionMap();
  state.phase = PHASES.idle;
  state.round = 1;
  state.roundActionCounter = 0;
  state.roundStarter = null;
  state.previousRoundStarter = null;
  state.currentActor = null;
  state.lastPerformedActor = null;
  state.thinking = false;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.matchWinner = null;
  state.matchEndReason = "";
  state.progressionAwarded = false;
  state.events = [];
  const devActor = DEV.enabled ? DEV.forceStartingActor : null;
  state.startingActor = devActor === "human" || devActor === "bot" ? devActor : Math.random() < 0.5 ? "human" : "bot";
}

function showMenu() {
  clearTimer();
  cancelResolutionQueue();
  state.view = "menu";
  state.phase = PHASES.idle;
  state.pendingResponder = null;
  state.thinking = false;
  updateUI();
}

function startNewMatch() {
  resetMatchState();
  state.view = "game";
  setCurrentAction("Match started.");
  pushDebugLog(`Starting actor: ${actorLabel(state.startingActor)}.`);
  updateUI();
  setTimeout(() => beginTurn(), 220);
}

function computeRoundStarter() {
  const human = state.players.human;
  const bot = state.players.bot;
  if (human.hp !== bot.hp) return human.hp < bot.hp ? "human" : "bot";
  if (human.gold !== bot.gold) return human.gold > bot.gold ? "human" : "bot";
  if (!state.previousRoundStarter) return state.startingActor;
  return opponentOf(state.previousRoundStarter);
}

function actorForCurrentRoundAction() {
  if (state.roundActionCounter === 0) {
    state.roundStarter = computeRoundStarter();
    return state.roundStarter;
  }
  if (state.roundActionCounter === 1 && state.roundStarter) return opponentOf(state.roundStarter);
  return null;
}

function resolveRoundLimitWinner() {
  const human = state.players.human;
  const bot = state.players.bot;
  if (human.hp !== bot.hp) return human.hp > bot.hp ? "human" : "bot";
  if (human.gold !== bot.gold) return human.gold > bot.gold ? "human" : "bot";
  if (state.lastPerformedActor) return state.lastPerformedActor;
  return "draw";
}

function concludeMatch(winnerKey, reason) {
  if (state.phase === PHASES.matchEnd) return;
  clearTimer();
  cancelResolutionQueue();
  state.phase = PHASES.matchEnd;
  state.view = "result";
  state.matchWinner = winnerKey;
  state.matchEndReason = reason;
  state.currentActor = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.thinking = false;
  awardMatchProgression();
  setCurrentAction(reason);
  updateUI();
}

function concludeMatchByHp() {
  const h = state.players.human.hp;
  const b = state.players.bot.hp;
  if (h > 0 && b > 0) return false;
  if (h <= 0 && b <= 0) concludeMatch("draw", "Both players reached 0 HP.");
  else if (h <= 0) concludeMatch("bot", "BOT reduced your HP to 0.");
  else concludeMatch("human", "YOU reduced BOT HP to 0.");
  return true;
}

function consumeRoundAction(actor) {
  state.roundActionCounter += 1;
  if (state.roundActionCounter >= MATCH_SETTINGS.ACTIONS_PER_ROUND) {
    state.roundActionCounter = 0;
    state.previousRoundStarter = state.roundStarter;
    state.roundStarter = null;
    state.round += 1;
  }
  state.currentActor = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.thinking = false;
}

function advanceToNextAction(actor, delayMs = 260) {
  clearTimer();
  consumeRoundAction(actor);
  if (concludeMatchByHp()) return;
  if (state.round > MATCH_SETTINGS.MAX_ROUNDS) {
    const winner = resolveRoundLimitWinner();
    concludeMatch(winner, "Round 10 complete. Tiebreak resolved.");
    return;
  }
  state.phase = PHASES.idle;
  updateUI();
  setTimeout(() => {
    if (state.view === "game" && state.phase !== PHASES.matchEnd) beginTurn();
  }, delayMs);
}

function beginTurn() {
  if (state.view !== "game" || state.phase === PHASES.matchEnd) return;
  if (state.round > MATCH_SETTINGS.MAX_ROUNDS) {
    concludeMatch(resolveRoundLimitWinner(), "Round 10 complete. Tiebreak resolved.");
    return;
  }
  if (concludeMatchByHp()) return;
  const actor = actorForCurrentRoundAction();
  if (!actor) {
    state.phase = PHASES.idle;
    updateUI();
    return;
  }
  state.currentActor = actor;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.thinking = false;
  const actorState = state.players[actor];
  if (actorState.blockedActions > 0) {
    actorState.blockedActions -= 1;
    setCurrentAction(`${actorLabel(actor)} loses action (SIREN skip).`);
    advanceToNextAction(actor, 460);
    return;
  }
  state.phase = PHASES.choosingAction;
  if (actor === "human") {
    runHumanTimer("action", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleActionTimeout(actor));
  } else {
    clearTimer();
    botTakeTurn();
  }
  updateUI();
}

function handleActionTimeout(actor) {
  if (state.phase !== PHASES.choosingAction || state.currentActor !== actor) return;
  if (canPlayBasic(actor, "INTEREST")) {
    setCurrentAction(`${actorLabel(actor)} timer expired. Auto INTEREST.`);
    playAction("INTEREST");
  } else {
    setCurrentAction(`${actorLabel(actor)} timer expired. No legal action.`);
    advanceToNextAction(actor);
  }
}

function normalizeActionInput(actor, input) {
  if (typeof input === "string") {
    const id = input.toUpperCase();
    const basic = BASIC_ACTIONS[id];
    if (!basic) return null;
    return {
      kind: "basic",
      id,
      label: id,
      role: null,
      cardIndex: null,
      cost: basic.cost,
      challengeable: basic.challengeable,
      description: basic.description
    };
  }
  let cardIndex = null;
  if (typeof input === "number") cardIndex = input;
  else if (input && typeof input === "object") {
    if (typeof input.cardIndex === "number") cardIndex = input.cardIndex;
    else if (typeof input.index === "number") cardIndex = input.index;
  }
  if (cardIndex === null) return null;
  const card = state.players[actor].cards[cardIndex];
  if (!card) return null;
  const meta = getRoleMeta(card.role);
  if (!meta) return null;
  if (meta.passive) {
    setCurrentAction(`${actorLabel(actor)} tapped ${card.role}. ${card.role} is passive.`);
    return null;
  }
  return {
    kind: "role",
    id: card.role,
    label: card.role,
    role: card.role,
    cardIndex,
    cost: meta.cost,
    challengeable: true,
    description: meta.description
  };
}

function isActionLegal(actor, action) {
  const player = state.players[actor];
  if (action.cost > player.gold) return { ok: false, reason: `${actorLabel(actor)} cannot afford ${action.label}.` };
  if (action.role && !canUseRoleByUses(actor, action.role)) return { ok: false, reason: `${action.role} has no uses left.` };
  return { ok: true };
}

function canPlayBasic(actor, basicId) {
  const basic = BASIC_ACTIONS[basicId];
  if (!basic) return false;
  return state.players[actor].gold >= basic.cost;
}

function formatActionText(actor, action) {
  return `${actorLabel(actor)} played ${action.label} (${action.description})`;
}

function runResolutionAfterDelay(applyFn) {
  clearTimer();
  cancelResolutionQueue();
  state.phase = PHASES.resolvingDelay;
  const token = state.resolutionToken;
  updateUI();
  setTimeout(() => {
    if (token !== state.resolutionToken || state.phase === PHASES.matchEnd || state.view !== "game") return;
    state.phase = PHASES.applyingEffects;
    updateUI();
    applyFn();
  }, MATCH_SETTINGS.RESOLUTION_DELAY_MS);
}

function applyActionResourceCost(action) {
  if (!action) return;
  if (action.cost > 0) applyGold(action.actor, -action.cost, `${action.label} cost`);
  if (action.role) consumeRoleUse(action.actor, action.role);
}

function finalizeResolvedAction(actor) {
  if (concludeMatchByHp()) return;
  advanceToNextAction(actor);
}

function playAction(input) {
  if (state.view !== "game" || state.phase !== PHASES.choosingAction || !state.currentActor) return;
  const actor = state.currentActor;
  const action = normalizeActionInput(actor, input);
  if (!action) return;
  const legal = isActionLegal(actor, action);
  if (!legal.ok) {
    setCurrentAction(legal.reason);
    return;
  }
  clearTimer();
  state.lastPerformedActor = actor;
  state.pendingAction = {
    actor,
    target: opponentOf(actor),
    kind: action.kind,
    id: action.id,
    role: action.role,
    label: action.label,
    cardIndex: action.cardIndex,
    challengeable: action.challengeable,
    cost: action.cost
  };
  setCurrentAction(formatActionText(actor, action));
  if (action.challengeable) {
    state.phase = PHASES.awaitingResponse;
    promptResponseForOpponent();
  } else {
    runResolutionAfterDelay(() => {
      const pending = state.pendingAction;
      if (!pending) return;
      applyActionResourceCost(pending);
      applyEffect(pending);
      finalizeResolvedAction(pending.actor);
    });
  }
  updateUI();
}

function promptResponseForOpponent() {
  const action = state.pendingAction;
  if (!action || action.kind !== "role") return;
  const responder = opponentOf(action.actor);
  state.pendingResponder = responder;
  if (responder === "human") {
    runHumanTimer("response", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => {
      if (state.phase !== PHASES.awaitingResponse) return;
      setCurrentAction("Response timer expired. Auto ACCEPT.");
      resolveAccept();
    });
  } else {
    clearTimer();
    botRespondToClaim();
  }
  updateUI();
}

function markRoleReveal(playerKey, cardIndex, confirmed) {
  const card = state.players[playerKey].cards[cardIndex];
  if (!card) return;
  card.revealedUsed = true;
  if (confirmed && card.isReal) card.confirmed = true;
}

function playerHasRealRole(playerKey, role) {
  return state.players[playerKey].realRoles.includes(role);
}

function adjustSuspicion(role, delta) {
  if (!(role in state.ai.suspicion)) return;
  state.ai.suspicion[role] = clamp(state.ai.suspicion[role] + delta, 0.05, 0.95);
}

function resolveAccept() {
  if (state.phase !== PHASES.awaitingResponse) return;
  clearTimer();
  const action = state.pendingAction;
  if (!action) return;
  if (typeof action.cardIndex === "number") markRoleReveal(action.actor, action.cardIndex, false);
  setCurrentAction(`ACCEPTED. ${actorLabel(action.actor)} ${action.role} resolves.`);
  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    if (!pending) return;
    applyActionResourceCost(pending);
    applyEffect(pending);
    finalizeResolvedAction(pending.actor);
  });
}

function resolveChallenge() {
  if (state.phase !== PHASES.awaitingResponse) return;
  clearTimer();
  const action = state.pendingAction;
  if (!action || action.kind !== "role" || typeof action.cardIndex !== "number") return;
  const actor = action.actor;
  const challenger = opponentOf(actor);
  const card = state.players[actor].cards[action.cardIndex];
  const isReal = Boolean(card && card.isReal);
  markRoleReveal(actor, action.cardIndex, isReal);
  state.pendingChallengeResult = { actor, challenger, role: action.role, isReal };
  setCurrentAction(isReal ? "CHALLENGE! Result: FAILURE (Challenger loses 1 ❤️)" : "CHALLENGE! Result: SUCCESS (Liar loses 2 ❤️)");
  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    const result = state.pendingChallengeResult;
    if (!pending || !result) return;
    applyActionResourceCost(pending);
    if (result.isReal) {
      applyDamage(result.challenger, 1, "failed challenge");
      applyEffect(pending);
      if (playerHasRealRole(result.actor, "ELF")) applyGold(result.actor, 1, "ELF passive bonus");
      if (result.challenger === "bot") adjustSuspicion(result.role, -0.15);
    } else {
      applyDamage(result.actor, 2, "bluff penalty");
      if (result.challenger === "bot") adjustSuspicion(result.role, 0.24);
    }
    finalizeResolvedAction(result.actor);
  });
}

function applyEffect(action) {
  const actor = action.actor;
  const target = action.target;
  if (action.kind === "basic") {
    if (action.id === "INTEREST") applyGold(actor, 1, "INTEREST");
    if (action.id === "STRIKE") applyDamage(target, 1, "STRIKE");
    return;
  }
  switch (action.role) {
    case "SIREN":
      state.players[target].blockedActions += 1;
      break;
    case "DWARF":
      state.players[actor].shield = true;
      break;
    case "KNIGHT":
      applyDamage(target, 2, "KNIGHT");
      break;
    case "GOBLIN": {
      const amount = Math.min(1, state.players[target].gold);
      if (amount > 0) {
        applyGold(target, -amount, "GOBLIN steal");
        applyGold(actor, amount, "GOBLIN steal");
      }
      break;
    }
    case "ENT":
      applyHeal(actor, 2, "ENT");
      break;
    case "PIRATE":
      applyDamage(target, 1, "PIRATE");
      applyGold(actor, 1, "PIRATE");
      break;
    default:
      break;
  }
}

function applyDamage(playerKey, amount, source) {
  const player = state.players[playerKey];
  if (!player || amount <= 0 || player.hp <= 0) return 0;
  if (player.shield) {
    player.shield = false;
    pushDebugLog(`${actorLabel(playerKey)} blocked damage (${source}) with DWARF.`);
    triggerPlayerAnimation(playerKey, "damage");
    return 0;
  }
  const before = player.hp;
  player.hp = Math.max(0, before - amount);
  const dealt = before - player.hp;
  if (dealt > 0) triggerPlayerAnimation(playerKey, "damage");
  return dealt;
}

function applyHeal(playerKey, amount, source) {
  const player = state.players[playerKey];
  if (!player || amount <= 0 || player.hp <= 0) return 0;
  const before = player.hp;
  player.hp = Math.max(0, before + amount);
  const healed = player.hp - before;
  if (healed > 0) {
    triggerPlayerAnimation(playerKey, "heal");
    pushDebugLog(`${actorLabel(playerKey)} healed ${healed} (${source}).`);
  }
  return healed;
}

function applyGold(playerKey, delta, source) {
  const player = state.players[playerKey];
  if (!player || delta === 0) return 0;
  const before = player.gold;
  player.gold = Math.max(0, before + delta);
  const actual = player.gold - before;
  if (actual > 0) triggerPlayerAnimation(playerKey, "gold-up");
  if (actual < 0) triggerPlayerAnimation(playerKey, "gold-down");
  if (actual !== 0) pushDebugLog(`${actorLabel(playerKey)} gold ${actual > 0 ? "+" : ""}${actual} (${source}).`);
  return actual;
}

function gatherLegalActions(playerKey) {
  const player = state.players[playerKey];
  const actions = [{ kind: "basic", id: "INTEREST", label: "INTEREST", challengeable: false }];
  if (player.gold >= BASIC_ACTIONS.STRIKE.cost) {
    actions.push({ kind: "basic", id: "STRIKE", label: "STRIKE", challengeable: false });
  }
  player.cards.forEach((card, cardIndex) => {
    const meta = getRoleMeta(card.role);
    if (!meta || meta.passive) return;
    if (player.gold < meta.cost) return;
    if (!canUseRoleByUses(playerKey, card.role)) return;
    actions.push({
      kind: "role",
      id: card.role,
      role: card.role,
      label: card.role,
      cardIndex,
      isReal: card.isReal,
      challengeable: true
    });
  });
  return actions;
}

function getBotBluffRate() {
  const hpDiff = state.players.bot.hp - state.players.human.hp;
  if (hpDiff <= -2) return 0.4;
  if (hpDiff >= 2) return 0.15;
  return 0.25;
}

function expectedHumanDamagePressure() {
  const human = state.players.human;
  let pressure = 0;
  if (human.gold >= 2) pressure += 1;
  pressure += (1 - state.ai.suspicion.KNIGHT) * 0.8;
  pressure += (1 - state.ai.suspicion.PIRATE) * 0.4;
  return pressure;
}

function scoreBotAction(action) {
  const bot = state.players.bot;
  const human = state.players.human;
  let score = 0.6 + Math.random() * 0.45;

  if (action.kind === "basic") {
    if (action.id === "INTEREST") {
      score += bot.gold <= 1 ? 3.1 : 1.0;
      if (bot.hp <= 2) score -= 0.4;
      return score;
    }
    if (action.id === "STRIKE") {
      score += 2.2;
      if (human.hp <= 1) score += 8;
      else if (human.hp <= 2) score += 2.2;
      if (bot.gold <= 2) score -= 0.3;
      return score;
    }
  }

  switch (action.role) {
    case "KNIGHT":
      score += 3;
      if (human.hp <= 2) score += 8;
      else if (human.hp <= 3) score += 2.5;
      break;
    case "ENT":
      if (bot.hp <= 2) score += 5.4;
      else if (bot.hp <= 3) score += 2.8;
      else score += 0.7;
      break;
    case "GOBLIN":
      score += human.gold > 0 ? 2.6 : 0.3;
      if (human.gold >= 2) score += 1.2;
      break;
    case "DWARF":
      score += bot.shield ? -1.4 : 0.8;
      score += expectedHumanDamagePressure() >= 1 ? 1.9 : 0.4;
      break;
    case "SIREN":
      score += bot.hp + 1 <= human.hp ? 2.4 : 0.9;
      if (bot.gold < 2) score += 0.5;
      break;
    default:
      break;
  }

  if (!action.isReal) {
    const bluffRate = getBotBluffRate();
    score -= (1 - bluffRate) * 1.2;
    if (bot.hp + 2 <= human.hp) score += 0.6;
  }
  return score;
}

function chooseWeightedAction(scoredActions) {
  const top = scoredActions.slice(0, Math.min(3, scoredActions.length));
  const weights = top.map((item) => Math.max(0.2, item.score));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < top.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return top[i].action;
  }
  return top[0].action;
}

function botChooseAction() {
  const legal = gatherLegalActions("bot");
  if (legal.length === 0) return "INTEREST";
  const human = state.players.human;
  const bot = state.players.bot;

  const knightFinisher = legal.find((a) => a.kind === "role" && a.role === "KNIGHT" && human.hp <= 2);
  if (knightFinisher) return { kind: "card", cardIndex: knightFinisher.cardIndex };

  const strikeFinisher = legal.find((a) => a.kind === "basic" && a.id === "STRIKE" && human.hp <= 1);
  if (strikeFinisher && !knightFinisher) return "STRIKE";

  if (bot.gold <= 1) {
    const income = legal.find((a) => a.kind === "basic" && a.id === "INTEREST");
    const goblin = legal.find((a) => a.kind === "role" && a.role === "GOBLIN");
    if (goblin && human.gold >= 2 && Math.random() < 0.5) return { kind: "card", cardIndex: goblin.cardIndex };
    if (income) return "INTEREST";
  }

  const scored = legal.map((action) => ({ action, score: scoreBotAction(action) })).sort((a, b) => b.score - a.score);
  const bluffRate = getBotBluffRate();
  const best = scored[0];
  const fakeCandidates = scored.filter((item) => item.action.kind === "role" && item.action.isReal === false);
  if (best && best.action.kind === "role" && best.action.isReal && fakeCandidates.length > 0 && Math.random() < bluffRate) {
    const bestFake = fakeCandidates[0];
    if (bestFake.score >= best.score - 1.3) return { kind: "card", cardIndex: bestFake.action.cardIndex };
  }
  const picked = chooseWeightedAction(scored);
  return picked.kind === "basic" ? picked.id : { kind: "card", cardIndex: picked.cardIndex };
}

function botShouldChallenge(action) {
  if (!action || action.kind !== "role") return false;
  const role = action.role;
  const suspicion = state.ai.suspicion[role] ?? 0.35;
  const bot = state.players.bot;
  const human = state.players.human;

  let preventedSwing = 1;
  switch (role) {
    case "KNIGHT":
      preventedSwing = 2.8;
      break;
    case "ENT":
      preventedSwing = 2.3;
      break;
    case "SIREN":
      preventedSwing = 1.9;
      break;
    case "GOBLIN":
      preventedSwing = 1.4 + (bot.gold <= 1 ? 0.4 : 0);
      break;
    case "PIRATE":
      preventedSwing = 2.0;
      break;
    case "DWARF":
      preventedSwing = 1.2;
      break;
    default:
      break;
  }
  if (role === "KNIGHT" && bot.hp <= 2) return true;
  if (role === "ENT" && human.hp <= 2) preventedSwing += 0.5;
  if (role === "GOBLIN" && bot.gold === 0) preventedSwing -= 0.6;
  const hpSafety = bot.hp <= 1 ? -1 : bot.hp <= 2 ? -0.4 : 0;
  const expectedValue = suspicion * preventedSwing - (1 - suspicion) * 1.05 + hpSafety;
  return expectedValue > 0.12;
}

async function botTakeTurn() {
  if (state.phase !== PHASES.choosingAction || state.currentActor !== "bot") return;
  state.thinking = true;
  updateUI();
  await wait(randomInt(MATCH_SETTINGS.BOT_THINK_MIN_MS, MATCH_SETTINGS.BOT_THINK_MAX_MS));
  state.thinking = false;
  if (state.phase !== PHASES.choosingAction || state.currentActor !== "bot") {
    updateUI();
    return;
  }
  playAction(botChooseAction());
}

async function botRespondToClaim() {
  state.thinking = true;
  updateUI();
  await wait(randomInt(MATCH_SETTINGS.BOT_THINK_MIN_MS, MATCH_SETTINGS.BOT_THINK_MAX_MS));
  state.thinking = false;
  if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== "bot") {
    updateUI();
    return;
  }
  if (botShouldChallenge(state.pendingAction)) resolveChallenge();
  else resolveAccept();
}

function makeCardArt(container, role) {
  const src = `assets/cards/${role.toLowerCase()}.png`;
  if (cardArtStatus[src] === false) return null;
  const image = document.createElement("img");
  image.className = "card-art";
  image.alt = `${role} card art`;
  image.src = src;
  image.addEventListener("load", () => {
    cardArtStatus[src] = true;
    container.classList.add("has-art");
  });
  image.addEventListener("error", () => {
    cardArtStatus[src] = false;
    image.remove();
    container.classList.remove("has-art");
  });
  return image;
}

function createRoleCardNode({ owner, card, cardIndex = null, asButton = false, disabled = false }) {
  const node = asButton ? document.createElement("button") : document.createElement("div");
  node.className = "role-card";
  if (asButton) {
    node.type = "button";
    node.dataset.cardIndex = String(cardIndex);
  }
  if (owner === "human") node.classList.add(card.isReal ? "real-role" : "fake-role");
  else {
    node.classList.add("bot-role-card");
    if (card.confirmed) node.classList.add("bot-card-confirmed");
    else if (card.revealedUsed) node.classList.add("bot-card-played");
  }
  const art = makeCardArt(node, card.role);
  if (art) node.appendChild(art);

  const meta = getRoleMeta(card.role);
  if (meta && meta.cost > 0) {
    const cost = document.createElement("span");
    cost.className = "card-cost";
    cost.textContent = String(meta.cost);
    node.appendChild(cost);
  }
  if (meta && meta.passive) {
    const passive = document.createElement("span");
    passive.className = "card-passive";
    passive.textContent = "PASSIVE";
    node.appendChild(passive);
  }
  const usesLeft = getRoleUsesLeft(owner, card.role);
  if (usesLeft !== null) {
    const uses = document.createElement("span");
    uses.className = "card-uses";
    uses.textContent = `USES: ${usesLeft} left`;
    node.appendChild(uses);
  }
  const label = document.createElement("p");
  label.className = "card-label";
  label.textContent = card.role;
  node.appendChild(label);
  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = meta ? meta.description : "";
  node.appendChild(desc);

  if (asButton && disabled) {
    node.disabled = true;
    node.classList.add("is-disabled");
  }
  return node;
}

function renderBotCards() {
  ui.botCards.innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.players.bot.cards.forEach((card) => {
    fragment.appendChild(createRoleCardNode({ owner: "bot", card, asButton: false }));
  });
  ui.botCards.appendChild(fragment);
}

function renderHumanCards() {
  ui.humanCards.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const human = state.players.human;
  const canAct = state.phase === PHASES.choosingAction && state.currentActor === "human";
  human.cards.forEach((card, index) => {
    const meta = getRoleMeta(card.role);
    let enabled = canAct && Boolean(meta) && !meta.passive;
    if (enabled) {
      if (human.gold < meta.cost) enabled = false;
      if (!canUseRoleByUses("human", card.role)) enabled = false;
    }
    fragment.appendChild(
      createRoleCardNode({ owner: "human", card, cardIndex: index, asButton: true, disabled: !enabled })
    );
  });
  ui.humanCards.appendChild(fragment);
}

function triggerAnimation(element, className) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  element.addEventListener(
    "animationend",
    () => {
      element.classList.remove(className);
    },
    { once: true }
  );
}

function triggerPlayerAnimation(playerKey, type) {
  const panel = playerKey === "human" ? ui.humanPanel : ui.botPanel;
  const hpText = playerKey === "human" ? ui.humanHpText : ui.botHpText;
  const goldText = playerKey === "human" ? ui.humanGoldText : ui.botGoldText;
  if (type === "damage") {
    triggerAnimation(panel, "anim-damage");
    triggerAnimation(hpText, "anim-damage");
    return;
  }
  if (type === "heal") {
    triggerAnimation(panel, "anim-heal");
    triggerAnimation(hpText, "anim-heal");
    return;
  }
  if (type === "gold-up") {
    triggerAnimation(goldText, "anim-gold-up");
    return;
  }
  if (type === "gold-down") triggerAnimation(goldText, "anim-gold-down");
}

function setupFigureFallback(imageNode, fallbackNode) {
  const showFallback = () => {
    imageNode.classList.add("hidden");
    fallbackNode.classList.remove("hidden");
  };
  const showImage = () => {
    imageNode.classList.remove("hidden");
    fallbackNode.classList.add("hidden");
  };
  imageNode.addEventListener("error", showFallback);
  imageNode.addEventListener("load", showImage);
  if (imageNode.complete) {
    if (imageNode.naturalWidth > 0) showImage();
    else showFallback();
  }
}

function getTurnIndicatorText() {
  if (state.view !== "game") return "";
  if (state.phase === PHASES.choosingAction) {
    return state.currentActor === "human" ? "Your turn" : state.thinking ? "Bot thinking..." : "Bot turn";
  }
  if (state.phase === PHASES.awaitingResponse) {
    return state.pendingResponder === "human" ? "Your decision" : state.thinking ? "Bot thinking..." : "Bot deciding";
  }
  if (state.phase === PHASES.resolvingDelay || state.phase === PHASES.applyingEffects) return "Resolving...";
  return "Waiting...";
}

function getResultWinnerText() {
  if (state.matchWinner === "human") return "YOU WIN";
  if (state.matchWinner === "bot") return "BOT WINS";
  return "DRAW";
}

function updateUI() {
  const human = state.players.human;
  const bot = state.players.bot;
  ui.menuScreen.classList.toggle("hidden", state.view !== "menu");
  ui.gameScreen.classList.toggle("hidden", state.view !== "game");
  ui.resultScreen.classList.toggle("hidden", state.view !== "result");
  ui.menuLevelText.textContent = `Level ${state.progression.level}`;
  ui.smallLevelText.textContent = `Lv.${state.progression.level}`;
  ui.roundLabel.textContent = `ROUND ${Math.min(state.round, MATCH_SETTINGS.MAX_ROUNDS)}/${MATCH_SETTINGS.MAX_ROUNDS}`;
  ui.timerText.textContent = state.timer.mode ? `${state.timer.remaining}s` : "--";
  ui.turnIndicator.textContent = getTurnIndicatorText();
  ui.currentActionText.textContent = state.currentActionText;

  ui.humanHpText.textContent = `❤️ HP: ${human.hp}${human.shield ? " • 🛡️" : ""}`;
  ui.humanGoldText.textContent = `🪙 Gold: ${human.gold}`;
  ui.botHpText.textContent = `❤️ HP: ${bot.hp}${bot.shield ? " • 🛡️" : ""}`;
  ui.botGoldText.textContent = `🪙 Gold: ${bot.gold}`;

  const humanCanAct = state.phase === PHASES.choosingAction && state.currentActor === "human";
  ui.interestBtn.disabled = !humanCanAct;
  ui.strikeBtn.disabled = !humanCanAct || human.gold < BASIC_ACTIONS.STRIKE.cost;

  renderBotCards();
  renderHumanCards();

  const showResponse = state.view === "game" && state.phase === PHASES.awaitingResponse && state.pendingResponder === "human";
  ui.responseOverlay.classList.toggle("hidden", !showResponse);

  ui.resultWinnerText.textContent = getResultWinnerText();
  ui.resultSummaryText.textContent = state.matchEndReason || "Match complete.";
  ui.resultStatsText.textContent = `You: ${human.hp} HP, ${human.gold} Gold | Bot: ${bot.hp} HP, ${bot.gold} Gold`;
  ui.resultLevelText.textContent = `Level ${state.progression.level}`;
  ui.resultXpText.textContent = `${state.progression.xp} / ${MATCH_SETTINGS.LEVEL_UP_XP} XP`;
  ui.resultXpFill.style.width = `${clamp((state.progression.xp / MATCH_SETTINGS.LEVEL_UP_XP) * 100, 0, 100)}%`;
}

function onHumanCardClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button[data-card-index]");
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const cardIndex = Number(button.dataset.cardIndex);
  if (Number.isNaN(cardIndex)) return;
  playAction({ kind: "card", cardIndex });
}

function onHumanResponse(choice) {
  if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== "human") return;
  if (choice === "CHALLENGE") resolveChallenge();
  else resolveAccept();
}

function openModal(modalNode) {
  if (!(modalNode instanceof HTMLElement)) return;
  modalNode.classList.remove("hidden");
  modalState.activeModal = modalNode;
}

function closeModal(modalNode = modalState.activeModal) {
  if (!(modalNode instanceof HTMLElement)) return;
  modalNode.classList.add("hidden");
  if (modalState.activeModal === modalNode) modalState.activeModal = null;
}

function bindModalDismiss(modalNode, closeButtonNode) {
  if (closeButtonNode instanceof HTMLElement) {
    closeButtonNode.addEventListener("click", () => closeModal(modalNode));
  }
  if (modalNode instanceof HTMLElement) {
    modalNode.addEventListener("click", (event) => {
      if (event.target === modalNode) closeModal(modalNode);
    });
  }
}

function bindEvents() {
  ui.startMatchBtn.addEventListener("click", () => startNewMatch());
  ui.rulesBtn.addEventListener("click", () => openModal(ui.rulesModal));
  ui.interestBtn.addEventListener("click", () => playAction("INTEREST"));
  ui.strikeBtn.addEventListener("click", () => playAction("STRIKE"));
  ui.humanCards.addEventListener("click", onHumanCardClick);
  ui.acceptBtn.addEventListener("click", () => onHumanResponse("ACCEPT"));
  ui.challengeBtn.addEventListener("click", () => onHumanResponse("CHALLENGE"));
  ui.playAgainBtn.addEventListener("click", () => startNewMatch());
  ui.backToMenuBtn.addEventListener("click", () => showMenu());
  bindModalDismiss(ui.rulesModal, ui.rulesCloseBtn);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function cacheElements() {
  ui.menuScreen = document.getElementById("menuScreen");
  ui.menuLevelText = document.getElementById("menuLevelText");
  ui.startMatchBtn = document.getElementById("startMatchBtn");
  ui.gameScreen = document.getElementById("gameScreen");
  ui.roundLabel = document.getElementById("roundLabel");
  ui.timerText = document.getElementById("timerText");
  ui.turnIndicator = document.getElementById("turnIndicator");
  ui.smallLevelText = document.getElementById("smallLevelText");
  ui.currentActionText = document.getElementById("currentActionText");
  ui.rulesBtn = document.getElementById("rulesBtn");
  ui.rulesModal = document.getElementById("rulesModal");
  ui.rulesCloseBtn = document.getElementById("rulesCloseBtn");
  ui.botPanel = document.getElementById("botPanel");
  ui.humanPanel = document.getElementById("humanPanel");
  ui.botCards = document.getElementById("botCards");
  ui.humanCards = document.getElementById("humanCards");
  ui.botHpText = document.getElementById("botHpText");
  ui.botGoldText = document.getElementById("botGoldText");
  ui.humanHpText = document.getElementById("humanHpText");
  ui.humanGoldText = document.getElementById("humanGoldText");
  ui.interestBtn = document.getElementById("interestBtn");
  ui.strikeBtn = document.getElementById("strikeBtn");
  ui.responseOverlay = document.getElementById("responseOverlay");
  ui.acceptBtn = document.getElementById("acceptBtn");
  ui.challengeBtn = document.getElementById("challengeBtn");
  ui.resultScreen = document.getElementById("resultScreen");
  ui.resultWinnerText = document.getElementById("resultWinnerText");
  ui.resultSummaryText = document.getElementById("resultSummaryText");
  ui.resultStatsText = document.getElementById("resultStatsText");
  ui.resultLevelText = document.getElementById("resultLevelText");
  ui.resultXpText = document.getElementById("resultXpText");
  ui.resultXpFill = document.getElementById("resultXpFill");
  ui.playAgainBtn = document.getElementById("playAgainBtn");
  ui.backToMenuBtn = document.getElementById("backToMenuBtn");
  ui.botFigureImg = document.getElementById("botFigureImg");
  ui.botFigureFallback = document.getElementById("botFigureFallback");
  ui.humanFigureImg = document.getElementById("humanFigureImg");
  ui.humanFigureFallback = document.getElementById("humanFigureFallback");
}

function init() {
  cacheElements();
  setupFigureFallback(ui.botFigureImg, ui.botFigureFallback);
  setupFigureFallback(ui.humanFigureImg, ui.humanFigureFallback);
  bindEvents();
  showMenu();
}

window.addEventListener("DOMContentLoaded", init);

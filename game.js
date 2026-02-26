"use strict";

const PHASES = Object.freeze({
  idle: "idle",
  choosingAction: "choosingAction",
  awaitingResponse: "awaitingResponse",
  resolvingDelay: "resolvingDelay",
  applyingEffects: "applyingEffects",
  matchEnd: "matchEnd"
});

const APP_SCREENS = Object.freeze({
  home: "home",
  mode: "mode",
  friend: "friend",
  waiting: "waiting",
  game: "game",
  result: "result"
});

const EVENT_TYPES = Object.freeze(["HELLO", "START", "ACTION", "RESPONSE", "TIMEOUT_FORCED", "SYNC"]);

const MATCH_SETTINGS = Object.freeze({
  START_HP: 5,
  START_GOLD: 2,
  MAX_ROUNDS: 10,
  ACTIONS_PER_ROUND: 2,
  HUMAN_TIMER_SECONDS: 120,
  BOT_THINK_MIN_MS: 500,
  BOT_THINK_MAX_MS: 900,
  RESOLUTION_DELAY_MS: 2500,
  MAX_EVENT_ENTRIES: 200
});

const ROLE_CONFIG = Object.freeze({
  SIREN: Object.freeze({ name: "SIREN", cost: 0, description: "Skip next turn", passive: false }),
  DWARF: Object.freeze({ name: "DWARF", cost: 1, description: "Shield next DMG", passive: false }),
  KNIGHT: Object.freeze({ name: "KNIGHT", cost: 2, description: "2 DMG", passive: false }),
  GOBLIN: Object.freeze({ name: "GOBLIN", cost: 0, description: "Steal 1 Gold", maxUses: 3, passive: false }),
  ENT: Object.freeze({ name: "ENT", cost: 2, description: "+2 HP", passive: false }),
  ELF: Object.freeze({ name: "ELF", cost: 0, description: "Passive: +1 Gold on defend", passive: true }),
  PIRATE: Object.freeze({ name: "PIRATE", cost: 0, description: "1 DMG +1 Gold", maxUses: 2, passive: false })
});

const BASIC_ACTIONS = Object.freeze({
  INTEREST: Object.freeze({ id: "INTEREST", cost: 0, description: "+1 Gold", challengeable: false }),
  STRIKE: Object.freeze({ id: "STRIKE", cost: 2, description: "Deal 1 DMG", challengeable: false })
});

const AVATAR_PRESETS = Object.freeze({
  "avatar-1": Object.freeze({ id: "avatar-1", label: "Avatar 1", className: "avatar-1" }),
  "avatar-2": Object.freeze({ id: "avatar-2", label: "Avatar 2", className: "avatar-2" }),
  "avatar-3": Object.freeze({ id: "avatar-3", label: "Avatar 3", className: "avatar-3" }),
  "avatar-bot": Object.freeze({ id: "avatar-bot", label: "Bot", className: "avatar-bot" })
});

const ui = {};
const modalState = { activeModal: null };

const state = {
  screen: APP_SCREENS.home,
  mode: null,
  profile: { name: "Player", avatarId: "avatar-1", level: 1 },
  friend: {
    roomId: "",
    role: null,
    link: "",
    startInFlight: false,
    pendingRequest: null
  },
  localSlot: "human",
  slots: {
    human: { id: "local-human", name: "Player", avatarId: "avatar-1" },
    bot: { id: "bot-ai", name: "Bot", avatarId: "avatar-bot" }
  },
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
  timer: { mode: null, remaining: 0, expiresAt: 0, intervalId: null, timeoutId: null, token: 0 },
  ai: { suspicion: createSuspicionMap() },
  players: { human: createPlayerState("human"), bot: createPlayerState("bot") }
};

const net = {
  client: null,
  channel: null,
  roomId: "",
  role: null,
  playerId: createPlayerId(),
  hostId: null,
  connectedCount: 0,
  presenceById: Object.create(null),
  seq: 0,
  lastSeq: 0,
  pendingCanonical: new Map(),
  syncTimerId: null,
  requestCache: new Set(),
  supabaseReady: false,

  async initSupabase() {
    if (this.supabaseReady && this.client) return true;
    const rawConfig = window.LIARS_CLASH_SUPABASE_CONFIG || {};
    const supabaseUrl = typeof rawConfig.url === "string" ? rawConfig.url.trim() : "";
    const supabaseAnonKey = typeof rawConfig.anonKey === "string" ? rawConfig.anonKey.trim() : "";
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Supabase] Missing URL or anon key in supabase-config.js.");
      return false;
    }
    try {
      const supa = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      this.client = supa.createClient(supabaseUrl, supabaseAnonKey);
      this.supabaseReady = true;
      window.liarsClashSupabase = this.client;
      console.log("[Supabase] Client initialized.");
      return true;
    } catch (error) {
      console.error("[Supabase] Failed to initialize:", error);
      return false;
    }
  },

  async joinRoom(roomId, role) {
    const ok = await this.initSupabase();
    if (!ok) return false;
    await this.leaveRoom();

    this.roomId = roomId;
    this.role = role;
    this.hostId = role === "host" ? this.playerId : null;
    this.connectedCount = 0;
    this.presenceById = Object.create(null);
    this.seq = 0;
    this.lastSeq = 0;
    this.pendingCanonical.clear();
    this.requestCache.clear();

    const channel = this.client.channel(`room:${roomId}`, {
      config: { broadcast: { self: true }, presence: { key: this.playerId } }
    });

    channel.on("presence", { event: "sync" }, () => {
      this.handlePresenceSync();
    });

    channel.on("presence", { event: "join" }, () => {
      this.handlePresenceSync();
    });

    channel.on("presence", { event: "leave" }, () => {
      this.handlePresenceSync();
    });

    EVENT_TYPES.forEach((eventType) => {
      channel.on("broadcast", { event: eventType }, ({ payload }) => {
        void this.handleEvent(payload);
      });
    });

    this.channel = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            name: safePlayerName(state.profile.name),
            avatarId: normalizeAvatarId(state.profile.avatarId),
            role: this.role
          });
        } catch (error) {
          console.error("[Supabase] Presence track failed:", error);
        }
        await this.sendEvent(
          "HELLO",
          {
            joined: true,
            role: this.role,
            name: safePlayerName(state.profile.name),
            avatarId: normalizeAvatarId(state.profile.avatarId)
          },
          { actorId: this.playerId }
        );
      }
    });

    return true;
  },

  async leaveRoom() {
    if (!this.channel) {
      this.roomId = "";
      this.role = null;
      this.hostId = null;
      this.connectedCount = 0;
      this.presenceById = Object.create(null);
      this.pendingCanonical.clear();
      this.requestCache.clear();
      this.seq = 0;
      this.lastSeq = 0;
      return;
    }
    try {
      await this.channel.unsubscribe();
    } catch (error) {
      console.error("[Supabase] Leave room failed:", error);
    }
    this.channel = null;
    this.roomId = "";
    this.role = null;
    this.hostId = null;
    this.connectedCount = 0;
    this.presenceById = Object.create(null);
    this.pendingCanonical.clear();
    this.requestCache.clear();
    this.seq = 0;
    this.lastSeq = 0;
    clearSyncTimer();
  },

  handlePresenceSync() {
    if (!this.channel) return;
    const rawState = this.channel.presenceState();
    this.presenceById = Object.create(null);

    Object.entries(rawState).forEach(([key, value]) => {
      if (!Array.isArray(value) || value.length === 0) return;
      const latest = value[value.length - 1] || {};
      this.presenceById[key] = {
        name: safePlayerName(latest.name || "Player"),
        avatarId: normalizeAvatarId(latest.avatarId || "avatar-1"),
        role: latest.role === "host" ? "host" : "guest"
      };
    });

    this.connectedCount = Object.keys(this.presenceById).length;
    const hostEntry = Object.entries(this.presenceById).find(([, payload]) => payload.role === "host");
    if (hostEntry) this.hostId = hostEntry[0];

    updateUI();

    if (state.mode === "friend" && this.role === "host" && this.connectedCount === 2 && state.screen === APP_SCREENS.waiting) {
      void startFriendMatchAsHost();
    }
  },

  async sendEvent(type, payload, options = {}) {
    if (!this.channel || !EVENT_TYPES.includes(type)) return;
    const canonical = Boolean(options.canonical);
    let seq = 0;
    if (canonical) {
      this.seq += 1;
      seq = this.seq;
    } else if (typeof options.seq === "number") {
      seq = options.seq;
    }

    const envelope = {
      type,
      seq,
      actorId: options.actorId || this.playerId,
      ts: Date.now(),
      senderId: this.playerId,
      roomId: this.roomId,
      payload
    };

    try {
      await this.channel.send({
        type: "broadcast",
        event: type,
        payload: envelope
      });
    } catch (error) {
      console.error(`[Supabase] Failed to send ${type}:`, error);
      return;
    }

    if (options.applyLocal) {
      await this.handleEvent(envelope, true);
    }
  },

  async handleEvent(msg, isLocalEcho = false) {
    if (!msg || typeof msg !== "object") return;
    if (msg.roomId && this.roomId && msg.roomId !== this.roomId) return;

    if (msg.type === "HELLO") {
      if (this.role === "host" && msg.senderId !== this.playerId) {
        if (msg.payload && msg.payload.needSync) {
          await this.sendSyncSnapshot();
        }
        if (msg.payload && msg.payload.requestRestart && state.mode === "friend" && state.screen === APP_SCREENS.result) {
          if (this.connectedCount === 2) await startFriendMatchAsHost();
        }
      }
      return;
    }

    const isCanonical = msg.seq > 0 && msg.senderId === this.hostId;

    if (isCanonical) {
      if (msg.seq <= this.lastSeq) return;
      if (!this.pendingCanonical.has(msg.seq)) {
        this.pendingCanonical.set(msg.seq, msg);
      }
      await this.processCanonicalQueue();
      return;
    }

    if (this.role !== "host") return;
    if (!isLocalEcho && msg.senderId === this.playerId) return;

    if (msg.type === "ACTION") {
      await this.handleGuestActionRequest(msg);
      return;
    }

    if (msg.type === "RESPONSE") {
      await this.handleGuestResponseRequest(msg);
    }
  },

  async processCanonicalQueue() {
    while (this.pendingCanonical.has(this.lastSeq + 1)) {
      const nextSeq = this.lastSeq + 1;
      const evt = this.pendingCanonical.get(nextSeq);
      this.pendingCanonical.delete(nextSeq);
      this.lastSeq = nextSeq;
      await this.applyCanonicalEvent(evt);
    }

    if (this.pendingCanonical.size > 0 && this.role !== "host") {
      scheduleSyncRequest();
    } else {
      clearSyncTimer();
    }
  },

  async applyCanonicalEvent(msg) {
    if (!msg) return;
    switch (msg.type) {
      case "START":
        applyFriendStart(msg.payload);
        break;
      case "ACTION":
        state.friend.pendingRequest = null;
        applyCanonicalAction(msg.payload);
        break;
      case "RESPONSE":
        state.friend.pendingRequest = null;
        applyCanonicalResponse(msg.payload);
        break;
      case "TIMEOUT_FORCED":
        state.friend.pendingRequest = null;
        applyCanonicalTimeout(msg.payload);
        break;
      case "SYNC":
        applySyncPayload(msg.payload);
        break;
      default:
        break;
    }
  },

  async handleGuestActionRequest(msg) {
    const payload = msg.payload || {};
    const requestId = String(payload.requestId || "");
    if (requestId) {
      if (this.requestCache.has(requestId)) return;
      this.requestCache.add(requestId);
      if (this.requestCache.size > 200) {
        this.requestCache = new Set(Array.from(this.requestCache).slice(-120));
      }
    }

    if (state.screen !== APP_SCREENS.game) return;
    if (state.phase !== PHASES.choosingAction) return;
    if (payload.actorSlot !== state.currentActor) return;
    if (!state.slots[payload.actorSlot] || state.slots[payload.actorSlot].id !== msg.senderId) return;

    await this.sendEvent(
      "ACTION",
      {
        actorSlot: payload.actorSlot,
        input: payload.input
      },
      {
        canonical: true,
        actorId: state.slots[payload.actorSlot].id,
        applyLocal: true
      }
    );
  },

  async handleGuestResponseRequest(msg) {
    const payload = msg.payload || {};
    const requestId = String(payload.requestId || "");
    if (requestId) {
      if (this.requestCache.has(requestId)) return;
      this.requestCache.add(requestId);
      if (this.requestCache.size > 200) {
        this.requestCache = new Set(Array.from(this.requestCache).slice(-120));
      }
    }

    if (state.screen !== APP_SCREENS.game) return;
    if (state.phase !== PHASES.awaitingResponse) return;
    if (payload.actorSlot !== state.pendingResponder) return;
    if (!state.slots[payload.actorSlot] || state.slots[payload.actorSlot].id !== msg.senderId) return;

    await this.sendEvent(
      "RESPONSE",
      {
        actorSlot: payload.actorSlot,
        choice: payload.choice
      },
      {
        canonical: true,
        actorId: state.slots[payload.actorSlot].id,
        applyLocal: true
      }
    );
  },

  async sendSyncSnapshot() {
    if (this.role !== "host") return;
    await this.sendEvent(
      "SYNC",
      {
        snapshot: buildSyncSnapshot()
      },
      {
        canonical: true,
        actorId: this.playerId
      }
    );
  }
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

function createPlayerId() {
  return `p-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
}

function createShortRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

function getRoomIdFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const room = (query.get("room") || "").trim().toLowerCase();
  return room ? room.replace(/[^a-z0-9-]/g, "").slice(0, 24) : "";
}

function setRoomIdInUrl(roomId) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.replaceState({}, "", url.toString());
}

function safePlayerName(name) {
  const cleaned = String(name || "Player")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
  return cleaned || "Player";
}

function normalizeAvatarId(value) {
  return AVATAR_PRESETS[value] ? value : "avatar-1";
}

function getAvatarMeta(avatarId) {
  return AVATAR_PRESETS[normalizeAvatarId(avatarId)] || AVATAR_PRESETS["avatar-1"];
}

function opponentOf(slot) {
  return slot === "human" ? "bot" : "human";
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

function shuffleInPlace(list, rng = Math.random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function shuffle(list, rng = Math.random) {
  return shuffleInPlace([...list], rng);
}

function createSeededRng(seedText) {
  let seed = 2166136261;
  const text = String(seedText || "seed");
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function clearSyncTimer() {
  if (net.syncTimerId) {
    clearTimeout(net.syncTimerId);
    net.syncTimerId = null;
  }
}

function scheduleSyncRequest() {
  if (net.syncTimerId || net.role === "host") return;
  net.syncTimerId = setTimeout(() => {
    net.syncTimerId = null;
    if (net.pendingCanonical.size === 0) return;
    void net.sendEvent(
      "HELLO",
      {
        needSync: true,
        lastSeq: net.lastSeq
      },
      {
        actorId: net.playerId,
        seq: 0
      }
    );
  }, 1300);
}

function getRoleMeta(role) {
  return ROLE_CONFIG[role] || null;
}

function getPlayableRoles() {
  return Object.keys(ROLE_CONFIG).filter((role) => !ROLE_CONFIG[role].passive);
}

function getAllRoles() {
  const pool = [...getPlayableRoles(), "ELF"];
  return pool.filter((item, idx, list) => list.indexOf(item) === idx);
}

function createCard(role, isReal, index) {
  return { role, isReal, index, revealedUsed: false, confirmed: false };
}

function pickUnique(pool, count, rng = Math.random) {
  return shuffle(pool, rng).slice(0, count);
}

function buildLoadoutForPlayer(rng, shuffleCards) {
  const allPool = getAllRoles();
  const fakePool = getPlayableRoles();
  const realRoles = pickUnique(allPool, 2, rng);
  const fakeRoles = pickUnique(
    fakePool.filter((role) => !realRoles.includes(role)),
    2,
    rng
  );

  const cards = [];
  realRoles.forEach((role, idx) => cards.push(createCard(role, true, idx)));
  fakeRoles.forEach((role, idx) => cards.push(createCard(role, false, idx + 2)));

  const ordered = shuffleCards ? shuffle(cards, rng) : cards;
  const normalized = ordered.map((card, index) => ({ ...card, index }));

  return {
    realRoles,
    fakeRoles,
    cards: normalized
  };
}

function buildDeterministicLoadout(seedText) {
  const rngHuman = createSeededRng(`${seedText}:human`);
  const rngBot = createSeededRng(`${seedText}:bot`);
  return {
    human: buildLoadoutForPlayer(rngHuman, true),
    bot: buildLoadoutForPlayer(rngBot, true)
  };
}

function applyLoadoutToPlayer(playerKey, loadout) {
  const player = state.players[playerKey];
  if (!player || !loadout) return;
  player.realRoles = Array.isArray(loadout.realRoles) ? [...loadout.realRoles] : [];
  player.fakeRoles = Array.isArray(loadout.fakeRoles) ? [...loadout.fakeRoles] : [];
  player.cards = Array.isArray(loadout.cards)
    ? loadout.cards.map((card, idx) => ({
        role: card.role,
        isReal: Boolean(card.isReal),
        index: idx,
        revealedUsed: Boolean(card.revealedUsed),
        confirmed: Boolean(card.confirmed)
      }))
    : [];
}

function assignRandomRolesForBotMatch() {
  const humanPack = buildLoadoutForPlayer(Math.random, false);
  const botPack = buildLoadoutForPlayer(Math.random, true);
  applyLoadoutToPlayer("human", humanPack);
  applyLoadoutToPlayer("bot", botPack);
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

function resetMatchState(options = {}) {
  clearTimer();
  cancelResolutionQueue();
  state.friend.pendingRequest = null;

  state.players.human = createPlayerState("human");
  state.players.bot = createPlayerState("bot");
  state.ai.suspicion = createSuspicionMap();

  if (options.loadout && options.loadout.human && options.loadout.bot) {
    applyLoadoutToPlayer("human", options.loadout.human);
    applyLoadoutToPlayer("bot", options.loadout.bot);
  } else {
    assignRandomRolesForBotMatch();
  }

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
  state.events = [];
  state.startingActor = options.startingActor === "bot" ? "bot" : options.startingActor === "human" ? "human" : Math.random() < 0.5 ? "human" : "bot";
  state.currentActionText = "Ready.";
}

function slotName(slot) {
  const name = state.slots[slot] && state.slots[slot].name ? state.slots[slot].name : slot;
  return String(name || slot).trim() || slot;
}

function slotLabel(slot) {
  return slotName(slot).toUpperCase();
}

function runToModeScreen() {
  state.screen = APP_SCREENS.mode;
  updateUI();
}

async function backToMenu() {
  clearTimer();
  cancelResolutionQueue();
  state.phase = PHASES.idle;
  state.matchWinner = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.friend.pendingRequest = null;
  state.friend.startInFlight = false;

  if (state.mode === "friend" || net.channel) {
    await net.leaveRoom();
  }

  state.mode = null;
  state.friend.roomId = "";
  state.friend.role = null;
  state.friend.link = "";

  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  state.slots.bot = { id: "bot-ai", name: "Bot", avatarId: "avatar-bot" };
  state.localSlot = "human";

  setRoomIdInUrl("");
  state.screen = APP_SCREENS.home;
  closeModal();
  updateUI();
}

function startBotMatch() {
  state.mode = "bot";
  state.friend.roomId = "";
  state.friend.role = null;
  state.friend.link = "";

  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  state.slots.bot = { id: "bot-ai", name: "Bot", avatarId: "avatar-bot" };
  state.localSlot = "human";

  resetMatchState();
  state.screen = APP_SCREENS.game;
  setCurrentAction("Match started.");
  updateUI();
  setTimeout(() => beginTurn(), 220);
}

function createFriendLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  return url.toString();
}

async function createFriendRoomAsHost() {
  const roomId = createShortRoomId();
  state.mode = "friend";
  state.friend.role = "host";
  state.friend.roomId = roomId;
  state.friend.link = createFriendLink(roomId);
  state.friend.startInFlight = false;
  state.friend.pendingRequest = null;
  state.localSlot = "human";

  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  state.slots.bot = { id: "pending-guest", name: "Friend", avatarId: "avatar-2" };

  setRoomIdInUrl(roomId);
  state.screen = APP_SCREENS.waiting;
  updateUI();

  const joined = await net.joinRoom(roomId, "host");
  if (!joined) {
    setCurrentAction("Supabase connection failed.");
    return;
  }

  updateUI();
}

async function joinFriendRoomAsGuest(roomId) {
  state.mode = "friend";
  state.friend.role = "guest";
  state.friend.roomId = roomId;
  state.friend.link = createFriendLink(roomId);
  state.friend.startInFlight = false;
  state.friend.pendingRequest = null;

  setRoomIdInUrl(roomId);
  state.screen = APP_SCREENS.waiting;
  updateUI();

  const joined = await net.joinRoom(roomId, "guest");
  if (!joined) {
    setCurrentAction("Supabase connection failed.");
    return;
  }

  await net.sendEvent(
    "HELLO",
    {
      joined: true,
      role: "guest",
      name: safePlayerName(state.profile.name),
      avatarId: normalizeAvatarId(state.profile.avatarId),
      needSync: true
    },
    {
      actorId: net.playerId,
      seq: 0
    }
  );
}

function buildFriendStartPayload() {
  const hostPresence = net.presenceById[net.playerId] || {
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId),
    role: "host"
  };

  const guestEntry = Object.entries(net.presenceById).find(([id]) => id !== net.playerId);
  if (!guestEntry) return null;

  const [guestId, guestPresenceRaw] = guestEntry;
  const guestPresence = guestPresenceRaw || { name: "Guest", avatarId: "avatar-2" };

  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const loadout = buildDeterministicLoadout(seed);
  const starterRng = createSeededRng(`${seed}:starter`);

  return {
    matchSeed: seed,
    startingActor: starterRng() < 0.5 ? "human" : "bot",
    players: {
      human: {
        id: net.playerId,
        name: safePlayerName(hostPresence.name),
        avatarId: normalizeAvatarId(hostPresence.avatarId),
        realRoles: loadout.human.realRoles,
        fakeRoles: loadout.human.fakeRoles,
        cards: loadout.human.cards
      },
      bot: {
        id: guestId,
        name: safePlayerName(guestPresence.name),
        avatarId: normalizeAvatarId(guestPresence.avatarId),
        realRoles: loadout.bot.realRoles,
        fakeRoles: loadout.bot.fakeRoles,
        cards: loadout.bot.cards
      }
    }
  };
}

async function startFriendMatchAsHost() {
  if (state.mode !== "friend") return;
  if (net.role !== "host") return;
  if (state.friend.startInFlight) return;
  if (net.connectedCount < 2) return;

  const payload = buildFriendStartPayload();
  if (!payload) return;

  state.friend.startInFlight = true;
  await net.sendEvent("START", payload, {
    canonical: true,
    actorId: net.playerId,
    applyLocal: true
  });
}

function applyFriendStart(payload) {
  if (!payload || !payload.players || !payload.players.human || !payload.players.bot) return;

  state.mode = "friend";
  state.friend.startInFlight = false;

  state.slots.human = {
    id: payload.players.human.id,
    name: safePlayerName(payload.players.human.name),
    avatarId: normalizeAvatarId(payload.players.human.avatarId)
  };
  state.slots.bot = {
    id: payload.players.bot.id,
    name: safePlayerName(payload.players.bot.name),
    avatarId: normalizeAvatarId(payload.players.bot.avatarId)
  };

  state.localSlot = state.slots.human.id === net.playerId ? "human" : "bot";
  net.hostId = state.slots.human.id;

  resetMatchState({
    startingActor: payload.startingActor,
    loadout: {
      human: payload.players.human,
      bot: payload.players.bot
    }
  });

  state.screen = APP_SCREENS.game;
  setCurrentAction("Match started.");
  updateUI();
  setTimeout(() => beginTurn(), 200);
}

function buildSyncSnapshot() {
  const players = {
    human: {
      hp: state.players.human.hp,
      gold: state.players.human.gold,
      shield: state.players.human.shield,
      blockedActions: state.players.human.blockedActions,
      realRoles: [...state.players.human.realRoles],
      fakeRoles: [...state.players.human.fakeRoles],
      roleUses: { ...state.players.human.roleUses },
      cards: state.players.human.cards.map((card) => ({ ...card }))
    },
    bot: {
      hp: state.players.bot.hp,
      gold: state.players.bot.gold,
      shield: state.players.bot.shield,
      blockedActions: state.players.bot.blockedActions,
      realRoles: [...state.players.bot.realRoles],
      fakeRoles: [...state.players.bot.fakeRoles],
      roleUses: { ...state.players.bot.roleUses },
      cards: state.players.bot.cards.map((card) => ({ ...card }))
    }
  };

  return {
    mode: state.mode,
    screen: state.screen,
    phase: state.phase,
    round: state.round,
    roundActionCounter: state.roundActionCounter,
    roundStarter: state.roundStarter,
    previousRoundStarter: state.previousRoundStarter,
    currentActor: state.currentActor,
    startingActor: state.startingActor,
    lastPerformedActor: state.lastPerformedActor,
    thinking: state.thinking,
    matchWinner: state.matchWinner,
    matchEndReason: state.matchEndReason,
    pendingAction: state.pendingAction,
    pendingResponder: state.pendingResponder,
    pendingChallengeResult: state.pendingChallengeResult,
    currentActionText: state.currentActionText,
    slots: {
      human: { ...state.slots.human },
      bot: { ...state.slots.bot }
    },
    players
  };
}

function applySyncPayload(payload) {
  if (!payload || !payload.snapshot) return;
  const snap = payload.snapshot;
  if (snap.mode !== "friend") return;

  clearTimer();

  state.mode = "friend";
  state.screen = snap.screen;
  state.phase = snap.phase;
  state.round = Number(snap.round) || 1;
  state.roundActionCounter = Number(snap.roundActionCounter) || 0;
  state.roundStarter = snap.roundStarter || null;
  state.previousRoundStarter = snap.previousRoundStarter || null;
  state.currentActor = snap.currentActor || null;
  state.startingActor = snap.startingActor === "bot" ? "bot" : "human";
  state.lastPerformedActor = snap.lastPerformedActor || null;
  state.thinking = Boolean(snap.thinking);
  state.matchWinner = snap.matchWinner || null;
  state.matchEndReason = snap.matchEndReason || "";
  state.pendingAction = snap.pendingAction || null;
  state.pendingResponder = snap.pendingResponder || null;
  state.pendingChallengeResult = snap.pendingChallengeResult || null;
  state.currentActionText = snap.currentActionText || "Synced.";

  state.slots.human = {
    id: snap.slots && snap.slots.human ? snap.slots.human.id : state.slots.human.id,
    name: safePlayerName(snap.slots && snap.slots.human ? snap.slots.human.name : "Host"),
    avatarId: normalizeAvatarId(snap.slots && snap.slots.human ? snap.slots.human.avatarId : "avatar-1")
  };
  state.slots.bot = {
    id: snap.slots && snap.slots.bot ? snap.slots.bot.id : state.slots.bot.id,
    name: safePlayerName(snap.slots && snap.slots.bot ? snap.slots.bot.name : "Guest"),
    avatarId: normalizeAvatarId(snap.slots && snap.slots.bot ? snap.slots.bot.avatarId : "avatar-2")
  };

  state.localSlot = state.slots.human.id === net.playerId ? "human" : "bot";

  state.players.human = createPlayerState("human");
  state.players.bot = createPlayerState("bot");
  applyLoadoutToPlayer("human", snap.players && snap.players.human ? snap.players.human : {});
  applyLoadoutToPlayer("bot", snap.players && snap.players.bot ? snap.players.bot : {});

  if (snap.players && snap.players.human) {
    state.players.human.hp = Number(snap.players.human.hp) || MATCH_SETTINGS.START_HP;
    state.players.human.gold = Number(snap.players.human.gold) || MATCH_SETTINGS.START_GOLD;
    state.players.human.shield = Boolean(snap.players.human.shield);
    state.players.human.blockedActions = Number(snap.players.human.blockedActions) || 0;
    state.players.human.roleUses = Object.assign(Object.create(null), snap.players.human.roleUses || {});
  }

  if (snap.players && snap.players.bot) {
    state.players.bot.hp = Number(snap.players.bot.hp) || MATCH_SETTINGS.START_HP;
    state.players.bot.gold = Number(snap.players.bot.gold) || MATCH_SETTINGS.START_GOLD;
    state.players.bot.shield = Boolean(snap.players.bot.shield);
    state.players.bot.blockedActions = Number(snap.players.bot.blockedActions) || 0;
    state.players.bot.roleUses = Object.assign(Object.create(null), snap.players.bot.roleUses || {});
  }

  updateUI();
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
  state.screen = APP_SCREENS.result;
  state.matchWinner = winnerKey;
  state.matchEndReason = reason;
  state.currentActor = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  state.thinking = false;
  setCurrentAction(reason);
  updateUI();
}

function concludeMatchByHp() {
  const h = state.players.human.hp;
  const b = state.players.bot.hp;
  if (h > 0 && b > 0) return false;
  if (h <= 0 && b <= 0) {
    concludeMatch("draw", "Both players reached 0 HP.");
  } else if (h <= 0) {
    concludeMatch("bot", `${slotLabel("bot")} reduced ${slotLabel("human")} HP to 0.`);
  } else {
    concludeMatch("human", `${slotLabel("human")} reduced ${slotLabel("bot")} HP to 0.`);
  }
  return true;
}

function consumeRoundAction() {
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
  state.friend.pendingRequest = null;
}

function advanceToNextAction(delayMs = 260) {
  clearTimer();
  consumeRoundAction();
  if (concludeMatchByHp()) return;
  if (state.round > MATCH_SETTINGS.MAX_ROUNDS) {
    const winner = resolveRoundLimitWinner();
    concludeMatch(winner, "Round 10 complete. Tiebreak resolved.");
    return;
  }
  state.phase = PHASES.idle;
  updateUI();
  setTimeout(() => {
    if (state.screen === APP_SCREENS.game && state.phase !== PHASES.matchEnd) beginTurn();
  }, delayMs);
}

function beginTurn() {
  if (state.screen !== APP_SCREENS.game || state.phase === PHASES.matchEnd) return;
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
    setCurrentAction(`${slotLabel(actor)} loses action (SIREN skip).`);
    advanceToNextAction(460);
    return;
  }

  state.phase = PHASES.choosingAction;

  if (state.mode === "bot") {
    if (actor === "human") {
      runHumanTimer("action", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleActionTimeout(actor));
    } else {
      clearTimer();
      void botTakeTurn();
    }
  } else if (state.mode === "friend") {
    if (net.role === "host" || actor === state.localSlot) {
      runHumanTimer("action", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleActionTimeout(actor));
    } else {
      clearTimer();
    }
  }

  updateUI();
}

function canPlayBasic(actor, basicId) {
  const basic = BASIC_ACTIONS[basicId];
  if (!basic) return false;
  return state.players[actor].gold >= basic.cost;
}

function handleActionTimeout(actor) {
  if (state.phase !== PHASES.choosingAction || state.currentActor !== actor) return;

  if (state.mode === "friend") {
    if (net.role === "host") {
      const forcedInput = "INTEREST";
      void net.sendEvent(
        "TIMEOUT_FORCED",
        {
          phase: "action",
          actorSlot: actor,
          forcedInput
        },
        {
          canonical: true,
          actorId: state.slots[actor] ? state.slots[actor].id : net.playerId,
          applyLocal: true
        }
      );
    } else {
      setCurrentAction("Timer expired. Waiting for host...");
    }
    return;
  }

  if (canPlayBasic(actor, "INTEREST")) {
    setCurrentAction(`${slotLabel(actor)} timer expired. Auto INTEREST.`);
    playAction("INTEREST");
  } else {
    setCurrentAction(`${slotLabel(actor)} timer expired. No legal action.`);
    advanceToNextAction();
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
    setCurrentAction(`${slotLabel(actor)} tapped ${card.role}. ${card.role} is passive.`);
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
  if (action.cost > player.gold) return { ok: false, reason: `${slotLabel(actor)} cannot afford ${action.label}.` };
  if (action.role && !canUseRoleByUses(actor, action.role)) return { ok: false, reason: `${action.role} has no uses left.` };
  return { ok: true };
}

function formatActionText(actor, action) {
  return `${slotLabel(actor)} played ${action.label} (${action.description})`;
}

function runResolutionAfterDelay(applyFn) {
  clearTimer();
  cancelResolutionQueue();
  state.phase = PHASES.resolvingDelay;
  const token = state.resolutionToken;
  updateUI();
  setTimeout(() => {
    if (token !== state.resolutionToken || state.phase === PHASES.matchEnd || state.screen !== APP_SCREENS.game) return;
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

function finalizeResolvedAction() {
  if (concludeMatchByHp()) return;
  advanceToNextAction();
}

function playAction(input) {
  if (state.screen !== APP_SCREENS.game || state.phase !== PHASES.choosingAction || !state.currentActor) return;
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
      finalizeResolvedAction();
    });
  }

  updateUI();
}

function promptResponseForOpponent() {
  const action = state.pendingAction;
  if (!action || action.kind !== "role") return;

  const responder = opponentOf(action.actor);
  state.pendingResponder = responder;

  if (state.mode === "bot") {
    if (responder === "human") {
      runHumanTimer("response", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleResponseTimeout(responder));
    } else {
      clearTimer();
      void botRespondToClaim();
    }
  } else if (state.mode === "friend") {
    if (net.role === "host" || responder === state.localSlot) {
      runHumanTimer("response", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleResponseTimeout(responder));
    } else {
      clearTimer();
    }
  }

  updateUI();
}

function handleResponseTimeout(responder) {
  if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== responder) return;

  if (state.mode === "friend") {
    if (net.role === "host") {
      void net.sendEvent(
        "TIMEOUT_FORCED",
        {
          phase: "response",
          actorSlot: responder,
          forcedChoice: "ACCEPT"
        },
        {
          canonical: true,
          actorId: state.slots[responder] ? state.slots[responder].id : net.playerId,
          applyLocal: true
        }
      );
    } else {
      setCurrentAction("Response timer expired. Waiting for host...");
    }
    return;
  }

  setCurrentAction("Response timer expired. Auto ACCEPT.");
  resolveAccept();
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
  setCurrentAction(`ACCEPTED. ${slotLabel(action.actor)} ${action.role} resolves.`);

  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    if (!pending) return;
    applyActionResourceCost(pending);
    applyEffect(pending);
    finalizeResolvedAction();
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

  if (isReal) {
    setCurrentAction("CHALLENGE! Result: FAILURE (challenger loses 1 HP)");
  } else {
    setCurrentAction("CHALLENGE! Result: SUCCESS (liar loses 2 HP)");
  }

  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    const result = state.pendingChallengeResult;
    if (!pending || !result) return;

    applyActionResourceCost(pending);

    if (result.isReal) {
      applyDamage(result.challenger, 1, "failed challenge");
      applyEffect(pending);
      if (playerHasRealRole(result.actor, "ELF")) applyGold(result.actor, 1, "ELF passive bonus");
      if (state.mode === "bot" && result.challenger === "bot") adjustSuspicion(result.role, -0.15);
    } else {
      applyDamage(result.actor, 2, "bluff penalty");
      if (state.mode === "bot" && result.challenger === "bot") adjustSuspicion(result.role, 0.24);
    }

    finalizeResolvedAction();
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
    pushDebugLog(`${slotLabel(playerKey)} blocked damage (${source}) with DWARF.`);
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
    pushDebugLog(`${slotLabel(playerKey)} healed ${healed} (${source}).`);
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
  if (actual !== 0) pushDebugLog(`${slotLabel(playerKey)} gold ${actual > 0 ? "+" : ""}${actual} (${source}).`);

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
    case "PIRATE":
      score += human.hp <= 2 ? 3.1 : 1.4;
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
      preventedSwing = 2;
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

function applyCanonicalAction(payload) {
  if (!payload || state.screen !== APP_SCREENS.game) return;
  if (state.phase !== PHASES.choosingAction) return;
  if (payload.actorSlot !== state.currentActor) return;
  playAction(payload.input);
}

function applyCanonicalResponse(payload) {
  if (!payload || state.screen !== APP_SCREENS.game) return;
  if (state.phase !== PHASES.awaitingResponse) return;
  if (payload.actorSlot !== state.pendingResponder) return;

  if (payload.choice === "CHALLENGE") resolveChallenge();
  else resolveAccept();
}

function applyCanonicalTimeout(payload) {
  if (!payload || state.screen !== APP_SCREENS.game) return;

  if (payload.phase === "action") {
    if (state.phase !== PHASES.choosingAction || payload.actorSlot !== state.currentActor) return;
    setCurrentAction(`${slotLabel(payload.actorSlot)} timed out. Auto INTEREST.`);
    playAction(payload.forcedInput || "INTEREST");
    return;
  }

  if (payload.phase === "response") {
    if (state.phase !== PHASES.awaitingResponse || payload.actorSlot !== state.pendingResponder) return;
    setCurrentAction("Response timer expired. Auto ACCEPT.");
    if (payload.forcedChoice === "CHALLENGE") resolveChallenge();
    else resolveAccept();
  }
}

function submitLocalAction(input) {
  if (state.screen !== APP_SCREENS.game) return;
  if (state.phase !== PHASES.choosingAction) return;
  if (state.currentActor !== state.localSlot) return;
  if (state.friend.pendingRequest) return;

  if (state.mode === "friend") {
    const actorSlot = state.currentActor;
    if (net.role === "host") {
      void net.sendEvent(
        "ACTION",
        {
          actorSlot,
          input
        },
        {
          canonical: true,
          actorId: state.slots[actorSlot].id,
          applyLocal: true
        }
      );
    } else {
      state.friend.pendingRequest = "action";
      clearTimer();
      updateUI();
      void net.sendEvent(
        "ACTION",
        {
          actorSlot,
          input,
          requestId: `${net.playerId}-${Date.now()}-a`
        },
        {
          actorId: state.slots[actorSlot].id,
          seq: 0
        }
      );
    }
    return;
  }

  playAction(input);
}

function submitLocalResponse(choice) {
  if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== state.localSlot) return;
  if (state.friend.pendingRequest) return;

  if (state.mode === "friend") {
    const actorSlot = state.pendingResponder;
    if (net.role === "host") {
      void net.sendEvent(
        "RESPONSE",
        {
          actorSlot,
          choice
        },
        {
          canonical: true,
          actorId: state.slots[actorSlot].id,
          applyLocal: true
        }
      );
    } else {
      state.friend.pendingRequest = "response";
      clearTimer();
      updateUI();
      void net.sendEvent(
        "RESPONSE",
        {
          actorSlot,
          choice,
          requestId: `${net.playerId}-${Date.now()}-r`
        },
        {
          actorId: state.slots[actorSlot].id,
          seq: 0
        }
      );
    }
    return;
  }

  if (choice === "CHALLENGE") resolveChallenge();
  else resolveAccept();
}

function getTurnIndicatorText() {
  if (state.screen !== APP_SCREENS.game) return "";

  if (state.phase === PHASES.choosingAction) {
    if (state.currentActor === state.localSlot) {
      if (state.friend.pendingRequest === "action") return "Waiting host confirmation...";
      return "Your turn";
    }
    if (state.mode === "bot" && state.currentActor === "bot") return state.thinking ? "Bot thinking..." : "Bot turn";
    return `${slotName(state.currentActor)} turn`;
  }

  if (state.phase === PHASES.awaitingResponse) {
    if (state.pendingResponder === state.localSlot) {
      if (state.friend.pendingRequest === "response") return "Waiting host confirmation...";
      return "Your decision";
    }
    if (state.mode === "bot" && state.pendingResponder === "bot") return state.thinking ? "Bot thinking..." : "Bot deciding";
    return `${slotName(state.pendingResponder)} deciding`;
  }

  if (state.phase === PHASES.resolvingDelay || state.phase === PHASES.applyingEffects) return "Resolving...";
  return "Waiting...";
}

function getResultWinnerText() {
  if (state.matchWinner === "draw") return "DRAW";
  if (state.matchWinner === state.localSlot) return "YOU WIN";
  if (state.matchWinner === "human" || state.matchWinner === "bot") return `${slotLabel(state.matchWinner)} WINS`;
  return "MATCH END";
}

function getConnectionBannerText() {
  const roomId = state.friend.roomId || "----";
  const role = net.role === "host" ? "Host" : net.role === "guest" ? "Guest" : "-";
  return `Connected: ${net.connectedCount}/2 | You are ${role} | Room: ${roomId}`;
}

function renderAvatar(node, avatarId) {
  if (!node) return;
  node.classList.remove("avatar-1", "avatar-2", "avatar-3", "avatar-bot");
  node.classList.add(getAvatarMeta(avatarId).className);
}

function createRoleCardNode({ ownerSlot, card, cardIndex, asButton, disabled }) {
  const node = asButton ? document.createElement("button") : document.createElement("div");
  node.className = "role-card";
  if (asButton) {
    node.type = "button";
    node.dataset.cardIndex = String(cardIndex);
  }

  if (ownerSlot === state.localSlot) {
    node.classList.add(card.isReal ? "real-role" : "fake-role");
  } else {
    node.classList.add("opponent-card");
    if (card.confirmed) node.classList.add("opponent-confirmed");
    else if (card.revealedUsed) node.classList.add("opponent-played");
  }

  const meta = getRoleMeta(card.role);

  if (meta && meta.cost > 0) {
    const cost = document.createElement("span");
    cost.className = "card-badge card-cost";
    cost.textContent = String(meta.cost);
    node.appendChild(cost);
  }

  if (meta && meta.passive) {
    const passive = document.createElement("span");
    passive.className = "card-badge card-passive";
    passive.textContent = "PASSIVE";
    node.appendChild(passive);
  }

  const usesLeft = getRoleUsesLeft(ownerSlot, card.role);
  if (usesLeft !== null) {
    const uses = document.createElement("span");
    uses.className = "card-badge card-uses";
    uses.textContent = `USES ${usesLeft}`;
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

function renderCardsForSlot(container, slot, asInteractive) {
  if (!container) return;
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const cards = state.players[slot].cards;
  cards.forEach((card, index) => {
    let enabled = asInteractive;
    if (enabled) {
      const meta = getRoleMeta(card.role);
      if (!meta || meta.passive) enabled = false;
      if (enabled && state.players[slot].gold < meta.cost) enabled = false;
      if (enabled && !canUseRoleByUses(slot, card.role)) enabled = false;
    }

    fragment.appendChild(
      createRoleCardNode({
        ownerSlot: slot,
        card,
        cardIndex: index,
        asButton: true,
        disabled: !enabled
      })
    );
  });

  container.appendChild(fragment);
}

function statsTextForSlot(slot) {
  const p = state.players[slot];
  const shield = p.shield ? " | Shield" : "";
  return `HP: ${p.hp} | Gold: ${p.gold}${shield}`;
}

function updateUI() {
  const map = {
    [APP_SCREENS.home]: ui.homeScreen,
    [APP_SCREENS.mode]: ui.modeScreen,
    [APP_SCREENS.friend]: ui.friendScreen,
    [APP_SCREENS.waiting]: ui.waitingScreen,
    [APP_SCREENS.game]: ui.gameScreen,
    [APP_SCREENS.result]: ui.resultScreen
  };

  Object.entries(map).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle("active", state.screen === key);
  });

  ui.playerNameInput.value = safePlayerName(state.profile.name);
  ui.avatarPreviewLabel.textContent = getAvatarMeta(state.profile.avatarId).label;
  renderAvatar(ui.avatarPreviewArt, state.profile.avatarId);

  const showFriendBanner = state.mode === "friend" && state.screen === APP_SCREENS.game;
  ui.friendBanner.classList.toggle("hidden", !showFriendBanner);
  if (showFriendBanner) ui.friendBanner.textContent = getConnectionBannerText();

  ui.waitingStatusText.textContent = `Connected: ${net.connectedCount}/2`;
  ui.waitingRoleText.textContent = `You are ${net.role === "host" ? "Host" : net.role === "guest" ? "Guest" : "-"}`;
  ui.waitingRoomText.textContent = `Room: ${state.friend.roomId || "----"}`;

  const waitingCanCopy = Boolean(state.friend.link) && net.role === "host";
  ui.waitingLinkBlock.classList.toggle("hidden", !waitingCanCopy);
  if (waitingCanCopy) ui.waitingLinkInput.value = state.friend.link;

  const friendLinkVisible = Boolean(state.friend.link) && state.screen === APP_SCREENS.friend;
  ui.friendLinkBlock.classList.toggle("hidden", !friendLinkVisible);
  if (friendLinkVisible) ui.friendLinkInput.value = state.friend.link;

  const topSlot = opponentOf(state.localSlot);
  const bottomSlot = state.localSlot;

  ui.topNameText.textContent = slotName(topSlot);
  ui.bottomNameText.textContent = slotName(bottomSlot);
  ui.topStatsText.textContent = statsTextForSlot(topSlot);
  ui.bottomStatsText.textContent = statsTextForSlot(bottomSlot);

  renderAvatar(ui.topAvatar, state.slots[topSlot].avatarId);
  renderAvatar(ui.bottomAvatar, state.slots[bottomSlot].avatarId);

  ui.roundLabel.textContent = `ROUND ${Math.min(state.round, MATCH_SETTINGS.MAX_ROUNDS)}/${MATCH_SETTINGS.MAX_ROUNDS}`;
  ui.timerText.textContent = state.timer.mode ? `${state.timer.remaining}s` : "--";
  ui.turnIndicator.textContent = getTurnIndicatorText();
  ui.currentActionText.textContent = state.currentActionText;

  const canLocalAct =
    state.screen === APP_SCREENS.game &&
    state.phase === PHASES.choosingAction &&
    state.currentActor === state.localSlot &&
    !state.friend.pendingRequest;

  ui.interestBtn.disabled = !canLocalAct;
  ui.strikeBtn.disabled = !canLocalAct || state.players[state.localSlot].gold < BASIC_ACTIONS.STRIKE.cost;

  renderCardsForSlot(ui.topCards, topSlot, false);
  renderCardsForSlot(ui.bottomCards, bottomSlot, canLocalAct);

  const showResponse =
    state.screen === APP_SCREENS.game &&
    state.phase === PHASES.awaitingResponse &&
    state.pendingResponder === state.localSlot &&
    !state.friend.pendingRequest;

  ui.responseOverlay.classList.toggle("hidden", !showResponse);
  ui.appRoot.classList.toggle("response-open", showResponse);

  ui.resultWinnerText.textContent = getResultWinnerText();
  ui.resultSummaryText.textContent = state.matchEndReason || "Match complete.";
  ui.resultStatsText.textContent = `${slotName("human")}: ${state.players.human.hp} HP, ${state.players.human.gold} Gold | ${slotName("bot")}: ${state.players.bot.hp} HP, ${state.players.bot.gold} Gold`;
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
  const panel = playerKey === state.localSlot ? ui.bottomPanel : ui.topPanel;
  const stat = playerKey === state.localSlot ? ui.bottomStatsText : ui.topStatsText;
  if (type === "damage") {
    triggerAnimation(panel, "anim-damage");
    triggerAnimation(stat, "anim-damage");
    return;
  }
  if (type === "heal") {
    triggerAnimation(panel, "anim-heal");
    triggerAnimation(stat, "anim-heal");
    return;
  }
  if (type === "gold-up") {
    triggerAnimation(stat, "anim-gold-up");
    return;
  }
  if (type === "gold-down") triggerAnimation(stat, "anim-gold-down");
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

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_e) {
      ok = false;
    }
    document.body.removeChild(helper);
    return ok;
  }
}

function onBottomCardsClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button[data-card-index]");
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const cardIndex = Number(button.dataset.cardIndex);
  if (Number.isNaN(cardIndex)) return;
  submitLocalAction({ kind: "card", cardIndex });
}

function onAvatarChoice(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const choice = target.closest("button[data-avatar-id]");
  if (!(choice instanceof HTMLButtonElement)) return;

  const avatarId = normalizeAvatarId(choice.dataset.avatarId || "avatar-1");
  state.profile.avatarId = avatarId;
  if (state.mode !== "friend") {
    state.slots.human.avatarId = avatarId;
  }
  closeModal(ui.avatarModal);
  updateUI();
}

function applyCanonicalFromLocalStartIfNeeded() {
  if (state.mode !== "friend") return;
  if (!state.friend.roomId || !net.channel) return;
  if (net.role !== "host") return;
  if (state.screen !== APP_SCREENS.waiting || net.connectedCount < 2) return;
  void startFriendMatchAsHost();
}

function bindEvents() {
  ui.homePlayBtn.addEventListener("click", () => runToModeScreen());

  ui.modeBackBtn.addEventListener("click", () => {
    state.screen = APP_SCREENS.home;
    updateUI();
  });

  ui.friendBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.waitingBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.gameBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.resultBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.backToMenuBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.playBotBtn.addEventListener("click", () => startBotMatch());
  ui.playFriendBtn.addEventListener("click", () => {
    state.screen = APP_SCREENS.friend;
    state.friend.link = "";
    updateUI();
  });

  ui.createLinkBtn.addEventListener("click", () => {
    void createFriendRoomAsHost();
  });

  ui.copyFriendLinkBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(state.friend.link);
    ui.copyStatusText.textContent = ok ? "Link copied." : "Copy failed.";
  });

  ui.waitingCopyBtn.addEventListener("click", async () => {
    await copyToClipboard(state.friend.link);
  });

  ui.playAgainBtn.addEventListener("click", () => {
    if (state.mode === "bot") {
      startBotMatch();
      return;
    }

    if (state.mode === "friend") {
      if (net.connectedCount < 2) {
        state.screen = APP_SCREENS.waiting;
        updateUI();
        return;
      }

      if (net.role === "host") {
        void startFriendMatchAsHost();
      } else {
        state.screen = APP_SCREENS.waiting;
        updateUI();
        void net.sendEvent(
          "HELLO",
          {
            requestRestart: true
          },
          {
            actorId: net.playerId,
            seq: 0
          }
        );
      }
    }
  });

  ui.rulesBtn.addEventListener("click", () => openModal(ui.rulesModal));
  ui.rulesCloseBtn.addEventListener("click", () => closeModal(ui.rulesModal));

  ui.avatarPreviewBtn.addEventListener("click", () => openModal(ui.avatarModal));
  ui.avatarGrid.addEventListener("click", onAvatarChoice);

  ui.playerNameInput.addEventListener("input", () => {
    state.profile.name = safePlayerName(ui.playerNameInput.value);
    if (state.mode !== "friend") {
      state.slots.human.name = state.profile.name;
    }
    updateUI();
  });

  ui.interestBtn.addEventListener("click", () => submitLocalAction("INTEREST"));
  ui.strikeBtn.addEventListener("click", () => submitLocalAction("STRIKE"));
  ui.bottomCards.addEventListener("click", onBottomCardsClick);

  ui.acceptBtn.addEventListener("click", () => submitLocalResponse("ACCEPT"));
  ui.challengeBtn.addEventListener("click", () => submitLocalResponse("CHALLENGE"));

  bindModalDismiss(ui.rulesModal, ui.rulesCloseBtn);
  bindModalDismiss(ui.avatarModal, ui.avatarModalCloseBtn);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  applyCanonicalFromLocalStartIfNeeded();
}

function cacheElements() {
  ui.appRoot = document.getElementById("appRoot");

  ui.homeScreen = document.getElementById("homeScreen");
  ui.modeScreen = document.getElementById("modeScreen");
  ui.friendScreen = document.getElementById("friendScreen");
  ui.waitingScreen = document.getElementById("waitingScreen");
  ui.gameScreen = document.getElementById("gameScreen");
  ui.resultScreen = document.getElementById("resultScreen");

  ui.homePlayBtn = document.getElementById("homePlayBtn");
  ui.playerNameInput = document.getElementById("playerNameInput");
  ui.avatarPreviewBtn = document.getElementById("avatarPreviewBtn");
  ui.avatarPreviewArt = document.getElementById("avatarPreviewArt");
  ui.avatarPreviewLabel = document.getElementById("avatarPreviewLabel");

  ui.modeBackBtn = document.getElementById("modeBackBtn");
  ui.playBotBtn = document.getElementById("playBotBtn");
  ui.playFriendBtn = document.getElementById("playFriendBtn");

  ui.friendBackBtn = document.getElementById("friendBackBtn");
  ui.createLinkBtn = document.getElementById("createLinkBtn");
  ui.friendLinkBlock = document.getElementById("friendLinkBlock");
  ui.friendLinkInput = document.getElementById("friendLinkInput");
  ui.copyFriendLinkBtn = document.getElementById("copyFriendLinkBtn");
  ui.copyStatusText = document.getElementById("copyStatusText");

  ui.waitingBackBtn = document.getElementById("waitingBackBtn");
  ui.waitingStatusText = document.getElementById("waitingStatusText");
  ui.waitingRoleText = document.getElementById("waitingRoleText");
  ui.waitingRoomText = document.getElementById("waitingRoomText");
  ui.waitingLinkBlock = document.getElementById("waitingLinkBlock");
  ui.waitingLinkInput = document.getElementById("waitingLinkInput");
  ui.waitingCopyBtn = document.getElementById("waitingCopyBtn");

  ui.gameBackBtn = document.getElementById("gameBackBtn");
  ui.rulesBtn = document.getElementById("rulesBtn");
  ui.friendBanner = document.getElementById("friendBanner");

  ui.roundLabel = document.getElementById("roundLabel");
  ui.timerText = document.getElementById("timerText");
  ui.turnIndicator = document.getElementById("turnIndicator");
  ui.currentActionText = document.getElementById("currentActionText");

  ui.topPanel = document.getElementById("topPanel");
  ui.bottomPanel = document.getElementById("bottomPanel");
  ui.topAvatar = document.getElementById("topAvatar");
  ui.bottomAvatar = document.getElementById("bottomAvatar");
  ui.topNameText = document.getElementById("topNameText");
  ui.bottomNameText = document.getElementById("bottomNameText");
  ui.topStatsText = document.getElementById("topStatsText");
  ui.bottomStatsText = document.getElementById("bottomStatsText");
  ui.topCards = document.getElementById("topCards");
  ui.bottomCards = document.getElementById("bottomCards");

  ui.interestBtn = document.getElementById("interestBtn");
  ui.strikeBtn = document.getElementById("strikeBtn");

  ui.responseOverlay = document.getElementById("responseOverlay");
  ui.acceptBtn = document.getElementById("acceptBtn");
  ui.challengeBtn = document.getElementById("challengeBtn");

  ui.resultBackBtn = document.getElementById("resultBackBtn");
  ui.resultWinnerText = document.getElementById("resultWinnerText");
  ui.resultSummaryText = document.getElementById("resultSummaryText");
  ui.resultStatsText = document.getElementById("resultStatsText");
  ui.playAgainBtn = document.getElementById("playAgainBtn");
  ui.backToMenuBtn = document.getElementById("backToMenuBtn");

  ui.avatarModal = document.getElementById("avatarModal");
  ui.avatarModalCloseBtn = document.getElementById("avatarModalCloseBtn");
  ui.avatarGrid = ui.avatarModal ? ui.avatarModal.querySelector(".avatar-grid") : null;

  ui.rulesModal = document.getElementById("rulesModal");
  ui.rulesCloseBtn = document.getElementById("rulesCloseBtn");
}

function exposeSupabaseTest() {
  window.liarsClashTestSupabase = async function liarsClashTestSupabase() {
    const ok = await net.initSupabase();
    if (!ok) {
      console.error("[Supabase Test] Client is not initialized. Check supabase-config.js.");
      return;
    }

    const channelName = "test";
    const eventName = "liars-clash-test";
    const payload = {
      message: "hello-from-liars-clash",
      sentAt: new Date().toISOString()
    };

    const channel = net.client.channel(channelName, {
      config: { broadcast: { self: true } }
    });

    try {
      const receipt = await new Promise((resolve, reject) => {
        let settled = false;
        let timeoutId = null;

        const settle = (handler, value) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          handler(value);
        };

        channel.on("broadcast", { event: eventName }, (message) => {
          console.log("[Supabase Test] Broadcast received:", message);
          settle(resolve, message);
        });

        channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            console.log(`[Supabase Test] Subscribed to channel \"${channelName}\". Sending broadcast...`);
            try {
              const sendResult = await channel.send({
                type: "broadcast",
                event: eventName,
                payload
              });
              console.log("[Supabase Test] Broadcast send result:", sendResult);
            } catch (error) {
              settle(reject, new Error(`Broadcast send failed: ${error && error.message ? error.message : String(error)}`));
              return;
            }

            timeoutId = setTimeout(() => {
              settle(reject, new Error("No broadcast receipt within 10s. Check Realtime config/network."));
            }, 10000);
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            settle(reject, new Error(`Realtime channel failed with status \"${status}\".`));
          }
        });
      });

      console.log("[Supabase Test] Success:", receipt);
    } catch (error) {
      console.error("[Supabase Test] Failed:", error);
    } finally {
      try {
        await channel.unsubscribe();
      } catch (error) {
        console.error("[Supabase Test] Unsubscribe error:", error);
      }
    }
  };
}

async function init() {
  cacheElements();
  exposeSupabaseTest();
  bindEvents();

  state.profile.name = safePlayerName(ui.playerNameInput.value);
  state.profile.avatarId = normalizeAvatarId(state.profile.avatarId);
  state.slots.human = {
    id: net.playerId,
    name: state.profile.name,
    avatarId: state.profile.avatarId
  };

  const roomFromUrl = getRoomIdFromUrl();
  if (roomFromUrl) {
    await joinFriendRoomAsGuest(roomFromUrl);
  } else {
    state.screen = APP_SCREENS.home;
    updateUI();
  }

  updateUI();
}

window.addEventListener("DOMContentLoaded", () => {
  void init();
});

window.initSupabase = () => net.initSupabase();
window.joinRoom = (roomId, role) => net.joinRoom(roomId, role);
window.sendEvent = (type, payload) => net.sendEvent(type, payload);
window.handleEvent = (msg) => net.handleEvent(msg);

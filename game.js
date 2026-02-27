"use strict";

const PHASES = Object.freeze({
  idle: "idle",
  draft: "draft",
  awaitingDraftOpponent: "awaitingDraftOpponent",
  draftReveal: "draftReveal",
  gameStart: "gameStart",
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
  ELF: Object.freeze({ name: "ELF", cost: 0, description: "+2 Gold on catch lie", passive: true }),
  PIRATE: Object.freeze({ name: "PIRATE", cost: 0, description: "1 DMG +1 Gold", maxUses: 2, passive: false }),
  SCIENTIST: Object.freeze({ name: "SCIENTIST", cost: 0, description: "+1 Gold + reveal unknown card", maxUses: 2, passive: false }),
  JOKER: Object.freeze({ name: "JOKER", cost: 1, description: "1 DMG then transform", passive: false }),
  BERSERK: Object.freeze({ name: "BERSERK", cost: 0, description: "Self -1 HP enemy -2 HP", passive: false }),
  BANKER: Object.freeze({ name: "BANKER", cost: 3, description: "+1 Gold / round", passive: false }),
  ANGEL: Object.freeze({ name: "ANGEL", cost: 1, description: "Swap HP and Gold", maxUses: 1, passive: false }),
  VALK: Object.freeze({ name: "VALK", cost: 3, description: "Enemy -1 HP self +1 HP", passive: false }),
  APPRENTICE: Object.freeze({ name: "APPRENTICE", cost: 2, description: "Scales each round", passive: false, apprentice: true })
});

const BASIC_ACTIONS = Object.freeze({
  INTEREST: Object.freeze({ id: "INTEREST", cost: 0, description: "+1 Gold", challengeable: false }),
  STRIKE: Object.freeze({ id: "STRIKE", cost: 2, description: "Deal 1 DMG", challengeable: false })
});

const ASSET_MAP = Object.freeze({
  avatarPaths: Object.freeze({
    "avatar-1": "./Recursos/Adventurer_avatar.png",
    "avatar-2": "./Recursos/Noble_avatar.png",
    "avatar-3": "./Recursos/rogue_avatar.png",
    "avatar-bot": "./Recursos/Noble_avatar.png"
  }),
  roleImagePaths: Object.freeze({
    SIREN: "./Recursos/Siren.png",
    DWARF: "./Recursos/Dwarf.png",
    KNIGHT: "./Recursos/Knight.png",
    GOBLIN: "./Recursos/Goblin.png",
    ELF: "./Recursos/Elf.png",
    ENT: "./Recursos/Ent.png",
    PIRATE: "./Recursos/Pirate.png",
    SCIENTIST: "./Recursos/Scientist.png",
    JOKER: "./Recursos/joker.png",
    BERSERK: "./Recursos/Berserk.png",
    BANKER: "./Recursos/bank.png",
    ANGEL: "./Recursos/angel.png",
    VALK: "./Recursos/Valk.png",
    APPRENTICE: "./Recursos/mage.png"
  }),
  iconPaths: Object.freeze({
    hp: "./Recursos/HP.png",
    gold: "./Recursos/Gold.png",
    shield: "./Recursos/Shield.png",
    sword: "./Recursos/Sword.png"
  }),
  badgePath: "./Recursos/Badge.png"
});

const AVATAR_PRESETS = Object.freeze({
  "avatar-1": Object.freeze({ id: "avatar-1", label: "Adventurer" }),
  "avatar-2": Object.freeze({ id: "avatar-2", label: "Noble" }),
  "avatar-3": Object.freeze({ id: "avatar-3", label: "Rogue" }),
  "avatar-bot": Object.freeze({ id: "avatar-bot", label: "Bot" })
});

const ASSET_VERSION = "3";

const UI_TIMINGS = Object.freeze({
  actionToastMs: 1800,
  currentActionTypeMs: 25,
  currentActionPauseMs: 4000,
  homeTipsRotateMs: 5000
});

const HOME_TIPS = Object.freeze([
  "Bluff early to learn how your opponent reacts.",
  "Save gold for high-impact turns.",
  "If they hesitate, they might be lying.",
  "Use reveals to reduce uncertainty, not to show off.",
  "Track which cards are REAL/FAKE as the match evolves.",
  "Don\u2019t accuse on impulse\u2014accuse when the risk is worth it.",
  "Swap smart in the opening: keep flexible options.",
  "Pressure low HP opponents\u2014force tough decisions.",
  "Sometimes ACCEPT is the best punish.",
  "Win the mind game, not just the numbers."
]);

const TUTORIAL_STEPS = Object.freeze([
  Object.freeze({
    text: "Play a card. You can tell the truth... or bluff.",
    button: "Next",
    focus: "cards"
  }),
  Object.freeze({
    text: "Your opponent chooses ACCEPT or YOU'RE LYING!",
    button: "Next",
    focus: "decision"
  }),
  Object.freeze({
    text: "If they catch a lie, you lose 2 HP. If they're wrong, they lose 1 HP.",
    button: "Next",
    focus: "outcome"
  }),
  Object.freeze({
    text: "Reduce HP or outscore with Gold after 10 rounds.",
    button: "Got it",
    focus: "none"
  })
]);

const TUTORIAL_SAMPLE_CARDS = Object.freeze([
  Object.freeze({ role: "KNIGHT", isReal: true }),
  Object.freeze({ role: "SIREN", isReal: false }),
  Object.freeze({ role: "GOBLIN", isReal: true }),
  Object.freeze({ role: "DWARF", isReal: false })
]);

const SESSION_LEVEL_MAX = 3;
const ROLE_UNLOCK_LEVELS = Object.freeze({
  JOKER: 2,
  ANGEL: 3
});

const BOT_IDENTITIES = Object.freeze([
  Object.freeze({ name: "Hikaru", avatarId: "avatar-2" }),
  Object.freeze({ name: "Danny", avatarId: "avatar-1" }),
  Object.freeze({ name: "MrBeast", avatarId: "avatar-3" })
]);

const RULES_ROLE_DETAILS = Object.freeze([
  Object.freeze({ role: "SIREN", text: "Skip opponent next action" }),
  Object.freeze({ role: "DWARF", text: "Shield next damage (1 Gold)" }),
  Object.freeze({ role: "KNIGHT", text: "2 damage (2 Gold)" }),
  Object.freeze({ role: "GOBLIN", text: "Steal 1 Gold (max 3)" }),
  Object.freeze({ role: "ENT", text: "Heal 2 HP (2 Gold)" }),
  Object.freeze({ role: "PIRATE", text: "1 damage +1 Gold (max 2)" }),
  Object.freeze({ role: "ELF", text: "Passive +2 Gold on catch lie" }),
  Object.freeze({ role: "SCIENTIST", text: "+1 Gold + reveal one unknown card (max 2)" }),
  Object.freeze({ role: "JOKER", text: "1 damage (1 Gold), then transforms" }),
  Object.freeze({ role: "BERSERK", text: "Self -1 HP, enemy -2 HP" }),
  Object.freeze({ role: "BANKER", text: "Activate +1 Gold / round buff (2 Gold)" }),
  Object.freeze({ role: "ANGEL", text: "Swap HP and Gold (1 Gold, max 1)" }),
  Object.freeze({ role: "VALK", text: "Enemy -1 HP, self +1 HP (3 Gold)" }),
  Object.freeze({ role: "APPRENTICE", label: "ADEPT", text: "X damage, cost X+1, scales each round (cap 5/6)" })
]);

const ui = {};
const uiRuntime = {
  actionToastTimerId: null,
  currentActionTypeTimerId: null,
  currentActionPauseTimerId: null,
  currentActionTypeToken: 0,
  lastActionText: "",
  tutorialStepIndex: 0,
  homeTipTimerId: null,
  homeTipFadeTimerId: null
};
const modalState = { activeModal: null };

const state = {
  screen: APP_SCREENS.home,
  mode: null,
  profile: { name: "Matt", avatarId: "avatar-1", level: 1, ranking: 1000, opponentRanking: 1000 },
  progression: { pendingUnlock: null },
  home: { tipIndex: 0 },
  friend: {
    roomId: "",
    role: null,
    hostLink: "",
    guestLink: "",
    startInFlight: false,
    pendingRequest: null,
    connectionStatus: "Idle",
    errorMessage: "",
    copyToastTimerId: null
  },
  localSlot: "human",
  slots: {
    human: { id: "local-human", name: "Matt", avatarId: "avatar-1" },
    bot: { id: "bot-ai", name: "Bot", avatarId: "avatar-bot" }
  },
  phase: PHASES.idle,
  round: 1,
  roundActionCounter: 0,
  roundStarter: null,
  previousRoundStarter: null,
  currentActor: null,
  startingActor: "human",
  matchSeed: "",
  lastPerformedActor: null,
  thinking: false,
  matchWinner: null,
  matchEndReason: "",
  pendingAction: null,
  pendingResponder: null,
  pendingChallengeResult: null,
  pendingClaim: null,
  draft: createDraftState(),
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
      console.error("[Supabase] Missing URL or anon key in runtime config.");
      setFriendStatus("Config missing");
      setFriendError("Supabase config is missing in production build.");
      return false;
    }
    try {
      const supa = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      this.client = supa.createClient(supabaseUrl, supabaseAnonKey);
      this.supabaseReady = true;
      window.liarsClashSupabase = this.client;
      console.log("[Supabase] Client initialized:", supabaseUrl);
      return true;
    } catch (error) {
      console.error("[Supabase] Failed to initialize:", error);
      setFriendStatus("Init failed");
      setFriendError("Could not initialize Supabase client.");
      return false;
    }
  },

  async joinRoom(roomId, role) {
    console.log(`[Supabase] joinRoom requested: room=${roomId} role=${role}`);
    const ok = await this.initSupabase();
    if (!ok) {
      setFriendStatus("Connection failed");
      return false;
    }
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
    setFriendError("");
    setFriendStatus("Subscribing...");

    const channel = this.client.channel(`room:${roomId}`, {
      config: { broadcast: { self: true }, presence: { key: this.playerId } }
    });
    console.log(`[Supabase] Subscribing to channel room:${roomId}`);

    channel.on("presence", { event: "sync" }, () => {
      console.log("[Supabase] presence sync event");
      this.handlePresenceSync();
    });

    channel.on("presence", { event: "join" }, () => {
      console.log("[Supabase] presence join event");
      this.handlePresenceSync();
    });

    channel.on("presence", { event: "leave" }, () => {
      console.log("[Supabase] presence leave event");
      this.handlePresenceSync();
    });

    EVENT_TYPES.forEach((eventType) => {
      channel.on("broadcast", { event: eventType }, ({ payload }) => {
        void this.handleEvent(payload);
      });
    });

    this.channel = channel;

    const joined = await new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const timeoutId = setTimeout(() => {
        setFriendStatus("Subscribe timeout");
        setFriendError("Timed out joining room. Try Reconnect.");
        settle(false);
      }, 10000);

      channel.subscribe(async (status) => {
        console.log(`[Supabase] subscribe status: ${status}`);
        if (status === "SUBSCRIBED") {
          setFriendStatus("Subscribed");
          try {
            setFriendStatus("Tracking presence...");
            console.log("[Supabase] track called");
            await channel.track({
              playerId: this.playerId,
              name: safePlayerName(state.profile.name),
              avatarId: normalizeAvatarId(state.profile.avatarId),
              role: this.role
            });
            this.presenceById[this.playerId] = {
              name: safePlayerName(state.profile.name),
              avatarId: normalizeAvatarId(state.profile.avatarId),
              role: this.role
            };
            this.connectedCount = Math.max(1, Object.keys(this.presenceById).length);
            updateUI();
            this.handlePresenceSync();
          } catch (error) {
            console.error("[Supabase] Presence track failed:", error);
            setFriendStatus("Track failed");
            setFriendError("Presence tracking failed. Try Reconnect.");
            clearTimeout(timeoutId);
            settle(false);
            return;
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
          clearTimeout(timeoutId);
          settle(true);
          return;
        }

        if (status === "CHANNEL_ERROR") {
          setFriendStatus("Channel error");
          setFriendError("Realtime channel error. Check Supabase Realtime and try Reconnect.");
          clearTimeout(timeoutId);
          settle(false);
          return;
        }

        if (status === "TIMED_OUT") {
          setFriendStatus("Subscribe timeout");
          setFriendError("Room subscription timed out. Try Reconnect.");
          clearTimeout(timeoutId);
          settle(false);
          return;
        }

        if (status === "CLOSED") {
          setFriendStatus("Disconnected");
        }
      });
    });

    if (!joined) {
      await this.leaveRoom();
      return false;
    }

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
      setFriendStatus("Disconnected");
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
    setFriendStatus("Disconnected");
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
    console.log("[Supabase] presence state:", this.presenceById);
    const hostEntry = Object.entries(this.presenceById).find(([, payload]) => payload.role === "host");
    if (hostEntry) this.hostId = hostEntry[0];
    setFriendStatus(`Connected ${this.connectedCount}/2`);

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

    if (payload.kind === "DRAFT_ACCEPT") {
      if (state.screen !== APP_SCREENS.game) return;
      if (!isDraftPhase()) return;
      if (payload.actorSlot !== "human" && payload.actorSlot !== "bot") return;
      if (!state.slots[payload.actorSlot] || state.slots[payload.actorSlot].id !== msg.senderId) return;
      if (state.draft && state.draft.accepted && state.draft.accepted[payload.actorSlot]) return;

      await this.sendEvent(
        "ACTION",
        {
          kind: "DRAFT_ACCEPT",
          actorSlot: payload.actorSlot,
          selected: normalizeDraftSelectionIndices(payload.selected),
          forced: Boolean(payload.forced)
        },
        {
          canonical: true,
          actorId: state.slots[payload.actorSlot].id,
          applyLocal: true
        }
      );
      return;
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
    bankerBuff: false,
    shield: false,
    blockedActions: 0,
    realRoles: [],
    fakeRoles: [],
    roleUses: Object.create(null),
    cards: []
  };
}

function createSuspicionMap() {
  const map = {};
  Object.values(ROLE_CONFIG).forEach((meta) => {
    if (!meta.passive) map[meta.name] = 0.35;
  });
  return map;
}

function createDraftState() {
  return {
    selections: { human: [], bot: [] },
    accepted: { human: false, bot: false },
    revealUntilBySlot: { human: 0, bot: 0 },
    initialRoles: { human: [], bot: [] },
    finalizing: false
  };
}

function createEmptyLoadout() {
  return { realRoles: [], fakeRoles: [], cards: [] };
}

function generateMatchSeed() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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

function getRoomRoleFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const role = (query.get("role") || "").trim().toLowerCase();
  return role === "guest" ? "guest" : "host";
}

function setRoomIdInUrl(roomId, role = null) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  if (!roomId || role !== "guest") url.searchParams.delete("role");
  else url.searchParams.set("role", "guest");
  window.history.replaceState({}, "", url.toString());
}

function createHostLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.searchParams.delete("role");
  return url.toString();
}

function createGuestLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "guest");
  return url.toString();
}

function setFriendStatus(text) {
  state.friend.connectionStatus = String(text || "Idle");
  if (ui.appRoot) updateUI();
}

function setFriendError(message) {
  state.friend.errorMessage = String(message || "");
  if (ui.appRoot) updateUI();
}

function safePlayerName(name) {
  const cleaned = String(name || "Matt")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
  return cleaned || "Matt";
}

function normalizeAvatarId(value) {
  return AVATAR_PRESETS[value] ? value : "avatar-1";
}

function getAvatarMeta(avatarId) {
  return AVATAR_PRESETS[normalizeAvatarId(avatarId)] || AVATAR_PRESETS["avatar-1"];
}

function withAssetVersion(path) {
  if (!path) return "";
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(ASSET_VERSION)}`;
}

function clearPendingClaim() {
  state.pendingClaim = null;
}

function setPendingClaim(action) {
  if (!action || action.kind !== "role") {
    clearPendingClaim();
    return;
  }
  if (state.pendingResponder !== state.localSlot) {
    clearPendingClaim();
    return;
  }
  if (action.actor === state.localSlot) {
    clearPendingClaim();
    return;
  }
  const actorSlot = action.actor;
  const actorId = state.slots[actorSlot] ? state.slots[actorSlot].id : actorSlot;
  state.pendingClaim = {
    actorId,
    roleName: action.role || "",
    cardIndex: typeof action.cardIndex === "number" ? action.cardIndex : null,
    timestamp: Date.now()
  };
}

function isPendingClaimCard(ownerSlot, card, cardIndex) {
  if (!state.pendingClaim) return false;
  if (state.screen !== APP_SCREENS.game) return false;
  if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== state.localSlot) return false;
  const owner = state.slots[ownerSlot];
  if (!owner || owner.id !== state.pendingClaim.actorId) return false;
  if (typeof state.pendingClaim.cardIndex === "number") return state.pendingClaim.cardIndex === cardIndex;
  return state.pendingClaim.roleName === card.role;
}

function getAvatarPath(avatarId) {
  const normalized = normalizeAvatarId(avatarId);
  const path = ASSET_MAP.avatarPaths[normalized] || ASSET_MAP.avatarPaths["avatar-1"];
  return withAssetVersion(path);
}

function getRoleImagePath(role) {
  return withAssetVersion(ASSET_MAP.roleImagePaths[role] || "");
}

function getChoiceLabel(choice) {
  return choice === "CHALLENGE" ? "YOU'RE LYING!" : "ACCEPT";
}

function formatDecisionText(actorSlot, choice) {
  const label = getChoiceLabel(choice);
  if (actorSlot === state.localSlot) return `You chose ${label}`;
  return `${slotName(actorSlot)} chose ${label}`;
}

function formatChallengeOutcome(isReal, actor, challenger) {
  if (isReal) return `Wrong accuse -> ${slotName(challenger)} -1 HP`;
  return `Lie caught -> ${slotName(actor)} -2 HP`;
}

function createInlineIcon(iconKey, className = "inline-icon") {
  const iconPath = ASSET_MAP.iconPaths[iconKey];
  if (!iconPath) return null;
  const img = document.createElement("img");
  img.className = className;
  img.src = withAssetVersion(iconPath);
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  return img;
}

function appendText(node, text) {
  node.appendChild(document.createTextNode(String(text || "")));
}

function renderRoleDescription(node, role, card = null) {
  if (!node) return;
  node.textContent = "";

  const icon = (key) => {
    const image = createInlineIcon(key);
    if (image) node.appendChild(image);
  };

  switch (role) {
    case "DWARF":
      icon("shield");
      appendText(node, " Shield next ");
      icon("sword");
      appendText(node, " DMG");
      break;
    case "KNIGHT":
      appendText(node, "2 ");
      icon("sword");
      appendText(node, " DMG");
      break;
    case "GOBLIN":
      appendText(node, "Steal 1 ");
      icon("gold");
      break;
    case "ENT":
      appendText(node, "+2 ");
      icon("hp");
      break;
    case "ELF":
      appendText(node, "+2 ");
      icon("gold");
      appendText(node, " on catch lie");
      break;
    case "PIRATE":
      appendText(node, "1 ");
      icon("sword");
      appendText(node, " +1 ");
      icon("gold");
      break;
    case "SCIENTIST":
      appendText(node, "+1 ");
      icon("gold");
      appendText(node, " + reveal");
      break;
    case "JOKER":
      appendText(node, "1 ");
      icon("sword");
      appendText(node, " then transform");
      break;
    case "BERSERK":
      appendText(node, "Self -1 ");
      icon("hp");
      appendText(node, " enemy -2 ");
      icon("hp");
      break;
    case "BANKER":
      appendText(node, "+1 ");
      icon("gold");
      appendText(node, " / round");
      break;
    case "ANGEL":
      appendText(node, "Swap ");
      icon("hp");
      appendText(node, " and ");
      icon("gold");
      break;
    case "VALK":
      appendText(node, "Enemy -1 ");
      icon("hp");
      appendText(node, " self +1 ");
      icon("hp");
      break;
    case "APPRENTICE": {
      const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
      appendText(node, `${dmg} `);
      icon("sword");
      break;
    }
    default:
      appendText(node, "Skip next turn");
      break;
  }
}

function setActionDescriptions() {
  if (ui.interestActionDesc) {
    ui.interestActionDesc.textContent = "";
    appendText(ui.interestActionDesc, "+1 ");
    const goldIcon = createInlineIcon("gold");
    if (goldIcon) ui.interestActionDesc.appendChild(goldIcon);
  }
  if (ui.strikeActionDesc) {
    ui.strikeActionDesc.textContent = "";
    appendText(ui.strikeActionDesc, "Deal 1 ");
    const swordIcon = createInlineIcon("sword");
    if (swordIcon) ui.strikeActionDesc.appendChild(swordIcon);
    appendText(ui.strikeActionDesc, " DMG");
  }
}

function renderAvatarChoices() {
  if (!ui.avatarGrid) return;
  const choices = ui.avatarGrid.querySelectorAll(".avatar-choice");
  choices.forEach((choice) => {
    const avatarId = normalizeAvatarId(choice.dataset.avatarId || "avatar-1");
    const artNode = choice.querySelector(".avatar-art");
    const labelNode = choice.querySelector(".avatar-choice-label");
    renderAvatar(artNode, avatarId);
    if (labelNode) labelNode.textContent = getAvatarMeta(avatarId).label;
  });
}

function applyAssetCssVariables() {
  if (!document || !document.documentElement) return;
  document.documentElement.style.setProperty("--badge-image", `url("${withAssetVersion(ASSET_MAP.badgePath)}")`);
  document.documentElement.style.setProperty("--cost-icon-image", `url("${withAssetVersion(ASSET_MAP.iconPaths.gold)}")`);
}

function createStatSegment(iconKey, text) {
  const segment = document.createElement("span");
  segment.className = "stat-segment";
  if (String(text).toLowerCase() === "shield") segment.classList.add("stat-segment-shield");
  const icon = createInlineIcon(iconKey, "stat-icon");
  if (icon) segment.appendChild(icon);
  const value = document.createElement("span");
  value.className = "stat-value";
  value.textContent = text;
  segment.appendChild(value);
  return segment;
}

function createStatSeparator() {
  const separator = document.createElement("span");
  separator.className = "stat-separator";
  separator.textContent = "|";
  return separator;
}

function renderStatsForSlot(node, slot) {
  if (!node) return;
  const p = state.players[slot];
  node.textContent = "";
  node.appendChild(createStatSegment("hp", String(p.hp)));
  node.appendChild(createStatSeparator());
  node.appendChild(createStatSegment("gold", String(p.gold)));
  if (p.shield) {
    node.appendChild(createStatSeparator());
    node.appendChild(createStatSegment("shield", "Shield"));
  }
}

function extractCardIndex(input) {
  if (typeof input === "number") return input;
  if (input && typeof input === "object") {
    if (typeof input.cardIndex === "number") return input.cardIndex;
    if (typeof input.index === "number") return input.index;
  }
  return null;
}

function getInvalidActionFeedback(input) {
  if (state.screen !== APP_SCREENS.game) return "Not your turn.";
  if (state.phase === PHASES.awaitingResponse && state.pendingResponder === state.localSlot) {
    return "Choose ACCEPT or YOU'RE LYING!";
  }
  if (state.phase !== PHASES.choosingAction || state.currentActor !== state.localSlot) {
    return "Not your turn.";
  }
  if (state.friend.pendingRequest) return "Not your turn.";

  const player = state.players[state.localSlot];
  if (typeof input === "string") {
    const actionId = input.toUpperCase();
    const basic = BASIC_ACTIONS[actionId];
    if (!basic) return "Not your turn.";
    if (player.gold < basic.cost) return "Not enough gold.";
    return null;
  }

  const cardIndex = extractCardIndex(input);
  if (cardIndex === null) return "Not your turn.";
  const card = player.cards[cardIndex];
  if (!card) return "Not your turn.";
  const meta = getRoleMeta(card.role);
  if (!meta) return "Not your turn.";
  if (meta.passive) return "Passive ability cannot be played.";
  if (player.gold < getRoleCost(card.role, card)) return "Not enough gold.";
  if (!canUseRoleByUses(state.localSlot, card.role)) return "Uses exhausted.";
  return null;
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

function getRoleDisplayName(role) {
  if (role === "APPRENTICE") return "ADEPT";
  return String(role || "");
}

function chooseBotIdentity() {
  const index = Math.floor(Math.random() * BOT_IDENTITIES.length);
  return BOT_IDENTITIES[index] || BOT_IDENTITIES[0];
}

function getHomeTip(index) {
  if (HOME_TIPS.length === 0) return "";
  const normalized = ((Number(index) || 0) % HOME_TIPS.length + HOME_TIPS.length) % HOME_TIPS.length;
  return HOME_TIPS[normalized];
}

function setHomeTip(index, animate = true) {
  if (!ui.homeTipText) return;
  if (HOME_TIPS.length === 0) return;
  const normalized = ((Number(index) || 0) % HOME_TIPS.length + HOME_TIPS.length) % HOME_TIPS.length;
  state.home.tipIndex = normalized;

  if (ui.homeTipDots) {
    const dots = ui.homeTipDots.querySelectorAll(".home-tip-dot");
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === normalized;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  const nextText = getHomeTip(normalized);
  if (!animate) {
    ui.homeTipText.textContent = nextText;
    ui.homeTipText.classList.remove("is-animating");
    return;
  }

  ui.homeTipText.classList.add("is-animating");
  if (uiRuntime.homeTipFadeTimerId) clearTimeout(uiRuntime.homeTipFadeTimerId);
  uiRuntime.homeTipFadeTimerId = setTimeout(() => {
    ui.homeTipText.textContent = nextText;
    ui.homeTipText.classList.remove("is-animating");
    uiRuntime.homeTipFadeTimerId = null;
  }, 170);
}

function advanceHomeTip() {
  setHomeTip(state.home.tipIndex + 1, true);
}

function startHomeTipsCarousel() {
  if (uiRuntime.homeTipTimerId) clearInterval(uiRuntime.homeTipTimerId);
  uiRuntime.homeTipTimerId = setInterval(() => {
    if (state.screen !== APP_SCREENS.home) return;
    advanceHomeTip();
  }, UI_TIMINGS.homeTipsRotateMs);
}

function renderHomeTipDots() {
  if (!ui.homeTipDots) return;
  ui.homeTipDots.innerHTML = "";
  HOME_TIPS.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "home-tip-dot";
    dot.setAttribute("aria-label", `Show tip ${index + 1}`);
    dot.addEventListener("click", () => {
      setHomeTip(index, true);
    });
    ui.homeTipDots.appendChild(dot);
  });
}

function renderRulesRoleList() {
  if (!ui.rulesRoleList) return;
  ui.rulesRoleList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  RULES_ROLE_DETAILS.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "rules-role-item";

    const thumb = document.createElement("img");
    thumb.className = "rules-role-thumb";
    thumb.src = getRoleImagePath(entry.role);
    thumb.alt = `${entry.label || getRoleDisplayName(entry.role)} card`;

    const text = document.createElement("p");
    text.className = "rules-role-text";
    text.textContent = `${entry.label || getRoleDisplayName(entry.role)} - ${entry.text}`;

    row.appendChild(thumb);
    row.appendChild(text);
    fragment.appendChild(row);
  });

  ui.rulesRoleList.appendChild(fragment);
}

function getPlayableRoles() {
  return Object.keys(ROLE_CONFIG).filter((role) => !ROLE_CONFIG[role].passive);
}

function getAllRoles() {
  return Object.keys(ROLE_CONFIG);
}

function getUnlockLevelForRole(role) {
  return ROLE_UNLOCK_LEVELS[role] || 1;
}

function isUnlocked(role, level = state.profile.level) {
  const required = getUnlockLevelForRole(role);
  return Number(level) >= required;
}

function getUnlockedRoles(level = state.profile.level) {
  return getAllRoles().filter((role) => isUnlocked(role, level));
}

function normalizeDraftSelectionIndices(indices) {
  if (!Array.isArray(indices)) return [];
  const cleaned = indices
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value < 4);
  return Array.from(new Set(cleaned)).sort((a, b) => a - b);
}

function applyCardRoleDefaults(card, role) {
  if (!card) return;
  if (role === "APPRENTICE") {
    card.apprenticeDamage = typeof card.apprenticeDamage === "number" ? clamp(card.apprenticeDamage, 1, 5) : 1;
    card.apprenticeCost = typeof card.apprenticeCost === "number" ? clamp(card.apprenticeCost, 2, 6) : 2;
    return;
  }
  card.apprenticeDamage = null;
  card.apprenticeCost = null;
}

function createCard(role, isReal, index) {
  const card = {
    role,
    isReal,
    index,
    revealedUsed: false,
    confirmed: false,
    verification: null,
    apprenticeDamage: null,
    apprenticeCost: null
  };
  applyCardRoleDefaults(card, role);
  return card;
}

function pickUnique(pool, count, rng = Math.random) {
  return shuffle(pool, rng).slice(0, count);
}

function rolesFromCards(cards) {
  const realRoles = [];
  const fakeRoles = [];
  cards.forEach((card) => {
    if (!card) return;
    if (card.isReal) realRoles.push(card.role);
    else fakeRoles.push(card.role);
  });
  return { realRoles, fakeRoles };
}

function createDraftLoadoutFromRoles(roles) {
  const normalizedRoles = Array.isArray(roles) ? roles.slice(0, 4) : [];
  const cards = normalizedRoles.map((role, index) => createCard(role, false, index));
  return { realRoles: [], fakeRoles: [], cards };
}

function assignTruthToCards(cards, rng) {
  if (!Array.isArray(cards) || cards.length < 4) return;
  const realIndices = new Set(pickUnique([0, 1, 2, 3], 2, rng));
  cards.forEach((card, index) => {
    card.isReal = realIndices.has(index);
    card.revealedUsed = false;
    card.confirmed = false;
    card.verification = null;
  });
}

function buildDraftRolesForPlayer(rng, level = state.profile.level) {
  const unlockedRoles = getUnlockedRoles(level);
  const pool = unlockedRoles.length >= 4 ? unlockedRoles : getAllRoles();
  return pickUnique(pool, 4, rng);
}

function buildDeterministicDraftRoles(seedText, level = state.profile.level) {
  const rngHuman = createSeededRng(`${seedText}:draft:human`);
  const rngBot = createSeededRng(`${seedText}:draft:bot`);
  return {
    human: buildDraftRolesForPlayer(rngHuman, level),
    bot: buildDraftRolesForPlayer(rngBot, level)
  };
}

function buildDraftSwapResult(initialRoles, selectedIndices, seedText, level = state.profile.level) {
  const roles = Array.isArray(initialRoles) ? initialRoles.slice(0, 4) : [];
  const picks = normalizeDraftSelectionIndices(selectedIndices);
  if (picks.length === 0) return roles;

  picks.forEach((index, step) => {
    const current = new Set(roles);
    const unlockedRoles = getUnlockedRoles(level);
    const rolePool = unlockedRoles.length > 0 ? unlockedRoles : getAllRoles();
    const available = rolePool.filter((role) => !current.has(role));
    if (available.length === 0) return;
    const rng = createSeededRng(`${seedText}:${step}:${index}`);
    const nextRole = available[Math.floor(rng() * available.length)];
    roles[index] = nextRole;
  });

  return roles;
}

function buildFinalLoadoutFromDraftRoles(draftRoles, seedText, playerKey) {
  const roles = Array.isArray(draftRoles) ? draftRoles.slice(0, 4) : [];
  const loadout = createDraftLoadoutFromRoles(roles);
  const rng = createSeededRng(`${seedText}:truth:${playerKey}`);
  assignTruthToCards(loadout.cards, rng);
  const groups = rolesFromCards(loadout.cards);
  loadout.realRoles = groups.realRoles;
  loadout.fakeRoles = groups.fakeRoles;
  return loadout;
}

function buildDeterministicFinalLoadout(seedText, draftRoles) {
  const roles = draftRoles || { human: [], bot: [] };
  return {
    human: buildFinalLoadoutFromDraftRoles(roles.human, seedText, "human"),
    bot: buildFinalLoadoutFromDraftRoles(roles.bot, seedText, "bot")
  };
}

function applyLoadoutToPlayer(playerKey, loadout) {
  const player = state.players[playerKey];
  if (!player || !loadout) return;

  player.cards = Array.isArray(loadout.cards)
    ? loadout.cards.map((card, idx) => {
        const verification = card.verification === "REAL" || card.verification === "FAKE" ? card.verification : card.confirmed ? "REAL" : null;
        return {
          role: card.role,
          isReal: Boolean(card.isReal),
          index: idx,
          revealedUsed: Boolean(card.revealedUsed),
          confirmed: verification === "REAL",
          verification,
          apprenticeDamage: typeof card.apprenticeDamage === "number" ? card.apprenticeDamage : null,
          apprenticeCost: typeof card.apprenticeCost === "number" ? card.apprenticeCost : null
        };
      })
    : [];

  player.cards.forEach((card) => {
    applyCardRoleDefaults(card, card.role);
  });
  player.bankerBuff = Boolean(loadout.bankerBuff);

  const groups = rolesFromCards(player.cards);
  player.realRoles = Array.isArray(loadout.realRoles) && loadout.realRoles.length > 0 ? [...loadout.realRoles] : groups.realRoles;
  player.fakeRoles = Array.isArray(loadout.fakeRoles) && loadout.fakeRoles.length > 0 ? [...loadout.fakeRoles] : groups.fakeRoles;
}

function assignRandomRolesForBotMatch() {
  const seed = generateMatchSeed();
  const draft = buildDeterministicDraftRoles(seed);
  const finalLoadout = buildDeterministicFinalLoadout(seed, draft);
  applyLoadoutToPlayer("human", finalLoadout.human);
  applyLoadoutToPlayer("bot", finalLoadout.bot);
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

function syncPlayerRoleLists(playerKey) {
  const player = state.players[playerKey];
  if (!player) return;
  const groups = rolesFromCards(player.cards || []);
  player.realRoles = groups.realRoles;
  player.fakeRoles = groups.fakeRoles;
}

function getCardByIndex(playerKey, cardIndex) {
  const player = state.players[playerKey];
  if (!player || !Array.isArray(player.cards)) return null;
  return player.cards[cardIndex] || null;
}

function getRoleCost(role, card) {
  if (role === "APPRENTICE") return clamp(typeof card?.apprenticeCost === "number" ? card.apprenticeCost : 2, 2, 6);
  const meta = getRoleMeta(role);
  return meta ? meta.cost : 0;
}

function getRoleEffectSummary(role, card) {
  if (role === "APPRENTICE") {
    const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
    const cost = clamp(typeof card?.apprenticeCost === "number" ? card.apprenticeCost : 2, 2, 6);
    return `${dmg} DMG (cost ${cost})`;
  }
  const meta = getRoleMeta(role);
  return meta ? meta.description : "";
}

function deterministicPickIndex(length, context) {
  if (!Number.isFinite(length) || length <= 0) return -1;
  const seed = `${state.matchSeed || "match"}:${context}`;
  const rng = createSeededRng(seed);
  return Math.floor(rng() * length);
}

function chooseScientistRevealIndex(targetKey, actorKey, cardIndex) {
  const targetCards = state.players[targetKey].cards || [];
  const unknown = [];
  targetCards.forEach((card, idx) => {
    if (!card) return;
    if (card.verification === "REAL" || card.verification === "FAKE") return;
    unknown.push(idx);
  });
  if (unknown.length === 0) return null;
  const actorUses = state.players[actorKey].roleUses.SCIENTIST || 0;
  const pick = deterministicPickIndex(
    unknown.length,
    `scientist:${actorKey}:${targetKey}:${state.round}:${state.roundActionCounter}:${cardIndex}:${actorUses}`
  );
  return pick >= 0 ? unknown[pick] : unknown[0];
}

function revealCardVerification(targetKey, cardIndex, sourceLabel) {
  const card = getCardByIndex(targetKey, cardIndex);
  if (!card) return null;
  const verification = card.isReal ? "REAL" : "FAKE";
  card.revealedUsed = true;
  card.verification = verification;
  card.confirmed = verification === "REAL";
  pushDebugLog(`${slotName(targetKey)} ${card.role} verified ${verification} (${sourceLabel}).`);
  return card;
}

function replaceJokerCard(playerKey, cardIndex) {
  const player = state.players[playerKey];
  if (!player) return null;
  const card = player.cards[cardIndex];
  if (!card) return null;

  const currentRoles = player.cards.map((item) => item.role);
  const unlockedRoles = getUnlockedRoles();
  const rolePool = unlockedRoles.length > 0 ? unlockedRoles : getAllRoles();
  const availableRoles = rolePool.filter((role) => role !== "JOKER" && !currentRoles.includes(role));
  if (availableRoles.length === 0) return null;

  const uses = player.roleUses.JOKER || 0;
  const pick = deterministicPickIndex(availableRoles.length, `joker:${playerKey}:${state.round}:${state.roundActionCounter}:${cardIndex}:${uses}`);
  const nextRole = availableRoles[pick >= 0 ? pick : 0];
  card.role = nextRole;
  applyCardRoleDefaults(card, card.role);
  syncPlayerRoleLists(playerKey);
  return nextRole;
}

function scaleApprenticeCardsForNewRound(playerKey) {
  const player = state.players[playerKey];
  if (!player || !Array.isArray(player.cards)) return;
  player.cards.forEach((card) => {
    if (!card || card.role !== "APPRENTICE") return;
    const nextDamage = clamp((typeof card.apprenticeDamage === "number" ? card.apprenticeDamage : 1) + 1, 1, 5);
    const nextCost = clamp((typeof card.apprenticeCost === "number" ? card.apprenticeCost : 2) + 1, 2, 6);
    card.apprenticeDamage = nextDamage;
    card.apprenticeCost = nextCost;
  });
}

function applyRoundStartPassives() {
  ["human", "bot"].forEach((playerKey) => {
    if (state.players[playerKey].bankerBuff) {
      applyGold(playerKey, 1, "BANKER passive");
    }
    if (state.round > 1) scaleApprenticeCardsForNewRound(playerKey);
  });
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
  state.matchSeed = String(options.matchSeed || state.matchSeed || generateMatchSeed());
  state.draft = createDraftState();
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
  clearPendingClaim();
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
  stopCurrentActionTypewriter();
  uiRuntime.lastActionText = "";
  clearActionToast();
  state.phase = PHASES.idle;
  state.matchWinner = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  clearPendingClaim();
  state.draft = createDraftState();
  state.matchSeed = "";
  state.friend.pendingRequest = null;
  state.friend.startInFlight = false;

  if (state.mode === "friend" || net.channel) {
    await net.leaveRoom();
  }

  state.mode = null;
  state.friend.roomId = "";
  state.friend.role = null;
  state.friend.hostLink = "";
  state.friend.guestLink = "";
  state.friend.connectionStatus = "Idle";
  state.friend.errorMessage = "";
  if (state.friend.copyToastTimerId) {
    clearTimeout(state.friend.copyToastTimerId);
    state.friend.copyToastTimerId = null;
  }
  if (ui.copyToast) ui.copyToast.classList.add("hidden");
  if (state.friend.copyToastTimerId) {
    clearTimeout(state.friend.copyToastTimerId);
    state.friend.copyToastTimerId = null;
  }
  if (ui.copyToast) ui.copyToast.classList.add("hidden");

  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  const botIdentity = chooseBotIdentity();
  state.slots.bot = { id: "bot-ai", name: botIdentity.name, avatarId: botIdentity.avatarId };
  state.localSlot = "human";

  setRoomIdInUrl("");
  state.screen = APP_SCREENS.home;
  closeModal();
  updateUI();
  openPendingUnlockModal();
}

function startBotMatch() {
  state.mode = "bot";
  state.friend.roomId = "";
  state.friend.role = null;
  state.friend.hostLink = "";
  state.friend.guestLink = "";
  state.friend.connectionStatus = "Idle";
  state.friend.errorMessage = "";

  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  const botIdentity = chooseBotIdentity();
  state.slots.bot = { id: "bot-ai", name: botIdentity.name, avatarId: botIdentity.avatarId };
  state.localSlot = "human";

  const matchSeed = generateMatchSeed();
  const starterRng = createSeededRng(`${matchSeed}:starter`);
  const draftRoles = buildDeterministicDraftRoles(matchSeed);
  const payload = {
    stage: "draft-start",
    matchSeed,
    startingActor: starterRng() < 0.5 ? "human" : "bot",
    players: {
      human: {
        id: state.slots.human.id,
        name: state.slots.human.name,
        avatarId: state.slots.human.avatarId,
        draftRoles: draftRoles.human
      },
      bot: {
        id: state.slots.bot.id,
        name: state.slots.bot.name,
        avatarId: state.slots.bot.avatarId,
        draftRoles: draftRoles.bot
      }
    }
  };

  applyFriendStart(payload);
}

function prepareFriendRoomState(roomId, role) {
  state.mode = "friend";
  state.friend.role = role;
  state.friend.roomId = roomId;
  state.friend.hostLink = createHostLink(roomId);
  state.friend.guestLink = createGuestLink(roomId);
  state.friend.startInFlight = false;
  state.friend.pendingRequest = null;
  state.friend.connectionStatus = "Connecting...";
  state.friend.errorMessage = "";

  setRoomIdInUrl(roomId, role);
  state.screen = APP_SCREENS.waiting;
  updateUI();
}

async function createFriendRoomAsHost() {
  const roomId = createShortRoomId();
  await joinFriendRoomAsHost(roomId);
}

async function joinFriendRoomAsHost(roomId) {
  prepareFriendRoomState(roomId, "host");
  state.localSlot = "human";
  state.slots.human = {
    id: net.playerId,
    name: safePlayerName(state.profile.name),
    avatarId: normalizeAvatarId(state.profile.avatarId)
  };
  state.slots.bot = { id: "pending-guest", name: "Friend", avatarId: "avatar-2" };

  const joined = await net.joinRoom(roomId, "host");
  if (!joined) {
    setFriendError("Could not connect to room as host.");
    return;
  }
  setFriendStatus("Connected 1/2");
  updateUI();
}

async function joinFriendRoomAsGuest(roomId) {
  prepareFriendRoomState(roomId, "guest");

  const joined = await net.joinRoom(roomId, "guest");
  if (!joined) {
    setFriendError("Could not connect to room as guest.");
    return;
  }

  setFriendStatus("Connected 1/2");
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

  const seed = generateMatchSeed();
  const draftRoles = buildDeterministicDraftRoles(seed);
  const starterRng = createSeededRng(`${seed}:starter`);

  return {
    stage: "draft-start",
    matchSeed: seed,
    startingActor: starterRng() < 0.5 ? "human" : "bot",
    players: {
      human: {
        id: net.playerId,
        name: safePlayerName(hostPresence.name),
        avatarId: normalizeAvatarId(hostPresence.avatarId),
        draftRoles: draftRoles.human
      },
      bot: {
        id: guestId,
        name: safePlayerName(guestPresence.name),
        avatarId: normalizeAvatarId(guestPresence.avatarId),
        draftRoles: draftRoles.bot
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
  console.log("[Supabase] Host sending START");
  await net.sendEvent("START", payload, {
    canonical: true,
    actorId: net.playerId,
    applyLocal: true
  });
  if (state.screen === APP_SCREENS.waiting) state.friend.startInFlight = false;
}

function applyFriendStart(payload) {
  if (!payload || !payload.players || !payload.players.human || !payload.players.bot) return;

  if (payload.stage === "draft-final") {
    applyDraftFinalStart(payload);
    return;
  }

  if (!payload.players.human.draftRoles || !payload.players.bot.draftRoles) return;
  if (!state.mode) state.mode = "friend";
  state.friend.startInFlight = false;
  state.friend.errorMessage = "";
  state.friend.connectionStatus = "Draft started";

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

  const startSeed = String(payload.matchSeed || generateMatchSeed());
  const startLoadout = {
    human: createDraftLoadoutFromRoles(payload.players.human.draftRoles),
    bot: createDraftLoadoutFromRoles(payload.players.bot.draftRoles)
  };

  resetMatchState({
    startingActor: payload.startingActor,
    loadout: startLoadout,
    matchSeed: startSeed
  });

  state.phase = PHASES.draft;
  state.screen = APP_SCREENS.game;
  state.draft = createDraftState();
  state.draft.initialRoles.human = [...payload.players.human.draftRoles];
  state.draft.initialRoles.bot = [...payload.players.bot.draftRoles];

  if (state.mode === "bot") {
    const botSelections = buildBotDraftSelections(startSeed);
    state.draft.selections.bot = [...botSelections];
    setTimeout(() => {
      if (state.mode === "bot" && state.phase === PHASES.draft) {
        applyCanonicalDraftAccept({ kind: "DRAFT_ACCEPT", actorSlot: "bot", selected: botSelections, forced: false });
      }
    }, 260);
  }

  setCurrentAction("Select 0-4 cards, then ACCEPT.");
  startDraftTimer();
  updateUI();
}

function isDraftPhase(phase = state.phase) {
  return phase === PHASES.draft || phase === PHASES.awaitingDraftOpponent || phase === PHASES.draftReveal;
}

function isDraftSelectionPhase() {
  return state.phase === PHASES.draft || state.phase === PHASES.awaitingDraftOpponent;
}

function getDraftSelectionsForSlot(slot) {
  if (!state.draft || !state.draft.selections) return [];
  return normalizeDraftSelectionIndices(state.draft.selections[slot]);
}

function setDraftSelectionsForSlot(slot, selections) {
  if (!state.draft) state.draft = createDraftState();
  state.draft.selections[slot] = normalizeDraftSelectionIndices(selections);
}

function allDraftAccepted() {
  return Boolean(state.draft && state.draft.accepted && state.draft.accepted.human && state.draft.accepted.bot);
}

function startDraftTimer() {
  if (!isDraftPhase()) return;
  runHumanTimer("draft", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleDraftTimeout(state.localSlot));
}

function buildBotDraftSelections(seed) {
  const rng = createSeededRng(`${seed}:bot-swap`);
  const count = Math.floor(rng() * 3);
  return normalizeDraftSelectionIndices(pickUnique([0, 1, 2, 3], count, rng));
}

async function submitLocalDraftAccept(forced = false) {
  if (!isDraftSelectionPhase()) return;
  const actorSlot = state.localSlot;
  if (!actorSlot || state.draft.accepted[actorSlot]) return;
  const selected = getDraftSelectionsForSlot(actorSlot);

  if (state.mode === "friend") {
    if (net.role === "host") {
      await net.sendEvent(
        "ACTION",
        {
          kind: "DRAFT_ACCEPT",
          actorSlot,
          selected,
          forced
        },
        {
          canonical: true,
          actorId: state.slots[actorSlot].id,
          applyLocal: true
        }
      );
      return;
    }

    state.friend.pendingRequest = "draft";
    clearTimer();
    updateUI();
    await net.sendEvent(
      "ACTION",
      {
        kind: "DRAFT_ACCEPT",
        actorSlot,
        selected,
        forced,
        requestId: `${net.playerId}-${Date.now()}-d`
      },
      {
        actorId: state.slots[actorSlot].id,
        seq: 0
      }
    );
    return;
  }

  applyCanonicalDraftAccept({ kind: "DRAFT_ACCEPT", actorSlot, selected, forced });
}

function getDraftFinalizeDelay() {
  if (!state.draft || !state.draft.revealUntilBySlot) return 0;
  const until = Math.max(
    Number(state.draft.revealUntilBySlot.human) || 0,
    Number(state.draft.revealUntilBySlot.bot) || 0
  );
  return Math.max(0, until - Date.now());
}

function buildDraftFinalPayload() {
  const seed = String(state.matchSeed || generateMatchSeed());
  const finalRoles = {
    human: buildDraftSwapResult(state.draft.initialRoles.human, getDraftSelectionsForSlot("human"), `${seed}:swap:human`, state.profile.level),
    bot: buildDraftSwapResult(state.draft.initialRoles.bot, getDraftSelectionsForSlot("bot"), `${seed}:swap:bot`, state.profile.level)
  };
  const finalLoadout = buildDeterministicFinalLoadout(seed, finalRoles);
  return {
    stage: "draft-final",
    matchSeed: seed,
    startingActor: state.startingActor,
    players: {
      human: {
        id: state.slots.human.id,
        name: safePlayerName(state.slots.human.name),
        avatarId: normalizeAvatarId(state.slots.human.avatarId),
        realRoles: finalLoadout.human.realRoles,
        fakeRoles: finalLoadout.human.fakeRoles,
        cards: finalLoadout.human.cards
      },
      bot: {
        id: state.slots.bot.id,
        name: safePlayerName(state.slots.bot.name),
        avatarId: normalizeAvatarId(state.slots.bot.avatarId),
        realRoles: finalLoadout.bot.realRoles,
        fakeRoles: finalLoadout.bot.fakeRoles,
        cards: finalLoadout.bot.cards
      }
    }
  };
}

function applyDraftFinalStart(payload) {
  if (!payload || !payload.players || !payload.players.human || !payload.players.bot) return;
  state.friend.pendingRequest = null;
  state.friend.startInFlight = false;
  clearTimer();

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
    matchSeed: payload.matchSeed,
    loadout: {
      human: payload.players.human,
      bot: payload.players.bot
    }
  });

  state.phase = PHASES.gameStart;
  state.screen = APP_SCREENS.game;
  setCurrentAction("Draft done. Match start.");
  updateUI();
  setTimeout(() => beginTurn(), 220);
}

async function finalizeDraftIfReady() {
  if (!isDraftPhase()) return;
  if (!allDraftAccepted()) return;
  if (!state.draft || state.draft.finalizing) return;
  state.draft.finalizing = true;
  state.phase = PHASES.draftReveal;
  updateUI();

  const delay = Math.max(220, getDraftFinalizeDelay());
  setTimeout(async () => {
    const payload = buildDraftFinalPayload();
    if (state.mode === "friend") {
      if (net.role !== "host") return;
      await net.sendEvent("START", payload, {
        canonical: true,
        actorId: net.playerId,
        applyLocal: true
      });
      return;
    }
    applyDraftFinalStart(payload);
  }, delay);
}

function applyCanonicalDraftAccept(payload) {
  if (!payload || !isDraftPhase()) return;
  const actorSlot = payload.actorSlot === "bot" ? "bot" : "human";
  if (state.draft && state.draft.accepted && state.draft.accepted[actorSlot]) return;
  const selected = normalizeDraftSelectionIndices(payload.selected);
  setDraftSelectionsForSlot(actorSlot, selected);
  state.draft.accepted[actorSlot] = true;
  state.draft.revealUntilBySlot[actorSlot] = Date.now() + 420;
  state.friend.pendingRequest = null;

  if (state.localSlot === actorSlot) state.phase = PHASES.awaitingDraftOpponent;
  if (allDraftAccepted()) state.phase = PHASES.draftReveal;
  updateUI();

  void finalizeDraftIfReady();
}

function handleDraftTimeout() {
  if (!isDraftPhase()) return;

  if (state.mode === "friend") {
    if (net.role === "host") {
      const pendingSlots = ["human", "bot"].filter((slot) => !state.draft.accepted[slot]);
      pendingSlots.forEach((slot) => {
        void net.sendEvent(
          "ACTION",
          {
            kind: "DRAFT_ACCEPT",
            actorSlot: slot,
            selected: getDraftSelectionsForSlot(slot),
            forced: true
          },
          {
            canonical: true,
            actorId: state.slots[slot].id,
            applyLocal: true
          }
        );
      });
      return;
    }

    if (!state.draft.accepted[state.localSlot]) {
      setCurrentAction("Draft timer ended. Waiting host.");
      void submitLocalDraftAccept(true);
    }
    return;
  }

  if (!state.draft.accepted[state.localSlot]) {
    applyCanonicalDraftAccept({
      kind: "DRAFT_ACCEPT",
      actorSlot: state.localSlot,
      selected: getDraftSelectionsForSlot(state.localSlot),
      forced: true
    });
  }
}

function isDraftCardSelectable(ownerSlot) {
  if (!isDraftSelectionPhase()) return false;
  if (state.screen !== APP_SCREENS.game) return false;
  if (ownerSlot !== state.localSlot) return false;
  if (!state.draft || state.draft.accepted[ownerSlot]) return false;
  return true;
}

function isDraftCardSelected(ownerSlot, cardIndex) {
  if (!state.draft || !state.draft.selections) return false;
  return getDraftSelectionsForSlot(ownerSlot).includes(cardIndex);
}

function isDraftCardSwapping(ownerSlot, cardIndex) {
  if (!state.draft || !state.draft.revealUntilBySlot) return false;
  const until = Number(state.draft.revealUntilBySlot[ownerSlot]) || 0;
  if (until <= Date.now()) return false;
  return getDraftSelectionsForSlot(ownerSlot).includes(cardIndex);
}

function buildSyncSnapshot() {
  const players = {
    human: {
      hp: state.players.human.hp,
      gold: state.players.human.gold,
      bankerBuff: state.players.human.bankerBuff,
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
      bankerBuff: state.players.bot.bankerBuff,
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
    matchSeed: state.matchSeed,
    draft: state.draft,
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
    pendingClaim: state.pendingClaim,
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
  state.matchSeed = String(snap.matchSeed || state.matchSeed || generateMatchSeed());
  state.draft = snap.draft
    ? {
        selections: {
          human: normalizeDraftSelectionIndices(snap.draft.selections && snap.draft.selections.human),
          bot: normalizeDraftSelectionIndices(snap.draft.selections && snap.draft.selections.bot)
        },
        accepted: {
          human: Boolean(snap.draft.accepted && snap.draft.accepted.human),
          bot: Boolean(snap.draft.accepted && snap.draft.accepted.bot)
        },
        revealUntilBySlot: {
          human: Number(snap.draft.revealUntilBySlot && snap.draft.revealUntilBySlot.human) || 0,
          bot: Number(snap.draft.revealUntilBySlot && snap.draft.revealUntilBySlot.bot) || 0
        },
        initialRoles: {
          human: Array.isArray(snap.draft.initialRoles && snap.draft.initialRoles.human) ? snap.draft.initialRoles.human.slice(0, 4) : [],
          bot: Array.isArray(snap.draft.initialRoles && snap.draft.initialRoles.bot) ? snap.draft.initialRoles.bot.slice(0, 4) : []
        },
        finalizing: Boolean(snap.draft.finalizing)
      }
    : createDraftState();
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
  state.pendingClaim = snap.pendingClaim || null;
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
    state.players.human.bankerBuff = Boolean(snap.players.human.bankerBuff);
    state.players.human.shield = Boolean(snap.players.human.shield);
    state.players.human.blockedActions = Number(snap.players.human.blockedActions) || 0;
    state.players.human.roleUses = Object.assign(Object.create(null), snap.players.human.roleUses || {});
  }

  if (snap.players && snap.players.bot) {
    state.players.bot.hp = Number(snap.players.bot.hp) || MATCH_SETTINGS.START_HP;
    state.players.bot.gold = Number(snap.players.bot.gold) || MATCH_SETTINGS.START_GOLD;
    state.players.bot.bankerBuff = Boolean(snap.players.bot.bankerBuff);
    state.players.bot.shield = Boolean(snap.players.bot.shield);
    state.players.bot.blockedActions = Number(snap.players.bot.blockedActions) || 0;
    state.players.bot.roleUses = Object.assign(Object.create(null), snap.players.bot.roleUses || {});
  }

  if (isDraftPhase()) startDraftTimer();
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

function getRoleUnlockedAtLevel(level) {
  return Object.keys(ROLE_UNLOCK_LEVELS).find((role) => ROLE_UNLOCK_LEVELS[role] === level) || null;
}

function applySessionLevelProgression() {
  const previousLevel = Number(state.profile.level) || 1;
  const nextLevel = clamp(previousLevel + 1, 1, SESSION_LEVEL_MAX);
  if (nextLevel === previousLevel) return null;

  state.profile.level = nextLevel;
  const unlockedRole = getRoleUnlockedAtLevel(nextLevel);
  if (!unlockedRole || isUnlocked(unlockedRole, previousLevel)) return null;

  const payload = { level: nextLevel, role: unlockedRole };
  state.progression.pendingUnlock = payload;
  return payload;
}

function openPendingUnlockModal() {
  const pending = state.progression.pendingUnlock;
  if (!pending) return;
  if (!ui.levelUnlockModal || !ui.levelUnlockLevelText || !ui.levelUnlockRoleText || !ui.levelUnlockImage) return;

  ui.levelUnlockLevelText.textContent = `You reached Level ${pending.level}.`;
  ui.levelUnlockRoleText.textContent = `New card unlocked: ${getRoleDisplayName(pending.role)}`;
  ui.levelUnlockImage.src = getRoleImagePath(pending.role);
  ui.levelUnlockImage.alt = `${getRoleDisplayName(pending.role)} card`;
  openModal(ui.levelUnlockModal);
}

function closeLevelUnlockModal() {
  state.progression.pendingUnlock = null;
  closeModal(ui.levelUnlockModal);
}

function concludeMatch(winnerKey, reason) {
  if (state.phase === PHASES.matchEnd) return;
  clearTimer();
  cancelResolutionQueue();
  if (winnerKey === "human" || winnerKey === "bot") {
    const delta = winnerKey === state.localSlot ? 50 : -50;
    state.profile.ranking = Math.max(0, state.profile.ranking + delta);
    state.profile.opponentRanking = Math.max(0, state.profile.opponentRanking - delta);
  }
  applySessionLevelProgression();
  state.phase = PHASES.matchEnd;
  state.screen = APP_SCREENS.result;
  state.matchWinner = winnerKey;
  state.matchEndReason = reason;
  state.currentActor = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  clearPendingClaim();
  state.thinking = false;
  setCurrentAction(reason);
  openPendingUnlockModal();
  updateUI();
}

function concludeMatchByHp() {
  const h = state.players.human.hp;
  const b = state.players.bot.hp;
  if (h > 0 && b > 0) return false;
  if (h <= 0 && b <= 0) {
    concludeMatch("draw", "Both reached 0 HP.");
  } else if (h <= 0) {
    concludeMatch("bot", `${slotName("bot")} wins by HP.`);
  } else {
    concludeMatch("human", `${slotName("human")} wins by HP.`);
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
  clearPendingClaim();
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

  if (state.roundActionCounter === 0) {
    applyRoundStartPassives();
  }

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
  clearPendingClaim();
  state.thinking = false;

  const actorState = state.players[actor];
  if (actorState.blockedActions > 0) {
    actorState.blockedActions -= 1;
    setCurrentAction(`${slotName(actor)} skipped (SIREN).`);
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
      setCurrentAction("Timer ended. Waiting host.");
    }
    return;
  }

  if (canPlayBasic(actor, "INTEREST")) {
    setCurrentAction(`${slotName(actor)} timeout -> INTEREST`);
    playAction("INTEREST");
  } else {
    setCurrentAction(`${slotName(actor)} timeout -> no action`);
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
    setCurrentAction(`${slotName(actor)} played ${card.role} (passive)`);
    return null;
  }

  const dynamicCost = getRoleCost(card.role, card);

  return {
    kind: "role",
    id: card.role,
    label: getRoleDisplayName(card.role),
    role: card.role,
    cardIndex,
    cost: dynamicCost,
    challengeable: true,
    description: getRoleEffectSummary(card.role, card)
  };
}

function isActionLegal(actor, action) {
  const player = state.players[actor];
  if (action.cost > player.gold) return { ok: false, reason: `Not enough Gold for ${action.label}.` };
  if (action.role && !canUseRoleByUses(actor, action.role)) return { ok: false, reason: `${action.label} has no uses left.` };
  return { ok: true };
}

function formatActionText(actor, action) {
  return `${slotName(actor)} played ${action.label}`;
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
  setPendingClaim(action);

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
      setCurrentAction("Response timer ended. Waiting host.");
    }
    return;
  }

  setCurrentAction("Timeout -> ACCEPT");
  clearPendingClaim();
  resolveAccept();
}

function markRoleReveal(playerKey, cardIndex, verification = null) {
  const card = state.players[playerKey].cards[cardIndex];
  if (!card) return;
  card.revealedUsed = true;
  const normalized = verification === "REAL" || verification === "FAKE" ? verification : null;
  if (normalized) card.verification = normalized;
  card.confirmed = card.verification === "REAL";
}

function playerHasRealRole(playerKey, role) {
  const player = state.players[playerKey];
  if (!player || !Array.isArray(player.cards)) return false;
  return player.cards.some((card) => card && card.isReal && card.role === role);
}

function adjustSuspicion(role, delta) {
  if (!(role in state.ai.suspicion)) return;
  state.ai.suspicion[role] = clamp(state.ai.suspicion[role] + delta, 0.05, 0.95);
}

function resolveAccept() {
  if (state.phase !== PHASES.awaitingResponse) return;
  clearTimer();
  clearPendingClaim();

  const action = state.pendingAction;
  if (!action) return;

  if (typeof action.cardIndex === "number") markRoleReveal(action.actor, action.cardIndex);
  setCurrentAction(formatDecisionText(state.pendingResponder || opponentOf(action.actor), "ACCEPT"));

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
  clearPendingClaim();

  const action = state.pendingAction;
  if (!action || action.kind !== "role" || typeof action.cardIndex !== "number") return;

  const actor = action.actor;
  const challenger = opponentOf(actor);
  const card = state.players[actor].cards[action.cardIndex];
  const isReal = Boolean(card && card.isReal);

  markRoleReveal(actor, action.cardIndex, isReal ? "REAL" : "FAKE");
  state.pendingChallengeResult = { actor, challenger, role: action.role, isReal };

  setCurrentAction(formatChallengeOutcome(isReal, actor, challenger));

  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    const result = state.pendingChallengeResult;
    if (!pending || !result) return;

    applyActionResourceCost(pending);

    if (result.isReal) {
      applyDamage(result.challenger, 1, "failed challenge");
      applyEffect(pending);
      if (state.mode === "bot" && result.challenger === "bot") adjustSuspicion(result.role, -0.15);
    } else {
      applyDamage(result.actor, 2, "bluff penalty");
      if (playerHasRealRole(result.challenger, "ELF")) applyGold(result.challenger, 2, "ELF catch lie bonus");
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
    case "SCIENTIST": {
      applyGold(actor, 1, "SCIENTIST");
      const revealIndex = chooseScientistRevealIndex(target, actor, action.cardIndex);
      if (revealIndex !== null) {
        const revealed = revealCardVerification(target, revealIndex, "SCIENTIST");
        if (revealed) {
          const status = revealed.isReal ? "REAL" : "FAKE";
          setCurrentAction(`Reveal ${status} ${getRoleDisplayName(revealed.role)}`);
        }
      }
      break;
    }
    case "JOKER": {
      applyDamage(target, 1, "JOKER");
      const transformedInto = replaceJokerCard(actor, action.cardIndex);
      if (transformedInto) {
        setCurrentAction(`JOKER -> ${getRoleDisplayName(transformedInto)}`);
      }
      break;
    }
    case "BERSERK":
      applyDamage(actor, 1, "BERSERK recoil");
      applyDamage(target, 2, "BERSERK");
      break;
    case "BANKER":
      state.players[actor].bankerBuff = true;
      setCurrentAction("+1 Gold each round");
      break;
    case "ANGEL": {
      const actorState = state.players[actor];
      const hp = actorState.hp;
      actorState.hp = Math.max(0, actorState.gold);
      actorState.gold = Math.max(0, hp);
      triggerPlayerAnimation(actor, "heal");
      break;
    }
    case "VALK":
      applyDamage(target, 1, "VALK");
      applyHeal(actor, 1, "VALK");
      break;
    case "APPRENTICE": {
      const card = getCardByIndex(actor, action.cardIndex);
      const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
      applyDamage(target, dmg, "APPRENTICE");
      break;
    }
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
    const dynamicCost = getRoleCost(card.role, card);
    if (player.gold < dynamicCost) return;
    if (!canUseRoleByUses(playerKey, card.role)) return;

    actions.push({
      kind: "role",
      id: card.role,
      role: card.role,
      label: getRoleDisplayName(card.role),
      cardIndex,
      cost: dynamicCost,
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
    case "SCIENTIST": {
      const unknownCount = state.players.human.cards.filter(
        (card) => card && card.verification !== "REAL" && card.verification !== "FAKE"
      ).length;
      score += 1.3 + unknownCount * 0.45;
      break;
    }
    case "JOKER":
      score += human.hp <= 2 ? 2.6 : 1.7;
      break;
    case "BERSERK":
      score += human.hp <= 2 ? 2.4 : 1.2;
      if (bot.hp <= 2) score -= 1.5;
      break;
    case "BANKER":
      score += bot.bankerBuff ? -0.8 : 1.9;
      break;
    case "ANGEL":
      if (bot.hp <= 2 && bot.gold >= 3) score += 3.4;
      else score += 0.7;
      break;
    case "VALK":
      score += bot.hp <= 3 ? 3.4 : 2.1;
      break;
    case "APPRENTICE": {
      const card = getCardByIndex("bot", action.cardIndex);
      const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
      score += dmg * 1.25;
      if (human.hp <= dmg) score += 4.2;
      break;
    }
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
    case "SCIENTIST":
      preventedSwing = 1.6;
      break;
    case "JOKER":
      preventedSwing = 1.9;
      break;
    case "BERSERK":
      preventedSwing = 2.1;
      break;
    case "BANKER":
      preventedSwing = 1.8;
      break;
    case "ANGEL":
      preventedSwing = 2.2;
      break;
    case "VALK":
      preventedSwing = 2.4;
      break;
    case "APPRENTICE": {
      const card = getCardByIndex("human", action.cardIndex);
      const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
      preventedSwing = 1.1 + dmg * 0.7;
      break;
    }
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
  if (payload.kind === "DRAFT_ACCEPT") {
    applyCanonicalDraftAccept(payload);
    return;
  }
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
    setCurrentAction(`${slotName(payload.actorSlot)} timeout -> INTEREST`);
    playAction(payload.forcedInput || "INTEREST");
    return;
  }

  if (payload.phase === "response") {
    if (state.phase !== PHASES.awaitingResponse || payload.actorSlot !== state.pendingResponder) return;
    setCurrentAction("Timeout -> ACCEPT");
    clearPendingClaim();
    if (payload.forcedChoice === "CHALLENGE") resolveChallenge();
    else resolveAccept();
  }
}

function submitLocalAction(input) {
  const invalidFeedback = getInvalidActionFeedback(input);
  if (invalidFeedback) {
    showActionToast(invalidFeedback);
    return;
  }

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
  setCurrentAction(formatDecisionText(state.localSlot, choice));
  clearPendingClaim();

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

  if (state.phase === PHASES.draft) return "SELECT CARDS TO CHANGE (0-4) THEN PRESS ACCEPT";
  if (state.phase === PHASES.awaitingDraftOpponent) return "WAITING FOR OPPONENT TO PRESS ACCEPT...";
  if (state.phase === PHASES.draftReveal) return "APPLYING SWAPS...";
  if (state.phase === PHASES.gameStart) return "PREPARING FIRST TURN...";

  if (state.phase === PHASES.choosingAction) {
    if (state.currentActor === state.localSlot) {
      if (state.friend.pendingRequest === "action") return "WAITING HOST CONFIRMATION...";
      return "YOUR TURN";
    }
    return "OPPONENT TURN";
  }

  if (state.phase === PHASES.awaitingResponse) {
    if (state.pendingResponder === state.localSlot) {
      if (state.friend.pendingRequest === "response") return "WAITING HOST CONFIRMATION...";
      return "YOUR DECISION";
    }
    return "OPPONENT TURN";
  }

  if (state.phase === PHASES.resolvingDelay || state.phase === PHASES.applyingEffects) return "RESOLVING...";
  return "WAITING...";
}

function getTurnIndicatorTone() {
  if (state.screen !== APP_SCREENS.game) return "neutral";
  if (state.phase === PHASES.choosingAction) {
    if (state.currentActor === state.localSlot && state.friend.pendingRequest !== "action") return "your-turn";
    if (state.currentActor !== state.localSlot) return "opponent-turn";
    return "neutral";
  }
  if (state.phase === PHASES.awaitingResponse) {
    if (state.pendingResponder === state.localSlot && state.friend.pendingRequest !== "response") return "your-decision";
    if (state.pendingResponder !== state.localSlot) return "opponent-turn";
    return "neutral";
  }
  return "neutral";
}
function getResultWinnerText() {
  if (state.matchWinner === "draw") return "DRAW";
  if (state.matchWinner === state.localSlot) return "YOU WIN";
  if (state.matchWinner === "human" || state.matchWinner === "bot") return `${slotLabel(state.matchWinner)} WINS`;
  return "MATCH END";
}

function getResultSummaryText() {
  if (state.matchWinner === state.localSlot) return "Checkmate\u2026 in your mind.";
  if (state.matchWinner === "draw") return "Mind games tied. Run it back?";
  return "Outplayed. Run it back?";
}

function getSlotRanking(slot) {
  return slot === state.localSlot ? state.profile.ranking : state.profile.opponentRanking;
}

function getRankingDeltaForSlot(slot) {
  if (!state.matchWinner || state.matchWinner === "draw") return 0;
  return state.matchWinner === slot ? 50 : -50;
}

function formatRankingLine(slot) {
  const ranking = getSlotRanking(slot);
  const delta = getRankingDeltaForSlot(slot);
  if (delta > 0) return `Ranking: ${ranking} <span class="rank-delta rank-delta--up">(+${delta})</span>`;
  if (delta < 0) return `Ranking: ${ranking} <span class="rank-delta rank-delta--down">(${delta})</span>`;
  return `Ranking: ${ranking} <span class="rank-delta rank-delta--flat">(+0)</span>`;
}

function getConnectionBannerText() {
  const roomId = state.friend.roomId || "----";
  const role = net.role === "host" ? "Host" : net.role === "guest" ? "Guest" : "-";
  return `Connected: ${net.connectedCount}/2 | You are ${role} | Room: ${roomId} | ${state.friend.connectionStatus}`;
}

function getActiveTurnSlot() {
  if (state.screen !== APP_SCREENS.game) return null;
  if (state.phase === PHASES.choosingAction) return state.currentActor;
  if (state.phase === PHASES.awaitingResponse) {
    if (state.pendingResponder === state.localSlot && state.pendingAction) return state.pendingAction.actor;
    return state.pendingResponder;
  }
  return null;
}

function renderAvatar(node, avatarId) {
  if (!node) return;
  const path = getAvatarPath(avatarId);
  node.style.backgroundImage = `url("${path}")`;
}

function createRoleCardNode({ ownerSlot, card, cardIndex, asButton, disabled }) {
  const node = asButton ? document.createElement("button") : document.createElement("div");
  node.className = "role-card";
  if (asButton) {
    node.type = "button";
    node.dataset.cardIndex = String(cardIndex);
  }

  const draftMode = isDraftPhase();

  if (ownerSlot === state.localSlot) {
    if (!draftMode) {
      node.classList.add(card.isReal ? "real-role" : "fake-role");
      if (card.isReal) node.classList.add("real-role-highlight");
    }
  } else {
    node.classList.add("opponent-card");
    if (card.verification === "REAL" || card.verification === "FAKE") node.classList.add("opponent-confirmed");
    else if (!draftMode && card.revealedUsed) node.classList.add("opponent-played");
  }

  const pendingClaimCard = isPendingClaimCard(ownerSlot, card, cardIndex);
  if (pendingClaimCard) {
    node.classList.add("card--pending-claim");
    if (state.pendingClaim && Date.now() - state.pendingClaim.timestamp <= 320) {
      node.classList.add("card--pending-claim-flash");
    }
  }

  if (isDraftCardSelectable(ownerSlot)) {
    node.classList.add("draft-selectable");
    if (isDraftCardSelected(ownerSlot, cardIndex)) node.classList.add("draft-selected");
  }
  if (isDraftCardSwapping(ownerSlot, cardIndex)) {
    node.classList.add("draft-swapping");
  }

  const artLayer = document.createElement("span");
  artLayer.className = "card-art";
  if (card.role === "ANGEL") artLayer.classList.add("card-art-angel");
  if (card.role === "JOKER") artLayer.classList.add("card-art-joker");
  const roleImagePath = getRoleImagePath(card.role);
  if (roleImagePath) artLayer.style.backgroundImage = `url("${roleImagePath}")`;
  node.appendChild(artLayer);

  const textFade = document.createElement("span");
  textFade.className = "card-text-fade";
  node.appendChild(textFade);

  const meta = getRoleMeta(card.role);
  const roleCost = getRoleCost(card.role, card);
  const usesLeft = getRoleUsesLeft(ownerSlot, card.role);
  const badgeRow = document.createElement("div");
  badgeRow.className = "card-badge-row";
  const badgeLeft = document.createElement("div");
  badgeLeft.className = "card-badge-group card-badge-group-left";
  const badgeRight = document.createElement("div");
  badgeRight.className = "card-badge-group card-badge-group-right";
  let hasBadge = false;

  if (ownerSlot === state.localSlot && card.isReal) {
    const realTag = document.createElement("span");
    realTag.className = "card-badge card-status-tag card-real-tag";
    realTag.textContent = "REAL";
    badgeLeft.appendChild(realTag);
    hasBadge = true;
  } else if (ownerSlot === state.localSlot && !card.isReal && !draftMode) {
    const bluffTag = document.createElement("span");
    bluffTag.className = "card-badge card-status-tag card-fake-tag";
    bluffTag.textContent = "BLUFF";
    badgeLeft.appendChild(bluffTag);
    hasBadge = true;
  }

  if (ownerSlot !== state.localSlot && (card.verification === "REAL" || card.verification === "FAKE")) {
    const verifiedTag = document.createElement("span");
    const verifiedIsReal = card.verification === "REAL";
    verifiedTag.className = `card-badge card-status-tag ${verifiedIsReal ? "card-real-tag" : "card-fake-tag"}`;
    verifiedTag.textContent = verifiedIsReal ? "REAL" : "FAKE";
    badgeLeft.appendChild(verifiedTag);
    hasBadge = true;
  }

  if (meta && roleCost > 0) {
    const cost = document.createElement("span");
    cost.className = "card-badge card-cost";
    cost.textContent = String(roleCost);
    badgeRight.appendChild(cost);
    hasBadge = true;
  }

  if (meta && meta.passive) {
    const passive = document.createElement("span");
    passive.className = "card-badge card-passive";
    passive.textContent = "PASSIVE";
    badgeLeft.appendChild(passive);
    hasBadge = true;
  }

  if (usesLeft !== null) {
    const uses = document.createElement("span");
    uses.className = "card-badge card-uses";
    uses.textContent = `USES ${usesLeft}`;
    badgeLeft.appendChild(uses);
    hasBadge = true;
  }

  if (hasBadge) {
    badgeRow.appendChild(badgeLeft);
    badgeRow.appendChild(badgeRight);
    node.appendChild(badgeRow);
  }

  const textPanel = document.createElement("div");
  textPanel.className = "card-text-panel";

  const label = document.createElement("p");
  label.className = "card-label";
  label.textContent = getRoleDisplayName(card.role);
  textPanel.appendChild(label);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  renderRoleDescription(desc, card.role, card);
  textPanel.appendChild(desc);
  node.appendChild(textPanel);

  if (asButton && disabled) {
    node.setAttribute("aria-disabled", "true");
    node.classList.add("is-disabled");
  } else if (asButton) {
    node.setAttribute("aria-disabled", "false");
  }

  return node;
}

function renderCardsForSlot(container, slot, asInteractive) {
  if (!container) return;
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const cards = Array.isArray(state.players[slot].cards) ? state.players[slot].cards : [];
  cards.forEach((card, index) => {
    const draftSelectable = isDraftCardSelectable(slot);
    let enabled = asInteractive || draftSelectable;
    if (enabled && !draftSelectable) {
      const meta = getRoleMeta(card.role);
      if (!meta || meta.passive) enabled = false;
      if (enabled && state.players[slot].gold < getRoleCost(card.role, card)) enabled = false;
      if (enabled && !canUseRoleByUses(slot, card.role)) enabled = false;
    }
    const disabled = slot === state.localSlot ? !enabled : false;

    fragment.appendChild(
      createRoleCardNode({
        ownerSlot: slot,
        card,
        cardIndex: index,
        asButton: true,
        disabled
      })
    );
  });

  if (isDraftPhase() && cards.length < 4) {
    for (let index = cards.length; index < 4; index += 1) {
      const placeholder = document.createElement("div");
      placeholder.className = "role-card draft-waiting-card";
      const textPanel = document.createElement("div");
      textPanel.className = "card-text-panel";
      const label = document.createElement("p");
      label.className = "card-label";
      label.textContent = "WAITING";
      const desc = document.createElement("p");
      desc.className = "card-desc";
      desc.textContent = "Waiting for opponent...";
      textPanel.appendChild(label);
      textPanel.appendChild(desc);
      placeholder.appendChild(textPanel);
      fragment.appendChild(placeholder);
    }
  }

  container.appendChild(fragment);
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

  ui.playerNameInput.value = String(state.profile.name || "");
  ui.avatarPreviewLabel.textContent = getAvatarMeta(state.profile.avatarId).label;
  renderAvatar(ui.avatarPreviewArt, state.profile.avatarId);
  if (ui.homeLevelValue) ui.homeLevelValue.textContent = String(state.profile.level);
  if (ui.homeRankingValue) ui.homeRankingValue.textContent = String(state.profile.ranking);

  const showFriendBanner = state.mode === "friend" && state.screen === APP_SCREENS.game;
  ui.friendBanner.classList.toggle("hidden", !showFriendBanner);
  if (showFriendBanner) ui.friendBanner.textContent = getConnectionBannerText();

  ui.waitingStatusText.textContent = `Connected: ${net.connectedCount}/2`;
  ui.waitingRoleText.textContent = `You are ${net.role === "host" ? "Host" : net.role === "guest" ? "Guest" : "-"}`;
  ui.waitingRoomText.textContent = `Room: ${state.friend.roomId || "----"}`;
  ui.waitingConnectionStatusText.textContent = `Status: ${state.friend.connectionStatus}`;
  ui.friendConnectionStatusText.textContent = `Status: ${state.friend.connectionStatus}`;

  const hasFriendError = Boolean(state.friend.errorMessage);
  ui.waitingConnectionErrorText.classList.toggle("hidden", !hasFriendError);
  ui.friendConnectionErrorText.classList.toggle("hidden", !hasFriendError);
  if (hasFriendError) {
    ui.waitingConnectionErrorText.textContent = state.friend.errorMessage;
    ui.friendConnectionErrorText.textContent = state.friend.errorMessage;
  } else {
    ui.waitingConnectionErrorText.textContent = "";
    ui.friendConnectionErrorText.textContent = "";
  }

  const waitingLinksVisible = Boolean(state.friend.hostLink) && Boolean(state.friend.guestLink) && state.mode === "friend";
  ui.waitingLinkBlock.classList.toggle("hidden", !waitingLinksVisible);
  if (waitingLinksVisible) {
    ui.waitingHostLinkInput.value = state.friend.hostLink;
    ui.waitingGuestLinkInput.value = state.friend.guestLink;
  }

  const friendLinksVisible = Boolean(state.friend.hostLink) && Boolean(state.friend.guestLink) && state.screen === APP_SCREENS.friend;
  ui.friendLinkBlock.classList.toggle("hidden", !friendLinksVisible);
  if (friendLinksVisible) {
    ui.hostLinkInput.value = state.friend.hostLink;
    ui.friendLinkInput.value = state.friend.guestLink;
  }

  const canReconnect = state.mode === "friend" && Boolean(state.friend.roomId);
  ui.friendReconnectBtn.classList.toggle("hidden", !canReconnect);
  ui.waitingReconnectBtn.classList.toggle("hidden", !canReconnect);

  const topSlot = opponentOf(state.localSlot);
  const bottomSlot = state.localSlot;
  const draftMode = isDraftPhase();
  const localDraftPending =
    isDraftSelectionPhase() &&
    Boolean(state.draft) &&
    Boolean(state.localSlot) &&
    !Boolean(state.draft.accepted[state.localSlot]);
  const hideDraftOpponentPanel = draftMode && localDraftPending;

  ui.topNameText.textContent = slotName(topSlot);
  ui.bottomNameText.textContent = slotName(bottomSlot);
  renderStatsForSlot(ui.topStatsText, topSlot);
  renderStatsForSlot(ui.bottomStatsText, bottomSlot);

  renderAvatar(ui.topAvatar, state.slots[topSlot].avatarId);
  renderAvatar(ui.bottomAvatar, state.slots[bottomSlot].avatarId);
  ui.topPanel.classList.toggle("draft-opponent-hidden", hideDraftOpponentPanel);
  ui.topPanel.dataset.hiddenText =
    hideDraftOpponentPanel && state.mode === "friend" && net.connectedCount < 2
      ? "HIDDEN\nWaiting for opponent..."
      : hideDraftOpponentPanel
        ? "HIDDEN\nReveal after you press ACCEPT"
        : "";

  ui.appRoot.classList.toggle("draft-open", draftMode);
  ui.appRoot.classList.toggle("draft-local-pending", hideDraftOpponentPanel);
  ui.roundLabel.textContent = draftMode
    ? "DRAFT PHASE"
    : `ROUND ${Math.min(state.round, MATCH_SETTINGS.MAX_ROUNDS)}/${MATCH_SETTINGS.MAX_ROUNDS}`;
  ui.timerText.textContent = state.timer.mode ? `${state.timer.remaining}s` : "--";
  ui.turnIndicator.textContent = getTurnIndicatorText();
  const turnTone = getTurnIndicatorTone();
  ui.turnIndicator.classList.toggle("turn-indicator--your-turn", turnTone === "your-turn");
  ui.turnIndicator.classList.toggle("turn-indicator--your-decision", turnTone === "your-decision");
  ui.turnIndicator.classList.toggle("turn-indicator--opponent-turn", turnTone === "opponent-turn");
  ui.turnIndicator.classList.toggle("turn-indicator--neutral", turnTone === "neutral");
  ui.turnIndicator.classList.toggle("draft-instruction", localDraftPending);
  renderCurrentActionTypewriter(state.currentActionText);

  const activeTurnSlot = getActiveTurnSlot();
  ui.topPanel.classList.toggle("turn-active", activeTurnSlot === topSlot);
  ui.bottomPanel.classList.toggle("turn-active", activeTurnSlot === bottomSlot);
  const claimActorSlot = state.phase === PHASES.awaitingResponse && state.pendingAction ? state.pendingAction.actor : null;
  ui.topPanel.classList.toggle("claim-source-active", claimActorSlot === topSlot);
  ui.bottomPanel.classList.toggle("claim-source-active", claimActorSlot === bottomSlot);

  const canLocalAct =
    state.screen === APP_SCREENS.game &&
    !draftMode &&
    state.phase === PHASES.choosingAction &&
    state.currentActor === state.localSlot &&
    !state.friend.pendingRequest;
  const inLocalDecision =
    state.screen === APP_SCREENS.game &&
    state.phase === PHASES.awaitingResponse &&
    state.pendingResponder === state.localSlot &&
    !state.friend.pendingRequest;
  const localTurnLocked = state.screen === APP_SCREENS.game && !draftMode && !canLocalAct && !inLocalDecision;

  const canUseStrike = canLocalAct && state.players[state.localSlot].gold >= BASIC_ACTIONS.STRIKE.cost;
  ui.interestBtn.disabled = false;
  ui.strikeBtn.disabled = false;
  ui.interestBtn.classList.toggle("is-disabled", !canLocalAct && !inLocalDecision);
  ui.strikeBtn.classList.toggle("is-disabled", (!canUseStrike && !inLocalDecision) || localTurnLocked);
  ui.interestBtn.setAttribute("aria-disabled", canLocalAct ? "false" : "true");
  ui.strikeBtn.setAttribute("aria-disabled", canUseStrike ? "false" : "true");
  ui.bottomPanel.classList.toggle("actions-locked", localTurnLocked);

  const showDraftAccept =
    state.screen === APP_SCREENS.game &&
    isDraftSelectionPhase() &&
    Boolean(state.draft) &&
    Boolean(state.localSlot);
  ui.draftAcceptBtn.classList.toggle("hidden", !showDraftAccept);
  if (showDraftAccept) {
    const accepted = Boolean(state.draft.accepted[state.localSlot]);
    ui.draftAcceptBtn.disabled = accepted;
    ui.draftAcceptBtn.textContent = accepted ? "WAITING..." : "ACCEPT";
    ui.draftAcceptBtn.classList.toggle("draft-accept-attention", !accepted);
  } else {
    ui.draftAcceptBtn.disabled = false;
    ui.draftAcceptBtn.textContent = "ACCEPT";
    ui.draftAcceptBtn.classList.remove("draft-accept-attention");
  }

  renderCardsForSlot(ui.topCards, topSlot, false);
  renderCardsForSlot(ui.bottomCards, bottomSlot, canLocalAct);
  ui.bottomCards.classList.toggle("draft-needs-accept", localDraftPending);

  const showResponse =
    state.screen === APP_SCREENS.game &&
    state.phase === PHASES.awaitingResponse &&
    state.pendingResponder === state.localSlot &&
    !state.friend.pendingRequest;

  ui.responseOverlay.classList.toggle("hidden", !showResponse);
  ui.responseOverlay.classList.toggle("decision-attention", showResponse);
  ui.appRoot.classList.toggle("response-open", showResponse);

  ui.resultWinnerText.textContent = getResultWinnerText();
  ui.resultSummaryText.textContent = getResultSummaryText();

  const localSlot = state.localSlot || "human";
  const opponentSlot = opponentOf(localSlot);
  const localPlayer = state.players[localSlot];
  const opponentPlayer = state.players[opponentSlot];

  if (ui.resultDuelNames) ui.resultDuelNames.textContent = `${slotName(localSlot)} vs ${slotName(opponentSlot)}`;
  if (ui.resultLocalName) ui.resultLocalName.textContent = slotName(localSlot);
  if (ui.resultOpponentName) ui.resultOpponentName.textContent = slotName(opponentSlot);
  if (ui.resultLocalStatsLabel) ui.resultLocalStatsLabel.textContent = slotName(localSlot);
  if (ui.resultOpponentStatsLabel) ui.resultOpponentStatsLabel.textContent = slotName(opponentSlot);
  if (ui.resultLocalHpText) ui.resultLocalHpText.textContent = `HP: ${localPlayer.hp}`;
  if (ui.resultOpponentHpText) ui.resultOpponentHpText.textContent = `HP: ${opponentPlayer.hp}`;
  if (ui.resultLocalGoldText) ui.resultLocalGoldText.textContent = `Gold: ${localPlayer.gold}`;
  if (ui.resultOpponentGoldText) ui.resultOpponentGoldText.textContent = `Gold: ${opponentPlayer.gold}`;
  if (ui.resultLocalRankText) ui.resultLocalRankText.innerHTML = formatRankingLine(localSlot);
  if (ui.resultOpponentRankText) ui.resultOpponentRankText.innerHTML = formatRankingLine(opponentSlot);
  if (ui.resultLocalCard) ui.resultLocalCard.classList.toggle("is-winner", state.matchWinner === localSlot);
  if (ui.resultOpponentCard) ui.resultOpponentCard.classList.toggle("is-winner", state.matchWinner === opponentSlot);
  if (ui.resultLocalCard) ui.resultLocalCard.classList.toggle("is-draw", state.matchWinner === "draw");
  if (ui.resultOpponentCard) ui.resultOpponentCard.classList.toggle("is-draw", state.matchWinner === "draw");
  renderAvatar(ui.resultLocalAvatar, state.slots[localSlot].avatarId);
  renderAvatar(ui.resultOpponentAvatar, state.slots[opponentSlot].avatarId);
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

function ensureCardBadgeRow(node) {
  if (!(node instanceof HTMLElement)) return null;
  let badgeRow = node.querySelector(".card-badge-row");
  let badgeLeft = badgeRow ? badgeRow.querySelector(".card-badge-group-left") : null;
  let badgeRight = badgeRow ? badgeRow.querySelector(".card-badge-group-right") : null;

  if (!badgeRow) {
    badgeRow = document.createElement("div");
    badgeRow.className = "card-badge-row";
  }
  if (!badgeLeft) {
    badgeLeft = document.createElement("div");
    badgeLeft.className = "card-badge-group card-badge-group-left";
  }
  if (!badgeRight) {
    badgeRight = document.createElement("div");
    badgeRight.className = "card-badge-group card-badge-group-right";
  }

  if (!badgeRow.contains(badgeLeft)) badgeRow.appendChild(badgeLeft);
  if (!badgeRow.contains(badgeRight)) badgeRow.appendChild(badgeRight);

  if (!node.contains(badgeRow)) {
    const textPanel = node.querySelector(".card-text-panel");
    if (textPanel) node.insertBefore(badgeRow, textPanel);
    else node.appendChild(badgeRow);
  }

  return { badgeRow, badgeLeft, badgeRight };
}

function setTutorialCardStatusTag(node, isReal) {
  const refs = ensureCardBadgeRow(node);
  if (!refs) return;
  const { badgeLeft } = refs;
  badgeLeft.querySelectorAll(".card-status-tag").forEach((tag) => tag.remove());

  const statusTag = document.createElement("span");
  statusTag.className = `card-badge card-status-tag ${isReal ? "card-real-tag" : "card-tutorial-fake-tag"}`;
  statusTag.textContent = isReal ? "REAL" : "FAKE";
  badgeLeft.prepend(statusTag);
}

function renderTutorialCards() {
  if (!ui.tutorialCardsRow) return;
  ui.tutorialCardsRow.innerHTML = "";

  const fragment = document.createDocumentFragment();
  TUTORIAL_SAMPLE_CARDS.forEach((entry, index) => {
    const card = createCard(entry.role, entry.isReal, index);
    const node = createRoleCardNode({
      ownerSlot: state.localSlot,
      card,
      cardIndex: index,
      asButton: false,
      disabled: false
    });
    node.classList.add("tutorial-role-card");
    setTutorialCardStatusTag(node, entry.isReal);
    fragment.appendChild(node);
  });

  ui.tutorialCardsRow.appendChild(fragment);
}

function renderTutorialStep() {
  if (!(ui.tutorialModal instanceof HTMLElement)) return;
  const steps = TUTORIAL_STEPS;
  if (!Array.isArray(steps) || steps.length === 0) return;

  const clampedIndex = clamp(uiRuntime.tutorialStepIndex, 0, steps.length - 1);
  uiRuntime.tutorialStepIndex = clampedIndex;
  const step = steps[clampedIndex];

  if (ui.tutorialStepText) ui.tutorialStepText.textContent = step.text;
  if (ui.tutorialNextBtn) ui.tutorialNextBtn.textContent = step.button;
  ui.tutorialModal.dataset.step = step.focus || "none";
}

function openTutorial() {
  renderTutorialCards();
  uiRuntime.tutorialStepIndex = 0;
  renderTutorialStep();
  openModal(ui.tutorialModal);
}

function advanceTutorialStep() {
  const lastIndex = TUTORIAL_STEPS.length - 1;
  if (uiRuntime.tutorialStepIndex >= lastIndex) {
    closeModal(ui.tutorialModal);
    return;
  }
  uiRuntime.tutorialStepIndex += 1;
  renderTutorialStep();
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

function showCopyToast(message) {
  if (!ui.copyToast) return;
  ui.copyToast.textContent = message || "Copied!";
  ui.copyToast.classList.remove("hidden");
  if (state.friend.copyToastTimerId) clearTimeout(state.friend.copyToastTimerId);
  state.friend.copyToastTimerId = setTimeout(() => {
    ui.copyToast.classList.add("hidden");
    state.friend.copyToastTimerId = null;
  }, 1500);
}

function showActionToast(message) {
  if (!ui.actionToast || !message) return;
  ui.actionToast.textContent = message;
  ui.actionToast.classList.remove("hidden");
  if (uiRuntime.actionToastTimerId) clearTimeout(uiRuntime.actionToastTimerId);
  uiRuntime.actionToastTimerId = setTimeout(() => {
    ui.actionToast.classList.add("hidden");
    uiRuntime.actionToastTimerId = null;
  }, UI_TIMINGS.actionToastMs);
}

function clearActionToast() {
  if (uiRuntime.actionToastTimerId) {
    clearTimeout(uiRuntime.actionToastTimerId);
    uiRuntime.actionToastTimerId = null;
  }
  if (ui.actionToast) ui.actionToast.classList.add("hidden");
}

function stopCurrentActionTypewriter() {
  if (uiRuntime.currentActionTypeTimerId) {
    clearTimeout(uiRuntime.currentActionTypeTimerId);
    uiRuntime.currentActionTypeTimerId = null;
  }
  if (uiRuntime.currentActionPauseTimerId) {
    clearTimeout(uiRuntime.currentActionPauseTimerId);
    uiRuntime.currentActionPauseTimerId = null;
  }
}

function renderCurrentActionTypewriter(text) {
  if (!ui.currentActionText) return;
  const nextText = String(text || "");

  if (nextText === uiRuntime.lastActionText) {
    if (ui.currentActionText.textContent !== nextText && !uiRuntime.currentActionTypeTimerId && !uiRuntime.currentActionPauseTimerId) {
      ui.currentActionText.textContent = nextText;
    }
    return;
  }

  uiRuntime.lastActionText = nextText;
  uiRuntime.currentActionTypeToken += 1;
  const token = uiRuntime.currentActionTypeToken;
  stopCurrentActionTypewriter();

  if (!nextText) {
    ui.currentActionText.textContent = "";
    return;
  }

  let index = 0;
  ui.currentActionText.textContent = "";
  const typeNext = () => {
    if (token !== uiRuntime.currentActionTypeToken) {
      stopCurrentActionTypewriter();
      return;
    }
    index += 1;
    ui.currentActionText.textContent = nextText.slice(0, index);
    if (index >= nextText.length) {
      uiRuntime.currentActionTypeTimerId = null;
      uiRuntime.currentActionPauseTimerId = setTimeout(() => {
        if (token !== uiRuntime.currentActionTypeToken) return;
        uiRuntime.currentActionPauseTimerId = null;
      }, UI_TIMINGS.currentActionPauseMs);
      return;
    }
    uiRuntime.currentActionTypeTimerId = setTimeout(typeNext, UI_TIMINGS.currentActionTypeMs);
  };
  uiRuntime.currentActionTypeTimerId = setTimeout(typeNext, UI_TIMINGS.currentActionTypeMs);
}

async function reconnectFriendRoom() {
  if (!state.friend.roomId || !state.friend.role) return;
  if (state.friend.role === "guest") {
    await joinFriendRoomAsGuest(state.friend.roomId);
    return;
  }
  await joinFriendRoomAsHost(state.friend.roomId);
}

function onBottomCardsClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button[data-card-index]");
  if (!(button instanceof HTMLButtonElement)) return;
  const cardIndex = Number(button.dataset.cardIndex);
  if (Number.isNaN(cardIndex)) return;

  if (isDraftSelectionPhase()) {
    if (!isDraftCardSelectable(state.localSlot)) return;
    const current = getDraftSelectionsForSlot(state.localSlot);
    const exists = current.includes(cardIndex);
    const next = exists ? current.filter((idx) => idx !== cardIndex) : [...current, cardIndex];
    setDraftSelectionsForSlot(state.localSlot, next);
    setCurrentAction(`Swaps selected: ${normalizeDraftSelectionIndices(next).length}`);
    return;
  }

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
  ui.premiumBtn.addEventListener("click", () => openModal(ui.premiumModal));

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

  ui.backToMenuBtn.addEventListener("click", () => {
    void backToMenu();
  });
  ui.shareResultBtn.addEventListener("click", () => {
    showActionToast("Share coming soon");
  });

  ui.playBotBtn.addEventListener("click", () => startBotMatch());
  ui.playFriendBtn.addEventListener("click", () => {
    state.screen = APP_SCREENS.friend;
    state.friend.hostLink = "";
    state.friend.guestLink = "";
    state.friend.connectionStatus = "Idle";
    state.friend.errorMessage = "";
    updateUI();
  });
  ui.tournamentsBtn.addEventListener("click", () => {
    showActionToast("Tournaments coming soon");
  });
  ui.startTutorialBtn.addEventListener("click", () => openTutorial());

  ui.createLinkBtn.addEventListener("click", () => {
    void createFriendRoomAsHost();
  });

  ui.copyFriendLinkBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(state.friend.guestLink);
    if (ok) showCopyToast("Copied!");
    else setFriendError("Clipboard copy failed. Copy manually.");
  });

  ui.waitingCopyBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(state.friend.guestLink);
    if (ok) showCopyToast("Copied!");
    else setFriendError("Clipboard copy failed. Copy manually.");
  });

  ui.friendReconnectBtn.addEventListener("click", () => {
    void reconnectFriendRoom();
  });

  ui.waitingReconnectBtn.addEventListener("click", () => {
    void reconnectFriendRoom();
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
  ui.premiumCloseBtn.addEventListener("click", () => closeModal(ui.premiumModal));
  ui.goPremiumBtn.addEventListener("click", () => showActionToast("Available soon"));
  ui.tutorialNextBtn.addEventListener("click", () => advanceTutorialStep());
  ui.levelUnlockCloseBtn.addEventListener("click", () => closeLevelUnlockModal());
  if (ui.levelUnlockModal instanceof HTMLElement) {
    ui.levelUnlockModal.addEventListener("click", (event) => {
      if (event.target === ui.levelUnlockModal) closeLevelUnlockModal();
    });
  }

  ui.avatarPreviewBtn.addEventListener("click", () => openModal(ui.avatarModal));
  ui.avatarGrid.addEventListener("click", onAvatarChoice);

  ui.playerNameInput.addEventListener("input", () => {
    state.profile.name = String(ui.playerNameInput.value || "");
    if (state.mode !== "friend") {
      state.slots.human.name = state.profile.name;
    }
    updateUI();
  });

  ui.interestBtn.addEventListener("click", () => submitLocalAction("INTEREST"));
  ui.strikeBtn.addEventListener("click", () => submitLocalAction("STRIKE"));
  ui.bottomCards.addEventListener("click", onBottomCardsClick);
  ui.draftAcceptBtn.addEventListener("click", () => {
    void submitLocalDraftAccept(false);
  });

  ui.acceptBtn.addEventListener("click", () => submitLocalResponse("ACCEPT"));
  ui.challengeBtn.addEventListener("click", () => submitLocalResponse("CHALLENGE"));

  bindModalDismiss(ui.rulesModal, ui.rulesCloseBtn);
  bindModalDismiss(ui.avatarModal, ui.avatarModalCloseBtn);
  bindModalDismiss(ui.premiumModal, ui.premiumCloseBtn);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalState.activeModal === ui.levelUnlockModal) {
      closeLevelUnlockModal();
      return;
    }
    closeModal();
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
  ui.premiumBtn = document.getElementById("premiumBtn");
  ui.homeLevelValue = document.getElementById("homeLevelValue");
  ui.homeRankingValue = document.getElementById("homeRankingValue");
  ui.homeTipText = document.getElementById("homeTipText");
  ui.homeTipDots = document.getElementById("homeTipDots");
  ui.playerNameInput = document.getElementById("playerNameInput");
  ui.avatarPreviewBtn = document.getElementById("avatarPreviewBtn");
  ui.avatarPreviewArt = document.getElementById("avatarPreviewArt");
  ui.avatarPreviewLabel = document.getElementById("avatarPreviewLabel");

  ui.modeBackBtn = document.getElementById("modeBackBtn");
  ui.playBotBtn = document.getElementById("playBotBtn");
  ui.playFriendBtn = document.getElementById("playFriendBtn");
  ui.tournamentsBtn = document.getElementById("tournamentsBtn");
  ui.startTutorialBtn = document.getElementById("startTutorialBtn");

  ui.friendBackBtn = document.getElementById("friendBackBtn");
  ui.createLinkBtn = document.getElementById("createLinkBtn");
  ui.friendLinkBlock = document.getElementById("friendLinkBlock");
  ui.hostLinkInput = document.getElementById("hostLinkInput");
  ui.friendLinkInput = document.getElementById("friendLinkInput");
  ui.copyFriendLinkBtn = document.getElementById("copyFriendLinkBtn");
  ui.friendConnectionStatusText = document.getElementById("friendConnectionStatusText");
  ui.friendConnectionErrorText = document.getElementById("friendConnectionErrorText");
  ui.friendReconnectBtn = document.getElementById("friendReconnectBtn");

  ui.waitingBackBtn = document.getElementById("waitingBackBtn");
  ui.waitingStatusText = document.getElementById("waitingStatusText");
  ui.waitingRoleText = document.getElementById("waitingRoleText");
  ui.waitingRoomText = document.getElementById("waitingRoomText");
  ui.waitingConnectionStatusText = document.getElementById("waitingConnectionStatusText");
  ui.waitingConnectionErrorText = document.getElementById("waitingConnectionErrorText");
  ui.waitingLinkBlock = document.getElementById("waitingLinkBlock");
  ui.waitingHostLinkInput = document.getElementById("waitingHostLinkInput");
  ui.waitingGuestLinkInput = document.getElementById("waitingGuestLinkInput");
  ui.waitingCopyBtn = document.getElementById("waitingCopyBtn");
  ui.waitingReconnectBtn = document.getElementById("waitingReconnectBtn");

  ui.gameBackBtn = document.getElementById("gameBackBtn");
  ui.rulesBtn = document.getElementById("rulesBtn");
  ui.friendBanner = document.getElementById("friendBanner");

  ui.roundLabel = document.getElementById("roundLabel");
  ui.timerText = document.getElementById("timerText");
  ui.turnIndicator = document.getElementById("turnIndicator");
  ui.currentActionText = document.getElementById("currentActionText");
  ui.draftAcceptBtn = document.getElementById("draftAcceptBtn");

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
  ui.interestActionDesc = document.getElementById("interestActionDesc");
  ui.strikeActionDesc = document.getElementById("strikeActionDesc");

  ui.responseOverlay = document.getElementById("responseOverlay");
  ui.acceptBtn = document.getElementById("acceptBtn");
  ui.challengeBtn = document.getElementById("challengeBtn");
  ui.tutorialModal = document.getElementById("tutorialModal");
  ui.tutorialCardsRow = document.getElementById("tutorialCardsRow");
  ui.tutorialStepText = document.getElementById("tutorialStepText");
  ui.tutorialNextBtn = document.getElementById("tutorialNextBtn");
  ui.levelUnlockModal = document.getElementById("levelUnlockModal");
  ui.levelUnlockLevelText = document.getElementById("levelUnlockLevelText");
  ui.levelUnlockRoleText = document.getElementById("levelUnlockRoleText");
  ui.levelUnlockImage = document.getElementById("levelUnlockImage");
  ui.levelUnlockCloseBtn = document.getElementById("levelUnlockCloseBtn");

  ui.resultWinnerText = document.getElementById("resultWinnerText");
  ui.resultSummaryText = document.getElementById("resultSummaryText");
  ui.resultDuelNames = document.getElementById("resultDuelNames");
  ui.resultLocalCard = document.getElementById("resultLocalCard");
  ui.resultOpponentCard = document.getElementById("resultOpponentCard");
  ui.resultLocalAvatar = document.getElementById("resultLocalAvatar");
  ui.resultOpponentAvatar = document.getElementById("resultOpponentAvatar");
  ui.resultLocalName = document.getElementById("resultLocalName");
  ui.resultOpponentName = document.getElementById("resultOpponentName");
  ui.resultLocalStatsLabel = document.getElementById("resultLocalStatsLabel");
  ui.resultOpponentStatsLabel = document.getElementById("resultOpponentStatsLabel");
  ui.resultLocalHpText = document.getElementById("resultLocalHpText");
  ui.resultOpponentHpText = document.getElementById("resultOpponentHpText");
  ui.resultLocalGoldText = document.getElementById("resultLocalGoldText");
  ui.resultOpponentGoldText = document.getElementById("resultOpponentGoldText");
  ui.resultLocalRankText = document.getElementById("resultLocalRankText");
  ui.resultOpponentRankText = document.getElementById("resultOpponentRankText");
  ui.shareResultBtn = document.getElementById("shareResultBtn");
  ui.playAgainBtn = document.getElementById("playAgainBtn");
  ui.backToMenuBtn = document.getElementById("backToMenuBtn");

  ui.avatarModal = document.getElementById("avatarModal");
  ui.avatarModalCloseBtn = document.getElementById("avatarModalCloseBtn");
  ui.avatarGrid = ui.avatarModal ? ui.avatarModal.querySelector(".avatar-grid") : null;

  ui.rulesModal = document.getElementById("rulesModal");
  ui.rulesCloseBtn = document.getElementById("rulesCloseBtn");
  ui.rulesRoleList = document.getElementById("rulesRoleList");
  ui.premiumModal = document.getElementById("premiumModal");
  ui.premiumCloseBtn = document.getElementById("premiumCloseBtn");
  ui.goPremiumBtn = document.getElementById("goPremiumBtn");
  ui.copyToast = document.getElementById("copyToast");
  ui.actionToast = document.getElementById("actionToast");
}

function exposeSupabaseTest() {
  window.liarsClashTestSupabase = async function liarsClashTestSupabase() {
    const ok = await net.initSupabase();
    if (!ok) {
      console.error("[Supabase Test] Client is not initialized. Check supabase-public-config.js.");
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
  applyAssetCssVariables();
  renderAvatarChoices();
  renderRulesRoleList();
  renderTutorialCards();
  renderHomeTipDots();
  setHomeTip(state.home.tipIndex, false);
  startHomeTipsCarousel();
  setActionDescriptions();
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
    const roleFromUrl = getRoomRoleFromUrl();
    if (roleFromUrl === "guest") await joinFriendRoomAsGuest(roomFromUrl);
    else await joinFriendRoomAsHost(roomFromUrl);
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


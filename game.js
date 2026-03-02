"use strict";

const PHASES = Object.freeze({
  idle: "idle",
  draft: "draft",
  awaitingDraftOpponent: "awaitingDraftOpponent",
  draftReveal: "draftReveal",
  gameStart: "gameStart",
  rogueSwap: "rogueSwap",
  choosingAction: "choosingAction",
  awaitingResponse: "awaitingResponse",
  resolvingDelay: "resolvingDelay",
  applyingEffects: "applyingEffects",
  matchEnd: "matchEnd"
});

const APP_SCREENS = Object.freeze({
  splash: "splash",
  home: "home",
  collection: "collection",
  mode: "mode",
  tv: "tv",
  friend: "friend",
  waiting: "waiting",
  game: "game",
  result: "result",
  review: "review"
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
  SIREN: Object.freeze({ name: "SIREN", cost: 1, description: "1 DMG + skip next action", passive: false }),
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
  ANGEL: Object.freeze({ name: "ANGEL", cost: 0, description: "Swap HP and Gold", maxUses: 1, passive: false }),
  VALK: Object.freeze({ name: "VALK", cost: 3, description: "Enemy -1 HP self +1 HP", passive: false }),
  APPRENTICE: Object.freeze({ name: "APPRENTICE", cost: 2, description: "Scales each round", passive: false, apprentice: true })
});

const BASIC_ACTIONS = Object.freeze({
  INTEREST: Object.freeze({ id: "INTEREST", cost: 0, description: "+1 Gold", challengeable: false }),
  STRIKE: Object.freeze({ id: "STRIKE", cost: 2, description: "Deal 1 DMG", challengeable: false })
});

const ASSET_MAP = Object.freeze({
  heroPortraitPaths: Object.freeze({
    adventurer: "./Recursos/Adventurer_avatar.png",
    noble: "./Recursos/Noble_avatar.png",
    rogue: "./Recursos/rogue_avatar.png",
    guardian: "./Recursos/Guardian.png",
    oracle: "./Recursos/Oracle.png"
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

const HERO_REGISTRY = Object.freeze({
  adventurer: Object.freeze({
    id: "adventurer",
    displayName: "Adventurer",
    shortDescription: "Interest gives +2 Gold instead of +1.",
    portraitPath: ASSET_MAP.heroPortraitPaths.adventurer
  }),
  noble: Object.freeze({
    id: "noble",
    displayName: "Noble",
    shortDescription: "Basic Strike deals 2 damage.",
    portraitPath: ASSET_MAP.heroPortraitPaths.noble
  }),
  rogue: Object.freeze({
    id: "rogue",
    displayName: "Rogue",
    shortDescription: "First turn: optional 0-4 card swap.",
    portraitPath: ASSET_MAP.heroPortraitPaths.rogue
  }),
  guardian: Object.freeze({
    id: "guardian",
    displayName: "Guardian",
    shortDescription: "Gain Shield at round 1 and round 6.",
    portraitPath: ASSET_MAP.heroPortraitPaths.guardian
  }),
  oracle: Object.freeze({
    id: "oracle",
    displayName: "Oracle",
    shortDescription: "Start with 3 REAL cards and 1 BLUFF.",
    portraitPath: ASSET_MAP.heroPortraitPaths.oracle
  })
});

const GAME_EVENT_REGISTRY = Object.freeze({
  none: Object.freeze({
    id: "none",
    name: "No Event",
    description: "Standard rules."
  }),
  extra_hp: Object.freeze({
    id: "extra_hp",
    name: "+1 Starting HP",
    description: "Both players start with 6 HP instead of 5."
  }),
  mirror_hands: Object.freeze({
    id: "mirror_hands",
    name: "Mirror Hands",
    description: "Both players start with the same cards."
  }),
  gold_per_round: Object.freeze({
    id: "gold_per_round",
    name: "+1 Gold per Round",
    description: "Both players gain +1 extra Gold each round."
  }),
  hidden_cards: Object.freeze({
    id: "hidden_cards",
    name: "Fog of War",
    description: "You cannot see opponent cards until they are played."
  })
});

const GAME_EVENTS = Object.freeze(Object.values(GAME_EVENT_REGISTRY));

const HERO_ORDER = Object.freeze(["adventurer", "noble", "rogue", "guardian", "oracle"]);
const COLLECTION_TABS = Object.freeze(["cards", "heroes", "events"]);
const PROGRESSION_STORAGE_KEY = "liarsClashProgressionV3";
const MATCHES_PLAYED_COUNT_STORAGE_KEY = "matchesPlayedCount";
const DEMON_BOT_MATCH_THRESHOLD = 3;

const LEAGUE_SEGMENTS = Object.freeze([
  Object.freeze({ id: "wood_iii", league: "Wood", subleague: "III", basePoints: 0 }),
  Object.freeze({ id: "wood_ii", league: "Wood", subleague: "II", basePoints: 100 }),
  Object.freeze({ id: "wood_i", league: "Wood", subleague: "I", basePoints: 200 }),
  Object.freeze({ id: "stone_iii", league: "Stone", subleague: "III", basePoints: 300 }),
  Object.freeze({ id: "stone_ii", league: "Stone", subleague: "II", basePoints: 400 }),
  Object.freeze({ id: "stone_i", league: "Stone", subleague: "I", basePoints: 500 }),
  Object.freeze({ id: "bronze_iii", league: "Bronze", subleague: "III", basePoints: 600 }),
  Object.freeze({ id: "bronze_ii", league: "Bronze", subleague: "II", basePoints: 700 }),
  Object.freeze({ id: "bronze_i", league: "Bronze", subleague: "I", basePoints: 800 })
]);

const LEAGUE_SEGMENT_BY_ID = Object.freeze(
  LEAGUE_SEGMENTS.reduce((acc, segment) => {
    acc[segment.id] = segment;
    return acc;
  }, Object.create(null))
);
const LEAGUE_SEGMENT_INDEX_BY_ID = Object.freeze(
  LEAGUE_SEGMENTS.reduce((acc, segment, index) => {
    acc[segment.id] = index;
    return acc;
  }, Object.create(null))
);

const STARTING_UNLOCKS = Object.freeze({
  cards: Object.freeze(["KNIGHT", "GOBLIN", "SIREN", "ELF"]),
  heroes: Object.freeze(["adventurer"]),
  events: Object.freeze(["none"])
});

const PROGRESSION_REWARDS = Object.freeze([
  Object.freeze({ id: "wood_iii_20_ent", segmentId: "wood_iii", point: 20, rewardType: "card", itemId: "ENT", label: "Unlock Card: Ent" }),
  Object.freeze({ id: "wood_iii_40_dwarf", segmentId: "wood_iii", point: 40, rewardType: "card", itemId: "DWARF", label: "Unlock Card: Dwarf" }),
  Object.freeze({ id: "wood_iii_60_noble", segmentId: "wood_iii", point: 60, rewardType: "hero", itemId: "noble", label: "Unlock Hero: Noble" }),
  Object.freeze({ id: "wood_iii_80_berserk", segmentId: "wood_iii", point: 80, rewardType: "card", itemId: "BERSERK", label: "Unlock Card: Berserker" }),
  Object.freeze({ id: "wood_iii_100_valk", segmentId: "wood_iii", point: 100, rewardType: "card", itemId: "VALK", label: "Unlock Card: Valkyrie" }),

  Object.freeze({ id: "wood_ii_20_scientist", segmentId: "wood_ii", point: 20, rewardType: "card", itemId: "SCIENTIST", label: "Unlock Card: Scientist" }),
  Object.freeze({ id: "wood_ii_40_banker", segmentId: "wood_ii", point: 40, rewardType: "card", itemId: "BANKER", label: "Unlock Card: Banker" }),
  Object.freeze({ id: "wood_ii_60_rogue", segmentId: "wood_ii", point: 60, rewardType: "hero", itemId: "rogue", label: "Unlock Hero: Rogue" }),
  Object.freeze({ id: "wood_ii_80_pirate", segmentId: "wood_ii", point: 80, rewardType: "card", itemId: "PIRATE", label: "Unlock Card: Pirate" }),
  Object.freeze({ id: "wood_ii_100_adept", segmentId: "wood_ii", point: 100, rewardType: "card", itemId: "APPRENTICE", label: "Unlock Card: Adept" }),

  Object.freeze({ id: "wood_i_20_angel", segmentId: "wood_i", point: 20, rewardType: "card", itemId: "ANGEL", label: "Unlock Card: Angel" }),
  Object.freeze({ id: "wood_i_40_joker", segmentId: "wood_i", point: 40, rewardType: "card", itemId: "JOKER", label: "Unlock Card: Joker" }),
  Object.freeze({ id: "wood_i_60_guardian", segmentId: "wood_i", point: 60, rewardType: "hero", itemId: "guardian", label: "Unlock Hero: Guardian" }),
  Object.freeze({
    id: "wood_i_80_skin_adventurer",
    segmentId: "wood_i",
    point: 80,
    rewardType: "skin",
    itemId: "adventurer",
    label: "Unlock Hero Skin: Adventurer"
  }),
  Object.freeze({
    id: "wood_i_100_skin_noble",
    segmentId: "wood_i",
    point: 100,
    rewardType: "skin",
    itemId: "noble",
    label: "Unlock Hero Skin: Noble"
  }),
  Object.freeze({
    id: "stone_iii_40_event_extra_hp",
    segmentId: "stone_iii",
    point: 40,
    rewardType: "event",
    itemId: "extra_hp",
    label: "Unlock Game Event: +1 Starting HP"
  }),

  Object.freeze({
    id: "stone_iii_80_skin_rogue",
    segmentId: "stone_iii",
    point: 80,
    rewardType: "skin",
    itemId: "rogue",
    label: "Unlock Hero Skin: Rogue"
  }),
  Object.freeze({
    id: "stone_iii_100_event_mirror_hands",
    segmentId: "stone_iii",
    point: 100,
    rewardType: "event",
    itemId: "mirror_hands",
    label: "Unlock Game Event: Mirror Hands"
  }),

  Object.freeze({
    id: "stone_ii_40_skin_guardian",
    segmentId: "stone_ii",
    point: 40,
    rewardType: "skin",
    itemId: "guardian",
    label: "Unlock Hero Skin: Guardian"
  }),
  Object.freeze({
    id: "stone_ii_100_event_gold_per_round",
    segmentId: "stone_ii",
    point: 100,
    rewardType: "event",
    itemId: "gold_per_round",
    label: "Unlock Game Event: +1 Gold per Round"
  }),

  Object.freeze({ id: "stone_i_40_oracle", segmentId: "stone_i", point: 40, rewardType: "hero", itemId: "oracle", label: "Unlock Hero: Oracle" }),
  Object.freeze({
    id: "stone_i_100_event_hidden_cards",
    segmentId: "stone_i",
    point: 100,
    rewardType: "event",
    itemId: "hidden_cards",
    label: "Unlock Game Event: Fog of War"
  }),

  Object.freeze({
    id: "bronze_iii_100_ranked",
    segmentId: "bronze_iii",
    point: 100,
    rewardType: "mode",
    itemId: "ranked",
    label: "Unlock Ranked Mode"
  })
]);

const PROGRESSION_REWARD_BY_ID = Object.freeze(
  PROGRESSION_REWARDS.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, Object.create(null))
);

const ROLE_COLLECTION_META = Object.freeze({
  SIREN: Object.freeze({ name: "Siren", description: "Deal 1 damage and skip opponent next action." }),
  DWARF: Object.freeze({ name: "Dwarf", description: "Gain Shield for the next damage." }),
  KNIGHT: Object.freeze({ name: "Knight", description: "Deal 2 damage." }),
  GOBLIN: Object.freeze({ name: "Goblin", description: "Steal 1 Gold (max 3 uses)." }),
  ENT: Object.freeze({ name: "Ent", description: "Heal 2 HP." }),
  ELF: Object.freeze({ name: "Elf", description: "Passive: +2 Gold when you catch a lie." }),
  PIRATE: Object.freeze({ name: "Pirate", description: "Deal 1 damage and gain 1 Gold." }),
  SCIENTIST: Object.freeze({ name: "Scientist", description: "Gain 1 Gold and reveal one unknown opponent card." }),
  JOKER: Object.freeze({ name: "Joker", description: "Deal 1 damage, then transform into another card." }),
  BERSERK: Object.freeze({ name: "Berserker", description: "Self -1 HP, opponent -2 HP." }),
  BANKER: Object.freeze({ name: "Banker", description: "Activate +1 Gold at the start of each round." }),
  ANGEL: Object.freeze({ name: "Angel", description: "Swap your HP and Gold." }),
  VALK: Object.freeze({ name: "Valkyrie", description: "Opponent -1 HP, you +1 HP." }),
  APPRENTICE: Object.freeze({ name: "Adept", description: "Damage and cost scale each round." })
});

const MAX_PROGRESS_POINTS = LEAGUE_SEGMENTS[LEAGUE_SEGMENTS.length - 1].basePoints + 100;
const PROGRESSION_XP_RULES = Object.freeze({
  baseByLeague: Object.freeze({
    Wood: 10,
    Stone: 8,
    Bronze: 6
  }),
  winBonus: 5,
  firstWinOfDayBonus: 10,
  claimCardBonus: 10,
  claimHeroBonus: 20
});

const ASSET_VERSION = "3";

const UI_TIMINGS = Object.freeze({
  actionToastMs: 1800,
  currentActionTypeMs: 25,
  currentActionPauseMs: 4000,
  homeTipsRotateMs: 5000,
  splashIntroMs: 2000
});

const HOME_TIPS = Object.freeze([
  "Bluff early to learn how your opponent reacts.",
  "Save gold for high-impact turns.",
  "If they hesitate, they might be lying.",
  "Use reveals to reduce uncertainty, not to show off.",
  "Track which cards are REAL/BLUFF as the match evolves.",
  "Don\u2019t accuse on impulse\u2014accuse when the risk is worth it.",
  "Rogue can swap cards only on their first turn.",
  "Pressure low HP opponents\u2014force tough decisions.",
  "Sometimes ACCEPT is the best punish.",
  "Win the mind game, not just the numbers."
]);

const RESULT_REVIEW_BADGE_OPTIONS = Object.freeze([
  "1 Brilliant Catch!",
  "1 Brilliant Bluff!",
  "Perfect Read!",
  "Psychological Masterplay!",
  "Mind Game Victory!",
  "Cold Blood Bluff!"
]);

const REVIEW_FINAL_MESSAGES = Object.freeze([
  "You controlled the mind game.",
  "Psychological victory.",
  "You outplayed the bluff war."
]);

const MATCH_HISTORY_STORAGE_KEY = "liarsClashMatchHistoryV1";
const TV_TABS = Object.freeze(["live", "highlights", "history"]);

const TV_COMMUNITY_MATCHES = Object.freeze([
  Object.freeze({ id: "comm-1", result: "WIN", opponentName: "Hikaru", opponentHeroId: "noble", highlightLine: "Brilliant Catch on Knight bluff." }),
  Object.freeze({
    id: "comm-2",
    result: "LOSS",
    opponentName: "MrBeast",
    opponentHeroId: "rogue",
    highlightLine: "Risky Angel swap backfired."
  }),
  Object.freeze({
    id: "comm-3",
    result: "WIN",
    opponentName: "Danny",
    opponentHeroId: "adventurer",
    highlightLine: "Perfect read in the final round."
  }),
  Object.freeze({ id: "comm-4", result: "WIN", opponentName: "Sasha", opponentHeroId: "oracle", highlightLine: "Caught a turn-6 BLUFF instantly." }),
  Object.freeze({ id: "comm-5", result: "LOSS", opponentName: "Lena", opponentHeroId: "guardian", highlightLine: "Shield timing shut down the comeback." }),
  Object.freeze({ id: "comm-6", result: "WIN", opponentName: "Noah", opponentHeroId: "noble", highlightLine: "Cold-blood bluff at 1 HP." }),
  Object.freeze({ id: "comm-7", result: "WIN", opponentName: "Ava", opponentHeroId: "adventurer", highlightLine: "Mind game masterclass on turn 8." }),
  Object.freeze({ id: "comm-8", result: "LOSS", opponentName: "Kai", opponentHeroId: "rogue", highlightLine: "Rogue swap created a perfect trap." }),
  Object.freeze({ id: "comm-9", result: "WIN", opponentName: "Mina", opponentHeroId: "oracle", highlightLine: "Perfect bluff chain in midgame." }),
  Object.freeze({ id: "comm-10", result: "LOSS", opponentName: "Omar", opponentHeroId: "guardian", highlightLine: "Late challenge missed by one read." })
]);

const TV_LIVE_MATCHES = Object.freeze([
  Object.freeze({ id: "live-1", playerA: "Hikaru", heroA: "noble", playerB: "Matt", heroB: "adventurer", league: "Bronze" }),
  Object.freeze({ id: "live-2", playerA: "Danny", heroA: "adventurer", playerB: "Lena", heroB: "guardian", league: "Stone" }),
  Object.freeze({ id: "live-3", playerA: "MrBeast", heroA: "rogue", playerB: "Noah", heroB: "noble", league: "Bronze" }),
  Object.freeze({ id: "live-4", playerA: "Sasha", heroA: "oracle", playerB: "Ava", heroB: "adventurer", league: "Stone" }),
  Object.freeze({ id: "live-5", playerA: "Kai", heroA: "rogue", playerB: "Mina", heroB: "oracle", league: "Wood" }),
  Object.freeze({ id: "live-6", playerA: "Omar", heroA: "guardian", playerB: "Danny", heroB: "adventurer", league: "Wood" })
]);

const TV_HIGHLIGHTS = Object.freeze([
  Object.freeze({ id: "hl-1", title: "Brilliant Catch!", matchup: "Matt vs Hikaru", line: "Caught a Knight bluff on Turn 9." }),
  Object.freeze({ id: "hl-2", title: "Perfect Bluff!", matchup: "Danny vs Lena", line: "Sold a Goblin lie with zero tells." }),
  Object.freeze({ id: "hl-3", title: "Epic Comeback!", matchup: "Ava vs Noah", line: "Recovered from 1 HP to close it out." }),
  Object.freeze({ id: "hl-4", title: "Mind Game Masterclass", matchup: "Sasha vs Kai", line: "Three reads in a row flipped the match." }),
  Object.freeze({ id: "hl-5", title: "Brilliant Catch!", matchup: "Mina vs MrBeast", line: "Sniped a late BLUFF in round 10." }),
  Object.freeze({ id: "hl-6", title: "Perfect Bluff!", matchup: "Omar vs Matt", line: "Risky BLUFF landed under pressure." })
]);

const FIRST_MATCH_GUIDE_STEPS = Object.freeze([
  Object.freeze({
    id: "welcome",
    title: "Welcome to Gambit Liar’s",
    body: "Let’s learn the basics in 30 seconds. Tap anywhere to continue.",
    button: "Next",
    spotlightSelectors: Object.freeze([])
  }),
  Object.freeze({
    id: "hp",
    title: "This is your HP",
    body: "If it reaches 0, you lose.",
    button: "Next",
    spotlightSelectors: Object.freeze(["#bottomPanel .stat-segment-hp"])
  }),
  Object.freeze({
    id: "gold",
    title: "This is your Gold",
    body: "Spend Gold to play cards and actions.",
    button: "Next",
    spotlightSelectors: Object.freeze(["#bottomPanel .stat-segment-gold"])
  }),
  Object.freeze({
    id: "actions",
    title: "Your turn",
    body: "Tap a basic action or play a card.",
    button: "Next",
    spotlightSelectors: Object.freeze(["#bottomPanel .basic-actions", "#bottomCards"])
  }),
  Object.freeze({
    id: "real-cards",
    title: "Your REAL cards",
    body: "These are safe. Play them freely — they’re always REAL.",
    button: "Next",
    spotlightKind: "real-cards"
  }),
  Object.freeze({
    id: "bluff-cards",
    title: "Your BLUFF cards",
    body: "Careful: if you play a BLUFF and your opponent catches it, you lose 2 HP.",
    button: "Next",
    spotlightKind: "bluff-cards"
  }),
  Object.freeze({
    id: "ready",
    title: "Ready",
    body: "Now choose your move.",
    button: "Play",
    spotlightSelectors: Object.freeze(["#bottomPanel .basic-actions", "#bottomCards"])
  })
]);

const FIRST_MATCH_DECISION_OVERLAY = Object.freeze({
  title: "Accept or call BLUFF?",
  body: "Your opponent played a card.\nTap ACCEPT to take the effect...\nor tap YOU'RE LYING! to challenge.\nCatch a BLUFF: they lose 2 HP.\nWrong accuse: you lose 1 HP.",
  button: "Choose"
});

const FIRST_MATCH_FINAL_OVERLAY = Object.freeze({
  title: "No more help!",
  body: "You’ve got this. Outplay them and go for the win.",
  button: "Play"
});

const FIRST_MATCH_NICE_OVERLAY = Object.freeze({
  title: "Nice!",
  body: "Good move. Now it’s your opponent’s turn.",
  button: "Continue"
});

const MATCH_ONBOARDING_STEPS = Object.freeze([
  Object.freeze({
    title: "Your REAL cards",
    body: "These are your REAL cards for this match. Play them freely - they are always safe.",
    button: "OK",
    filterReal: true
  }),
  Object.freeze({
    title: "Your BLUFF cards",
    body: "These are your BLUFF cards. If you play one and your opponent catches the lie, you lose 2 HP.",
    button: "OK, start",
    filterReal: false
  })
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

const BOT_IDENTITIES = Object.freeze([
  Object.freeze({ name: "Hikaru", heroId: "noble" }),
  Object.freeze({ name: "Danny", heroId: "adventurer" })
]);

const RULES_ROLE_DETAILS = Object.freeze([
  Object.freeze({ role: "SIREN", text: "1 damage + skip opponent next action (1 Gold)" }),
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
  Object.freeze({ role: "ANGEL", text: "Swap HP and Gold (0 Gold, max 1)" }),
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
  claimPulseRewardId: null,
  claimPulseTimerId: null,
  onboardingTypeTimerId: null,
  onboardingTypeToken: 0,
  guidePulseTimerId: null,
  firstGuideDecisionDelayTimerId: null,
  tutorialStepIndex: 0,
  homeTipTimerId: null,
  homeTipFadeTimerId: null,
  resultRevealBadgeTimerId: null,
  resultRevealButtonsTimerId: null,
  reviewSequenceToken: 0,
  reviewSequenceTimerIds: [],
  reviewMetricAnimationIds: [],
  inlineHintTimerId: null,
  homePremiumIntroTimerId: null,
  homePremiumIntroPlayed: false,
  lastScreen: null
};
const modalState = { activeModal: null };

const state = {
  screen: APP_SCREENS.splash,
  mode: null,
  profile: { name: "Matt", heroId: "adventurer", ranking: 1000, opponentRanking: 1000 },
  progression: createDefaultProgressionState(),
  matchesPlayedCount: 0,
  collection: { tab: "cards" },
  tv: { tab: "live" },
  matchHistory: [],
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
    human: { id: "local-human", name: "Matt", heroId: "adventurer" },
    bot: { id: "bot-ai", name: "Bot", heroId: "noble" }
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
  rogueSwap: createRogueSwapState(),
  heroRuntime: createHeroRuntimeState(),
  matchOnboarding: createMatchOnboardingState(),
  firstMatchGuide: createFirstMatchGuideState(),
  tutorialMatch: false,
  review: createMatchReviewState(),
  postGameReview: createPostGameReviewState(),
  heroTooltip: { slot: null, open: false },
  gameEventId: "none",
  gameEventTooltip: { open: false },
  currentActionText: "Ready.",
  events: [],
  resolutionToken: 0,
  timer: { mode: null, remaining: 0, expiresAt: 0, intervalId: null, timeoutId: null, token: 0 },
  ai: createBotAiState(),
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
              heroId: normalizeOwnedHeroId(state.profile.heroId),
              role: this.role
            });
            this.presenceById[this.playerId] = {
              name: safePlayerName(state.profile.name),
              heroId: normalizeOwnedHeroId(state.profile.heroId),
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
              heroId: normalizeOwnedHeroId(state.profile.heroId)
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
        heroId: normalizeHeroId(latest.heroId || "adventurer"),
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

    if (msg.seq > 0 && !this.hostId) {
      this.hostId = msg.senderId;
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

    if (payload.kind === "ONBOARDING_READY") {
      if (state.screen !== APP_SCREENS.game) return;
      if (state.phase !== PHASES.gameStart) return;
      if (payload.actorSlot !== "human" && payload.actorSlot !== "bot") return;
      if (!state.slots[payload.actorSlot] || state.slots[payload.actorSlot].id !== msg.senderId) return;

      await this.sendEvent(
        "ACTION",
        {
          kind: "ONBOARDING_READY",
          actorSlot: payload.actorSlot
        },
        {
          canonical: true,
          actorId: state.slots[payload.actorSlot].id,
          applyLocal: true
        }
      );
      return;
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

    if (payload.kind === "ROGUE_SWAP_ACCEPT") {
      if (state.screen !== APP_SCREENS.game) return;
      if (!isRogueSwapPhase()) return;
      if (payload.actorSlot !== "human" && payload.actorSlot !== "bot") return;
      if (payload.actorSlot !== state.rogueSwap.actorSlot) return;
      if (!state.slots[payload.actorSlot] || state.slots[payload.actorSlot].id !== msg.senderId) return;

      await this.sendEvent(
        "ACTION",
        {
          kind: "ROGUE_SWAP_ACCEPT",
          actorSlot: payload.actorSlot,
          selected: normalizeDraftSelectionIndices(payload.selected)
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

function createPlayerState(key, startHp = MATCH_SETTINGS.START_HP) {
  return {
    key,
    hp: Number(startHp) || MATCH_SETTINGS.START_HP,
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

function createRoleBeliefMap(initialValue = 0.5) {
  const map = Object.create(null);
  Object.values(ROLE_CONFIG).forEach((meta) => {
    if (!meta || meta.passive) return;
    map[meta.name] = clamp(Number(initialValue) || 0.5, 0.05, 0.95);
  });
  return map;
}

function createRoleCounterMap(initialValue = 0) {
  const map = Object.create(null);
  Object.values(ROLE_CONFIG).forEach((meta) => {
    if (!meta || meta.passive) return;
    map[meta.name] = Math.max(0, Number(initialValue) || 0);
  });
  return map;
}

function createPlayerBehaviorStats(raw = null) {
  return {
    challengeOpportunities: Math.max(0, Number(raw && raw.challengeOpportunities) || 0),
    challenges: Math.max(0, Number(raw && raw.challenges) || 0),
    bluffsCaught: Math.max(0, Number(raw && raw.bluffsCaught) || 0),
    turns: Math.max(0, Number(raw && raw.turns) || 0),
    damageActions: Math.max(0, Number(raw && raw.damageActions) || 0)
  };
}

function createBotAiState(options = {}) {
  return {
    demonActive: Boolean(options.demonActive),
    beliefRealByRole: createRoleBeliefMap(0.5),
    repeatUnchallengedByRole: createRoleCounterMap(0),
    botBluffUsageByRole: createRoleCounterMap(0),
    playerModel: createPlayerBehaviorStats(options.playerModel || null)
  };
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

function createRogueSwapState() {
  return {
    active: false,
    actorSlot: null,
    selections: [],
    revealUntil: 0,
    pendingFinalize: false
  };
}

function createHeroRuntimeState() {
  return {
    roundStartAppliedFor: 0,
    rogueSwapUsed: { human: false, bot: false },
    guardianRoundShield: { human: Object.create(null), bot: Object.create(null) }
  };
}

function createMatchOnboardingState() {
  return {
    open: false,
    stepIndex: 0,
    readyBySlot: { human: false, bot: false }
  };
}

function createFirstMatchGuideState() {
  return {
    scripted: false,
    active: false,
    overlayMode: null,
    stepIndex: 0,
    awaitingFinalOverlay: false,
    botFirstPlayDone: false,
    botAcceptedFirstHumanCard: false,
    niceOverlayShown: false,
    decisionOverlayShown: false,
    finalOverlayShown: false
  };
}

function createMatchReviewState() {
  return {
    actionCounter: 0,
    actions: []
  };
}

function createPostGameReviewState() {
  return {
    bluffSuccessRate: 0,
    challengeAccuracy: 0,
    optimalDecisions: 0,
    feedback: "",
    highlights: [],
    matchBadgeText: RESULT_REVIEW_BADGE_OPTIONS[0],
    finalMessage: REVIEW_FINAL_MESSAGES[0]
  };
}

function createDefaultProgressionState() {
  return {
    points: 0,
    matchesCompleted: 0,
    claimedRewardIds: Object.create(null),
    unlockedCosmetics: Object.create(null),
    rankedModeUnlocked: false,
    firstWinBonusDate: "",
    demoUnlockApplied: false
  };
}

function normalizeProgressionState(raw) {
  const base = createDefaultProgressionState();
  if (!raw || typeof raw !== "object") return base;
  const normalized = {
    points: clamp(Number(raw.points) || 0, 0, MAX_PROGRESS_POINTS),
    matchesCompleted: Math.max(0, Number(raw.matchesCompleted) || 0),
    claimedRewardIds: Object.create(null),
    unlockedCosmetics: Object.create(null),
    rankedModeUnlocked: Boolean(raw.rankedModeUnlocked),
    firstWinBonusDate: typeof raw.firstWinBonusDate === "string" ? raw.firstWinBonusDate.slice(0, 10) : "",
    demoUnlockApplied: Boolean(raw.demoUnlockApplied)
  };

  if (raw.claimedRewardIds && typeof raw.claimedRewardIds === "object") {
    Object.keys(raw.claimedRewardIds).forEach((rewardId) => {
      if (PROGRESSION_REWARD_BY_ID[rewardId] && raw.claimedRewardIds[rewardId]) {
        normalized.claimedRewardIds[rewardId] = true;
      }
    });
  }

  if (raw.unlockedCosmetics && typeof raw.unlockedCosmetics === "object") {
    Object.keys(raw.unlockedCosmetics).forEach((key) => {
      if (raw.unlockedCosmetics[key]) normalized.unlockedCosmetics[key] = true;
    });
  }

  PROGRESSION_REWARDS.forEach((reward) => {
    if (reward.rewardType === "skin" && normalized.claimedRewardIds[reward.id]) {
      normalized.unlockedCosmetics[reward.itemId] = true;
    }
    if (reward.rewardType === "mode" && reward.itemId === "ranked" && normalized.claimedRewardIds[reward.id]) {
      normalized.rankedModeUnlocked = true;
    }
  });

  return normalized;
}

function loadProgressionStateFromStorage() {
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return createDefaultProgressionState();
    const parsed = JSON.parse(raw);
    return normalizeProgressionState(parsed);
  } catch (_error) {
    return createDefaultProgressionState();
  }
}

function persistProgressionState() {
  try {
    window.localStorage.setItem(
      PROGRESSION_STORAGE_KEY,
      JSON.stringify({
        points: clamp(Number(state.progression.points) || 0, 0, MAX_PROGRESS_POINTS),
        matchesCompleted: Math.max(0, Number(state.progression.matchesCompleted) || 0),
        claimedRewardIds: { ...state.progression.claimedRewardIds },
        unlockedCosmetics: { ...state.progression.unlockedCosmetics },
        rankedModeUnlocked: Boolean(state.progression.rankedModeUnlocked),
        firstWinBonusDate: String(state.progression.firstWinBonusDate || "").slice(0, 10),
        demoUnlockApplied: Boolean(state.progression.demoUnlockApplied)
      })
    );
  } catch (_error) {
    // Ignore storage write failures for demo build.
  }
}

function loadMatchesPlayedCountFromStorage() {
  try {
    const raw = window.localStorage.getItem(MATCHES_PLAYED_COUNT_STORAGE_KEY);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
  } catch (_error) {
    return 0;
  }
}

function persistMatchesPlayedCount() {
  try {
    window.localStorage.setItem(
      MATCHES_PLAYED_COUNT_STORAGE_KEY,
      String(Math.max(0, Math.floor(Number(state.matchesPlayedCount) || 0)))
    );
  } catch (_error) {
    // Ignore storage write failures for demo build.
  }
}

function incrementMatchesPlayedCount() {
  state.matchesPlayedCount = Math.max(0, Math.floor(Number(state.matchesPlayedCount) || 0)) + 1;
  persistMatchesPlayedCount();
}

function isDemonBotUnlocked() {
  return Math.max(0, Math.floor(Number(state.matchesPlayedCount) || 0)) >= DEMON_BOT_MATCH_THRESHOLD;
}

function normalizeHistoryResult(result) {
  const normalized = String(result || "").toUpperCase();
  if (normalized === "WIN" || normalized === "LOSS" || normalized === "DRAW") return normalized;
  return "DRAW";
}

function normalizeMatchHistoryEntry(entry, index = 0) {
  if (!entry || typeof entry !== "object") return null;
  const opponentHeroId = normalizeHeroId(entry.opponentHeroId || "adventurer");
  return {
    id: String(entry.id || `hist-${Date.now()}-${index}`),
    timestamp: String(entry.timestamp || new Date().toISOString()),
    opponentName: safePlayerName(entry.opponentName || "Opponent"),
    opponentHeroId,
    result: normalizeHistoryResult(entry.result),
    localHp: Math.max(0, Number(entry.localHp) || 0),
    localGold: Math.max(0, Number(entry.localGold) || 0),
    opponentHp: Math.max(0, Number(entry.opponentHp) || 0),
    opponentGold: Math.max(0, Number(entry.opponentGold) || 0),
    highlightLine: String(entry.highlightLine || ""),
    reviewSnapshot: entry.reviewSnapshot && typeof entry.reviewSnapshot === "object" ? entry.reviewSnapshot : null
  };
}

function loadMatchHistoryFromStorage() {
  try {
    const raw = window.localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry, index) => normalizeMatchHistoryEntry(entry, index))
      .filter(Boolean)
      .slice(0, 10);
  } catch (_error) {
    return [];
  }
}

function persistMatchHistory() {
  try {
    const safeHistory = Array.isArray(state.matchHistory) ? state.matchHistory.slice(0, 10) : [];
    window.localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(safeHistory));
  } catch (_error) {
    // Ignore storage write failures in demo.
  }
}

function pushCurrentMatchToHistory(winnerKey) {
  const local = state.localSlot || "human";
  const opponent = opponentOf(local);
  const localPlayer = state.players[local] || createPlayerState(local);
  const opponentPlayer = state.players[opponent] || createPlayerState(opponent);
  const result = winnerKey === local ? "WIN" : winnerKey === opponent ? "LOSS" : "DRAW";
  const review = state.postGameReview || createPostGameReviewState();
  const fallbackLine = review.feedback || "Mind game battle finished.";
  const highlightLine = review.highlights && review.highlights[0] ? review.highlights[0].resultText || fallbackLine : fallbackLine;
  const entry = normalizeMatchHistoryEntry(
    {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      opponentName: slotName(opponent),
      opponentHeroId: getHeroIdForSlot(opponent),
      result,
      localHp: localPlayer.hp,
      localGold: localPlayer.gold,
      opponentHp: opponentPlayer.hp,
      opponentGold: opponentPlayer.gold,
      highlightLine,
      reviewSnapshot: review
    },
    0
  );
  if (!entry) return;
  if (!Array.isArray(state.matchHistory)) state.matchHistory = [];
  state.matchHistory = [entry, ...state.matchHistory.filter((item) => item && item.id !== entry.id)].slice(0, 10);
  persistMatchHistory();
}

function getLeagueSegmentByPoints(points = state.progression.points) {
  const total = clamp(Number(points) || 0, 0, MAX_PROGRESS_POINTS);
  for (let i = LEAGUE_SEGMENTS.length - 1; i >= 0; i -= 1) {
    const segment = LEAGUE_SEGMENTS[i];
    if (total >= segment.basePoints) {
      return {
        ...segment,
        pointsInSegment: clamp(total - segment.basePoints, 0, 100)
      };
    }
  }
  const first = LEAGUE_SEGMENTS[0];
  return { ...first, pointsInSegment: 0 };
}

function formatLeagueBadgeText(points = state.progression.points) {
  const segment = getLeagueSegmentByPoints(points);
  return `${segment.league.toUpperCase()} ${segment.subleague}`;
}

function formatLeagueProgressText(points = state.progression.points) {
  const segment = getLeagueSegmentByPoints(points);
  return `${segment.league.toUpperCase()} ${segment.subleague} - Points: ${segment.pointsInSegment}/100`;
}

function getLocalDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBaseMatchXpByLeague(points = state.progression.points) {
  const segment = getLeagueSegmentByPoints(points);
  return PROGRESSION_XP_RULES.baseByLeague[segment.league] || 0;
}

function addProgressPoints(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) return 0;
  const before = clamp(Number(state.progression.points) || 0, 0, MAX_PROGRESS_POINTS);
  const after = clamp(before + value, 0, MAX_PROGRESS_POINTS);
  state.progression.points = after;
  return Math.max(0, after - before);
}

function getRewardClaimXpBonus(reward) {
  if (!reward) return 0;
  if (reward.rewardType === "card") return PROGRESSION_XP_RULES.claimCardBonus;
  if (reward.rewardType === "hero") return PROGRESSION_XP_RULES.claimHeroBonus;
  return 0;
}

function getRewardAbsolutePoints(reward) {
  const segment = reward ? LEAGUE_SEGMENT_BY_ID[reward.segmentId] : null;
  const base = segment ? segment.basePoints : 0;
  return clamp(base + (Number(reward?.point) || 0), 0, MAX_PROGRESS_POINTS);
}

function formatRewardUnlockLocation(reward) {
  const segment = reward ? LEAGUE_SEGMENT_BY_ID[reward.segmentId] : null;
  if (!segment) return "Start";
  return `${segment.league} ${segment.subleague} ${reward.point}`;
}

function isRewardClaimed(rewardOrId) {
  const rewardId = typeof rewardOrId === "string" ? rewardOrId : rewardOrId?.id;
  if (!rewardId) return false;
  return Boolean(state.progression.claimedRewardIds[rewardId]);
}

function isRewardReached(reward) {
  if (!reward) return false;
  return (Number(state.progression.points) || 0) >= getRewardAbsolutePoints(reward);
}

function isRewardClaimable(reward) {
  if (!reward) return false;
  return isRewardReached(reward) && !isRewardClaimed(reward);
}

function getClaimableRewards() {
  return PROGRESSION_REWARDS.filter((reward) => isRewardClaimable(reward));
}

function hasClaimableRewards() {
  return getClaimableRewards().length > 0;
}

function getRewardNodeById(rewardId) {
  return PROGRESSION_REWARD_BY_ID[rewardId] || null;
}

function findUnlockNode(rewardType, itemId) {
  return PROGRESSION_REWARDS.find((reward) => reward.rewardType === rewardType && reward.itemId === itemId) || null;
}

function getCollectionUnlockText(rewardType, itemId) {
  const node = findUnlockNode(rewardType, itemId);
  if (!node) {
    if (rewardType === "card" && STARTING_UNLOCKS.cards.includes(itemId)) return "Unlocked at start";
    if (rewardType === "hero" && STARTING_UNLOCKS.heroes.includes(itemId)) return "Unlocked at start";
    if (rewardType === "event" && STARTING_UNLOCKS.events.includes(itemId)) return "Unlocked at start";
    return "Unlocks at: Not in current track";
  }
  return `Unlocks at: ${formatRewardUnlockLocation(node)}`;
}

function getUnlockedCardRoles() {
  const unlocked = new Set(STARTING_UNLOCKS.cards);
  PROGRESSION_REWARDS.forEach((reward) => {
    if (reward.rewardType !== "card") return;
    if (!isRewardClaimed(reward)) return;
    unlocked.add(reward.itemId);
  });
  return Array.from(unlocked).filter((role) => ROLE_CONFIG[role]);
}

function getCardCollectionOrder() {
  const order = [];
  const seen = new Set();
  const pushRole = (role) => {
    const normalizedRole = String(role || "").trim();
    if (!ROLE_CONFIG[normalizedRole]) return;
    if (seen.has(normalizedRole)) return;
    seen.add(normalizedRole);
    order.push(normalizedRole);
  };

  STARTING_UNLOCKS.cards.forEach((role) => pushRole(role));

  const progressionCardRewards = [...PROGRESSION_REWARDS]
    .filter((reward) => reward.rewardType === "card")
    .sort((a, b) => {
      const aSegmentIndex = LEAGUE_SEGMENT_INDEX_BY_ID[a.segmentId] ?? 0;
      const bSegmentIndex = LEAGUE_SEGMENT_INDEX_BY_ID[b.segmentId] ?? 0;
      if (aSegmentIndex !== bSegmentIndex) return aSegmentIndex - bSegmentIndex;
      return (Number(a.point) || 0) - (Number(b.point) || 0);
    });

  progressionCardRewards.forEach((reward) => pushRole(reward.itemId));
  getAllRoles().forEach((role) => pushRole(role));
  return order;
}

function getUnlockedHeroIds() {
  const unlocked = new Set(STARTING_UNLOCKS.heroes);
  PROGRESSION_REWARDS.forEach((reward) => {
    if (reward.rewardType !== "hero") return;
    if (!isRewardClaimed(reward)) return;
    unlocked.add(reward.itemId);
  });
  return Array.from(unlocked).filter((heroId) => HERO_REGISTRY[heroId]);
}

function getUnlockedGameEventIds() {
  const unlocked = new Set(STARTING_UNLOCKS.events);
  PROGRESSION_REWARDS.forEach((reward) => {
    if (reward.rewardType !== "event") return;
    if (!isRewardClaimed(reward)) return;
    unlocked.add(reward.itemId);
  });
  return Array.from(unlocked).filter((eventId) => GAME_EVENT_REGISTRY[eventId]);
}

function isRankedProgressionUnlocked() {
  return Boolean(state.progression.rankedModeUnlocked || isRewardClaimed("bronze_iii_100_ranked"));
}

function isHeroUnlocked(heroId) {
  return getUnlockedHeroIds().includes(normalizeHeroId(heroId));
}

function getDefaultUnlockedHeroId() {
  const unlocked = getUnlockedHeroIds();
  return unlocked[0] || "adventurer";
}

function normalizeOwnedHeroId(value) {
  const normalized = normalizeHeroId(value);
  return isHeroUnlocked(normalized) ? normalized : getDefaultUnlockedHeroId();
}

function ensureSelectedHeroUnlocked() {
  const normalized = normalizeOwnedHeroId(state.profile.heroId);
  state.profile.heroId = normalized;
  if (state.mode !== "friend") state.slots.human.heroId = normalized;
}

function refreshUnlockedContentState(options = {}) {
  ensureSelectedHeroUnlocked();
  if (!options.skipPersist) persistProgressionState();
  if (!options.skipRerender) updateUI();
}

function setClaimPulse(rewardId) {
  uiRuntime.claimPulseRewardId = rewardId;
  if (uiRuntime.claimPulseTimerId) clearTimeout(uiRuntime.claimPulseTimerId);
  uiRuntime.claimPulseTimerId = setTimeout(() => {
    uiRuntime.claimPulseRewardId = null;
    uiRuntime.claimPulseTimerId = null;
    updateUI();
  }, 520);
}

function claimReward(rewardId, options = {}) {
  const reward = getRewardNodeById(rewardId);
  if (!reward) return false;
  if (!isRewardClaimable(reward)) return false;

  state.progression.claimedRewardIds[reward.id] = true;
  if (reward.rewardType === "skin") state.progression.unlockedCosmetics[reward.itemId] = true;
  if (reward.rewardType === "mode" && reward.itemId === "ranked") state.progression.rankedModeUnlocked = true;
  if (!options.skipXpBonus) {
    addProgressPoints(getRewardClaimXpBonus(reward));
  }
  refreshUnlockedContentState({
    skipPersist: Boolean(options.skipPersist),
    skipRerender: Boolean(options.skipRerender)
  });
  if (!options.skipPulse) setClaimPulse(reward.id);
  return true;
}

function claimAllRewards() {
  const claimable = getClaimableRewards();
  if (claimable.length === 0) return 0;
  let claimed = 0;
  claimable.forEach((reward, index) => {
    if (
      claimReward(reward.id, {
        skipPersist: true,
        skipRerender: true,
        skipPulse: index !== claimable.length - 1
      })
    ) {
      claimed += 1;
    }
  });
  if (claimed > 0) {
    refreshUnlockedContentState({ skipPersist: false, skipRerender: false });
  }
  return claimed;
}

function hasClaimableHeroRewards() {
  return PROGRESSION_REWARDS.some((reward) => reward.rewardType === "hero" && isRewardClaimable(reward));
}

function areAllRewardsClaimed() {
  return PROGRESSION_REWARDS.every((reward) => isRewardClaimed(reward));
}

function shouldShowDemoResetButton() {
  return Boolean(state.progression.demoUnlockApplied) && areAllRewardsClaimed();
}

function applyDemoCheatUnlock() {
  if ((Number(state.progression.matchesCompleted) || 0) < 1) return false;
  state.progression.points = MAX_PROGRESS_POINTS;
  state.progression.demoUnlockApplied = true;
  PROGRESSION_REWARDS.forEach((reward) => {
    state.progression.claimedRewardIds[reward.id] = true;
    if (reward.rewardType === "skin") state.progression.unlockedCosmetics[reward.itemId] = true;
    if (reward.rewardType === "mode" && reward.itemId === "ranked") state.progression.rankedModeUnlocked = true;
  });
  refreshUnlockedContentState({ skipPersist: false, skipRerender: false });
  return true;
}

function resetDemoProgressionState() {
  state.progression = createDefaultProgressionState();
  refreshUnlockedContentState({ skipPersist: false, skipRerender: false });
}

function applyProgressAfterCompletedMatch(winnerKey) {
  const matches = Math.max(0, Number(state.progression.matchesCompleted) || 0);
  state.progression.matchesCompleted = matches + 1;

  let gained = getBaseMatchXpByLeague();
  const localWon = (winnerKey === "human" || winnerKey === "bot") && winnerKey === state.localSlot;
  if (localWon) {
    gained += PROGRESSION_XP_RULES.winBonus;
    const today = getLocalDateStamp();
    if (state.progression.firstWinBonusDate !== today) {
      state.progression.firstWinBonusDate = today;
      gained += PROGRESSION_XP_RULES.firstWinOfDayBonus;
    }
  }

  const applied = addProgressPoints(gained);
  persistProgressionState();
  if (applied > 0) showActionToast(`+${applied} Points earned.`);
}

function getRoleCollectionMeta(role) {
  return ROLE_COLLECTION_META[role] || { name: getRoleDisplayName(role), description: String(ROLE_CONFIG[role]?.description || "") };
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

function normalizeHeroId(value) {
  return HERO_REGISTRY[value] ? value : "adventurer";
}

function getHeroMeta(heroId) {
  return HERO_REGISTRY[normalizeHeroId(heroId)] || HERO_REGISTRY.adventurer;
}

function normalizeGameEventId(value) {
  return GAME_EVENT_REGISTRY[value] ? value : "none";
}

function getGameEventMeta(eventId) {
  return GAME_EVENT_REGISTRY[normalizeGameEventId(eventId)] || GAME_EVENT_REGISTRY.none;
}

function pickRandomGameEventId() {
  const unlockedEventIds = getUnlockedGameEventIds();
  if (unlockedEventIds.length === 0) return "none";
  const index = Math.floor(Math.random() * unlockedEventIds.length);
  return normalizeGameEventId(unlockedEventIds[index] || "none");
}

function getStartingHpForEvent(eventId) {
  return normalizeGameEventId(eventId) === "extra_hp" ? MATCH_SETTINGS.START_HP + 1 : MATCH_SETTINGS.START_HP;
}

function isFogOfWarActive() {
  return normalizeGameEventId(state.gameEventId) === "hidden_cards";
}

function getHeroIdForSlot(slot) {
  const slotData = state.slots[slot];
  if (!slotData) return "adventurer";
  return normalizeHeroId(slotData.heroId);
}

function normalizeAvatarId(value) {
  return normalizeHeroId(value);
}

function getAvatarMeta(avatarId) {
  return getHeroMeta(avatarId);
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

function isFirstMatchBotKnightDecisionPending() {
  if (!isFirstScriptedBotMatchActive()) return false;
  if (state.phase !== PHASES.awaitingResponse) return false;
  if (state.pendingResponder !== state.localSlot) return false;
  const action = state.pendingAction;
  if (!action || action.actor !== "bot" || action.kind !== "role" || action.role !== "KNIGHT") return false;
  if (typeof action.cardIndex !== "number") return false;
  const card = getCardByIndex("bot", action.cardIndex);
  return Boolean(card && card.isReal === false);
}

function getAvatarPath(avatarId) {
  const normalized = normalizeHeroId(avatarId);
  const path = ASSET_MAP.heroPortraitPaths[normalized] || ASSET_MAP.heroPortraitPaths.adventurer;
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
    case "SIREN":
      appendText(node, "1 ");
      icon("sword");
      appendText(node, " + skip next action");
      break;
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
  const localSlot = state.localSlot || "human";
  const interestAmount = getInterestGoldGain(localSlot);
  const strikeAmount = getStrikeDamage(localSlot);
  if (ui.interestActionDesc) {
    ui.interestActionDesc.textContent = "";
    appendText(ui.interestActionDesc, `+${interestAmount} `);
    const goldIcon = createInlineIcon("gold");
    if (goldIcon) ui.interestActionDesc.appendChild(goldIcon);
  }
  if (ui.strikeActionDesc) {
    ui.strikeActionDesc.textContent = "";
    appendText(ui.strikeActionDesc, `Deal ${strikeAmount} `);
    const swordIcon = createInlineIcon("sword");
    if (swordIcon) ui.strikeActionDesc.appendChild(swordIcon);
    appendText(ui.strikeActionDesc, " DMG");
  }
}

function renderAvatarChoices() {
  if (!ui.avatarGrid) return;
  const unlockedHeroIds = new Set(getUnlockedHeroIds());
  const choices = ui.avatarGrid.querySelectorAll(".avatar-choice");
  choices.forEach((choice) => {
    const avatarId = normalizeHeroId(choice.dataset.heroId || "adventurer");
    const artNode = choice.querySelector(".avatar-art");
    const labelNode = choice.querySelector(".avatar-choice-label");
    const descNode = choice.querySelector(".avatar-choice-desc");
    const unlocked = unlockedHeroIds.has(avatarId);
    choice.classList.toggle("hidden", !unlocked);
    choice.disabled = !unlocked;
    choice.setAttribute("aria-disabled", unlocked ? "false" : "true");
    renderAvatar(artNode, avatarId);
    if (labelNode) labelNode.textContent = getAvatarMeta(avatarId).displayName;
    if (descNode) descNode.textContent = getAvatarMeta(avatarId).shortDescription;
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
  const normalizedIconKey = String(iconKey || "").toLowerCase().trim();
  if (normalizedIconKey) segment.classList.add(`stat-segment-${normalizedIconKey}`);
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

function canTriggerInvalidTapHint() {
  if (state.screen !== APP_SCREENS.game) return false;
  if (state.phase !== PHASES.choosingAction) return false;
  if (state.currentActor !== state.localSlot) return false;
  if (state.friend.pendingRequest) return false;
  if (state.matchOnboarding && state.matchOnboarding.open) return false;
  if (state.firstMatchGuide && state.firstMatchGuide.active) return false;
  if (modalState.activeModal) return false;
  return true;
}

function collectValidActionHintNodes() {
  const nodes = [];
  const pushNode = (node) => {
    if (!(node instanceof HTMLElement)) return;
    if (nodes.includes(node)) return;
    nodes.push(node);
  };

  if (ui.interestBtn && ui.interestBtn.getAttribute("aria-disabled") === "false") pushNode(ui.interestBtn);
  if (ui.strikeBtn && ui.strikeBtn.getAttribute("aria-disabled") === "false") pushNode(ui.strikeBtn);
  if (ui.bottomCards) {
    ui.bottomCards.querySelectorAll("button[data-card-index][aria-disabled='false']").forEach((node) => {
      pushNode(node);
    });
  }

  return nodes;
}

function triggerInvalidTapHint() {
  if (!canTriggerInvalidTapHint()) return;
  const nodes = collectValidActionHintNodes();
  if (nodes.length === 0) return;

  nodes.forEach((node) => node.classList.remove("valid-action-hint"));
  void nodes[0].offsetWidth;
  nodes.forEach((node) => node.classList.add("valid-action-hint"));
  setTimeout(() => {
    nodes.forEach((node) => node.classList.remove("valid-action-hint"));
  }, 520);
}

function isValidActionTapTarget(target) {
  if (!(target instanceof Element)) return false;
  const interestTarget = target.closest("#interestBtn");
  if (interestTarget instanceof HTMLElement && interestTarget.getAttribute("aria-disabled") === "false") return true;
  const strikeTarget = target.closest("#strikeBtn");
  if (strikeTarget instanceof HTMLElement && strikeTarget.getAttribute("aria-disabled") === "false") return true;
  const cardTarget = target.closest("#bottomCards button[data-card-index]");
  if (cardTarget instanceof HTMLElement && cardTarget.getAttribute("aria-disabled") === "false") return true;
  return false;
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

function slotHasHero(slot, heroId) {
  return getHeroIdForSlot(slot) === normalizeHeroId(heroId);
}

function getInterestGoldGain(slot) {
  return slotHasHero(slot, "adventurer") ? 2 : 1;
}

function getStrikeDamage(slot) {
  return slotHasHero(slot, "noble") ? 2 : 1;
}

function getInitialRealCardCount(slot) {
  return slotHasHero(slot, "oracle") ? 3 : 2;
}

function shouldTriggerRogueSwap(slot) {
  if (!slotHasHero(slot, "rogue")) return false;
  if (state.heroRuntime.rogueSwapUsed[slot]) return false;
  return true;
}

function isFirstScriptedBotMatchActive() {
  return Boolean(state.mode === "bot" && state.firstMatchGuide && state.firstMatchGuide.scripted);
}

function isTutorialMatchActive() {
  return Boolean(state.mode === "bot" && state.tutorialMatch);
}

function chooseBotIdentity() {
  const unlockedHeroes = new Set(getUnlockedHeroIds());
  const candidates = BOT_IDENTITIES.filter((entry) => {
    const heroId = normalizeHeroId(entry.heroId);
    return heroId !== "rogue" && unlockedHeroes.has(heroId);
  });
  const pool = candidates.length > 0 ? candidates : [Object.freeze({ name: "Danny", heroId: "adventurer" })];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] || pool[0];
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

function getUnlockedRoles() {
  return getUnlockedCardRoles();
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

function assignTruthToCards(cards, rng, realCount = 2) {
  if (!Array.isArray(cards) || cards.length < 4) return;
  const count = clamp(Number(realCount) || 0, 0, 4);
  const realIndices = new Set(pickUnique([0, 1, 2, 3], count, rng));
  cards.forEach((card, index) => {
    card.isReal = realIndices.has(index);
    card.revealedUsed = false;
    card.confirmed = false;
    card.verification = null;
  });
}

function buildDraftRolesForPlayer(rng) {
  const unlockedRoles = getUnlockedRoles();
  if (unlockedRoles.length >= 4) return pickUnique(unlockedRoles, 4, rng);
  if (unlockedRoles.length === 0) return pickUnique(STARTING_UNLOCKS.cards, 4, rng);
  const padded = [...unlockedRoles];
  while (padded.length < 4) {
    padded.push(unlockedRoles[Math.floor(rng() * unlockedRoles.length)]);
  }
  return shuffle(padded, rng).slice(0, 4);
}

function buildDeterministicDraftRoles(seedText) {
  const rngHuman = createSeededRng(`${seedText}:draft:human`);
  const rngBot = createSeededRng(`${seedText}:draft:bot`);
  return {
    human: buildDraftRolesForPlayer(rngHuman),
    bot: buildDraftRolesForPlayer(rngBot)
  };
}

function buildDraftSwapResult(initialRoles, selectedIndices, seedText) {
  const roles = Array.isArray(initialRoles) ? initialRoles.slice(0, 4) : [];
  const picks = normalizeDraftSelectionIndices(selectedIndices);
  if (picks.length === 0) return roles;

  picks.forEach((index, step) => {
    const current = new Set(roles);
    const unlockedRoles = getUnlockedRoles();
    const rolePool = unlockedRoles.length > 0 ? unlockedRoles : getAllRoles();
    const available = rolePool.filter((role) => !current.has(role));
    if (available.length === 0) return;
    const rng = createSeededRng(`${seedText}:${step}:${index}`);
    const nextRole = available[Math.floor(rng() * available.length)];
    roles[index] = nextRole;
  });

  return roles;
}

function buildFinalLoadoutFromDraftRoles(draftRoles, seedText, playerKey, heroId = "adventurer") {
  const roles = Array.isArray(draftRoles) ? draftRoles.slice(0, 4) : [];
  const loadout = createDraftLoadoutFromRoles(roles);
  const rng = createSeededRng(`${seedText}:truth:${playerKey}`);
  assignTruthToCards(loadout.cards, rng, normalizeHeroId(heroId) === "oracle" ? 3 : 2);
  const groups = rolesFromCards(loadout.cards);
  loadout.realRoles = groups.realRoles;
  loadout.fakeRoles = groups.fakeRoles;
  return loadout;
}

function buildDeterministicFinalLoadout(seedText, draftRoles, heroIds = {}, gameEventId = "none") {
  const roles = draftRoles || { human: [], bot: [] };
  const eventId = normalizeGameEventId(gameEventId);
  const mirrorHands = eventId === "mirror_hands";
  const sharedRoles =
    mirrorHands && Array.isArray(roles.human) && roles.human.length > 0
      ? roles.human.slice(0, 4)
      : mirrorHands && Array.isArray(roles.bot)
        ? roles.bot.slice(0, 4)
        : null;
  const humanRoles = sharedRoles || roles.human;
  const botRoles = sharedRoles || roles.bot;
  const heroBySlot = {
    human: normalizeHeroId(heroIds.human || "adventurer"),
    bot: normalizeHeroId(heroIds.bot || "adventurer")
  };
  return {
    human: buildFinalLoadoutFromDraftRoles(humanRoles, seedText, "human", heroBySlot.human),
    bot: buildFinalLoadoutFromDraftRoles(botRoles, seedText, "bot", heroBySlot.bot)
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
  const finalLoadout = buildDeterministicFinalLoadout(seed, draft, {
    human: getHeroIdForSlot("human"),
    bot: getHeroIdForSlot("bot")
  }, state.gameEventId);
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
  if (state.heroRuntime.roundStartAppliedFor === state.round) return;
  state.heroRuntime.roundStartAppliedFor = state.round;

  ["human", "bot"].forEach((playerKey) => {
    if (normalizeGameEventId(state.gameEventId) === "gold_per_round") {
      applyGold(playerKey, 1, "Game Event (+1 Gold per Round)");
    }
    if (state.players[playerKey].bankerBuff) {
      applyGold(playerKey, 1, "BANKER passive");
    }
    if ((state.round === 1 || state.round === 6) && slotHasHero(playerKey, "guardian")) {
      const shieldAppliedThisRound = Boolean(state.heroRuntime.guardianRoundShield[playerKey][state.round]);
      if (!shieldAppliedThisRound) {
        state.heroRuntime.guardianRoundShield[playerKey][state.round] = true;
        if (!state.players[playerKey].shield) {
          state.players[playerKey].shield = true;
          triggerPlayerAnimation(playerKey, "heal");
          pushDebugLog(`${slotLabel(playerKey)} gained Shield (GUARDIAN).`);
        }
      }
    }
    if (state.round > 1) scaleApprenticeCardsForNewRound(playerKey);
  });
}

function resetMatchState(options = {}) {
  clearTimer();
  cancelResolutionQueue();
  clearFirstMatchDecisionGuideDelay();
  state.friend.pendingRequest = null;

  const gameEventId = normalizeGameEventId(options.gameEventId || "none");
  const startHp = getStartingHpForEvent(gameEventId);
  state.players.human = createPlayerState("human", startHp);
  state.players.bot = createPlayerState("bot", startHp);
  const carriedPlayerModel = state.ai && state.ai.playerModel ? state.ai.playerModel : createPlayerBehaviorStats();
  state.ai = createBotAiState({
    demonActive: Boolean(options.demonBotActive && state.mode === "bot" && !options.tutorialMatch),
    playerModel: carriedPlayerModel
  });
  state.gameEventId = gameEventId;

  if (options.loadout && options.loadout.human && options.loadout.bot) {
    applyLoadoutToPlayer("human", options.loadout.human);
    applyLoadoutToPlayer("bot", options.loadout.bot);
  } else {
    assignRandomRolesForBotMatch();
  }

  state.phase = PHASES.idle;
  state.matchSeed = String(options.matchSeed || state.matchSeed || generateMatchSeed());
  state.draft = createDraftState();
  state.rogueSwap = createRogueSwapState();
  state.heroRuntime = createHeroRuntimeState();
  state.matchOnboarding = createMatchOnboardingState();
  state.firstMatchGuide = createFirstMatchGuideState();
  state.firstMatchGuide.scripted = Boolean(options.firstMatchScripted && state.mode === "bot");
  state.tutorialMatch = Boolean(options.tutorialMatch && state.mode === "bot");
  state.review = createMatchReviewState();
  state.postGameReview = createPostGameReviewState();
  state.heroTooltip = { slot: null, open: false };
  state.gameEventTooltip = { open: false };
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
  clearFirstMatchDecisionGuideDelay();
  cancelResolutionQueue();
  stopCurrentActionTypewriter();
  stopOnboardingTypewriter();
  uiRuntime.lastActionText = "";
  clearActionToast();
  closeHeroTooltip();
  closeGameEventTooltip();
  state.phase = PHASES.idle;
  state.matchWinner = null;
  state.pendingAction = null;
  state.pendingResponder = null;
  state.pendingChallengeResult = null;
  clearPendingClaim();
  state.draft = createDraftState();
  state.matchSeed = "";
  state.tutorialMatch = false;
  state.review = createMatchReviewState();
  state.postGameReview = createPostGameReviewState();
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
    heroId: normalizeOwnedHeroId(state.profile.heroId)
  };
  const botIdentity = chooseBotIdentity();
  state.slots.bot = { id: "bot-ai", name: botIdentity.name, heroId: botIdentity.heroId };
  state.localSlot = "human";

  setRoomIdInUrl("");
  state.screen = APP_SCREENS.home;
  closeModal();
  updateUI();
}

function startBotMatch(options = {}) {
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
    heroId: normalizeOwnedHeroId(state.profile.heroId)
  };
  const botIdentity = chooseBotIdentity();
  state.slots.bot = { id: "bot-ai", name: botIdentity.name, heroId: botIdentity.heroId };
  state.localSlot = "human";

  const tutorialMatch = Boolean(options.tutorialMatch);
  const demonBotActive = !tutorialMatch && isDemonBotUnlocked();
  const matchSeed = generateMatchSeed();
  const firstMatchScripted = tutorialMatch || (Number(state.progression.matchesCompleted) || 0) === 0;
  const gameEventId = pickRandomGameEventId();
  const starterRng = createSeededRng(`${matchSeed}:starter`);
  const draftRoles = buildDeterministicDraftRoles(matchSeed);
  const finalLoadout = buildDeterministicFinalLoadout(matchSeed, draftRoles, {
    human: state.slots.human.heroId,
    bot: state.slots.bot.heroId
  }, gameEventId);
  const payload = {
    stage: "match-start",
    firstMatchScripted,
    tutorialMatch,
    demonBotActive,
    matchSeed,
    gameEventId,
    startingActor: firstMatchScripted ? "human" : starterRng() < 0.5 ? "human" : "bot",
    players: {
      human: {
        id: state.slots.human.id,
        name: state.slots.human.name,
        heroId: state.slots.human.heroId,
        realRoles: finalLoadout.human.realRoles,
        fakeRoles: finalLoadout.human.fakeRoles,
        cards: finalLoadout.human.cards
      },
      bot: {
        id: state.slots.bot.id,
        name: state.slots.bot.name,
        heroId: state.slots.bot.heroId,
        realRoles: finalLoadout.bot.realRoles,
        fakeRoles: finalLoadout.bot.fakeRoles,
        cards: finalLoadout.bot.cards
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
    heroId: normalizeOwnedHeroId(state.profile.heroId)
  };
  state.slots.bot = { id: "pending-guest", name: "Friend", heroId: "noble" };

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
      heroId: normalizeOwnedHeroId(state.profile.heroId),
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
    heroId: normalizeOwnedHeroId(state.profile.heroId),
    role: "host"
  };

  const guestEntry = Object.entries(net.presenceById).find(([id]) => id !== net.playerId);
  if (!guestEntry) return null;

  const [guestId, guestPresenceRaw] = guestEntry;
  const guestPresence = guestPresenceRaw || { name: "Guest", heroId: "noble" };

  const seed = generateMatchSeed();
  const gameEventId = pickRandomGameEventId();
  const draftRoles = buildDeterministicDraftRoles(seed);
  const heroBySlot = {
    human: normalizeHeroId(hostPresence.heroId || "adventurer"),
    bot: normalizeHeroId(guestPresence.heroId || "adventurer")
  };
  const finalLoadout = buildDeterministicFinalLoadout(seed, draftRoles, heroBySlot, gameEventId);
  const starterRng = createSeededRng(`${seed}:starter`);

  return {
    stage: "match-start",
    matchSeed: seed,
    gameEventId,
    startingActor: starterRng() < 0.5 ? "human" : "bot",
    players: {
      human: {
        id: net.playerId,
        name: safePlayerName(hostPresence.name),
        heroId: heroBySlot.human,
        realRoles: finalLoadout.human.realRoles,
        fakeRoles: finalLoadout.human.fakeRoles,
        cards: finalLoadout.human.cards
      },
      bot: {
        id: guestId,
        name: safePlayerName(guestPresence.name),
        heroId: heroBySlot.bot,
        realRoles: finalLoadout.bot.realRoles,
        fakeRoles: finalLoadout.bot.fakeRoles,
        cards: finalLoadout.bot.cards
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

  if (payload.stage === "draft-final" || payload.stage === "match-start") {
    applyDraftFinalStart(payload);
    return;
  }

  if (payload.players.human.cards && payload.players.bot.cards) {
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
    heroId: normalizeHeroId(payload.players.human.heroId || "adventurer")
  };
  state.slots.bot = {
    id: payload.players.bot.id,
    name: safePlayerName(payload.players.bot.name),
    heroId: normalizeHeroId(payload.players.bot.heroId || "adventurer")
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
    matchSeed: startSeed,
    gameEventId: payload.gameEventId
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

function buildBotRogueSwapSelections(seed) {
  const rng = createSeededRng(`${seed}:rogue-bot-swap`);
  const count = Math.floor(rng() * 5);
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
    human: buildDraftSwapResult(state.draft.initialRoles.human, getDraftSelectionsForSlot("human"), `${seed}:swap:human`),
    bot: buildDraftSwapResult(state.draft.initialRoles.bot, getDraftSelectionsForSlot("bot"), `${seed}:swap:bot`)
  };
  const finalLoadout = buildDeterministicFinalLoadout(
    seed,
    finalRoles,
    {
      human: normalizeHeroId(state.slots.human.heroId),
      bot: normalizeHeroId(state.slots.bot.heroId)
    },
    state.gameEventId
  );
  return {
    stage: "draft-final",
    matchSeed: seed,
    gameEventId: state.gameEventId,
    startingActor: state.startingActor,
    players: {
      human: {
        id: state.slots.human.id,
        name: safePlayerName(state.slots.human.name),
        heroId: normalizeHeroId(state.slots.human.heroId),
        realRoles: finalLoadout.human.realRoles,
        fakeRoles: finalLoadout.human.fakeRoles,
        cards: finalLoadout.human.cards
      },
      bot: {
        id: state.slots.bot.id,
        name: safePlayerName(state.slots.bot.name),
        heroId: normalizeHeroId(state.slots.bot.heroId),
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
    heroId: normalizeHeroId(payload.players.human.heroId)
  };
  state.slots.bot = {
    id: payload.players.bot.id,
    name: safePlayerName(payload.players.bot.name),
    heroId: normalizeHeroId(payload.players.bot.heroId)
  };
  state.localSlot = state.slots.human.id === net.playerId ? "human" : "bot";
  net.hostId = state.slots.human.id;

  resetMatchState({
    startingActor: payload.startingActor,
    matchSeed: payload.matchSeed,
    gameEventId: payload.gameEventId,
    firstMatchScripted: Boolean(payload.firstMatchScripted),
    tutorialMatch: Boolean(payload.tutorialMatch),
    demonBotActive: Boolean(payload.demonBotActive),
    loadout: {
      human: payload.players.human,
      bot: payload.players.bot
    }
  });

  if (isFirstScriptedBotMatchActive()) {
    ensureFirstMatchBotKnightBluff();
  }

  state.phase = PHASES.gameStart;
  state.screen = APP_SCREENS.game;
  setCurrentAction("Match start.");
  updateUI();
  if (isFirstScriptedBotMatchActive()) {
    openFirstMatchIntroGuide();
  } else {
    openMatchOnboarding();
  }
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

function isRogueSwapPhase() {
  return state.phase === PHASES.rogueSwap && Boolean(state.rogueSwap && state.rogueSwap.active);
}

function getRogueSwapSelections() {
  if (!state.rogueSwap) return [];
  return normalizeDraftSelectionIndices(state.rogueSwap.selections);
}

function setRogueSwapSelections(selections) {
  if (!state.rogueSwap) state.rogueSwap = createRogueSwapState();
  state.rogueSwap.selections = normalizeDraftSelectionIndices(selections);
}

function isRogueSwapCardSelectable(ownerSlot) {
  if (!isRogueSwapPhase()) return false;
  if (state.screen !== APP_SCREENS.game) return false;
  if (ownerSlot !== state.localSlot) return false;
  if (state.rogueSwap.actorSlot !== state.localSlot) return false;
  if (state.friend.pendingRequest) return false;
  return true;
}

function isRogueSwapCardSelected(ownerSlot, cardIndex) {
  if (ownerSlot !== state.localSlot) return false;
  if (!isRogueSwapPhase()) return false;
  return getRogueSwapSelections().includes(cardIndex);
}

function isRogueSwapCardSwapping(ownerSlot, cardIndex) {
  if (ownerSlot !== state.localSlot) return false;
  if (!isRogueSwapPhase()) return false;
  if (state.rogueSwap.actorSlot !== state.localSlot) return false;
  const until = Number(state.rogueSwap.revealUntil) || 0;
  if (until <= Date.now()) return false;
  return getRogueSwapSelections().includes(cardIndex);
}

function startRogueSwapForSlot(actorSlot) {
  if (actorSlot !== "human" && actorSlot !== "bot") return;
  if (!shouldTriggerRogueSwap(actorSlot)) return;

  state.heroRuntime.rogueSwapUsed[actorSlot] = true;
  state.phase = PHASES.rogueSwap;
  state.rogueSwap = createRogueSwapState();
  state.rogueSwap.active = true;
  state.rogueSwap.actorSlot = actorSlot;
  clearTimer();
  state.friend.pendingRequest = null;
  closeHeroTooltip();

  if (actorSlot === state.localSlot) {
    setCurrentAction("Rogue Hero: select 0-4 cards, then ACCEPT.");
  } else {
    setCurrentAction(`${slotName(actorSlot)} is using Rogue swap...`);
  }

  if (state.mode === "bot" && actorSlot === "bot") {
    const botSelections = buildBotRogueSwapSelections(state.matchSeed || generateMatchSeed());
    setTimeout(() => {
      if (!isRogueSwapPhase()) return;
      if (state.rogueSwap.actorSlot !== "bot") return;
      applyCanonicalRogueSwapAccept({ kind: "ROGUE_SWAP_ACCEPT", actorSlot: "bot", selected: botSelections });
    }, 260);
  }
}

function applyRogueSwapSelectionToPlayer(actorSlot, selectedIndices) {
  const player = state.players[actorSlot];
  if (!player || !Array.isArray(player.cards) || player.cards.length === 0) return;
  const selected = normalizeDraftSelectionIndices(selectedIndices);
  if (selected.length === 0) return;
  const roles = player.cards.map((card) => card.role);
  const swappedRoles = buildDraftSwapResult(roles, selected, `${state.matchSeed}:rogue-swap:${actorSlot}:${state.round}`);
  selected.forEach((index) => {
    const card = player.cards[index];
    if (!card) return;
    card.role = swappedRoles[index];
    applyCardRoleDefaults(card, card.role);
  });
  syncPlayerRoleLists(actorSlot);
}

function finalizeRogueSwapAndResume(actorSlot) {
  state.rogueSwap = createRogueSwapState();
  state.phase = PHASES.idle;
  state.friend.pendingRequest = null;
  setCurrentAction(actorSlot === state.localSlot ? "Rogue swap complete." : `${slotName(actorSlot)} finished Rogue swap.`);
  setTimeout(() => {
    if (state.screen === APP_SCREENS.game && state.phase !== PHASES.matchEnd) beginTurn();
  }, 200);
}

async function submitLocalRogueSwapAccept() {
  if (!isRogueSwapPhase()) return;
  if (state.rogueSwap.actorSlot !== state.localSlot) return;
  if (state.rogueSwap.pendingFinalize) return;

  const actorSlot = state.localSlot;
  const selected = getRogueSwapSelections();

  if (state.mode === "friend") {
    if (net.role === "host") {
      await net.sendEvent(
        "ACTION",
        {
          kind: "ROGUE_SWAP_ACCEPT",
          actorSlot,
          selected
        },
        {
          canonical: true,
          actorId: state.slots[actorSlot].id,
          applyLocal: true
        }
      );
      return;
    }

    state.friend.pendingRequest = "rogueSwap";
    clearTimer();
    updateUI();
    await net.sendEvent(
      "ACTION",
      {
        kind: "ROGUE_SWAP_ACCEPT",
        actorSlot,
        selected,
        requestId: `${net.playerId}-${Date.now()}-rs`
      },
      {
        actorId: state.slots[actorSlot].id,
        seq: 0
      }
    );
    return;
  }

  applyCanonicalRogueSwapAccept({ kind: "ROGUE_SWAP_ACCEPT", actorSlot, selected });
}

function applyCanonicalRogueSwapAccept(payload) {
  if (!payload || !isRogueSwapPhase()) return;
  const actorSlot = payload.actorSlot === "bot" ? "bot" : "human";
  if (actorSlot !== state.rogueSwap.actorSlot) return;
  if (state.rogueSwap.pendingFinalize) return;

  const selected = normalizeDraftSelectionIndices(payload.selected);
  setRogueSwapSelections(selected);
  state.rogueSwap.pendingFinalize = true;
  state.friend.pendingRequest = null;
  clearTimer();

  if (actorSlot === state.localSlot) {
    state.rogueSwap.revealUntil = Date.now() + 420;
    updateUI();
  }

  const delay = actorSlot === state.localSlot ? 420 : 220;
  setTimeout(() => {
    if (!isRogueSwapPhase()) return;
    if (state.rogueSwap.actorSlot !== actorSlot) return;
    if (!state.rogueSwap.pendingFinalize) return;
    applyRogueSwapSelectionToPlayer(actorSlot, selected);
    finalizeRogueSwapAndResume(actorSlot);
  }, delay);
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
    gameEventId: state.gameEventId,
    draft: state.draft,
    rogueSwap: state.rogueSwap,
    heroRuntime: state.heroRuntime,
    matchOnboarding: {
      open: Boolean(state.matchOnboarding && state.matchOnboarding.open),
      stepIndex: Number(state.matchOnboarding && state.matchOnboarding.stepIndex) || 0,
      readyBySlot: {
        human: Boolean(state.matchOnboarding && state.matchOnboarding.readyBySlot && state.matchOnboarding.readyBySlot.human),
        bot: Boolean(state.matchOnboarding && state.matchOnboarding.readyBySlot && state.matchOnboarding.readyBySlot.bot)
      }
    },
    firstMatchGuide: {
      scripted: Boolean(state.firstMatchGuide && state.firstMatchGuide.scripted),
      active: Boolean(state.firstMatchGuide && state.firstMatchGuide.active),
      overlayMode: state.firstMatchGuide ? state.firstMatchGuide.overlayMode || null : null,
      stepIndex: Number(state.firstMatchGuide && state.firstMatchGuide.stepIndex) || 0,
      awaitingFinalOverlay: Boolean(state.firstMatchGuide && state.firstMatchGuide.awaitingFinalOverlay),
      botFirstPlayDone: Boolean(state.firstMatchGuide && state.firstMatchGuide.botFirstPlayDone),
      botAcceptedFirstHumanCard: Boolean(state.firstMatchGuide && state.firstMatchGuide.botAcceptedFirstHumanCard),
      niceOverlayShown: Boolean(state.firstMatchGuide && state.firstMatchGuide.niceOverlayShown),
      decisionOverlayShown: Boolean(state.firstMatchGuide && state.firstMatchGuide.decisionOverlayShown),
      finalOverlayShown: Boolean(state.firstMatchGuide && state.firstMatchGuide.finalOverlayShown)
    },
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
  state.gameEventId = normalizeGameEventId(snap.gameEventId || "none");
  state.gameEventTooltip = { open: false };
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
  state.rogueSwap = snap.rogueSwap
    ? {
        active: Boolean(snap.rogueSwap.active),
        actorSlot: snap.rogueSwap.actorSlot === "bot" ? "bot" : snap.rogueSwap.actorSlot === "human" ? "human" : null,
        selections: normalizeDraftSelectionIndices(snap.rogueSwap.selections),
        revealUntil: Number(snap.rogueSwap.revealUntil) || 0,
        pendingFinalize: Boolean(snap.rogueSwap.pendingFinalize)
      }
    : createRogueSwapState();
  state.heroRuntime = snap.heroRuntime
    ? {
        roundStartAppliedFor: Number(snap.heroRuntime.roundStartAppliedFor) || 0,
        rogueSwapUsed: {
          human: Boolean(snap.heroRuntime.rogueSwapUsed && snap.heroRuntime.rogueSwapUsed.human),
          bot: Boolean(snap.heroRuntime.rogueSwapUsed && snap.heroRuntime.rogueSwapUsed.bot)
        },
        guardianRoundShield: {
          human: Object.assign(Object.create(null), snap.heroRuntime.guardianRoundShield && snap.heroRuntime.guardianRoundShield.human),
          bot: Object.assign(Object.create(null), snap.heroRuntime.guardianRoundShield && snap.heroRuntime.guardianRoundShield.bot)
        }
      }
    : createHeroRuntimeState();
  state.matchOnboarding = snap.matchOnboarding
    ? {
        open: Boolean(snap.matchOnboarding.open),
        stepIndex: clamp(Number(snap.matchOnboarding.stepIndex) || 0, 0, MATCH_ONBOARDING_STEPS.length - 1),
        readyBySlot: {
          human: Boolean(snap.matchOnboarding.readyBySlot && snap.matchOnboarding.readyBySlot.human),
          bot: Boolean(snap.matchOnboarding.readyBySlot && snap.matchOnboarding.readyBySlot.bot)
        }
      }
    : createMatchOnboardingState();
  state.firstMatchGuide = snap.firstMatchGuide
    ? {
        scripted: Boolean(snap.firstMatchGuide.scripted),
        active: Boolean(snap.firstMatchGuide.active),
        overlayMode: snap.firstMatchGuide.overlayMode || null,
        stepIndex: clamp(Number(snap.firstMatchGuide.stepIndex) || 0, 0, FIRST_MATCH_GUIDE_STEPS.length - 1),
        awaitingFinalOverlay: Boolean(snap.firstMatchGuide.awaitingFinalOverlay),
        botFirstPlayDone: Boolean(snap.firstMatchGuide.botFirstPlayDone),
        botAcceptedFirstHumanCard: Boolean(snap.firstMatchGuide.botAcceptedFirstHumanCard),
        niceOverlayShown: Boolean(snap.firstMatchGuide.niceOverlayShown),
        decisionOverlayShown: Boolean(snap.firstMatchGuide.decisionOverlayShown),
        finalOverlayShown: Boolean(snap.firstMatchGuide.finalOverlayShown)
      }
    : createFirstMatchGuideState();
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
    heroId: normalizeHeroId(snap.slots && snap.slots.human ? snap.slots.human.heroId : "adventurer")
  };
  state.slots.bot = {
    id: snap.slots && snap.slots.bot ? snap.slots.bot.id : state.slots.bot.id,
    name: safePlayerName(snap.slots && snap.slots.bot ? snap.slots.bot.name : "Guest"),
    heroId: normalizeHeroId(snap.slots && snap.slots.bot ? snap.slots.bot.heroId : "adventurer")
  };

  state.localSlot = state.slots.human.id === net.playerId ? "human" : "bot";

  const startHp = getStartingHpForEvent(state.gameEventId);
  state.players.human = createPlayerState("human", startHp);
  state.players.bot = createPlayerState("bot", startHp);
  applyLoadoutToPlayer("human", snap.players && snap.players.human ? snap.players.human : {});
  applyLoadoutToPlayer("bot", snap.players && snap.players.bot ? snap.players.bot : {});

  if (snap.players && snap.players.human) {
    state.players.human.hp = Number(snap.players.human.hp) || startHp;
    state.players.human.gold = Number(snap.players.human.gold) || MATCH_SETTINGS.START_GOLD;
    state.players.human.bankerBuff = Boolean(snap.players.human.bankerBuff);
    state.players.human.shield = Boolean(snap.players.human.shield);
    state.players.human.blockedActions = Number(snap.players.human.blockedActions) || 0;
    state.players.human.roleUses = Object.assign(Object.create(null), snap.players.human.roleUses || {});
  }

  if (snap.players && snap.players.bot) {
    state.players.bot.hp = Number(snap.players.bot.hp) || startHp;
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

function concludeMatch(winnerKey, reason) {
  if (state.phase === PHASES.matchEnd) return;
  clearTimer();
  cancelResolutionQueue();
  if (!isTutorialMatchActive() && (winnerKey === "human" || winnerKey === "bot")) {
    const delta = winnerKey === state.localSlot ? 50 : -50;
    state.profile.ranking = Math.max(0, state.profile.ranking + delta);
    state.profile.opponentRanking = Math.max(0, state.profile.opponentRanking - delta);
  }
  if (!isTutorialMatchActive()) {
    incrementMatchesPlayedCount();
    applyProgressAfterCompletedMatch(winnerKey);
  }
  state.postGameReview = buildPostGameReviewData(winnerKey);
  pushCurrentMatchToHistory(winnerKey);
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

  if (shouldTriggerRogueSwap(actor)) {
    startRogueSwapForSlot(actor);
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

  if (isFirstScriptedBotMatchActive() && state.mode === "bot" && actor === "bot" && !state.firstMatchGuide.niceOverlayShown) {
    clearTimer();
    openFirstMatchNiceGuide();
    updateUI();
    return;
  }

  if (state.mode === "bot") {
    if (actor === "human") {
      if (isFirstScriptedBotMatchActive()) clearTimer();
      else runHumanTimer("action", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleActionTimeout(actor));
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
      isReal: null,
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
    isReal: Boolean(card.isReal),
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

function toPercent(numerator, denominator, fallback = 50) {
  if (denominator <= 0) return clamp(Math.round(Number(fallback) || 0), 0, 100);
  return clamp(Math.round((numerator / denominator) * 100), 0, 100);
}

function pickRandomFromList(list, fallback = "") {
  if (!Array.isArray(list) || list.length === 0) return String(fallback || "");
  const index = Math.floor(Math.random() * list.length);
  return String(list[index] || fallback || "");
}

function getReviewEntryById(entryId) {
  if (!entryId || !state.review || !Array.isArray(state.review.actions)) return null;
  return state.review.actions.find((entry) => entry && entry.id === entryId) || null;
}

function recordPendingActionForReview(action) {
  if (!action) return null;
  if (!state.review || !Array.isArray(state.review.actions)) state.review = createMatchReviewState();
  const turnNumber = Math.max(1, (Number(state.review.actionCounter) || 0) + 1);
  state.review.actionCounter = turnNumber;

  const actor = action.actor;
  const target = action.target;
  const actorState = state.players[actor] || createPlayerState(actor);
  const targetState = state.players[target] || createPlayerState(target);

  const entry = {
    id: `review-${turnNumber}-${state.round}-${state.roundActionCounter}`,
    turnNumber,
    round: state.round,
    actor,
    target,
    kind: action.kind,
    actionId: action.id,
    actionLabel: action.label,
    role: action.role || null,
    isRole: action.kind === "role",
    isBluff: action.kind === "role" ? !Boolean(action.isReal) : false,
    isReal: action.kind === "role" ? Boolean(action.isReal) : null,
    actorHpBefore: Number(actorState.hp) || 0,
    actorGoldBefore: Number(actorState.gold) || 0,
    targetHpBefore: Number(targetState.hp) || 0,
    targetGoldBefore: Number(targetState.gold) || 0,
    actorHpAfter: Number(actorState.hp) || 0,
    actorGoldAfter: Number(actorState.gold) || 0,
    targetHpAfter: Number(targetState.hp) || 0,
    targetGoldAfter: Number(targetState.gold) || 0,
    response: null,
    responder: null,
    challengeWasCorrect: false,
    challengeWasWrong: false,
    hpSwingForActor: 0,
    goldSwingForActor: 0
  };
  state.review.actions.push(entry);
  return entry.id;
}

function markReviewDecision(entryId, response, options = {}) {
  const entry = getReviewEntryById(entryId);
  if (!entry) return;
  entry.response = response;
  entry.responder = state.pendingResponder || opponentOf(entry.actor);
  if (response !== "CHALLENGE") return;
  const isReal = Boolean(options.isReal);
  entry.challengeWasCorrect = !isReal;
  entry.challengeWasWrong = isReal;
}

function finalizeReviewEntry(entryId) {
  const entry = getReviewEntryById(entryId);
  if (!entry) return;
  const actorState = state.players[entry.actor] || createPlayerState(entry.actor);
  const targetState = state.players[entry.target] || createPlayerState(entry.target);
  entry.actorHpAfter = Number(actorState.hp) || 0;
  entry.actorGoldAfter = Number(actorState.gold) || 0;
  entry.targetHpAfter = Number(targetState.hp) || 0;
  entry.targetGoldAfter = Number(targetState.gold) || 0;
  const actorDamageTaken = Math.max(0, entry.actorHpBefore - entry.actorHpAfter);
  const targetDamageDealt = Math.max(0, entry.targetHpBefore - entry.targetHpAfter);
  entry.hpSwingForActor = targetDamageDealt - actorDamageTaken;
  const actorGoldGain = entry.actorGoldAfter - entry.actorGoldBefore;
  const targetGoldGain = entry.targetGoldAfter - entry.targetGoldBefore;
  entry.goldSwingForActor = actorGoldGain - targetGoldGain;
}

function createReviewHighlightFromEntry(entry, label, actionText, resultText, priority = 0) {
  return {
    turnNumber: Math.max(1, Number(entry?.turnNumber) || 1),
    label: String(label || "Great Read"),
    actionText: String(actionText || "You made a smart move."),
    resultText: String(resultText || "Result: Good pressure applied."),
    priority: Number(priority) || 0
  };
}

function buildPostGameReviewData(winnerKey = state.matchWinner) {
  const local = state.localSlot || "human";
  const entries = Array.isArray(state.review && state.review.actions) ? state.review.actions : [];
  const localActed = entries.filter((entry) => entry && entry.actor === local);
  const localResponded = entries.filter((entry) => entry && entry.responder === local && entry.response);

  const localBluffs = localActed.filter((entry) => entry.isRole && entry.isBluff);
  const successfulBluffs = localBluffs.filter(
    (entry) => entry.response === "ACCEPT" || (entry.response === "CHALLENGE" && entry.challengeWasWrong)
  );
  const bluffSuccessRate = toPercent(successfulBluffs.length, localBluffs.length, 58);

  const localChallenges = localResponded.filter((entry) => entry.response === "CHALLENGE");
  const correctChallenges = localChallenges.filter((entry) => entry.challengeWasCorrect);
  const challengeAccuracy = toPercent(correctChallenges.length, localChallenges.length, 60);

  let optimalTotal = 0;
  let optimalHits = 0;
  localActed.forEach((entry) => {
    if (!entry) return;
    optimalTotal += 1;
    if (entry.isRole && entry.isBluff) {
      if (entry.response === "ACCEPT" || (entry.response === "CHALLENGE" && entry.challengeWasWrong)) optimalHits += 1;
      return;
    }
    if (entry.hpSwingForActor >= 0 || entry.goldSwingForActor > 0) optimalHits += 1;
  });
  localResponded.forEach((entry) => {
    if (!entry) return;
    optimalTotal += 1;
    if (entry.response === "CHALLENGE" && entry.challengeWasCorrect) optimalHits += 1;
    if (entry.response === "ACCEPT" && entry.isReal === true) optimalHits += 1;
  });
  const optimalDecisions = toPercent(optimalHits, optimalTotal, 71);

  const candidates = [];
  entries.forEach((entry) => {
    if (!entry) return;
    if (entry.actor === local && entry.isRole && entry.isBluff && entry.response === "CHALLENGE" && entry.challengeWasWrong) {
      candidates.push(
        createReviewHighlightFromEntry(
          entry,
          "Brilliant Bluff",
          `You played ${entry.actionLabel} as a BLUFF.`,
          "Result: Opponent challenged and lost 2 HP.",
          100
        )
      );
    }
    if (entry.responder === local && entry.response === "CHALLENGE" && entry.challengeWasCorrect) {
      candidates.push(
        createReviewHighlightFromEntry(
          entry,
          "Great Read",
          `You challenged opponent's ${entry.actionLabel}.`,
          "Opponent bluff caught.",
          95
        )
      );
    }
    if (entry.actor === local && entry.hpSwingForActor >= 2) {
      candidates.push(
        createReviewHighlightFromEntry(
          entry,
          "Clever Trap",
          `You used ${entry.actionLabel} to swing the position.`,
          `Result: Strong HP swing in your favor (${entry.hpSwingForActor}).`,
          82
        )
      );
    }
    if (entry.actor === local && entry.isRole && entry.isBluff && entry.actorHpBefore <= 2) {
      candidates.push(
        createReviewHighlightFromEntry(
          entry,
          "Risky Play",
          `You bluffed with ${entry.actionLabel} at low HP.`,
          "Bold bluff under pressure.",
          76
        )
      );
    }
    if (
      entry.actor === local &&
      entry.isRole &&
      ["ENT", "DWARF", "ANGEL", "VALK"].includes(String(entry.role || "").toUpperCase()) &&
      entry.actorHpBefore <= 2
    ) {
      candidates.push(
        createReviewHighlightFromEntry(
          entry,
          "Perfect Timing",
          `You played ${entry.actionLabel} when HP was critical.`,
          "Result: Defensive timing kept you in the match.",
          88
        )
      );
    }
  });

  const uniqueByTurnAndLabel = new Set();
  const deduped = candidates
    .sort((a, b) => b.priority - a.priority || a.turnNumber - b.turnNumber)
    .filter((item) => {
      const key = `${item.turnNumber}:${item.label}`;
      if (uniqueByTurnAndLabel.has(key)) return false;
      uniqueByTurnAndLabel.add(key);
      return true;
    });

  const highlights = deduped.slice(0, 4);
  const fillerPool = localActed.length > 0 ? localActed : entries;
  let fillerIndex = 0;
  let fillerAttempts = 0;
  const fillerLabels = ["Perfect Timing", "Clever Trap", "Risky Play", "Great Read"];
  while (highlights.length < 3 && fillerPool.length > 0 && fillerAttempts < 16) {
    const entry = fillerPool[fillerIndex % fillerPool.length];
    fillerIndex += 1;
    fillerAttempts += 1;
    if (!entry) continue;
    const fallback = createReviewHighlightFromEntry(
      entry,
      fillerLabels[(fillerAttempts - 1) % fillerLabels.length],
      `${entry.actor === local ? "You" : "Opponent"} played ${entry.actionLabel}.`,
      "Result: Solid pressure and momentum control.",
      40
    );
    const exists = highlights.some((item) => item.turnNumber === fallback.turnNumber && item.label === fallback.label);
    if (!exists) highlights.push(fallback);
  }
  if (highlights.length === 0) {
    highlights.push(
      createReviewHighlightFromEntry(
        { turnNumber: 1 },
        "Clever Trap",
        "You adapted your strategy as the game evolved.",
        "Result: Good learning momentum for the next match.",
        10
      )
    );
  }
  while (highlights.length < 3) {
    highlights.push(
      createReviewHighlightFromEntry(
        { turnNumber: highlights.length + 1 },
        "Clever Trap",
        "You kept adapting to the board state.",
        "Result: Strong learning value for the next match.",
        8
      )
    );
  }

  let feedback = "You played a clever psychological game.";
  const localWon = winnerKey === local;
  if (!localWon && correctChallenges.length > 0) {
    feedback = "You lost the match, but made several strong reads.";
  } else if (challengeAccuracy >= 68) {
    feedback = "Strong reads on your opponent!";
  } else if (bluffSuccessRate >= 66) {
    feedback = "You played a clever psychological game.";
  } else if (!localWon) {
    feedback = "Tough result, but you made smart decisions under pressure.";
  }

  return {
    bluffSuccessRate,
    challengeAccuracy,
    optimalDecisions,
    feedback,
    highlights: highlights.slice(0, 4),
    matchBadgeText: pickRandomFromList(RESULT_REVIEW_BADGE_OPTIONS, "Mind Game Victory!"),
    finalMessage: pickRandomFromList(REVIEW_FINAL_MESSAGES, "Psychological victory.")
  };
}

function ensurePostGameReviewReady() {
  if (!state.postGameReview || !Array.isArray(state.postGameReview.highlights) || state.postGameReview.highlights.length === 0) {
    state.postGameReview = buildPostGameReviewData(state.matchWinner);
  }
}

function getReviewBadgeToneClass(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("brilliant bluff")) return "review-badge-gold";
  if (normalized.includes("risky play")) return "review-badge-orange";
  return "review-badge-green";
}

function renderPostGameReview() {
  if (!ui.reviewBluffRateText || !ui.reviewChallengeAccuracyText || !ui.reviewOptimalDecisionsText || !ui.reviewFeedbackText || !ui.reviewHighlightsList) return;
  ensurePostGameReviewReady();
  const review = state.postGameReview || createPostGameReviewState();
  const bluffRate = clamp(Number(review.bluffSuccessRate) || 0, 0, 100);
  const challengeRate = clamp(Number(review.challengeAccuracy) || 0, 0, 100);
  const optimalRate = clamp(Number(review.optimalDecisions) || 0, 0, 100);
  ui.reviewBluffRateText.textContent = `${bluffRate}%`;
  ui.reviewChallengeAccuracyText.textContent = `${challengeRate}%`;
  ui.reviewOptimalDecisionsText.textContent = `${optimalRate}%`;
  if (ui.reviewBluffRing) ui.reviewBluffRing.dataset.target = String(bluffRate);
  if (ui.reviewChallengeRing) ui.reviewChallengeRing.dataset.target = String(challengeRate);
  if (ui.reviewOptimalRing) ui.reviewOptimalRing.dataset.target = String(optimalRate);
  ui.reviewFeedbackText.textContent = String(review.feedback || "You made smart plays and valuable reads.");
  if (ui.reviewFinalMessageText) {
    ui.reviewFinalMessageText.textContent = String(review.finalMessage || "Psychological victory.");
    ui.reviewFinalMessageText.classList.add("hidden");
    ui.reviewFinalMessageText.classList.remove("review-final-message-visible");
  }
  if (ui.reviewMomentsTitle) {
    ui.reviewMomentsTitle.classList.add("hidden");
    ui.reviewMomentsTitle.classList.remove("review-moments-title-visible");
  }

  ui.reviewHighlightsList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const highlights = Array.isArray(review.highlights) ? review.highlights.slice(0, 4) : [];
  highlights.forEach((item) => {
    const card = document.createElement("article");
    card.className = "review-moment-card";

    const turn = document.createElement("p");
    turn.className = "review-moment-turn";
    turn.textContent = `Turn ${Math.max(1, Number(item.turnNumber) || 1)}`;
    card.appendChild(turn);

    const badge = document.createElement("span");
    badge.className = `review-moment-badge ${getReviewBadgeToneClass(item.label)}`;
    badge.textContent = item.label || "Great Read";
    card.appendChild(badge);

    const action = document.createElement("p");
    action.className = "review-moment-line";
    action.textContent = item.actionText || "You made a smart move.";
    card.appendChild(action);

    const result = document.createElement("p");
    result.className = "review-moment-line review-moment-result";
    result.textContent = item.resultText || "Result: Strong pressure.";
    card.appendChild(result);

    card.classList.remove("review-moment-visible");
    fragment.appendChild(card);
  });
  ui.reviewHighlightsList.appendChild(fragment);
}

function clearResultRevealTimers() {
  if (uiRuntime.resultRevealBadgeTimerId) {
    clearTimeout(uiRuntime.resultRevealBadgeTimerId);
    uiRuntime.resultRevealBadgeTimerId = null;
  }
  if (uiRuntime.resultRevealButtonsTimerId) {
    clearTimeout(uiRuntime.resultRevealButtonsTimerId);
    uiRuntime.resultRevealButtonsTimerId = null;
  }
}

function resetResultRevealNodes() {
  if (ui.resultReviewBadge) {
    ui.resultReviewBadge.classList.add("hidden");
    ui.resultReviewBadge.classList.remove("result-review-badge-visible");
  }
  if (ui.openGameReviewBtn) {
    ui.openGameReviewBtn.classList.add("hidden");
    ui.openGameReviewBtn.classList.remove("result-review-btn-visible");
  }
  if (ui.resultBottomActions) {
    ui.resultBottomActions.classList.add("hidden");
    ui.resultBottomActions.classList.remove("result-bottom-actions-visible");
  }
}

function startResultRevealSequence() {
  clearResultRevealTimers();
  resetResultRevealNodes();
  ensurePostGameReviewReady();
  if (ui.resultReviewBadge) {
    ui.resultReviewBadge.textContent = String(state.postGameReview.matchBadgeText || pickRandomFromList(RESULT_REVIEW_BADGE_OPTIONS, "Perfect Read!"));
  }
  uiRuntime.resultRevealBadgeTimerId = setTimeout(() => {
    uiRuntime.resultRevealBadgeTimerId = null;
    if (state.screen !== APP_SCREENS.result) return;
    if (ui.resultReviewBadge) {
      ui.resultReviewBadge.classList.remove("hidden");
      void ui.resultReviewBadge.offsetWidth;
      ui.resultReviewBadge.classList.add("result-review-badge-visible");
    }
  }, 500);
  uiRuntime.resultRevealButtonsTimerId = setTimeout(() => {
    uiRuntime.resultRevealButtonsTimerId = null;
    if (state.screen !== APP_SCREENS.result) return;
    if (ui.openGameReviewBtn) {
      ui.openGameReviewBtn.classList.remove("hidden");
      ui.openGameReviewBtn.classList.add("result-review-btn-visible");
    }
    if (ui.resultBottomActions) {
      ui.resultBottomActions.classList.remove("hidden");
      ui.resultBottomActions.classList.add("result-bottom-actions-visible");
    }
  }, 1000);
}

function clearReviewSequenceTimers() {
  uiRuntime.reviewSequenceToken += 1;
  if (Array.isArray(uiRuntime.reviewSequenceTimerIds)) {
    uiRuntime.reviewSequenceTimerIds.forEach((timerId) => clearTimeout(timerId));
  }
  uiRuntime.reviewSequenceTimerIds = [];
  if (Array.isArray(uiRuntime.reviewMetricAnimationIds)) {
    uiRuntime.reviewMetricAnimationIds.forEach((frameId) => cancelAnimationFrame(frameId));
  }
  uiRuntime.reviewMetricAnimationIds = [];
}

function queueReviewTimeout(callback, delayMs) {
  const timerId = setTimeout(callback, Math.max(0, Number(delayMs) || 0));
  uiRuntime.reviewSequenceTimerIds.push(timerId);
  return timerId;
}

function animateMetricRing(ringNode, valueNode, targetPercent, token, durationMs = 720) {
  const target = clamp(Number(targetPercent) || 0, 0, 100);
  const startAt = performance.now();
  const step = (now) => {
    if (token !== uiRuntime.reviewSequenceToken || state.screen !== APP_SCREENS.review) return;
    const elapsed = Math.max(0, now - startAt);
    const progress = clamp(elapsed / durationMs, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    if (ringNode) ringNode.style.setProperty("--progress", `${current}`);
    if (valueNode) valueNode.textContent = `${current}%`;
    if (progress < 1) {
      const frameId = requestAnimationFrame(step);
      uiRuntime.reviewMetricAnimationIds.push(frameId);
    }
  };
  const frameId = requestAnimationFrame(step);
  uiRuntime.reviewMetricAnimationIds.push(frameId);
}

function startReviewRevealSequence() {
  clearReviewSequenceTimers();
  if (!ui.reviewScreen) return;
  const token = uiRuntime.reviewSequenceToken;
  const metricItems = Array.from(ui.reviewScreen.querySelectorAll("[data-review-metric]"));
  metricItems.forEach((node) => node.classList.remove("review-metric-visible"));
  const metricSpecs = [
    { item: metricItems[0], ring: ui.reviewBluffRing, value: ui.reviewBluffRateText, target: Number(ui.reviewBluffRing?.dataset.target) || 0, delay: 0 },
    {
      item: metricItems[1],
      ring: ui.reviewChallengeRing,
      value: ui.reviewChallengeAccuracyText,
      target: Number(ui.reviewChallengeRing?.dataset.target) || 0,
      delay: 800
    },
    { item: metricItems[2], ring: ui.reviewOptimalRing, value: ui.reviewOptimalDecisionsText, target: Number(ui.reviewOptimalRing?.dataset.target) || 0, delay: 1600 }
  ];
  metricSpecs.forEach((spec) => {
    if (spec.ring) spec.ring.style.setProperty("--progress", "0");
    if (spec.value) spec.value.textContent = "0%";
    queueReviewTimeout(() => {
      if (token !== uiRuntime.reviewSequenceToken || state.screen !== APP_SCREENS.review) return;
      if (spec.item) spec.item.classList.add("review-metric-visible");
      animateMetricRing(spec.ring, spec.value, spec.target, token);
    }, spec.delay);
  });

  if (ui.reviewMomentsTitle) {
    ui.reviewMomentsTitle.classList.add("hidden");
    ui.reviewMomentsTitle.classList.remove("review-moments-title-visible");
  }
  const highlightCards = Array.from(ui.reviewHighlightsList ? ui.reviewHighlightsList.querySelectorAll(".review-moment-card") : []);
  highlightCards.forEach((card) => card.classList.remove("review-moment-visible"));
  if (ui.reviewFinalMessageText) {
    ui.reviewFinalMessageText.classList.add("hidden");
    ui.reviewFinalMessageText.classList.remove("review-final-message-visible");
  }

  const highlightsStartDelay = 2600;
  queueReviewTimeout(() => {
    if (token !== uiRuntime.reviewSequenceToken || state.screen !== APP_SCREENS.review) return;
    if (ui.reviewMomentsTitle) {
      ui.reviewMomentsTitle.classList.remove("hidden");
      ui.reviewMomentsTitle.classList.add("review-moments-title-visible");
    }
    highlightCards.forEach((card, index) => {
      queueReviewTimeout(() => {
        if (token !== uiRuntime.reviewSequenceToken || state.screen !== APP_SCREENS.review) return;
        card.classList.add("review-moment-visible");
      }, index * 260);
    });
    const finalDelay = highlightCards.length * 260 + 520;
    queueReviewTimeout(() => {
      if (token !== uiRuntime.reviewSequenceToken || state.screen !== APP_SCREENS.review) return;
      if (ui.reviewFinalMessageText) {
        ui.reviewFinalMessageText.classList.remove("hidden");
        ui.reviewFinalMessageText.classList.add("review-final-message-visible");
      }
    }, finalDelay);
  }, highlightsStartDelay);
}

function handleScreenTransitionAnimations() {
  const previous = uiRuntime.lastScreen;
  const current = state.screen;
  if (previous === current) return;
  uiRuntime.lastScreen = current;
  hideInlineHintTooltip();
  if (previous === APP_SCREENS.result) clearResultRevealTimers();
  if (previous === APP_SCREENS.review) clearReviewSequenceTimers();
  if (current === APP_SCREENS.home) {
    runHomePremiumIntroAnimation();
    runHomeLeagueBadgePopAnimation();
  }
  if (current === APP_SCREENS.result) startResultRevealSequence();
  if (current === APP_SCREENS.review) startReviewRevealSequence();
}

function runHomePremiumIntroAnimation() {
  if (!ui.premiumBtn || uiRuntime.homePremiumIntroPlayed) return;
  uiRuntime.homePremiumIntroPlayed = true;
  ui.premiumBtn.classList.add("premium-intro-active");
  if (uiRuntime.homePremiumIntroTimerId) clearTimeout(uiRuntime.homePremiumIntroTimerId);
  uiRuntime.homePremiumIntroTimerId = setTimeout(() => {
    uiRuntime.homePremiumIntroTimerId = null;
    if (!ui.premiumBtn) return;
    ui.premiumBtn.classList.remove("premium-intro-active");
  }, 900);
}

function runHomeLeagueBadgePopAnimation() {
  if (!ui.leagueBadgeBtn) return;
  triggerAnimation(ui.leagueBadgeBtn, "league-pop-animate");
}

function triggerPlayHapticFeedback() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(10);
  } catch {}
}

function shareReviewHighlightImage(anchor = null) {
  showInlineHintNearElement(anchor, "Sharing coming soon.");
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
  if (isFirstScriptedBotMatchActive() && state.firstMatchGuide.awaitingFinalOverlay && !state.firstMatchGuide.finalOverlayShown) {
    state.firstMatchGuide.awaitingFinalOverlay = false;
    openFirstMatchFinalGuide();
    updateUI();
    return;
  }
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
    isReal: action.kind === "role" ? Boolean(action.isReal) : null,
    challengeable: action.challengeable,
    cost: action.cost
  };
  recordPlayerActionProfile(actor, state.pendingAction);
  if (actor === "bot") recordBotBluffPattern(state.pendingAction);
  state.pendingAction.reviewEntryId = recordPendingActionForReview(state.pendingAction);

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
      finalizeReviewEntry(pending.reviewEntryId);
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
      if (isFirstScriptedBotMatchActive()) clearTimer();
      else runHumanTimer("response", MATCH_SETTINGS.HUMAN_TIMER_SECONDS, () => handleResponseTimeout(responder));
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

  if (
    isFirstScriptedBotMatchActive() &&
    responder === "human" &&
    action.actor === "bot" &&
    action.kind === "role" &&
    !state.firstMatchGuide.decisionOverlayShown
  ) {
    scheduleFirstMatchDecisionGuide();
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

function resolveAccept() {
  if (state.phase !== PHASES.awaitingResponse) return;
  clearFirstMatchDecisionGuideDelay();
  clearTimer();
  clearPendingClaim();

  const action = state.pendingAction;
  if (!action) return;

  if (typeof action.cardIndex === "number") markRoleReveal(action.actor, action.cardIndex);
  markReviewDecision(action.reviewEntryId, "ACCEPT");
  setCurrentAction(formatDecisionText(state.pendingResponder || opponentOf(action.actor), "ACCEPT"));
  if (isFirstScriptedBotMatchActive() && action.actor === "bot" && (state.pendingResponder || opponentOf(action.actor)) === "human") {
    state.firstMatchGuide.awaitingFinalOverlay = true;
  }
  if (state.mode === "bot" && action.actor === "bot" && state.pendingResponder === "human") {
    recordPlayerResponseProfile("ACCEPT", false);
  }
  if (state.mode === "bot" && action.actor === "human" && state.pendingResponder === "bot") {
    updateBeliefsAfterBotAccept(action);
  }

  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    if (!pending) return;
    applyActionResourceCost(pending);
    applyEffect(pending);
    finalizeReviewEntry(pending.reviewEntryId);
    finalizeResolvedAction();
  });
}

function resolveChallenge() {
  if (state.phase !== PHASES.awaitingResponse) return;
  clearFirstMatchDecisionGuideDelay();
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
  markReviewDecision(action.reviewEntryId, "CHALLENGE", { isReal });
  if (state.mode === "bot" && actor === "bot" && challenger === "human") {
    recordPlayerResponseProfile("CHALLENGE", !isReal);
  }
  if (state.mode === "bot" && actor === "human" && challenger === "bot") {
    updateBeliefsAfterBotChallenge(action, isReal);
  }

  setCurrentAction(formatChallengeOutcome(isReal, actor, challenger));
  if (isFirstScriptedBotMatchActive() && actor === "bot" && challenger === "human") {
    state.firstMatchGuide.awaitingFinalOverlay = true;
  }

  runResolutionAfterDelay(() => {
    const pending = state.pendingAction;
    const result = state.pendingChallengeResult;
    if (!pending || !result) return;

    applyActionResourceCost(pending);

    if (result.isReal) {
      applyDamage(result.challenger, 1, "failed challenge");
      applyEffect(pending);
    } else {
      applyDamage(result.actor, 2, "bluff penalty");
      if (playerHasRealRole(result.challenger, "ELF")) applyGold(result.challenger, 2, "ELF catch lie bonus");
    }

    finalizeReviewEntry(pending.reviewEntryId);
    finalizeResolvedAction();
  });
}

function applyEffect(action) {
  const actor = action.actor;
  const target = action.target;

  if (action.kind === "basic") {
    if (action.id === "INTEREST") applyGold(actor, getInterestGoldGain(actor), "INTEREST");
    if (action.id === "STRIKE") applyDamage(target, getStrikeDamage(actor), "STRIKE");
    return;
  }

  switch (action.role) {
    case "SIREN":
      applyDamage(target, 1, "SIREN");
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
          const status = revealed.isReal ? "REAL" : "BLUFF";
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

function clampBeliefReal(value) {
  return clamp(Number(value) || 0.5, 0.05, 0.95);
}

function getBeliefRealForRole(role) {
  const normalized = String(role || "").toUpperCase();
  if (!state.ai || !state.ai.beliefRealByRole || !(normalized in state.ai.beliefRealByRole)) return 0.5;
  return clampBeliefReal(state.ai.beliefRealByRole[normalized]);
}

function setBeliefRealForRole(role, value) {
  const normalized = String(role || "").toUpperCase();
  if (!state.ai || !state.ai.beliefRealByRole || !(normalized in state.ai.beliefRealByRole)) return;
  state.ai.beliefRealByRole[normalized] = clampBeliefReal(value);
}

function adjustBeliefRealForRole(role, delta) {
  setBeliefRealForRole(role, getBeliefRealForRole(role) + (Number(delta) || 0));
}

function getPlayerChallengeRate() {
  const model = state.ai && state.ai.playerModel ? state.ai.playerModel : createPlayerBehaviorStats();
  return model.challengeOpportunities > 0
    ? clamp(model.challenges / model.challengeOpportunities, 0.05, 0.95)
    : 0.45;
}

function getPlayerBluffCaughtRate() {
  const model = state.ai && state.ai.playerModel ? state.ai.playerModel : createPlayerBehaviorStats();
  return model.challenges > 0
    ? clamp(model.bluffsCaught / model.challenges, 0.05, 0.95)
    : 0.5;
}

function getPlayerAggressionRate() {
  const model = state.ai && state.ai.playerModel ? state.ai.playerModel : createPlayerBehaviorStats();
  return model.turns > 0
    ? clamp(model.damageActions / model.turns, 0.05, 0.95)
    : 0.5;
}

function isDamageActionForProfile(action) {
  if (!action) return false;
  if (action.kind === "basic") return action.id === "STRIKE";
  if (action.kind !== "role") return false;
  const role = String(action.role || "").toUpperCase();
  return role === "KNIGHT" || role === "SIREN" || role === "PIRATE" || role === "JOKER" || role === "BERSERK" || role === "VALK" || role === "APPRENTICE";
}

function recordPlayerActionProfile(actor, action) {
  if (state.mode !== "bot" || actor !== "human" || !state.ai || !state.ai.playerModel) return;
  const model = state.ai.playerModel;
  model.turns = Math.max(0, Number(model.turns) || 0) + 1;
  if (isDamageActionForProfile(action)) {
    model.damageActions = Math.max(0, Number(model.damageActions) || 0) + 1;
  }
}

function recordPlayerResponseProfile(choice, wasCorrect = false) {
  if (state.mode !== "bot" || !state.ai || !state.ai.playerModel) return;
  const model = state.ai.playerModel;
  model.challengeOpportunities = Math.max(0, Number(model.challengeOpportunities) || 0) + 1;
  if (choice === "CHALLENGE") {
    model.challenges = Math.max(0, Number(model.challenges) || 0) + 1;
    if (wasCorrect) model.bluffsCaught = Math.max(0, Number(model.bluffsCaught) || 0) + 1;
  }
}

function recordBotBluffPattern(action) {
  if (state.mode !== "bot" || !state.ai || !state.ai.botBluffUsageByRole || !action || action.kind !== "role") return;
  const role = String(action.role || "").toUpperCase();
  if (!(role in state.ai.botBluffUsageByRole)) return;
  if (action.isReal) {
    state.ai.botBluffUsageByRole[role] = Math.max(0, Number(state.ai.botBluffUsageByRole[role]) - 1);
    return;
  }
  state.ai.botBluffUsageByRole[role] = Math.max(0, Number(state.ai.botBluffUsageByRole[role]) || 0) + 1;
}

function isStrongOpponentClaim(action) {
  if (!action || action.kind !== "role") return false;
  const role = String(action.role || "").toUpperCase();
  const actor = state.players[action.actor] || createPlayerState(action.actor);
  const target = state.players[action.target] || createPlayerState(action.target);

  if (role === "KNIGHT" || role === "BERSERK" || role === "VALK") return true;
  if (role === "SIREN") return target.hp <= 3 || target.blockedActions <= 0;
  if (role === "PIRATE") return target.hp <= 2 || actor.gold <= 1;
  if (role === "GOBLIN") return target.gold >= 2;
  if (role === "ANGEL") return Math.abs(actor.hp - actor.gold) >= 2;
  if (role === "APPRENTICE") {
    const card = getCardByIndex(action.actor, action.cardIndex);
    const dmg = clamp(typeof card?.apprenticeDamage === "number" ? card.apprenticeDamage : 1, 1, 5);
    return dmg >= 3;
  }
  return false;
}

function updateBeliefsAfterBotAccept(opponentAction) {
  if (state.mode !== "bot" || !state.ai || !opponentAction || opponentAction.actor !== "human" || opponentAction.kind !== "role") return;
  const role = String(opponentAction.role || "").toUpperCase();
  if (!(role in state.ai.beliefRealByRole)) return;

  if (isStrongOpponentClaim(opponentAction)) adjustBeliefRealForRole(role, -0.05);
  else adjustBeliefRealForRole(role, 0.05);

  if (role === "BANKER" && state.round <= 3) adjustBeliefRealForRole(role, 0.05);
  if (role === "ANGEL") {
    const actorState = state.players[opponentAction.actor] || createPlayerState(opponentAction.actor);
    if (actorState.gold <= 1 || actorState.hp <= 2) adjustBeliefRealForRole(role, -0.1);
  }
  if ((role === "KNIGHT" || role === "BERSERK" || role === "SIREN") && (state.players.human.hp <= 2)) {
    adjustBeliefRealForRole(role, -0.05);
  }

  const repeatMap = state.ai.repeatUnchallengedByRole || Object.create(null);
  repeatMap[role] = Math.max(0, Number(repeatMap[role]) || 0) + 1;
  if (repeatMap[role] > 1) adjustBeliefRealForRole(role, -0.03);
}

function updateBeliefsAfterBotChallenge(opponentAction, wasReal) {
  if (state.mode !== "bot" || !state.ai || !opponentAction || opponentAction.actor !== "human" || opponentAction.kind !== "role") return;
  const role = String(opponentAction.role || "").toUpperCase();
  if (!(role in state.ai.beliefRealByRole)) return;
  setBeliefRealForRole(role, wasReal ? 0.9 : 0.1);
  if (state.ai.repeatUnchallengedByRole && role in state.ai.repeatUnchallengedByRole) {
    state.ai.repeatUnchallengedByRole[role] = 0;
  }
}

function buildBotAiGameState() {
  const bot = state.players.bot || createPlayerState("bot");
  const human = state.players.human || createPlayerState("human");
  return {
    demonActive: Boolean(state.ai && state.ai.demonActive),
    botHP: bot.hp,
    oppHP: human.hp,
    botGold: bot.gold,
    oppGold: human.gold,
    botHasShield: Boolean(bot.shield),
    roundIndex: Math.max(1, Number(state.round) || 1),
    remainingRounds: Math.max(0, MATCH_SETTINGS.MAX_ROUNDS - Math.max(1, Number(state.round) || 1) + 1),
    strikeDamage: getStrikeDamage("bot"),
    interestGain: getInterestGoldGain("bot"),
    opponentApprenticeDamageHint: 2
  };
}

function buildBotPrivateStateForAi() {
  const bot = state.players.bot || createPlayerState("bot");
  const playerModel = state.ai && state.ai.playerModel ? state.ai.playerModel : createPlayerBehaviorStats();
  const botHand = Array.isArray(bot.cards)
    ? bot.cards.map((card, index) => ({
        cardIndex: index,
        role: String(card && card.role ? card.role : ""),
        isReal: Boolean(card && card.isReal),
        cost: getRoleCost(card && card.role ? card.role : "", card),
        canUse: canUseRoleByUses("bot", card && card.role ? card.role : "")
      }))
    : [];
  return {
    beliefRealByRole: state.ai && state.ai.beliefRealByRole ? { ...state.ai.beliefRealByRole } : createRoleBeliefMap(0.5),
    botBluffUsageByRole: state.ai && state.ai.botBluffUsageByRole ? { ...state.ai.botBluffUsageByRole } : createRoleCounterMap(0),
    playerModel: {
      challengeOpportunities: playerModel.challengeOpportunities,
      challenges: playerModel.challenges,
      bluffsCaught: playerModel.bluffsCaught,
      turns: playerModel.turns,
      damageActions: playerModel.damageActions,
      challengeRate: getPlayerChallengeRate(),
      playerBluffCaughtRate: getPlayerBluffCaughtRate(),
      playerAggression: getPlayerAggressionRate()
    },
    botHand
  };
}

function buildBotPublicStateForAi(legalActions) {
  const availableActions = (Array.isArray(legalActions) ? legalActions : []).map((action) => ({
    kind: action.kind === "role" ? "role" : "basic",
    id: action.kind === "basic" ? action.id : action.role,
    role: action.kind === "role" ? action.role : null,
    cardIndex: typeof action.cardIndex === "number" ? action.cardIndex : null,
    cost: Number(action.cost) || 0,
    isReal: action.kind === "role" ? Boolean(action.isReal) : null
  }));

  const knownOppCards = Array.isArray(state.players.human.cards)
    ? state.players.human.cards.map((card, index) => ({
        cardIndex: index,
        role: String(card && card.role ? card.role : ""),
        verification: card && (card.verification === "REAL" || card.verification === "FAKE") ? card.verification : "UNKNOWN",
        revealedUsed: Boolean(card && card.revealedUsed)
      }))
    : [];

  return { availableActions, knownOppCards };
}

function normalizeBotAiActionChoice(choice, legalActions) {
  const legal = Array.isArray(legalActions) ? legalActions : [];
  if (!choice || typeof choice !== "object") return null;
  if (choice.kind === "basic") {
    const basicId = String(choice.id || "").toUpperCase();
    if (basicId === "INTEREST" || basicId === "STRIKE") return basicId;
    return null;
  }
  if (choice.kind === "role" && typeof choice.cardIndex === "number") {
    const legalRole = legal.find((action) => action.kind === "role" && action.cardIndex === choice.cardIndex);
    if (legalRole) return { kind: "card", cardIndex: legalRole.cardIndex };
  }
  return null;
}

function decideBotActionWithModule(legalActions) {
  if (!window.BotAI || typeof window.BotAI.decideAction !== "function") return null;
  const gameState = buildBotAiGameState();
  const botPrivateState = buildBotPrivateStateForAi();
  const publicState = buildBotPublicStateForAi(legalActions);
  const choice = window.BotAI.decideAction(gameState, botPrivateState, publicState);
  return normalizeBotAiActionChoice(choice, legalActions);
}

function decideBotResponseWithModule(opponentClaim) {
  if (!window.BotAI || typeof window.BotAI.decideResponseToClaim !== "function") return null;
  const gameState = buildBotAiGameState();
  const botPrivateState = buildBotPrivateStateForAi();
  const publicState = buildBotPublicStateForAi([]);
  const sanitizedClaim = {
    kind: "role",
    id: String(opponentClaim && opponentClaim.role ? opponentClaim.role : ""),
    role: String(opponentClaim && opponentClaim.role ? opponentClaim.role : ""),
    cardIndex: typeof opponentClaim?.cardIndex === "number" ? opponentClaim.cardIndex : null,
    cost: Number(opponentClaim && opponentClaim.cost) || 0
  };
  const result = String(
    window.BotAI.decideResponseToClaim(gameState, botPrivateState, publicState, sanitizedClaim) || "ACCEPT"
  ).toUpperCase();
  if (result === "CHALLENGE" || result === "YOU'RE LYING" || result === "YOURE_LYING") return "CHALLENGE";
  return "ACCEPT";
}

function botChooseAction() {
  const legal = gatherLegalActions("bot");
  if (legal.length === 0) return "INTEREST";

  if (isFirstScriptedBotMatchActive() && !state.firstMatchGuide.botFirstPlayDone) {
    const scriptedBotCards = Array.isArray(state.players.bot.cards) ? state.players.bot.cards : [];
    const fixedCardIndex = scriptedBotCards.findIndex((card) => card && card.role === "KNIGHT" && card.isReal === false);
    if (fixedCardIndex >= 0) {
      const fixedCard = scriptedBotCards[fixedCardIndex];
      const fixedCost = getRoleCost("KNIGHT", fixedCard);
      if (state.players.bot.gold < fixedCost) {
        applyGold("bot", fixedCost - state.players.bot.gold, "First match scripted setup");
      }
      state.firstMatchGuide.botFirstPlayDone = true;
      return { kind: "card", cardIndex: fixedCardIndex };
    }
    state.firstMatchGuide.botFirstPlayDone = true;
  }

  const moduleChoice = decideBotActionWithModule(legal);
  if (moduleChoice) return moduleChoice;

  const fallback = legal.find((action) => action.kind === "basic" && action.id === "INTEREST");
  if (fallback) return "INTEREST";
  const first = legal[0];
  return first.kind === "basic" ? first.id : { kind: "card", cardIndex: first.cardIndex };
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

  if (
    isFirstScriptedBotMatchActive() &&
    state.pendingAction &&
    state.pendingAction.actor === "human" &&
    state.pendingAction.kind === "role" &&
    !state.firstMatchGuide.botAcceptedFirstHumanCard
  ) {
    state.firstMatchGuide.botAcceptedFirstHumanCard = true;
    resolveAccept();
    return;
  }

  const decision = decideBotResponseWithModule(state.pendingAction);
  if (decision === "CHALLENGE") resolveChallenge();
  else resolveAccept();
}

function applyCanonicalAction(payload) {
  if (!payload || state.screen !== APP_SCREENS.game) return;
  if (payload.kind === "ONBOARDING_READY") {
    applyCanonicalOnboardingReady(payload);
    return;
  }
  if (payload.kind === "DRAFT_ACCEPT") {
    applyCanonicalDraftAccept(payload);
    return;
  }
  if (payload.kind === "ROGUE_SWAP_ACCEPT") {
    applyCanonicalRogueSwapAccept(payload);
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
    triggerInvalidTapHint();
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
  if (
    isFirstScriptedBotMatchActive() &&
    state.pendingAction &&
    state.pendingAction.actor === "bot" &&
    state.pendingAction.kind === "role" &&
    !state.firstMatchGuide.decisionOverlayShown
  ) {
    return;
  }
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
  if (state.phase === PHASES.rogueSwap) {
    if (state.rogueSwap.actorSlot === state.localSlot) {
      if (state.friend.pendingRequest === "rogueSwap") return "WAITING HOST CONFIRMATION...";
      return "ROGUE SWAP: SELECT 0-4, THEN ACCEPT";
    }
    return "OPPONENT ROGUE SWAP...";
  }

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
  if (state.phase === PHASES.rogueSwap) {
    if (state.rogueSwap.actorSlot === state.localSlot && state.friend.pendingRequest !== "rogueSwap") return "your-turn";
    if (state.rogueSwap.actorSlot !== state.localSlot) return "opponent-turn";
    return "neutral";
  }
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
  if (state.phase === PHASES.rogueSwap) return state.rogueSwap.actorSlot;
  if (state.phase === PHASES.choosingAction) return state.currentActor;
  if (state.phase === PHASES.awaitingResponse) {
    if (state.pendingResponder === state.localSlot && state.pendingAction) return state.pendingAction.actor;
    return state.pendingResponder;
  }
  return null;
}

function closeHeroTooltip() {
  state.heroTooltip.open = false;
  state.heroTooltip.slot = null;
  if (ui.heroTooltipOverlay) ui.heroTooltipOverlay.classList.add("hidden");
}

function closeGameEventTooltip() {
  state.gameEventTooltip.open = false;
  if (ui.gameEventTooltipOverlay) ui.gameEventTooltipOverlay.classList.add("hidden");
}

function openGameEventTooltip() {
  const eventMeta = getGameEventMeta(state.gameEventId);
  state.gameEventTooltip.open = true;
  if (ui.gameEventTooltipTitle) ui.gameEventTooltipTitle.textContent = eventMeta.name;
  if (ui.gameEventTooltipText) ui.gameEventTooltipText.textContent = eventMeta.description;
  if (ui.gameEventTooltipOverlay) ui.gameEventTooltipOverlay.classList.remove("hidden");
}

function toggleGameEventTooltip() {
  if (state.gameEventTooltip.open) {
    closeGameEventTooltip();
    return;
  }
  closeHeroTooltip();
  openGameEventTooltip();
}

function syncGameEventTooltip() {
  if (!ui.gameEventTooltipOverlay) return;
  if (!state.gameEventTooltip.open || state.screen !== APP_SCREENS.game) {
    ui.gameEventTooltipOverlay.classList.add("hidden");
    return;
  }
  const eventMeta = getGameEventMeta(state.gameEventId);
  if (ui.gameEventTooltipTitle) ui.gameEventTooltipTitle.textContent = eventMeta.name;
  if (ui.gameEventTooltipText) ui.gameEventTooltipText.textContent = eventMeta.description;
  ui.gameEventTooltipOverlay.classList.remove("hidden");
}

function openHeroTooltip(slot) {
  const resolvedSlot = slot === "bot" ? "bot" : "human";
  const hero = getHeroMeta(getHeroIdForSlot(resolvedSlot));
  closeGameEventTooltip();
  state.heroTooltip.slot = resolvedSlot;
  state.heroTooltip.open = true;
  if (ui.heroTooltipTitle) ui.heroTooltipTitle.textContent = hero.displayName;
  if (ui.heroTooltipText) ui.heroTooltipText.textContent = hero.shortDescription;
  if (ui.heroTooltipOverlay) ui.heroTooltipOverlay.classList.remove("hidden");
}

function toggleHeroTooltip(slot) {
  const resolvedSlot = slot === "bot" ? "bot" : "human";
  if (state.heroTooltip.open && state.heroTooltip.slot === resolvedSlot) {
    closeHeroTooltip();
    return;
  }
  openHeroTooltip(resolvedSlot);
}

function syncHeroTooltip() {
  if (!ui.heroTooltipOverlay) return;
  if (!state.heroTooltip.open || state.screen !== APP_SCREENS.game) {
    ui.heroTooltipOverlay.classList.add("hidden");
    return;
  }
  const slot = state.heroTooltip.slot === "bot" ? "bot" : "human";
  const hero = getHeroMeta(getHeroIdForSlot(slot));
  if (ui.heroTooltipTitle) ui.heroTooltipTitle.textContent = hero.displayName;
  if (ui.heroTooltipText) ui.heroTooltipText.textContent = hero.shortDescription;
  ui.heroTooltipOverlay.classList.remove("hidden");
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
  const cardVerified = card.verification === "REAL" || card.verification === "FAKE";
  const pendingClaimCard = isPendingClaimCard(ownerSlot, card, cardIndex);
  const hideOpponentCardDetails =
    ownerSlot !== state.localSlot && isFogOfWarActive() && !draftMode && !card.revealedUsed && !cardVerified && !pendingClaimCard;

  if (ownerSlot === state.localSlot) {
    if (!draftMode) {
      node.classList.add(card.isReal ? "real-role" : "fake-role");
      if (card.isReal) node.classList.add("real-role-highlight");
    }
  } else {
    node.classList.add("opponent-card");
    if (cardVerified) node.classList.add("opponent-confirmed");
    else if (!draftMode && card.revealedUsed) node.classList.add("opponent-played");
    if (hideOpponentCardDetails) node.classList.add("opponent-hidden");
  }

  if (pendingClaimCard) {
    node.classList.add("card--pending-claim");
    node.classList.add("card--pending-claim-pulse");
    if (state.pendingClaim && Date.now() - state.pendingClaim.timestamp <= 320) {
      node.classList.add("card--pending-claim-flash");
    }
    if (isFirstMatchBotKnightDecisionPending() && state.firstMatchGuide && state.firstMatchGuide.active && state.firstMatchGuide.overlayMode === "decision") {
      node.classList.add("card--pending-claim-pulse-strong");
    }
  }

  if (isDraftCardSelectable(ownerSlot) || isRogueSwapCardSelectable(ownerSlot)) {
    node.classList.add("draft-selectable");
    if (isDraftCardSelected(ownerSlot, cardIndex) || isRogueSwapCardSelected(ownerSlot, cardIndex)) node.classList.add("draft-selected");
  }
  if (isDraftCardSwapping(ownerSlot, cardIndex) || isRogueSwapCardSwapping(ownerSlot, cardIndex)) {
    node.classList.add("draft-swapping");
  }

  const artLayer = document.createElement("span");
  artLayer.className = "card-art";
  if (card.role === "ANGEL") artLayer.classList.add("card-art-angel");
  if (card.role === "JOKER") artLayer.classList.add("card-art-joker");
  if (hideOpponentCardDetails) {
    artLayer.classList.add("card-art-hidden");
  } else {
    const roleImagePath = getRoleImagePath(card.role);
    if (roleImagePath) artLayer.style.backgroundImage = `url("${roleImagePath}")`;
  }
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

  if (ownerSlot !== state.localSlot && cardVerified) {
    const verifiedTag = document.createElement("span");
    const verifiedIsReal = card.verification === "REAL";
    verifiedTag.className = `card-badge card-status-tag ${verifiedIsReal ? "card-real-tag" : "card-fake-tag"}`;
    verifiedTag.textContent = verifiedIsReal ? "REAL" : "BLUFF";
    badgeLeft.appendChild(verifiedTag);
    hasBadge = true;
  }

  if (!hideOpponentCardDetails && meta && (roleCost > 0 || card.role === "ANGEL")) {
    const cost = document.createElement("span");
    cost.className = "card-badge card-cost";
    cost.textContent = String(roleCost);
    badgeRight.appendChild(cost);
    hasBadge = true;
  }

  if (!hideOpponentCardDetails && meta && meta.passive) {
    const passive = document.createElement("span");
    passive.className = "card-badge card-passive";
    passive.textContent = "PASSIVE";
    badgeLeft.appendChild(passive);
    hasBadge = true;
  }

  if (!hideOpponentCardDetails && usesLeft !== null) {
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
  label.textContent = hideOpponentCardDetails ? "???" : getRoleDisplayName(card.role);
  textPanel.appendChild(label);

  const desc = document.createElement("p");
  desc.className = "card-desc";
  if (hideOpponentCardDetails) {
    desc.textContent = "Hidden card";
  } else {
    renderRoleDescription(desc, card.role, card);
  }
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
    const rogueSwapSelectable = isRogueSwapCardSelectable(slot);
    const selectableMode = draftSelectable || rogueSwapSelectable;
    let enabled = asInteractive || selectableMode;
    if (enabled && !selectableMode) {
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

function createLeagueTrackRewardRow(reward, alignLeft = true) {
  const row = document.createElement("div");
  row.className = `league-track-row ${alignLeft ? "league-track-row-left" : "league-track-row-right"}`;

  const leftSlot = document.createElement("div");
  leftSlot.className = "league-track-slot";
  const rightSlot = document.createElement("div");
  rightSlot.className = "league-track-slot";

  const center = document.createElement("div");
  center.className = "league-track-center";
  const dot = document.createElement("span");
  dot.className = "league-track-dot";
  center.appendChild(dot);

  const claimable = isRewardClaimable(reward);
  const claimed = isRewardClaimed(reward);
  const locked = !claimable && !claimed;
  const card = claimable ? document.createElement("button") : document.createElement("div");
  if (claimable) {
    card.type = "button";
    card.dataset.claimRewardId = reward.id;
  }
  card.className = "league-track-card";
  if (claimable) card.classList.add("league-track-card-claimable");
  if (claimed) card.classList.add("league-track-card-claimed");
  if (locked) card.classList.add("league-track-card-locked");
  if (uiRuntime.claimPulseRewardId && uiRuntime.claimPulseRewardId === reward.id) {
    card.classList.add("league-track-card-pop");
  }

  const head = document.createElement("div");
  head.className = "league-track-card-head";
  const thumb = document.createElement("span");
  thumb.className = "league-track-thumb";
  if (reward.rewardType === "card") {
    thumb.style.backgroundImage = `url("${withAssetVersion(getRoleImagePath(reward.itemId))}")`;
  } else if (reward.rewardType === "hero" || reward.rewardType === "skin") {
    thumb.style.backgroundImage = `url("${withAssetVersion(getAvatarPath(reward.itemId))}")`;
  } else if (reward.rewardType === "event") {
    thumb.classList.add("league-track-thumb-fallback");
    thumb.textContent = "EV";
  } else if (reward.rewardType === "mode") {
    thumb.classList.add("league-track-thumb-fallback");
    thumb.textContent = "R";
  } else {
    thumb.classList.add("league-track-thumb-fallback");
    thumb.textContent = "?";
  }
  head.appendChild(thumb);

  const title = document.createElement("p");
  title.className = "league-track-card-title";
  title.textContent = reward.label;
  head.appendChild(title);
  card.appendChild(head);

  const meta = document.createElement("p");
  meta.className = "league-track-card-meta";
  if (claimable) {
    meta.textContent = "Tap to Claim";
  } else if (claimed) {
    meta.textContent = "Claimed";
  } else {
    meta.textContent = `Unlocks at: ${formatRewardUnlockLocation(reward)}`;
  }
  card.appendChild(meta);

  const status = document.createElement("span");
  status.className = "league-track-state-icon";
  status.textContent = claimable ? "!" : claimed ? "OK" : "LOCK";
  card.appendChild(status);

  if (claimable) {
    const dotNotice = document.createElement("span");
    dotNotice.className = "notify-dot league-track-dot-notice";
    card.appendChild(dotNotice);
  }

  if (alignLeft) leftSlot.appendChild(card);
  else rightSlot.appendChild(card);

  row.appendChild(leftSlot);
  row.appendChild(center);
  row.appendChild(rightSlot);
  return row;
}

function renderLeagueProgressTrack() {
  if (!ui.leagueProgressTrack) return;
  ui.leagueProgressTrack.innerHTML = "";
  const fragment = document.createDocumentFragment();

  const soonNode = document.createElement("div");
  soonNode.className = "league-track-soon-node";
  soonNode.textContent = "New leagues coming soon";
  fragment.appendChild(soonNode);

  const sortedRewards = [...PROGRESSION_REWARDS].sort((a, b) => {
    const aSegmentIndex = LEAGUE_SEGMENT_INDEX_BY_ID[a.segmentId] ?? 0;
    const bSegmentIndex = LEAGUE_SEGMENT_INDEX_BY_ID[b.segmentId] ?? 0;
    if (aSegmentIndex !== bSegmentIndex) return aSegmentIndex - bSegmentIndex;
    return (Number(a.point) || 0) - (Number(b.point) || 0);
  });
  const rewardsBySegment = sortedRewards.reduce((acc, reward) => {
    if (!acc[reward.segmentId]) acc[reward.segmentId] = [];
    acc[reward.segmentId].push(reward);
    return acc;
  }, Object.create(null));

  let alignLeft = true;
  const segmentOrder = [...LEAGUE_SEGMENTS].reverse();
  segmentOrder.forEach((segment) => {
    const section = document.createElement("div");
    section.className = "league-track-section-label";
    section.textContent = `${segment.league} ${segment.subleague}`;
    fragment.appendChild(section);

    const rewards = Array.isArray(rewardsBySegment[segment.id]) ? rewardsBySegment[segment.id] : [];
    for (let i = rewards.length - 1; i >= 0; i -= 1) {
      const reward = rewards[i];
      fragment.appendChild(createLeagueTrackRewardRow(reward, alignLeft));
      alignLeft = !alignLeft;
    }
  });

  ui.leagueProgressTrack.appendChild(fragment);
}

function createCollectionThumb({ imagePath = "", fallbackText = "" }) {
  if (imagePath) {
    const image = document.createElement("img");
    image.className = "collection-thumb";
    image.src = imagePath;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    return image;
  }
  const badge = document.createElement("span");
  badge.className = "collection-thumb collection-thumb-fallback";
  badge.textContent = fallbackText || "?";
  return badge;
}

function buildCollectionItemsForTab(tab) {
  if (tab === "heroes") {
    const unlockedHeroes = new Set(getUnlockedHeroIds());
    return HERO_ORDER.map((heroId) => {
      const hero = getHeroMeta(heroId);
      return {
        id: heroId,
        name: hero.displayName,
        description: hero.shortDescription,
        unlocked: unlockedHeroes.has(heroId),
        unlockText: getCollectionUnlockText("hero", heroId),
        imagePath: getAvatarPath(heroId),
        fallbackText: hero.displayName.slice(0, 2).toUpperCase()
      };
    });
  }

  if (tab === "events") {
    const unlockedEvents = new Set(getUnlockedGameEventIds());
    return GAME_EVENTS.map((eventMeta) => ({
      id: eventMeta.id,
      name: eventMeta.name,
      description: eventMeta.description,
      unlocked: unlockedEvents.has(eventMeta.id),
      unlockText: getCollectionUnlockText("event", eventMeta.id),
      imagePath: "",
      fallbackText: "EV"
    }));
  }

  const unlockedCards = new Set(getUnlockedCardRoles());
  return getCardCollectionOrder().map((role) => {
    const meta = getRoleCollectionMeta(role);
    return {
      id: role,
      name: meta.name,
      description: meta.description,
      unlocked: unlockedCards.has(role),
      unlockText: getCollectionUnlockText("card", role),
      cost: getRoleCost(role),
      imagePath: getRoleImagePath(role),
      fallbackText: meta.name.slice(0, 2).toUpperCase()
    };
  });
}

function renderCollectionList() {
  if (!ui.collectionList) return;
  const tab = COLLECTION_TABS.includes(state.collection.tab) ? state.collection.tab : "cards";
  state.collection.tab = tab;
  ui.collectionList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const items = buildCollectionItemsForTab(tab);
  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "collection-item";
    if (!item.unlocked) row.classList.add("collection-item-locked");

    row.appendChild(createCollectionThumb(item));

    const textWrap = document.createElement("div");
    textWrap.className = "collection-item-text";

    const title = document.createElement("p");
    title.className = "collection-item-title";
    title.textContent = item.name;
    textWrap.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "collection-item-desc";
    desc.textContent = item.description;
    textWrap.appendChild(desc);

    const status = document.createElement("p");
    status.className = `collection-item-status ${item.unlocked ? "collection-item-status-unlocked" : "collection-item-status-locked"}`;
    status.textContent = item.unlocked ? "Unlocked" : item.unlockText;
    textWrap.appendChild(status);

    row.appendChild(textWrap);
    if (tab === "cards") {
      const cost = document.createElement("span");
      cost.className = "card-badge card-cost collection-card-cost";
      const rawCost = Number(item.cost);
      cost.textContent = Number.isFinite(rawCost) ? String(rawCost) : "0";
      row.appendChild(cost);
    }
    fragment.appendChild(row);
  });

  ui.collectionList.appendChild(fragment);
}

function normalizePostGameReviewSnapshot(snapshot) {
  const base = createPostGameReviewState();
  if (!snapshot || typeof snapshot !== "object") return base;
  const normalized = {
    ...base,
    bluffSuccessRate: clamp(Number(snapshot.bluffSuccessRate) || 0, 0, 100),
    challengeAccuracy: clamp(Number(snapshot.challengeAccuracy) || 0, 0, 100),
    optimalDecisions: clamp(Number(snapshot.optimalDecisions) || 0, 0, 100),
    feedback: String(snapshot.feedback || base.feedback),
    matchBadgeText: String(snapshot.matchBadgeText || base.matchBadgeText),
    finalMessage: String(snapshot.finalMessage || base.finalMessage),
    highlights: []
  };
  const highlights = Array.isArray(snapshot.highlights) ? snapshot.highlights : [];
  normalized.highlights = highlights.slice(0, 4).map((item, index) => ({
    turnNumber: Math.max(1, Number(item?.turnNumber) || index + 1),
    label: String(item?.label || "Great Read"),
    actionText: String(item?.actionText || "You made a smart move."),
    resultText: String(item?.resultText || "Strong pressure and momentum control."),
    priority: Number(item?.priority) || 0
  }));
  return normalized;
}

function getTvHistoryRows() {
  const real = Array.isArray(state.matchHistory) ? state.matchHistory.slice(0, 10) : [];
  const rows = real.map((entry) => ({
    id: entry.id,
    source: "real",
    result: normalizeHistoryResult(entry.result),
    opponentName: entry.opponentName,
    opponentHeroId: entry.opponentHeroId,
    highlightLine: entry.highlightLine || "Mind game battle finished.",
    reviewSnapshot: entry.reviewSnapshot
  }));
  const needed = Math.max(0, 10 - rows.length);
  for (let i = 0; i < needed; i += 1) {
    const mock = TV_COMMUNITY_MATCHES[i % TV_COMMUNITY_MATCHES.length];
    rows.push({
      id: `mock-${mock.id}-${i}`,
      source: "mock",
      result: normalizeHistoryResult(mock.result),
      opponentName: mock.opponentName,
      opponentHeroId: normalizeHeroId(mock.opponentHeroId),
      highlightLine: mock.highlightLine,
      reviewSnapshot: null
    });
  }
  return rows.slice(0, 10);
}

function createTvResultBadge(result) {
  const badge = document.createElement("span");
  const normalized = normalizeHistoryResult(result);
  badge.className = `tv-result-badge ${normalized === "WIN" ? "tv-result-win" : normalized === "LOSS" ? "tv-result-loss" : "tv-result-draw"}`;
  badge.textContent = normalized;
  return badge;
}

function createTvHeroLine(name, heroId) {
  const row = document.createElement("div");
  row.className = "tv-player-line";
  const icon = document.createElement("span");
  icon.className = "avatar-art tv-hero-art";
  renderAvatar(icon, heroId);
  const text = document.createElement("p");
  text.className = "tv-player-name";
  text.textContent = String(name || "Player");
  row.appendChild(icon);
  row.appendChild(text);
  return row;
}

function renderTvLiveTab(content) {
  TV_LIVE_MATCHES.forEach((match) => {
    const card = document.createElement("article");
    card.className = "tv-live-card";

    const top = document.createElement("div");
    top.className = "tv-live-top";
    const league = document.createElement("p");
    league.className = "tv-live-league";
    league.textContent = `${match.league} League`;
    const live = document.createElement("span");
    live.className = "tv-live-badge";
    live.textContent = "LIVE";
    top.appendChild(league);
    top.appendChild(live);
    card.appendChild(top);

    card.appendChild(createTvHeroLine(match.playerA, match.heroA));
    const vs = document.createElement("p");
    vs.className = "tv-player-vs";
    vs.textContent = "vs";
    card.appendChild(vs);
    card.appendChild(createTvHeroLine(match.playerB, match.heroB));

    const watch = document.createElement("button");
    watch.type = "button";
    watch.className = "btn btn-secondary tv-live-watch-btn";
    watch.dataset.tvAction = "live-watch";
    watch.textContent = "Watch";
    card.appendChild(watch);
    content.appendChild(card);
  });
}

function renderTvHighlightsTab(content) {
  TV_HIGHLIGHTS.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "tv-highlight-card";
    const title = document.createElement("p");
    title.className = "tv-highlight-title";
    title.textContent = entry.title;
    const matchup = document.createElement("p");
    matchup.className = "tv-highlight-matchup";
    matchup.textContent = entry.matchup;
    const line = document.createElement("p");
    line.className = "tv-highlight-line";
    line.textContent = entry.line;
    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "btn btn-secondary tv-highlight-replay-btn";
    replay.dataset.tvAction = "highlight-replay";
    replay.textContent = "Replay";
    card.appendChild(title);
    card.appendChild(matchup);
    card.appendChild(line);
    card.appendChild(replay);
    content.appendChild(card);
  });
}

function renderTvHistoryRow(content, row) {
  const card = document.createElement("article");
  card.className = "tv-history-row";

  const top = document.createElement("div");
  top.className = "tv-history-row-top";
  top.appendChild(createTvResultBadge(row.result));
  const opponent = document.createElement("div");
  opponent.className = "tv-history-opponent";
  const hero = document.createElement("span");
  hero.className = "avatar-art tv-hero-art";
  renderAvatar(hero, row.opponentHeroId);
  const name = document.createElement("p");
  name.className = "tv-player-name";
  name.textContent = row.opponentName;
  opponent.appendChild(hero);
  opponent.appendChild(name);
  top.appendChild(opponent);
  card.appendChild(top);

  const meta = document.createElement("p");
  meta.className = "tv-history-meta";
  meta.textContent = `${getHeroMeta(row.opponentHeroId).displayName} - ${row.highlightLine}`;
  card.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "tv-history-actions";
  const review = document.createElement("button");
  review.type = "button";
  review.className = "btn btn-secondary tv-history-btn";
  review.dataset.tvAction = "history-review";
  review.dataset.historyId = row.id;
  review.textContent = "Review";
  const replay = document.createElement("button");
  replay.type = "button";
  replay.className = "btn btn-secondary tv-history-btn tv-row-btn-disabled";
  replay.dataset.tvAction = "history-replay";
  replay.setAttribute("aria-disabled", "true");
  replay.textContent = "Replay";
  actions.appendChild(review);
  actions.appendChild(replay);
  card.appendChild(actions);

  content.appendChild(card);
}

function renderTvHistoryTab(content) {
  const recentTitle = document.createElement("h3");
  recentTitle.className = "tv-section-title";
  recentTitle.textContent = "Your Recent Matches";
  content.appendChild(recentTitle);

  const historyRows = getTvHistoryRows();
  historyRows.forEach((row) => renderTvHistoryRow(content, row));

  const communityTitle = document.createElement("h3");
  communityTitle.className = "tv-section-title";
  communityTitle.textContent = "Community Picks";
  content.appendChild(communityTitle);

  const community = document.createElement("div");
  community.className = "tv-community-grid";
  TV_COMMUNITY_MATCHES.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "tv-community-row";
    const top = document.createElement("div");
    top.className = "tv-history-row-top";
    top.appendChild(createTvResultBadge(entry.result));
    const opponent = document.createElement("div");
    opponent.className = "tv-history-opponent";
    const hero = document.createElement("span");
    hero.className = "avatar-art tv-hero-art";
    renderAvatar(hero, entry.opponentHeroId);
    const name = document.createElement("p");
    name.className = "tv-community-name";
    name.textContent = entry.opponentName;
    opponent.appendChild(hero);
    opponent.appendChild(name);
    top.appendChild(opponent);
    row.appendChild(top);

    const line = document.createElement("p");
    line.className = "tv-community-line";
    line.textContent = entry.highlightLine;
    row.appendChild(line);
    community.appendChild(row);
  });
  content.appendChild(community);
}

function renderTvTabContent() {
  if (!ui.tvTabContent) return;
  const activeTab = TV_TABS.includes(state.tv?.tab) ? state.tv.tab : "live";
  state.tv.tab = activeTab;
  ui.tvTabContent.innerHTML = "";

  if (ui.tvTabButtons && Array.isArray(ui.tvTabButtons)) {
    ui.tvTabButtons.forEach((button) => {
      const tab = String(button.dataset.tvTab || "").toLowerCase();
      const active = tab === activeTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  if (activeTab === "live") {
    renderTvLiveTab(ui.tvTabContent);
    return;
  }
  if (activeTab === "highlights") {
    renderTvHighlightsTab(ui.tvTabContent);
    return;
  }
  renderTvHistoryTab(ui.tvTabContent);
}

function openHistoryReviewById(historyId, anchor = null) {
  const entry = Array.isArray(state.matchHistory) ? state.matchHistory.find((item) => item && item.id === historyId) : null;
  if (!entry || !entry.reviewSnapshot) {
    showInlineHintNearElement(anchor, "Review coming soon for past matches.");
    return;
  }
  state.postGameReview = normalizePostGameReviewSnapshot(entry.reviewSnapshot);
  state.screen = APP_SCREENS.review;
  updateUI();
}

function updateUI() {
  const map = {
    [APP_SCREENS.splash]: ui.splashScreen,
    [APP_SCREENS.home]: ui.homeScreen,
    [APP_SCREENS.collection]: ui.collectionScreen,
    [APP_SCREENS.mode]: ui.modeScreen,
    [APP_SCREENS.tv]: ui.tvScreen,
    [APP_SCREENS.friend]: ui.friendScreen,
    [APP_SCREENS.waiting]: ui.waitingScreen,
    [APP_SCREENS.game]: ui.gameScreen,
    [APP_SCREENS.result]: ui.resultScreen,
    [APP_SCREENS.review]: ui.reviewScreen
  };

  Object.entries(map).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle("active", state.screen === key);
  });

  const showBottomTabs =
    state.screen === APP_SCREENS.home ||
    state.screen === APP_SCREENS.collection ||
    state.screen === APP_SCREENS.tv;
  if (ui.bottomTabBar) ui.bottomTabBar.classList.toggle("hidden", !showBottomTabs);
  const activeBottomTab = state.screen === APP_SCREENS.collection ? "collection" : state.screen === APP_SCREENS.tv ? "community" : "home";
  if (ui.collectionBtn) {
    ui.collectionBtn.classList.toggle("is-active", activeBottomTab === "collection");
    ui.collectionBtn.setAttribute("aria-pressed", activeBottomTab === "collection" ? "true" : "false");
  }
  if (ui.homeTabBtn) {
    ui.homeTabBtn.classList.toggle("is-active", activeBottomTab === "home");
    ui.homeTabBtn.setAttribute("aria-pressed", activeBottomTab === "home" ? "true" : "false");
  }
  if (ui.communityTabBtn) {
    ui.communityTabBtn.classList.toggle("is-active", activeBottomTab === "community");
    ui.communityTabBtn.setAttribute("aria-pressed", activeBottomTab === "community" ? "true" : "false");
  }

  ui.playerNameInput.value = String(state.profile.name || "");
  ensureSelectedHeroUnlocked();
  ui.avatarPreviewLabel.textContent = getAvatarMeta(state.profile.heroId).displayName;
  renderAvatar(ui.avatarPreviewArt, state.profile.heroId);
  if (ui.leagueBadgeText) ui.leagueBadgeText.textContent = formatLeagueBadgeText();
  if (ui.leagueProgressCurrentText) ui.leagueProgressCurrentText.textContent = formatLeagueProgressText();

  const claimableRewards = getClaimableRewards();
  const hasClaimable = claimableRewards.length > 0;
  const hasClaimableHero = hasClaimableHeroRewards();
  const claimedCount = Object.keys(state.progression.claimedRewardIds || {}).length;
  const canShowSecondaryDots = claimedCount > 0;
  if (ui.leagueBadgeDot) ui.leagueBadgeDot.classList.toggle("hidden", !hasClaimable);
  if (ui.collectionBtnDot) ui.collectionBtnDot.classList.toggle("hidden", !(canShowSecondaryDots && hasClaimable));
  if (ui.avatarPreviewDot) ui.avatarPreviewDot.classList.toggle("hidden", !(canShowSecondaryDots && hasClaimableHero));
  if (ui.leagueBadgeBtn) ui.leagueBadgeBtn.classList.toggle("has-notice", hasClaimable);
  if (ui.collectionBtn) ui.collectionBtn.classList.toggle("has-notice", canShowSecondaryDots && hasClaimable);
  if (ui.backToMenuBtn) {
    ui.backToMenuBtn.textContent = hasClaimable ? "Unlock new reward!" : "Back to Menu";
    ui.backToMenuBtn.classList.toggle("result-unlock-cta", state.screen === APP_SCREENS.result && hasClaimable);
  }
  if (ui.claimAllRewardsBtn) {
    ui.claimAllRewardsBtn.disabled = !hasClaimable;
    ui.claimAllRewardsBtn.textContent = hasClaimable ? `Claim All (${claimableRewards.length})` : "Claim All";
  }
  if (ui.cheatUnlockBtn) {
    const resetMode = shouldShowDemoResetButton();
    if (resetMode) {
      ui.cheatUnlockBtn.textContent = "Reset Progression (Demo Only)";
      ui.cheatUnlockBtn.disabled = false;
    } else {
      const canUseCheat = (Number(state.progression.matchesCompleted) || 0) >= 1;
      ui.cheatUnlockBtn.textContent = "Cheat Unlock (Demo Only)";
      ui.cheatUnlockBtn.disabled = !canUseCheat;
    }
  }
  renderAvatarChoices();
  renderLeagueProgressTrack();
  renderCollectionList();
  renderTvTabContent();
  if (ui.collectionTabs && Array.isArray(ui.collectionTabs)) {
    ui.collectionTabs.forEach((tabButton) => {
      const tab = (tabButton.dataset.tab || "").toLowerCase();
      const active = tab === state.collection.tab;
      tabButton.classList.toggle("active", active);
      tabButton.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  if (ui.rankedBtn) {
    ui.rankedBtn.classList.add("mode-btn-disabled");
    ui.rankedBtn.setAttribute("aria-disabled", "true");
    ui.rankedBtn.textContent = "Ranked";
    ui.rankedBtn.dataset.progressUnlocked = isRankedProgressionUnlocked() ? "true" : "false";
  }

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
  const rogueSwapMode = isRogueSwapPhase();
  const swapMode = draftMode || rogueSwapMode;
  const localDraftPending =
    isDraftSelectionPhase() &&
    Boolean(state.draft) &&
    Boolean(state.localSlot) &&
    !Boolean(state.draft.accepted[state.localSlot]);
  const localRogueSwapPending =
    rogueSwapMode &&
    Boolean(state.rogueSwap) &&
    state.rogueSwap.actorSlot === state.localSlot &&
    !state.rogueSwap.pendingFinalize;
  const hideDraftOpponentPanel =
    (draftMode && localDraftPending) || (rogueSwapMode && state.rogueSwap.actorSlot === topSlot);

  ui.topNameText.textContent = slotName(topSlot);
  ui.bottomNameText.textContent = slotName(bottomSlot);
  if (ui.topDemonBadge) {
    const showDemonBadge = Boolean(state.mode === "bot" && state.ai && state.ai.demonActive && topSlot === "bot");
    ui.topDemonBadge.classList.toggle("hidden", !showDemonBadge);
  }
  renderStatsForSlot(ui.topStatsText, topSlot);
  renderStatsForSlot(ui.bottomStatsText, bottomSlot);

  renderAvatar(ui.topAvatar, state.slots[topSlot].heroId);
  renderAvatar(ui.bottomAvatar, state.slots[bottomSlot].heroId);
  if (ui.topAvatar) ui.topAvatar.setAttribute("aria-label", `Opponent Hero: ${getHeroMeta(state.slots[topSlot].heroId).displayName}`);
  if (ui.bottomAvatar) ui.bottomAvatar.setAttribute("aria-label", `Your Hero: ${getHeroMeta(state.slots[bottomSlot].heroId).displayName}`);
  ui.topPanel.classList.toggle("draft-opponent-hidden", hideDraftOpponentPanel);
  ui.topPanel.dataset.hiddenText =
    rogueSwapMode && hideDraftOpponentPanel
      ? "HIDDEN\nOpponent Hero is swapping"
      : hideDraftOpponentPanel && state.mode === "friend" && net.connectedCount < 2
      ? "HIDDEN\nWaiting for opponent..."
      : hideDraftOpponentPanel
        ? "HIDDEN\nReveal after you press ACCEPT"
        : "";

  ui.appRoot.classList.toggle("draft-open", swapMode);
  ui.appRoot.classList.toggle("draft-local-pending", localDraftPending || localRogueSwapPending);
  ui.roundLabel.textContent = draftMode
    ? "DRAFT PHASE"
    : rogueSwapMode
      ? "ROGUE SWAP"
    : `ROUND ${Math.min(state.round, MATCH_SETTINGS.MAX_ROUNDS)}/${MATCH_SETTINGS.MAX_ROUNDS}`;
  const gameEventMeta = getGameEventMeta(state.gameEventId);
  if (ui.gameEventBanner) {
    ui.gameEventBanner.textContent = `Game Event: ${gameEventMeta.name}`;
    ui.gameEventBanner.setAttribute("aria-label", `Game Event details: ${gameEventMeta.name}`);
  }
  ui.timerText.textContent = state.timer.mode ? `${state.timer.remaining}s` : "--";
  ui.turnIndicator.textContent = getTurnIndicatorText();
  const turnTone = getTurnIndicatorTone();
  ui.turnIndicator.classList.toggle("turn-indicator--your-turn", turnTone === "your-turn");
  ui.turnIndicator.classList.toggle("turn-indicator--your-decision", turnTone === "your-decision");
  ui.turnIndicator.classList.toggle("turn-indicator--opponent-turn", turnTone === "opponent-turn");
  ui.turnIndicator.classList.toggle("turn-indicator--neutral", turnTone === "neutral");
  ui.turnIndicator.classList.toggle("draft-instruction", localDraftPending || localRogueSwapPending);
  renderCurrentActionTypewriter(state.currentActionText);

  const activeTurnSlot = getActiveTurnSlot();
  ui.topPanel.classList.toggle("turn-active", activeTurnSlot === topSlot);
  ui.bottomPanel.classList.toggle("turn-active", activeTurnSlot === bottomSlot);
  const claimActorSlot = state.phase === PHASES.awaitingResponse && state.pendingAction ? state.pendingAction.actor : null;
  ui.topPanel.classList.toggle("claim-source-active", claimActorSlot === topSlot);
  ui.bottomPanel.classList.toggle("claim-source-active", claimActorSlot === bottomSlot);

  const canLocalAct =
    state.screen === APP_SCREENS.game &&
    !swapMode &&
    state.phase === PHASES.choosingAction &&
    state.currentActor === state.localSlot &&
    !state.friend.pendingRequest;
  const inLocalDecision =
    state.screen === APP_SCREENS.game &&
    state.phase === PHASES.awaitingResponse &&
    state.pendingResponder === state.localSlot &&
    !state.friend.pendingRequest;
  const localTurnLocked = state.screen === APP_SCREENS.game && !swapMode && !canLocalAct && !inLocalDecision;
  const localSwapLocked = state.screen === APP_SCREENS.game && swapMode;

  setActionDescriptions();
  const canUseStrike = canLocalAct && state.players[state.localSlot].gold >= BASIC_ACTIONS.STRIKE.cost;
  ui.interestBtn.disabled = false;
  ui.strikeBtn.disabled = false;
  ui.interestBtn.classList.toggle("is-disabled", !canLocalAct && !inLocalDecision);
  ui.strikeBtn.classList.toggle("is-disabled", (!canUseStrike && !inLocalDecision) || localTurnLocked);
  ui.interestBtn.setAttribute("aria-disabled", canLocalAct ? "false" : "true");
  ui.strikeBtn.setAttribute("aria-disabled", canUseStrike ? "false" : "true");
  ui.bottomPanel.classList.toggle("actions-locked", localTurnLocked || localSwapLocked);

  const showDraftAccept =
    state.screen === APP_SCREENS.game &&
    ((isDraftSelectionPhase() && Boolean(state.draft) && Boolean(state.localSlot)) ||
      (rogueSwapMode && state.rogueSwap.actorSlot === state.localSlot));
  ui.draftAcceptBtn.classList.toggle("hidden", !showDraftAccept);
  if (showDraftAccept) {
    if (rogueSwapMode && state.rogueSwap.actorSlot === state.localSlot) {
      const waiting = Boolean(state.rogueSwap.pendingFinalize) || state.friend.pendingRequest === "rogueSwap";
      ui.draftAcceptBtn.disabled = waiting;
      ui.draftAcceptBtn.textContent = waiting ? "WAITING..." : "ACCEPT";
      ui.draftAcceptBtn.classList.toggle("draft-accept-attention", !waiting);
    } else {
      const accepted = Boolean(state.draft.accepted[state.localSlot]);
      ui.draftAcceptBtn.disabled = accepted;
      ui.draftAcceptBtn.textContent = accepted ? "WAITING..." : "ACCEPT";
      ui.draftAcceptBtn.classList.toggle("draft-accept-attention", !accepted);
    }
  } else {
    ui.draftAcceptBtn.disabled = false;
    ui.draftAcceptBtn.textContent = "ACCEPT";
    ui.draftAcceptBtn.classList.remove("draft-accept-attention");
  }

  renderCardsForSlot(ui.topCards, topSlot, false);
  renderCardsForSlot(ui.bottomCards, bottomSlot, canLocalAct);
  ui.bottomCards.classList.toggle("draft-needs-accept", localDraftPending || localRogueSwapPending);

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
  renderAvatar(ui.resultLocalAvatar, state.slots[localSlot].heroId);
  renderAvatar(ui.resultOpponentAvatar, state.slots[opponentSlot].heroId);
  renderPostGameReview();
  handleScreenTransitionAnimations();
  syncGameEventTooltip();
  syncHeroTooltip();
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
  if (modalNode === ui.matchOnboardingModal) stopOnboardingTypewriter();
  if (modalNode === ui.firstMatchGuideModal) {
    clearFirstMatchDecisionGuideDelay();
    document.body.classList.remove("first-guide-active");
    if (ui.appRoot) ui.appRoot.classList.remove("first-guide-active");
    clearGuideSpotlights();
    if (uiRuntime.guidePulseTimerId) {
      clearTimeout(uiRuntime.guidePulseTimerId);
      uiRuntime.guidePulseTimerId = null;
    }
    if (ui.acceptBtn) ui.acceptBtn.classList.remove("first-guide-pulse");
    if (ui.challengeBtn) ui.challengeBtn.classList.remove("first-guide-pulse");
  }
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

function stopOnboardingTypewriter() {
  if (uiRuntime.onboardingTypeTimerId) {
    clearTimeout(uiRuntime.onboardingTypeTimerId);
    uiRuntime.onboardingTypeTimerId = null;
  }
}

function typeOnboardingText(text) {
  if (!ui.matchOnboardingBody) return;
  const nextText = String(text || "");
  uiRuntime.onboardingTypeToken += 1;
  const token = uiRuntime.onboardingTypeToken;
  stopOnboardingTypewriter();
  if (!nextText) {
    ui.matchOnboardingBody.textContent = "";
    return;
  }

  ui.matchOnboardingBody.textContent = "";
  let index = 0;
  const step = () => {
    if (token !== uiRuntime.onboardingTypeToken) return;
    index += 1;
    ui.matchOnboardingBody.textContent = nextText.slice(0, index);
    if (index >= nextText.length) {
      uiRuntime.onboardingTypeTimerId = null;
      return;
    }
    uiRuntime.onboardingTypeTimerId = setTimeout(step, 22);
  };
  uiRuntime.onboardingTypeTimerId = setTimeout(step, 22);
}

function getOnboardingCardsForStep(stepIndex) {
  const step = MATCH_ONBOARDING_STEPS[stepIndex] || MATCH_ONBOARDING_STEPS[0];
  const localSlot = state.localSlot || "human";
  const cards = Array.isArray(state.players[localSlot].cards) ? state.players[localSlot].cards : [];
  return cards
    .map((card, index) => ({ ...card, index }))
    .filter((card) => Boolean(card.isReal) === Boolean(step.filterReal));
}

function renderMatchOnboardingCards(stepIndex) {
  if (!ui.matchOnboardingCards) return;
  ui.matchOnboardingCards.innerHTML = "";
  const localSlot = state.localSlot || "human";
  const cards = getOnboardingCardsForStep(stepIndex);
  const fragment = document.createDocumentFragment();

  cards.forEach((card) => {
    const node = createRoleCardNode({
      ownerSlot: localSlot,
      card,
      cardIndex: card.index,
      asButton: false,
      disabled: false
    });
    node.classList.add("onboarding-role-card");
    fragment.appendChild(node);
  });

  if (cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No cards in this category.";
    fragment.appendChild(empty);
  }

  ui.matchOnboardingCards.appendChild(fragment);
}

function isMatchOnboardingReadyToStart() {
  if (state.mode !== "friend") return true;
  return Boolean(state.matchOnboarding.readyBySlot.human && state.matchOnboarding.readyBySlot.bot);
}

function maybeStartMatchAfterOnboarding() {
  if (state.phase !== PHASES.gameStart) return;
  if (!isMatchOnboardingReadyToStart()) return;
  setCurrentAction("Match start.");
  updateUI();
  setTimeout(() => {
    if (state.screen === APP_SCREENS.game && state.phase !== PHASES.matchEnd) beginTurn();
  }, 220);
}

function applyCanonicalOnboardingReady(payload) {
  if (!payload || state.screen !== APP_SCREENS.game) return;
  const actorSlot = payload.actorSlot === "bot" ? "bot" : "human";
  if (!state.matchOnboarding) state.matchOnboarding = createMatchOnboardingState();
  state.matchOnboarding.readyBySlot[actorSlot] = true;
  state.friend.pendingRequest = null;
  if (!isMatchOnboardingReadyToStart()) {
    if (actorSlot === state.localSlot) setCurrentAction("Waiting for opponent onboarding...");
    updateUI();
    return;
  }
  maybeStartMatchAfterOnboarding();
}

async function submitLocalMatchOnboardingReady() {
  const localSlot = state.localSlot || "human";
  if (!state.matchOnboarding) state.matchOnboarding = createMatchOnboardingState();
  if (state.matchOnboarding.readyBySlot[localSlot]) {
    maybeStartMatchAfterOnboarding();
    return;
  }

  if (state.mode === "friend") {
    if (net.role === "host") {
      await net.sendEvent(
        "ACTION",
        {
          kind: "ONBOARDING_READY",
          actorSlot: localSlot
        },
        {
          canonical: true,
          actorId: state.slots[localSlot] ? state.slots[localSlot].id : net.playerId,
          applyLocal: true
        }
      );
      return;
    }

    state.friend.pendingRequest = "onboarding";
    updateUI();
    await net.sendEvent(
      "ACTION",
      {
        kind: "ONBOARDING_READY",
        actorSlot: localSlot,
        requestId: `${net.playerId}-${Date.now()}-onb`
      },
      {
        actorId: state.slots[localSlot] ? state.slots[localSlot].id : net.playerId,
        seq: 0
      }
    );
    return;
  }

  state.matchOnboarding.readyBySlot[localSlot] = true;
  state.matchOnboarding.readyBySlot[opponentOf(localSlot)] = true;
  maybeStartMatchAfterOnboarding();
}

function renderMatchOnboardingStep() {
  if (!ui.matchOnboardingModal || !ui.matchOnboardingTitle || !ui.matchOnboardingBody || !ui.matchOnboardingNextBtn) {
    void submitLocalMatchOnboardingReady();
    return;
  }
  if (!state.matchOnboarding) state.matchOnboarding = createMatchOnboardingState();
  const index = clamp(Number(state.matchOnboarding.stepIndex) || 0, 0, MATCH_ONBOARDING_STEPS.length - 1);
  state.matchOnboarding.stepIndex = index;
  const step = MATCH_ONBOARDING_STEPS[index];
  ui.matchOnboardingTitle.textContent = step.title;
  ui.matchOnboardingNextBtn.textContent = step.button;
  renderMatchOnboardingCards(index);
  typeOnboardingText(step.body);
}

async function advanceMatchOnboardingStep() {
  if (!state.matchOnboarding) state.matchOnboarding = createMatchOnboardingState();
  if (state.matchOnboarding.stepIndex < MATCH_ONBOARDING_STEPS.length - 1) {
    state.matchOnboarding.stepIndex += 1;
    renderMatchOnboardingStep();
    return;
  }
  state.matchOnboarding.open = false;
  closeModal(ui.matchOnboardingModal);
  stopOnboardingTypewriter();
  updateUI();
  await submitLocalMatchOnboardingReady();
}

function openMatchOnboarding() {
  if (!state.matchOnboarding) state.matchOnboarding = createMatchOnboardingState();
  state.matchOnboarding.open = true;
  state.matchOnboarding.stepIndex = 0;
  state.matchOnboarding.readyBySlot = { human: false, bot: false };
  if (ui.matchOnboardingModal instanceof HTMLElement) {
    openModal(ui.matchOnboardingModal);
    renderMatchOnboardingStep();
    return;
  }
  void submitLocalMatchOnboardingReady();
}

function clearFirstMatchDecisionGuideDelay() {
  if (uiRuntime.firstGuideDecisionDelayTimerId) {
    clearTimeout(uiRuntime.firstGuideDecisionDelayTimerId);
    uiRuntime.firstGuideDecisionDelayTimerId = null;
  }
}

function getFirstMatchCardSpotlightSelectors(filterReal) {
  const selectors = [];
  const slot = state.localSlot || "human";
  const cards = Array.isArray(state.players[slot] && state.players[slot].cards) ? state.players[slot].cards : [];
  cards.forEach((card, index) => {
    if (!card) return;
    if (Boolean(card.isReal) !== Boolean(filterReal)) return;
    selectors.push(`#bottomCards button[data-card-index="${index}"]`);
  });
  return selectors;
}

function getFirstMatchGuideSpotlightSelectors(step) {
  if (!step) return [];
  if (step.spotlightKind === "real-cards") {
    const selectors = getFirstMatchCardSpotlightSelectors(true);
    return selectors.length > 0 ? selectors : ["#bottomCards"];
  }
  if (step.spotlightKind === "bluff-cards") {
    const selectors = getFirstMatchCardSpotlightSelectors(false);
    return selectors.length > 0 ? selectors : ["#bottomCards"];
  }
  return Array.isArray(step.spotlightSelectors) ? step.spotlightSelectors : [];
}

function clearGuideSpotlights() {
  document.querySelectorAll(".guide-spotlight").forEach((node) => node.classList.remove("guide-spotlight"));
}

function applyGuideSpotlights(selectors = []) {
  clearGuideSpotlights();
  selectors.forEach((selector) => {
    if (!selector) return;
    document.querySelectorAll(selector).forEach((node) => node.classList.add("guide-spotlight"));
  });
}

function renderFirstMatchGuideOverlay() {
  if (!ui.firstMatchGuideModal || !ui.firstMatchGuideTitle || !ui.firstMatchGuideBody || !ui.firstMatchGuideNextBtn) return;
  const guide = state.firstMatchGuide || createFirstMatchGuideState();
  if (guide.overlayMode === "nice") {
    ui.firstMatchGuideTitle.textContent = FIRST_MATCH_NICE_OVERLAY.title;
    ui.firstMatchGuideBody.textContent = FIRST_MATCH_NICE_OVERLAY.body;
    ui.firstMatchGuideNextBtn.textContent = FIRST_MATCH_NICE_OVERLAY.button;
    applyGuideSpotlights([]);
    return;
  }
  if (guide.overlayMode === "decision") {
    ui.firstMatchGuideTitle.textContent = FIRST_MATCH_DECISION_OVERLAY.title;
    ui.firstMatchGuideBody.textContent = FIRST_MATCH_DECISION_OVERLAY.body;
    ui.firstMatchGuideNextBtn.textContent = FIRST_MATCH_DECISION_OVERLAY.button;
    applyGuideSpotlights(["#acceptBtn", "#challengeBtn"]);
    return;
  }
  if (guide.overlayMode === "final") {
    ui.firstMatchGuideTitle.textContent = FIRST_MATCH_FINAL_OVERLAY.title;
    ui.firstMatchGuideBody.textContent = FIRST_MATCH_FINAL_OVERLAY.body;
    ui.firstMatchGuideNextBtn.textContent = FIRST_MATCH_FINAL_OVERLAY.button;
    applyGuideSpotlights([]);
    return;
  }
  const step = FIRST_MATCH_GUIDE_STEPS[clamp(Number(guide.stepIndex) || 0, 0, FIRST_MATCH_GUIDE_STEPS.length - 1)];
  ui.firstMatchGuideTitle.textContent = step.title;
  ui.firstMatchGuideBody.textContent = step.body;
  ui.firstMatchGuideNextBtn.textContent = step.button;
  applyGuideSpotlights(getFirstMatchGuideSpotlightSelectors(step));
}

function openFirstMatchGuideOverlay(mode) {
  if (!isFirstScriptedBotMatchActive()) return;
  if (!(ui.firstMatchGuideModal instanceof HTMLElement)) return;
  state.firstMatchGuide.active = true;
  state.firstMatchGuide.overlayMode = mode;
  document.body.classList.add("first-guide-active");
  if (ui.appRoot) ui.appRoot.classList.add("first-guide-active");
  openModal(ui.firstMatchGuideModal);
  renderFirstMatchGuideOverlay();
}

function openFirstMatchIntroGuide() {
  if (!isFirstScriptedBotMatchActive()) {
    openMatchOnboarding();
    return;
  }
  state.firstMatchGuide.stepIndex = 0;
  openFirstMatchGuideOverlay("intro");
}

function pulseFirstMatchDecisionButtons() {
  if (!ui.acceptBtn || !ui.challengeBtn) return;
  ui.acceptBtn.classList.remove("first-guide-pulse");
  ui.challengeBtn.classList.remove("first-guide-pulse");
  void ui.acceptBtn.offsetWidth;
  ui.acceptBtn.classList.add("first-guide-pulse");
  if (uiRuntime.guidePulseTimerId) clearTimeout(uiRuntime.guidePulseTimerId);
  uiRuntime.guidePulseTimerId = setTimeout(() => {
    ui.acceptBtn.classList.add("first-guide-pulse");
    ui.challengeBtn.classList.add("first-guide-pulse");
    uiRuntime.guidePulseTimerId = setTimeout(() => {
      ui.acceptBtn.classList.remove("first-guide-pulse");
      ui.challengeBtn.classList.remove("first-guide-pulse");
      uiRuntime.guidePulseTimerId = null;
    }, 520);
  }, 280);
}

function openFirstMatchDecisionGuide() {
  if (!isFirstScriptedBotMatchActive()) return;
  if (state.firstMatchGuide.decisionOverlayShown) return;
  state.firstMatchGuide.decisionOverlayShown = true;
  clearFirstMatchDecisionGuideDelay();
  openFirstMatchGuideOverlay("decision");
}

function openFirstMatchFinalGuide() {
  if (!isFirstScriptedBotMatchActive()) return;
  if (state.firstMatchGuide.finalOverlayShown) return;
  state.firstMatchGuide.finalOverlayShown = true;
  openFirstMatchGuideOverlay("final");
}

function openFirstMatchNiceGuide() {
  if (!isFirstScriptedBotMatchActive()) return;
  if (state.firstMatchGuide.niceOverlayShown) return;
  state.firstMatchGuide.niceOverlayShown = true;
  openFirstMatchGuideOverlay("nice");
}

function scheduleFirstMatchDecisionGuide() {
  if (!isFirstScriptedBotMatchActive()) return;
  if (state.firstMatchGuide.decisionOverlayShown) return;
  clearFirstMatchDecisionGuideDelay();
  uiRuntime.firstGuideDecisionDelayTimerId = setTimeout(() => {
    uiRuntime.firstGuideDecisionDelayTimerId = null;
    if (!isFirstScriptedBotMatchActive()) return;
    if (state.phase !== PHASES.awaitingResponse || state.pendingResponder !== "human") return;
    const action = state.pendingAction;
    if (!action || action.actor !== "bot" || action.kind !== "role") return;
    if (state.firstMatchGuide.decisionOverlayShown) return;
    openFirstMatchDecisionGuide();
    updateUI();
  }, 1000);
}

function ensureFirstMatchBotKnightBluff() {
  if (!isFirstScriptedBotMatchActive()) return;
  const cards = state.players.bot && Array.isArray(state.players.bot.cards) ? state.players.bot.cards : [];
  if (cards.length === 0) return;
  const existing = cards.find((card) => card && !card.isReal && card.role === "KNIGHT");
  if (existing) return;

  let target = cards.find((card) => card && !card.isReal);
  if (!target) target = cards[0] || null;
  if (!target) return;

  target.role = "KNIGHT";
  target.isReal = false;
  target.revealedUsed = false;
  target.confirmed = false;
  target.verification = null;
  applyCardRoleDefaults(target, target.role);
  syncPlayerRoleLists("bot");
}

function advanceFirstMatchGuideOverlay() {
  if (!isFirstScriptedBotMatchActive()) return;
  if (!state.firstMatchGuide.active) return;
  const mode = state.firstMatchGuide.overlayMode || "intro";

  clearFirstMatchDecisionGuideDelay();

  if (mode === "nice") {
    state.firstMatchGuide.active = false;
    closeModal(ui.firstMatchGuideModal);
    clearGuideSpotlights();
    updateUI();
    if (state.phase === PHASES.choosingAction && state.currentActor === "bot" && state.mode === "bot") {
      clearTimer();
      void botTakeTurn();
    }
    return;
  }

  if (mode === "decision") {
    state.firstMatchGuide.active = false;
    closeModal(ui.firstMatchGuideModal);
    clearGuideSpotlights();
    pulseFirstMatchDecisionButtons();
    updateUI();
    return;
  }

  if (mode === "final") {
    state.firstMatchGuide.active = false;
    closeModal(ui.firstMatchGuideModal);
    clearGuideSpotlights();
    updateUI();
    advanceToNextAction();
    return;
  }

  if (state.firstMatchGuide.stepIndex < FIRST_MATCH_GUIDE_STEPS.length - 1) {
    state.firstMatchGuide.stepIndex += 1;
    renderFirstMatchGuideOverlay();
    return;
  }

  state.firstMatchGuide.active = false;
  closeModal(ui.firstMatchGuideModal);
  clearGuideSpotlights();
  updateUI();
  void submitLocalMatchOnboardingReady();
}

function setTutorialCardStatusTag(node, isReal) {
  const refs = ensureCardBadgeRow(node);
  if (!refs) return;
  const { badgeLeft } = refs;
  badgeLeft.querySelectorAll(".card-status-tag").forEach((tag) => tag.remove());

  const statusTag = document.createElement("span");
  statusTag.className = `card-badge card-status-tag ${isReal ? "card-real-tag" : "card-tutorial-fake-tag"}`;
  statusTag.textContent = isReal ? "REAL" : "BLUFF";
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

function hideInlineHintTooltip() {
  if (uiRuntime.inlineHintTimerId) {
    clearTimeout(uiRuntime.inlineHintTimerId);
    uiRuntime.inlineHintTimerId = null;
  }
  if (ui.inlineHintTooltip) ui.inlineHintTooltip.classList.add("hidden");
}

function showInlineHintNearElement(anchor, message) {
  const text = String(message || "").trim();
  if (!text) return;
  if (!ui.inlineHintTooltip || !(anchor instanceof HTMLElement)) {
    showActionToast(text);
    return;
  }
  hideInlineHintTooltip();
  ui.inlineHintTooltip.textContent = text;
  ui.inlineHintTooltip.classList.remove("hidden");

  const tooltipRect = ui.inlineHintTooltip.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const top = Math.max(8, anchorRect.top - tooltipRect.height - 8);
  const left = clamp(
    anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2,
    8,
    window.innerWidth - tooltipRect.width - 8
  );
  ui.inlineHintTooltip.style.left = `${left}px`;
  ui.inlineHintTooltip.style.top = `${top}px`;

  uiRuntime.inlineHintTimerId = setTimeout(() => {
    ui.inlineHintTooltip.classList.add("hidden");
    uiRuntime.inlineHintTimerId = null;
  }, 1500);
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

  if (isRogueSwapCardSelectable(state.localSlot)) {
    const current = getRogueSwapSelections();
    const exists = current.includes(cardIndex);
    const next = exists ? current.filter((idx) => idx !== cardIndex) : [...current, cardIndex];
    setRogueSwapSelections(next);
    setCurrentAction(`Rogue swaps selected: ${normalizeDraftSelectionIndices(next).length}`);
    return;
  }

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
  const choice = target.closest("button[data-hero-id]");
  if (!(choice instanceof HTMLButtonElement)) return;

  const heroId = normalizeHeroId(choice.dataset.heroId || "adventurer");
  if (!isHeroUnlocked(heroId)) {
    showActionToast("Hero not unlocked yet.");
    return;
  }
  state.profile.heroId = heroId;
  if (state.mode !== "friend") {
    state.slots.human.heroId = heroId;
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

function handlePlayAgain() {
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
}

function bindEvents() {
  ui.homePlayBtn.addEventListener("click", () => {
    triggerPlayHapticFeedback();
    runToModeScreen();
  });
  if (ui.homeTabBtn) {
    ui.homeTabBtn.addEventListener("click", () => {
      state.screen = APP_SCREENS.home;
      updateUI();
    });
  }
  if (ui.collectionBtn) {
    ui.collectionBtn.addEventListener("click", () => {
      closeHeroTooltip();
      closeGameEventTooltip();
      state.screen = APP_SCREENS.collection;
      updateUI();
    });
  }
  if (ui.communityTabBtn) {
    ui.communityTabBtn.addEventListener("click", () => {
      state.screen = APP_SCREENS.tv;
      updateUI();
    });
  }
  if (ui.homeTvBtn) {
    ui.homeTvBtn.addEventListener("click", () => {
      openModal(ui.resetProgressModal);
    });
  }
  ui.premiumBtn.addEventListener("click", () => openModal(ui.premiumModal));

  ui.modeBackBtn.addEventListener("click", () => {
    state.screen = APP_SCREENS.home;
    updateUI();
  });
  if (ui.tvBackBtn) {
    ui.tvBackBtn.addEventListener("click", () => {
      state.screen = APP_SCREENS.home;
      updateUI();
    });
  }

  ui.friendBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.waitingBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.gameBackBtn.addEventListener("click", () => {
    void backToMenu();
  });

  ui.backToMenuBtn.addEventListener("click", async () => {
    const hasClaimable = getClaimableRewards().length > 0;
    if (state.screen === APP_SCREENS.result && hasClaimable) {
      await backToMenu();
      openModal(ui.leagueProgressModal);
      updateUI();
      if (ui.leagueProgressScroll) {
        const target = Math.max(0, ui.leagueProgressScroll.scrollHeight - ui.leagueProgressScroll.clientHeight);
        ui.leagueProgressScroll.scrollTo({ top: target, behavior: "smooth" });
      }
      return;
    }
    await backToMenu();
  });
  ui.shareResultBtn.addEventListener("click", (event) => {
    shareReviewHighlightImage(event.currentTarget);
  });
  if (ui.openGameReviewBtn) {
    ui.openGameReviewBtn.addEventListener("click", () => {
      ensurePostGameReviewReady();
      state.screen = APP_SCREENS.review;
      updateUI();
    });
  }
  if (ui.reviewShareBtn) {
    ui.reviewShareBtn.addEventListener("click", (event) => {
      shareReviewHighlightImage(event.currentTarget);
    });
  }
  if (ui.reviewPlayAgainBtn) {
    ui.reviewPlayAgainBtn.addEventListener("click", () => {
      handlePlayAgain();
    });
  }
  if (ui.reviewBackToMenuBtn) {
    ui.reviewBackToMenuBtn.addEventListener("click", () => {
      void backToMenu();
    });
  }

  ui.playBotBtn.addEventListener("click", () => startBotMatch());
  ui.playFriendBtn.addEventListener("click", () => {
    state.screen = APP_SCREENS.friend;
    state.friend.hostLink = "";
    state.friend.guestLink = "";
    state.friend.connectionStatus = "Idle";
    state.friend.errorMessage = "";
    updateUI();
  });
  ui.rankedBtn.addEventListener("click", () => {
    showActionToast("Coming soon");
  });
  ui.tournamentsBtn.addEventListener("click", () => {
    showActionToast("Coming soon");
  });
  ui.startTutorialBtn.addEventListener("click", () => {
    startBotMatch({ tutorialMatch: true });
  });
  if (ui.tvTabButtons && Array.isArray(ui.tvTabButtons)) {
    ui.tvTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = String(button.dataset.tvTab || "").toLowerCase();
        if (!TV_TABS.includes(tab)) return;
        state.tv.tab = tab;
        updateUI();
      });
    });
  }
  if (ui.tvTabContent) {
    ui.tvTabContent.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-tv-action]");
      if (!(button instanceof HTMLButtonElement)) return;
      const action = String(button.dataset.tvAction || "");
      if (action === "live-watch") {
        openModal(ui.tvWatchModal);
        return;
      }
      if (action === "highlight-replay" || action === "history-replay") {
        showInlineHintNearElement(button, "Replay coming soon.");
        return;
      }
      if (action === "history-review") {
        openHistoryReviewById(String(button.dataset.historyId || ""), button);
      }
    });
  }

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
    handlePlayAgain();
  });

  ui.rulesBtn.addEventListener("click", () => openModal(ui.rulesModal));
  ui.rulesCloseBtn.addEventListener("click", () => closeModal(ui.rulesModal));
  ui.premiumCloseBtn.addEventListener("click", () => closeModal(ui.premiumModal));
  if (ui.tvWatchModalCloseBtn) ui.tvWatchModalCloseBtn.addEventListener("click", () => closeModal(ui.tvWatchModal));
  ui.goPremiumBtn.addEventListener("click", () => showActionToast("Available soon"));
  ui.tutorialNextBtn.addEventListener("click", () => advanceTutorialStep());
  if (ui.matchOnboardingNextBtn) {
    ui.matchOnboardingNextBtn.addEventListener("click", () => {
      void advanceMatchOnboardingStep();
    });
  }
  if (ui.firstMatchGuideNextBtn) {
    ui.firstMatchGuideNextBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      advanceFirstMatchGuideOverlay();
    });
  }
  if (ui.firstMatchGuideModal) {
    ui.firstMatchGuideModal.addEventListener("click", () => {
      if (!isFirstScriptedBotMatchActive()) return;
      if (!state.firstMatchGuide || !state.firstMatchGuide.active) return;
      advanceFirstMatchGuideOverlay();
    });
  }
  ui.leagueProgressCloseBtn.addEventListener("click", () => closeModal(ui.leagueProgressModal));
  ui.leagueBadgeBtn.addEventListener("click", () => {
    closeHeroTooltip();
    closeGameEventTooltip();
    openModal(ui.leagueProgressModal);
    updateUI();
    if (ui.leagueProgressScroll) {
      const target = Math.max(0, ui.leagueProgressScroll.scrollHeight - ui.leagueProgressScroll.clientHeight);
      ui.leagueProgressScroll.scrollTo({ top: target, behavior: "smooth" });
    }
  });
  ui.claimAllRewardsBtn.addEventListener("click", () => {
    const claimedCount = claimAllRewards();
    if (claimedCount > 0) {
      showActionToast(`Claimed ${claimedCount} rewards.`);
      updateUI();
    }
  });
  if (ui.cheatUnlockBtn) {
    ui.cheatUnlockBtn.addEventListener("click", () => {
      if (shouldShowDemoResetButton()) {
        openModal(ui.resetProgressModal);
        return;
      }
      const didApply = applyDemoCheatUnlock();
      if (!didApply) return;
      showActionToast("Demo unlock applied.");
      updateUI();
    });
  }
  if (ui.resetProgressCancelBtn) {
    ui.resetProgressCancelBtn.addEventListener("click", () => closeModal(ui.resetProgressModal));
  }
  if (ui.resetProgressConfirmBtn) {
    ui.resetProgressConfirmBtn.addEventListener("click", () => {
      closeModal(ui.resetProgressModal);
      resetDemoProgressionState();
      updateUI();
    });
  }

  ui.collectionTabs.forEach((tabButton) => {
    tabButton.addEventListener("click", () => {
      const tab = (tabButton.dataset.tab || "").toLowerCase();
      if (!COLLECTION_TABS.includes(tab)) return;
      state.collection.tab = tab;
      updateUI();
    });
  });

  if (ui.leagueProgressTrack) {
    ui.leagueProgressTrack.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const claimButton = target.closest("button[data-claim-reward-id]");
      if (!(claimButton instanceof HTMLButtonElement)) return;
      const rewardId = claimButton.dataset.claimRewardId;
      if (!rewardId) return;
      const didClaim = claimReward(rewardId);
      if (didClaim) {
        showActionToast("Reward claimed.");
        updateUI();
      }
    });
  }

  ui.avatarPreviewBtn.addEventListener("click", () => openModal(ui.avatarModal));
  ui.avatarGrid.addEventListener("click", onAvatarChoice);

  const onHeroPortraitKeydown = (slotGetter) => (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleHeroTooltip(slotGetter());
  };
  if (ui.topAvatar) {
    ui.topAvatar.addEventListener("click", () => toggleHeroTooltip(opponentOf(state.localSlot)));
    ui.topAvatar.addEventListener("keydown", onHeroPortraitKeydown(() => opponentOf(state.localSlot)));
  }
  if (ui.bottomAvatar) {
    ui.bottomAvatar.addEventListener("click", () => toggleHeroTooltip(state.localSlot));
    ui.bottomAvatar.addEventListener("keydown", onHeroPortraitKeydown(() => state.localSlot));
  }
  if (ui.gameEventBanner) {
    ui.gameEventBanner.addEventListener("click", () => toggleGameEventTooltip());
    ui.gameEventBanner.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleGameEventTooltip();
      }
    });
  }

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
    if (isRogueSwapPhase()) {
      void submitLocalRogueSwapAccept();
      return;
    }
    void submitLocalDraftAccept(false);
  });

  ui.acceptBtn.addEventListener("click", () => submitLocalResponse("ACCEPT"));
  ui.challengeBtn.addEventListener("click", () => submitLocalResponse("CHALLENGE"));

  bindModalDismiss(ui.rulesModal, ui.rulesCloseBtn);
  bindModalDismiss(ui.avatarModal, ui.avatarModalCloseBtn);
  bindModalDismiss(ui.premiumModal, ui.premiumCloseBtn);
  bindModalDismiss(ui.tvWatchModal, ui.tvWatchModalCloseBtn);
  bindModalDismiss(ui.leagueProgressModal, ui.leagueProgressCloseBtn);
  bindModalDismiss(ui.resetProgressModal, null);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modalState.activeModal === ui.matchOnboardingModal) return;
    if (modalState.activeModal === ui.firstMatchGuideModal) return;
    if (state.gameEventTooltip.open) {
      closeGameEventTooltip();
      return;
    }
    if (state.heroTooltip.open) {
      closeHeroTooltip();
      return;
    }
    closeModal();
  });

  document.addEventListener("pointerdown", (event) => {
    if (state.gameEventTooltip.open) {
      const target = event.target;
      if (!(target instanceof Element)) {
        closeGameEventTooltip();
      } else if (!target.closest(".game-event-tooltip-card") && !target.closest("#gameEventBanner")) {
        closeGameEventTooltip();
      }
    }
    if (!state.heroTooltip.open) return;
    const target = event.target;
    if (!(target instanceof Element)) {
      closeHeroTooltip();
      return;
    }
    if (target.closest(".hero-tooltip-card")) return;
    if (target.closest("#topAvatar") || target.closest("#bottomAvatar")) return;
    closeHeroTooltip();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!canTriggerInvalidTapHint()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (isValidActionTapTarget(target)) return;
    triggerInvalidTapHint();
  });

  applyCanonicalFromLocalStartIfNeeded();
}

function cacheElements() {
  ui.appRoot = document.getElementById("appRoot");

  ui.splashScreen = document.getElementById("splashScreen");
  ui.homeScreen = document.getElementById("homeScreen");
  ui.collectionScreen = document.getElementById("collectionScreen");
  ui.modeScreen = document.getElementById("modeScreen");
  ui.tvScreen = document.getElementById("tvScreen");
  ui.friendScreen = document.getElementById("friendScreen");
  ui.waitingScreen = document.getElementById("waitingScreen");
  ui.gameScreen = document.getElementById("gameScreen");
  ui.resultScreen = document.getElementById("resultScreen");
  ui.reviewScreen = document.getElementById("reviewScreen");

  ui.homePlayBtn = document.getElementById("homePlayBtn");
  ui.premiumBtn = document.getElementById("premiumBtn");
  ui.leagueBadgeBtn = document.getElementById("leagueBadgeBtn");
  ui.leagueBadgeText = document.getElementById("leagueBadgeText");
  ui.leagueBadgeDot = document.getElementById("leagueBadgeDot");
  ui.bottomTabBar = document.getElementById("bottomTabBar");
  ui.collectionBtn = document.getElementById("collectionBtn");
  ui.collectionBtnDot = document.getElementById("collectionBtnDot");
  ui.homeTabBtn = document.getElementById("homeTabBtn");
  ui.communityTabBtn = document.getElementById("communityTabBtn");
  ui.homeTipText = document.getElementById("homeTipText");
  ui.homeTipDots = document.getElementById("homeTipDots");
  ui.homeTvBtn = document.getElementById("homeTvBtn");
  ui.playerNameInput = document.getElementById("playerNameInput");
  ui.avatarPreviewBtn = document.getElementById("avatarPreviewBtn");
  ui.avatarPreviewDot = document.getElementById("avatarPreviewDot");
  ui.avatarPreviewArt = document.getElementById("avatarPreviewArt");
  ui.avatarPreviewLabel = document.getElementById("avatarPreviewLabel");

  ui.modeBackBtn = document.getElementById("modeBackBtn");
  ui.tvBackBtn = document.getElementById("tvBackBtn");
  ui.tvTabButtons = Array.from(document.querySelectorAll("[data-tv-tab]"));
  ui.tvTabContent = document.getElementById("tvTabContent");
  ui.playBotBtn = document.getElementById("playBotBtn");
  ui.playFriendBtn = document.getElementById("playFriendBtn");
  ui.rankedBtn = document.getElementById("rankedBtn");
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
  ui.gameEventBanner = document.getElementById("gameEventBanner");
  ui.timerText = document.getElementById("timerText");
  ui.turnIndicator = document.getElementById("turnIndicator");
  ui.currentActionText = document.getElementById("currentActionText");
  ui.draftAcceptBtn = document.getElementById("draftAcceptBtn");

  ui.topPanel = document.getElementById("topPanel");
  ui.bottomPanel = document.getElementById("bottomPanel");
  ui.topAvatar = document.getElementById("topAvatar");
  ui.bottomAvatar = document.getElementById("bottomAvatar");
  ui.topNameText = document.getElementById("topNameText");
  ui.topDemonBadge = document.getElementById("topDemonBadge");
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
  ui.collectionList = document.getElementById("collectionList");
  ui.collectionTabs = Array.from(document.querySelectorAll("[data-collection-tab]"));
  ui.leagueProgressModal = document.getElementById("leagueProgressModal");
  ui.leagueProgressCloseBtn = document.getElementById("leagueProgressCloseBtn");
  ui.leagueProgressCurrentText = document.getElementById("leagueProgressCurrentText");
  ui.leagueProgressScroll = document.getElementById("leagueProgressScroll");
  ui.leagueProgressTrack = document.getElementById("leagueProgressTrack");
  ui.claimAllRewardsBtn = document.getElementById("claimAllRewardsBtn");
  ui.cheatUnlockBtn = document.getElementById("cheatUnlockBtn");
  ui.resetProgressModal = document.getElementById("resetProgressModal");
  ui.resetProgressCancelBtn = document.getElementById("resetProgressCancelBtn");
  ui.resetProgressConfirmBtn = document.getElementById("resetProgressConfirmBtn");

  ui.matchOnboardingModal = document.getElementById("matchOnboardingModal");
  ui.matchOnboardingTitle = document.getElementById("matchOnboardingTitle");
  ui.matchOnboardingBody = document.getElementById("matchOnboardingBody");
  ui.matchOnboardingCards = document.getElementById("matchOnboardingCards");
  ui.matchOnboardingNextBtn = document.getElementById("matchOnboardingNextBtn");
  ui.firstMatchGuideModal = document.getElementById("firstMatchGuideModal");
  ui.firstMatchGuideTitle = document.getElementById("firstMatchGuideTitle");
  ui.firstMatchGuideBody = document.getElementById("firstMatchGuideBody");
  ui.firstMatchGuideNextBtn = document.getElementById("firstMatchGuideNextBtn");

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
  ui.openGameReviewBtn = document.getElementById("openGameReviewBtn");
  ui.resultReviewCtaWrap = document.getElementById("resultReviewCtaWrap");
  ui.resultReviewBadge = document.getElementById("resultReviewBadge");
  ui.resultBottomActions = document.getElementById("resultBottomActions");
  ui.reviewBluffRing = document.getElementById("reviewBluffRing");
  ui.reviewChallengeRing = document.getElementById("reviewChallengeRing");
  ui.reviewOptimalRing = document.getElementById("reviewOptimalRing");
  ui.reviewBluffRateText = document.getElementById("reviewBluffRateText");
  ui.reviewChallengeAccuracyText = document.getElementById("reviewChallengeAccuracyText");
  ui.reviewOptimalDecisionsText = document.getElementById("reviewOptimalDecisionsText");
  ui.reviewFeedbackText = document.getElementById("reviewFeedbackText");
  ui.reviewHighlightsList = document.getElementById("reviewHighlightsList");
  ui.reviewMomentsTitle = document.getElementById("reviewMomentsTitle");
  ui.reviewFinalMessageText = document.getElementById("reviewFinalMessageText");
  ui.reviewShareBtn = document.getElementById("reviewShareBtn");
  ui.reviewPlayAgainBtn = document.getElementById("reviewPlayAgainBtn");
  ui.reviewBackToMenuBtn = document.getElementById("reviewBackToMenuBtn");

  ui.avatarModal = document.getElementById("avatarModal");
  ui.avatarModalCloseBtn = document.getElementById("avatarModalCloseBtn");
  ui.avatarGrid = ui.avatarModal ? ui.avatarModal.querySelector(".avatar-grid") : null;

  ui.rulesModal = document.getElementById("rulesModal");
  ui.rulesCloseBtn = document.getElementById("rulesCloseBtn");
  ui.rulesRoleList = document.getElementById("rulesRoleList");
  ui.premiumModal = document.getElementById("premiumModal");
  ui.premiumCloseBtn = document.getElementById("premiumCloseBtn");
  ui.goPremiumBtn = document.getElementById("goPremiumBtn");
  ui.tvWatchModal = document.getElementById("tvWatchModal");
  ui.tvWatchModalCloseBtn = document.getElementById("tvWatchModalCloseBtn");
  ui.copyToast = document.getElementById("copyToast");
  ui.actionToast = document.getElementById("actionToast");
  ui.inlineHintTooltip = document.getElementById("inlineHintTooltip");
  ui.heroTooltipOverlay = document.getElementById("heroTooltipOverlay");
  ui.heroTooltipTitle = document.getElementById("heroTooltipTitle");
  ui.heroTooltipText = document.getElementById("heroTooltipText");
  ui.gameEventTooltipOverlay = document.getElementById("gameEventTooltipOverlay");
  ui.gameEventTooltipTitle = document.getElementById("gameEventTooltipTitle");
  ui.gameEventTooltipText = document.getElementById("gameEventTooltipText");
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
  state.progression = loadProgressionStateFromStorage();
  state.matchesPlayedCount = loadMatchesPlayedCountFromStorage();
  state.matchHistory = loadMatchHistoryFromStorage();
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
  state.profile.heroId = normalizeOwnedHeroId(state.profile.heroId);
  state.slots.human = {
    id: net.playerId,
    name: state.profile.name,
    heroId: state.profile.heroId
  };

  state.screen = APP_SCREENS.splash;
  updateUI();
  await wait(UI_TIMINGS.splashIntroMs);

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


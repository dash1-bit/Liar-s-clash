"use strict";

(function initBotAiModule(globalScope) {
  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function toRate(numerator, denominator, fallback = 0.45) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return clamp(fallback, 0.05, 0.95);
    }
    return clamp(numerator / denominator, 0.05, 0.95);
  }

  function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
  }

  function getPhaseWeights(gameState, playerAggression) {
    const roundIndex = Math.max(1, Number(gameState.roundIndex) || 1);
    const lateGame = roundIndex >= 7;
    const damageWeight = lateGame ? 1.25 : 1.0;
    const selfDamageWeight = 1.2;
    const economyWeight = roundIndex <= 3 ? 0.35 * 1.25 : 0.35;
    const goldDenyWeight = 0.45;
    let tempoWeight = lateGame ? 1.1 : 0.9;
    let shieldWeight = 0.7;
    const revealWeight = lateGame ? 1.2 : 0.8;
    if (playerAggression >= 0.55) {
      tempoWeight *= 1.15;
      shieldWeight *= 1.15;
    }
    return {
      damageWeight,
      selfDamageWeight,
      economyWeight,
      goldDenyWeight,
      tempoWeight,
      shieldWeight,
      revealWeight
    };
  }

  function getRoleEffectProfile(role, gameState) {
    const normalized = normalizeRole(role);
    const botHp = Math.max(0, Number(gameState.botHP) || 0);
    const botGold = Math.max(0, Number(gameState.botGold) || 0);
    const oppHp = Math.max(0, Number(gameState.oppHP) || 0);
    const oppGold = Math.max(0, Number(gameState.oppGold) || 0);
    const botHasShield = Boolean(gameState.botHasShield);
    const apprenticeDamage = clamp(Number(gameState.apprenticeDamageHint) || 1, 1, 5);

    switch (normalized) {
      case "KNIGHT":
        return { damageOpp: 2, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "SIREN":
        return { damageOpp: 1, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 1, shield: 0, reveal: 0 };
      case "DWARF":
        return { damageOpp: 0, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 0, shield: botHasShield ? 0.1 : 1, reveal: 0 };
      case "GOBLIN":
        return { damageOpp: 0, selfDamage: 0, goldGain: oppGold > 0 ? 1 : 0, goldSteal: oppGold > 0 ? 1 : 0, skip: 0, shield: 0, reveal: 0 };
      case "ENT":
        return { damageOpp: 0, selfDamage: -2, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "PIRATE":
        return { damageOpp: 1, selfDamage: 0, goldGain: 1, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "SCIENTIST":
        return { damageOpp: 0, selfDamage: 0, goldGain: 1, goldSteal: 0, skip: 0, shield: 0, reveal: 1 };
      case "JOKER":
        return { damageOpp: 1, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0.2 };
      case "BERSERK":
        return { damageOpp: 2, selfDamage: 1, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "BANKER":
        return { damageOpp: 0, selfDamage: 0, goldGain: 1.6, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "ANGEL": {
        const swing = Math.abs(botHp - botGold) >= 2 ? 1.5 : 0.8;
        const threat = botHp <= 2 ? 0.9 : 0.4;
        return { damageOpp: swing, selfDamage: -threat, goldGain: 0.6, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      }
      case "VALK":
        return { damageOpp: 1, selfDamage: -1, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      case "APPRENTICE":
        return { damageOpp: apprenticeDamage, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
      default:
        return { damageOpp: 0, selfDamage: 0, goldGain: 0, goldSteal: 0, skip: 0, shield: 0, reveal: 0 };
    }
  }

  function isHighImpactRole(role) {
    const normalized = normalizeRole(role);
    return normalized === "KNIGHT" || normalized === "BERSERK" || normalized === "SIREN" || normalized === "VALK";
  }

  function effectMatchesState(role, gameState) {
    const normalized = normalizeRole(role);
    const botHp = Math.max(0, Number(gameState.botHP) || 0);
    const botGold = Math.max(0, Number(gameState.botGold) || 0);
    const oppHp = Math.max(0, Number(gameState.oppHP) || 0);
    const oppGold = Math.max(0, Number(gameState.oppGold) || 0);

    if (normalized === "ENT" && botHp <= 3) return true;
    if (normalized === "SIREN" && oppHp <= 3) return true;
    if (normalized === "GOBLIN" && oppGold >= 1) return true;
    if (normalized === "KNIGHT" && oppHp <= 2) return true;
    if (normalized === "BERSERK" && oppHp <= 3) return true;
    if (normalized === "DWARF" && botHp <= 3) return true;
    if (normalized === "ANGEL" && (botHp <= 2 || botGold <= 1)) return true;
    if (normalized === "SCIENTIST" && Number(gameState.remainingRounds) <= 4) return true;
    return false;
  }

  function estimateChallengeProbability(action, gameState, playerModel, botPrivateState) {
    const model = playerModel || Object.create(null);
    const baseRate = clamp(Number(model.challengeRate) || toRate(model.challenges, model.challengeOpportunities, 0.45), 0.1, 0.9);
    const role = normalizeRole(action.role || action.id);
    const isBluff = action.kind === "role" && !Boolean(action.isReal);
    const bluffCounts = botPrivateState && botPrivateState.botBluffUsageByRole ? botPrivateState.botBluffUsageByRole : Object.create(null);
    const repeatedBluffPenalty = Math.max(0, Number(bluffCounts[role]) || 0) >= 2 ? 0.15 : 0;

    let credibilityBoost = 0;
    if ((Number(gameState.botGold) || 0) >= (Number(action.cost) || 0)) credibilityBoost += 0.1;
    if (effectMatchesState(role, gameState)) credibilityBoost += 0.1;
    credibilityBoost -= repeatedBluffPenalty;

    let challengeProb = baseRate - credibilityBoost;

    if (Number(model.challengeRate) < 0.35) challengeProb -= 0.1;
    if (Number(model.challengeRate) > 0.55) challengeProb += 0.15;
    if (isBluff && Number(gameState.botHP) <= 2) challengeProb += 0.08;
    if (isBluff && Number(gameState.oppHP) <= 2 && isHighImpactRole(role)) challengeProb += 0.06;

    return clamp(challengeProb, 0.05, 0.95);
  }

  function estimateLethalPotential(action, gameState, successProbability) {
    const role = normalizeRole(action.role || action.id);
    let projectedDamage = 0;
    if (action.kind === "basic" && normalizeRole(action.id) === "STRIKE") projectedDamage = Number(gameState.strikeDamage) || 1;
    if (action.kind === "role") {
      const profile = getRoleEffectProfile(role, gameState);
      projectedDamage = Number(profile.damageOpp) || 0;
    }
    return projectedDamage * successProbability >= Math.max(0, Number(gameState.oppHP) || 0);
  }

  function scoreAction(action, gameState, botPrivateState, publicState) {
    const model = (botPrivateState && botPrivateState.playerModel) || Object.create(null);
    const playerAggression = clamp(Number(model.playerAggression) || toRate(model.damageActions, model.turns, 0.45), 0.05, 0.95);
    const weights = getPhaseWeights(gameState, playerAggression);

    const role = normalizeRole(action.role || action.id);
    const isBluff = action.kind === "role" && !Boolean(action.isReal);
    const challengeProbability = estimateChallengeProbability(action, gameState, model, botPrivateState);
    let successProbability = isBluff ? 1 - challengeProbability : 1;

    if (isBluff && Number(gameState.botHP) <= 1 && !estimateLethalPotential(action, gameState, successProbability)) {
      successProbability = 0;
    }

    let damageOpp = 0;
    let damageSelf = 0;
    let goldGain = 0;
    let goldSteal = 0;
    let tempo = 0;
    let shield = 0;
    let reveal = 0;

    if (action.kind === "basic") {
      if (normalizeRole(action.id) === "INTEREST") goldGain = Number(gameState.interestGain) || 1;
      if (normalizeRole(action.id) === "STRIKE") damageOpp = Number(gameState.strikeDamage) || 1;
    } else {
      const profile = getRoleEffectProfile(role, gameState);
      damageOpp = Number(profile.damageOpp) || 0;
      damageSelf = Math.max(0, Number(profile.selfDamage) || 0);
      if ((Number(profile.selfDamage) || 0) < 0) {
        // Negative self-damage in profile means healing-like benefit.
        damageSelf = -Math.min(0, Number(profile.selfDamage) || 0) * -0.6;
      }
      goldGain = Number(profile.goldGain) || 0;
      goldSteal = Number(profile.goldSteal) || 0;
      tempo = Number(profile.skip) || 0;
      shield = Number(profile.shield) || 0;
      reveal = Number(profile.reveal) || 0;
    }

    const expectedDamageOpp = successProbability * damageOpp + (action.kind === "role" && !isBluff ? challengeProbability * 1 : 0);
    const expectedDamageSelf = successProbability * damageSelf + (isBluff ? challengeProbability * 2 : 0);
    const economyValue = successProbability * (goldGain * weights.economyWeight + goldSteal * weights.goldDenyWeight);
    const tempoValue = successProbability * (tempo * weights.tempoWeight + shield * weights.shieldWeight + reveal * weights.revealWeight);

    let score =
      expectedDamageOpp * weights.damageWeight -
      expectedDamageSelf * weights.selfDamageWeight +
      economyValue +
      tempoValue;

    const roundIndex = Math.max(1, Number(gameState.roundIndex) || 1);
    const remainingRounds = Math.max(0, Number(gameState.remainingRounds) || 0);

    if (estimateLethalPotential(action, gameState, successProbability)) score += 3;
    if (roundIndex <= 3 && normalizeRole(action.id) === "INTEREST") score += 0.8;
    if ((Number(gameState.botGold) || 0) <= 1 && Number(action.cost || 0) > 1) score -= 0.65;
    if ((Number(gameState.botHP) || 0) < (Number(gameState.oppHP) || 0) && (role === "SIREN" || role === "KNIGHT")) score += 0.7;
    if ((Number(gameState.botHP) || 0) <= 2 && isBluff) score -= 0.9;
    if (role === "SCIENTIST" && remainingRounds <= 5) score += 0.55;
    if (role === "SCIENTIST" && remainingRounds >= 7) score -= 0.2;
    if (role === "BANKER" && roundIndex <= 3) score += 0.55;
    if (role === "BANKER" && roundIndex >= 7) score -= 0.4;

    const challengeRate = clamp(Number(model.challengeRate) || 0.45, 0.05, 0.95);
    if (isBluff && challengeRate < 0.35) score += 0.65;
    if (isBluff && challengeRate > 0.55) score -= 0.75;

    const demonActive = Boolean(gameState.demonActive);
    const jitterRange = demonActive ? 0.18 : 0.32;
    score += randomBetween(-jitterRange, jitterRange);
    return score;
  }

  function chooseActionByScore(scoredActions, demonActive) {
    if (!Array.isArray(scoredActions) || scoredActions.length === 0) return null;
    const sorted = [...scoredActions].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, demonActive ? 3 : 4);

    const temperature = demonActive ? 0.75 : 1.25;
    const weights = top.map((entry) => Math.exp((Number(entry.score) || 0) / temperature));
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 0) return top[0].action;

    let roll = Math.random() * total;
    for (let i = 0; i < top.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return top[i].action;
    }
    return top[0].action;
  }

  function decideAction(gameState, botPrivateState, publicState) {
    const actions = Array.isArray(publicState && publicState.availableActions) ? publicState.availableActions : [];
    if (actions.length === 0) return { kind: "basic", id: "INTEREST" };

    const demonActive = Boolean(gameState && gameState.demonActive);
    const candidateScores = actions.map((action) => ({
      action,
      score: scoreAction(action, gameState || Object.create(null), botPrivateState || Object.create(null), publicState || Object.create(null))
    }));

    const lethalLines = candidateScores.filter((entry) => {
      const action = entry.action || {};
      if (action.kind === "role" && !Boolean(action.isReal)) return false;
      return estimateLethalPotential(action, gameState || Object.create(null), 1);
    });
    if (lethalLines.length > 0) {
      lethalLines.sort((a, b) => b.score - a.score);
      return lethalLines[0].action;
    }

    if (!demonActive && Math.random() < 0.15) {
      const conservative = actions.find((action) => normalizeRole(action.id) === "INTEREST");
      if (conservative) return conservative;
    }

    const picked = chooseActionByScore(candidateScores, demonActive);
    return picked || actions[0];
  }

  function estimateAcceptThreat(role, gameState) {
    const normalized = normalizeRole(role);
    const botHp = Math.max(0, Number(gameState.botHP) || 0);
    const botGold = Math.max(0, Number(gameState.botGold) || 0);
    const oppGold = Math.max(0, Number(gameState.oppGold) || 0);
    const apprenticeHint = clamp(Number(gameState.opponentApprenticeDamageHint) || 1, 1, 5);

    switch (normalized) {
      case "KNIGHT":
        return 1.9 + (botHp <= 2 ? 0.6 : 0);
      case "SIREN":
        return 1.7 + (botHp <= 2 ? 0.4 : 0);
      case "GOBLIN":
        return 1 + (botGold <= 1 ? 0.45 : 0.1);
      case "ENT":
        return 1.35;
      case "PIRATE":
        return 1.45;
      case "DWARF":
        return 0.9;
      case "SCIENTIST":
        return 0.7;
      case "JOKER":
        return 1.3;
      case "BERSERK":
        return 1.85 + (botHp <= 2 ? 0.35 : 0);
      case "BANKER":
        return 1.1;
      case "ANGEL":
        return 1.55 + (oppGold <= 1 ? 0.2 : 0);
      case "VALK":
        return 1.8;
      case "APPRENTICE":
        return 0.9 + apprenticeHint * 0.6;
      default:
        return 1.0;
    }
  }

  function decideResponseToClaim(gameState, botPrivateState, publicState, opponentClaim) {
    const role = normalizeRole(opponentClaim && (opponentClaim.role || opponentClaim.id));
    if (!role) return "ACCEPT";

    const beliefMap = botPrivateState && botPrivateState.beliefRealByRole ? botPrivateState.beliefRealByRole : Object.create(null);
    let pReal = clamp(Number(beliefMap[role]) || 0.5, 0.05, 0.95);

    const botHp = Math.max(0, Number(gameState && gameState.botHP) || 0);
    const oppHp = Math.max(0, Number(gameState && gameState.oppHP) || 0);
    const oppGold = Math.max(0, Number(gameState && gameState.oppGold) || 0);
    const roundIndex = Math.max(1, Number(gameState && gameState.roundIndex) || 1);

    if (role === "BANKER" && roundIndex <= 3) pReal += 0.05;
    if (role === "ANGEL" && (oppGold <= 1 || oppHp <= 2)) pReal -= 0.1;
    if (role === "SCIENTIST") pReal += 0.08;
    if ((role === "KNIGHT" || role === "BERSERK") && botHp <= 2) pReal -= 0.05;
    if (role === "SIREN" && botHp <= 2) pReal -= 0.07;
    pReal = clamp(pReal, 0.05, 0.95);

    const playerModel = (botPrivateState && botPrivateState.playerModel) || Object.create(null);
    const challengeRate = clamp(Number(playerModel.challengeRate) || toRate(playerModel.challenges, playerModel.challengeOpportunities, 0.45), 0.05, 0.95);

    const evChallenge = (1 - pReal) * 2 + pReal * -1;
    const evAccept = -estimateAcceptThreat(role, gameState || Object.create(null));

    let threshold = 0.15;
    if (botHp < oppHp) threshold = 0.05;
    else if (botHp > oppHp) threshold = 0.25;
    if (roundIndex >= 8) threshold -= 0.07;
    threshold += randomBetween(-0.05, 0.05);

    if (pReal > 0.85) return "ACCEPT";
    if (pReal < 0.15) {
      if (botHp === 1 && pReal >= 0.1) return "ACCEPT";
      return "CHALLENGE";
    }
    if (role === "SCIENTIST" && pReal >= 0.35 && roundIndex <= 4) return "ACCEPT";

    let challengeDecision = evChallenge > evAccept + threshold;

    if (challengeRate < 0.35) challengeDecision = challengeDecision || pReal < 0.42;
    if (challengeRate > 0.55 && pReal > 0.35) challengeDecision = false;

    if (Math.abs(evChallenge - (evAccept + threshold)) < 0.08) {
      challengeDecision = Math.random() < (challengeDecision ? 0.65 : 0.35);
    }

    return challengeDecision ? "CHALLENGE" : "ACCEPT";
  }

  globalScope.BotAI = Object.freeze({
    decideAction,
    decideResponseToClaim
  });
})(typeof window !== "undefined" ? window : globalThis);

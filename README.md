# CLAIM DUEL (Clean Rebuild)

Mobile-first vertical bluff game prototype with no dependencies and no build step.

## Run

1. Open [index.html](./index.html) directly in a browser, or
2. Run VS Code Live Server on this folder.

## Files

- [index.html](./index.html): vertical game layout and overlays.
- [styles.css](./styles.css): mobile-first styling, responsive rules, animation hooks.
- [game.js](./game.js): full game engine, state machine, timers, and bot AI.
- `assets/`: root folder for future visual assets.

## Asset Paths Used by Code

- Bot figure: `assets/figures/bot.png`
- Human figure: `assets/figures/human.png`
- Card faces (optional): `assets/cards/<role>.png` (for example `assets/cards/knight.png`)

If an image is missing, UI falls back to styled placeholders.

## State Machine

The game loop is explicit and phase-based:

- `playerTurn`
- `awaitingResponse`
- `resolving`
- `roundEnd`
- `matchEnd`

## Required Engine Surface

Implemented in [game.js](./game.js):

- `startNewMatch()`
- `computeNextActor()`
- `beginTurn()`
- `playAction(cardOrBasicAction)`
- `promptResponseForOpponent()`
- `resolveAccept()`
- `resolveChallenge()`
- `applyEffect()`
- `applyDamage()`, `applyHeal()`, `applyGold()`
- `updateUI()`
- `pushEventLog()`
- `runTimers()`

## DEV Testing

Inside [game.js](./game.js), edit the `DEV` object:

- `enabled: true`
- `forceRoles.human` / `forceRoles.bot`
- `forceStartingActor: "human"` or `"bot"`

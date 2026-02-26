# LIAR'S CLASH

Mobile-first vertical bluff game prototype with no dependencies and no build step.

## Run

1. Open [index.html](./index.html) directly in a browser, or
2. Run VS Code Live Server on this folder.

## GitHub Push Setup

### Option 1 (Recommended): GitHub CLI

```bash
gh auth login
gh repo create dash1-bit/liar-s-clash --public --source=. --remote=origin --push
```

### Option 2: Manual GitHub UI + git commands

1. Create a new empty public repository in GitHub named `dash1-bit/liar-s-clash`.
2. Run:

```bash
git remote add origin https://github.com/dash1-bit/liar-s-clash.git
git branch -M main
git push -u origin main
```

Do not put passwords or access tokens in project files.

## Supabase Wiring

- Frontend uses only anon key (`supabase-config.js`).
- Never use a service role key in frontend code.
- `supabase-config.example.js`: config template with placeholders.
- `supabase-config.js`: local runtime values (gitignored).
- Console test function: `window.liarsClashTestSupabase()`.

## Files

- [index.html](./index.html): vertical game layout and overlays.
- [styles.css](./styles.css): mobile-first styling, responsive rules, animation hooks.
- [game.js](./game.js): full game engine, state machine, timers, and bot AI.
- [supabase-client.js](./supabase-client.js): Supabase client and connection test helper.
- [supabase-config.example.js](./supabase-config.example.js): safe config template.
- `supabase-config.js`: local config (ignored by git).
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

## DEV Testing

Inside [game.js](./game.js), edit the `DEV` object:

- `enabled: true`
- `forceRoles.human` / `forceRoles.bot`
- `forceStartingActor: "human"` or `"bot"`
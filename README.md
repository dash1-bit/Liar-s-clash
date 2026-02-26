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

- Frontend uses only anon key.
- Never use a service role key in frontend code.
- `supabase-public-config.js`: committed runtime config for production (URL + anon key only).
- `supabase-config.example.js`: optional local template.
- `supabase-config.js`: optional local override (gitignored).
- Console test function: `window.liarsClashTestSupabase()`.

## Files

- [index.html](./index.html): vertical game layout and overlays.
- [styles.css](./styles.css): mobile-first styling, responsive rules, animation hooks.
- [game.js](./game.js): app flow, game engine, bot AI, and Supabase realtime friend networking.
- [supabase-public-config.js](./supabase-public-config.js): production runtime config (public URL + anon key only).
- [supabase-config.example.js](./supabase-config.example.js): safe config template.
- `supabase-config.js`: local config (ignored by git).
- `assets/`: root folder for future visual assets.

## Asset Paths Used by Code

- Bot figure: `assets/figures/bot.png`
- Human figure: `assets/figures/human.png`
- Card faces (optional): `assets/cards/<role>.png` (for example `assets/cards/knight.png`)

If an image is missing, UI falls back to styled placeholders.

## Modes

- `Play vs Bot`: local human vs bot.
- `Play vs a Friend`: Supabase Realtime room (`presence` + `broadcast`), no database writes.
- URL join:
  - `/?room=<id>` -> host
  - `/?room=<id>&role=guest` -> guest

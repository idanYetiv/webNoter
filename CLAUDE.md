# Notara Project - Claude Session Guide

> **Read this file at the start of each session to get up to speed quickly.**

---

## 1. Session Setup (REQUIRED)

```bash
cd ~/Notara
git config user.name "idanYetiv"
git config user.email "idanyativ@gmail.com"
```

---

## CRITICAL GIT RULE - NO EXCEPTIONS

**NEVER push directly to `main`. ALWAYS use a PR.**

This applies to ALL changes — features, fixes, config, docs, everything.

**Required workflow:**
```bash
git checkout -b feat/descriptive-name
# ... make changes ...
git add <files>
git commit -m "feat: description"
git push -u origin feat/descriptive-name
gh pr create --title "..." --body "..."
# STOP HERE - Share PR link and WAIT for user approval
gh pr merge <number> --squash --delete-branch  # Only after user approves
git checkout main && git pull
```

**NEVER merge a PR without explicit user approval.**

---

## 2. Project Overview

**Notara** — A Chrome extension that lets users write and save floating sticky notes on any website, with screenshot capture. Dark & sleek visual identity with neon cyan accents.

**Target:** Chrome Web Store distribution.

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | Chrome Manifest V3 |
| UI | React 19 + TypeScript |
| Build | Vite + @crxjs/vite-plugin |
| Styling | Tailwind CSS v4 |
| Storage | Chrome Storage API (sync) |
| Auth | Supabase Auth + Google OAuth (`chrome.identity.launchWebAuthFlow`) |
| Screenshots | html2canvas |
| Testing | Vitest + Testing Library |

---

## 4. Project Structure

```
~/Notara/
├── CLAUDE.md              # This file
├── .env.example           # Supabase + Google OAuth credentials template
├── manifest.json          # Chrome Extension Manifest V3
├── vite.config.ts
├── public/                # Extension icons
└── src/
    ├── popup/             # Extension popup UI
    │   └── components/    # AuthSection
    ├── content/           # Content script (floating notes)
    │   └── components/    # StickyNote, NoteEditor, ScreenshotButton
    ├── background/        # Service worker (Supabase client lives here)
    ├── lib/               # Storage, screenshot, types, auth, supabase
    ├── hooks/             # useNotes, useScreenshot, useAuth
    └── styles/            # Tailwind global CSS
```

---

## 5. Quick Commands

```bash
npm run dev          # Dev server with HMR
npm run build        # Build to dist/
npm run test         # Watch mode tests
npm run test:run     # Single run tests
```

**Load extension:** chrome://extensions → Load unpacked → select `dist/`

---

## 6. Key Patterns

- Content script uses isolated container with pointer-events strategy
- All notes stored via `chrome.storage.sync` keyed by URL
- Storage keys use `notara_` prefix (migrated from legacy `webnoter_` prefix)
- Types defined in `src/lib/types.ts`
- Storage CRUD in `src/lib/storage.ts`
- Dark theme with neon cyan (#00d4ff) accent color

---

## 7. Auth Architecture (Phase 1)

- **Google-only sign-in** via Supabase Auth + `chrome.identity.launchWebAuthFlow()`
- **Supabase client** lives in background service worker only (`src/lib/supabase.ts`)
- Uses custom `chrome.storage.local` adapter (service workers have no localStorage)
- Popup/content scripts communicate with background via Chrome messaging (`SIGN_IN_GOOGLE`, `SIGN_OUT`, `GET_AUTH_STATE`)
- User profile cached in `chrome.storage.session`; Supabase refresh token persisted in `chrome.storage.local`
- Extension icon click opens popup (with auth UI + toggle button); no longer directly toggles panel
- **Phase 1 = auth only** — notes stay in chrome.storage, no DB sync yet
- Credentials set via `.env` (see `.env.example`); requires Supabase project + Google Cloud Console setup

---

*Last updated: February 21, 2026*

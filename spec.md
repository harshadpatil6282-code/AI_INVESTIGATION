# AI Mystery Room — Specification (spec.md)

> **Single source of truth.** Build the whole project from this file.
> If something is ambiguous, follow this document. If it is silent, pick the simplest option that satisfies the Acceptance Criteria (section 17) and log the decision in `DECISIONS.md`.

---

## 0. Instructions for Codex (read first)

1. Build in the milestone order of section 16. Finish and test each milestone before starting the next.
2. Do not hardcode secrets or Gemini model names. Everything configurable goes in `.env` (section 12).
3. All AI calls go through the `AiProvider` interface (section 7). Implement `MockAiProvider` first so the app runs without a Gemini key.
4. **Never leak the solution to the client** before an accusation is made (section 9.1). This is the most important rule.
5. Validate every API input and every AI output with Zod. Share schemas via the `shared/` package.
6. Use JavaScript with ES modules, or TypeScript if preferred. Pick one for both client and server and record it in `DECISIONS.md`. TypeScript is recommended.
7. Write tests as described in section 14. CI must pass before a milestone is done.

---

## 1. Product Overview

AI Mystery Room is a web app. The player types a short scenario (example: *"A jewelry vault in a hotel was emptied during a wedding party"*). The backend uses Gemini to invent a complete fictional investigation:

- a hidden truth (who did it, how, why),
- a cast of suspects,
- evidence files: WhatsApp-style chats, images, CCTV footage, and in-world documents/logs.

The player studies the evidence, can use limited hints, then accuses one suspect. The app reveals whether the accusation was right, with the full solution and a clue-by-clue walkthrough.

### 1.1 Goals

- Every generated case is **solvable**: exactly one suspect is provably guilty from the evidence.
- Evidence feels real: chat UI, generated photos, CCTV-styled frames with timestamps.
- The solution never reaches the browser before the player accuses.
- Generation shows live progress and fails gracefully.

### 1.2 Non-Goals (v1)

- No multiplayer, payments, or native mobile apps.
- No real people, real events, or real brands as suspects. All content is fictional.
- No AI video generation by default (see 5.3; behind a feature flag).

---

## 2. User Flow

1. **Landing page** — pitch, "Start a Case" button, sample case.
2. **Create Case** — textarea for scenario (20–1000 chars), difficulty (Easy / Medium / Hard), optional genre chips (modern city, village, office, college, hotel, train).
3. **Generation screen** — live stages: Building the truth → Creating suspects → Writing messages → Developing photos → Reviewing footage → Final checks. Polls every 2 seconds.
4. **Case Board** (main screen) — briefing, suspect cards, evidence locker, notes, hint button, "Make Accusation".
5. **Evidence viewers** — chat viewer, image viewer (zoom), CCTV viewer (timeline scrubber), document viewer.
6. **Accusation** — pick one suspect, write optional reasoning, confirm in a modal (final, cannot change).
7. **Verdict page** — correct/wrong, full solution, clue walkthrough, score, "Play again", "Share case".

---

## 3. Tech Stack and Architecture

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Zustand, TanStack Query |
| Backend | Node.js 20, Express, Mongoose, Zod, Pino, Helmet, express-rate-limit |
| Database | MongoDB (Atlas or local) |
| AI | Google Gemini via official `@google/genai` SDK, **server-side only** |
| File storage | MongoDB GridFS behind a `StorageService` interface (swappable for S3/Cloudinary) |
| Jobs | In-process async runner + `generationJobs` collection (no Redis in v1) |
| Images | `sharp` for thumbnails (400px) |
| Tests | Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library, Playwright |

### 3.1 Monorepo Structure

```
ai-mystery-room/
├── spec.md
├── DECISIONS.md
├── README.md
├── .env.example
├── docker-compose.yml
├── shared/                  # Zod schemas + shared types
├── client/
│   └── src/
│       ├── pages/
│       ├── components/      # ChatViewer, ImageViewer, CctvViewer, DocViewer, SuspectCard...
│       ├── store/
│       ├── api/
│       └── hooks/
└── server/
    ├── fixtures/sampleCase.json
    └── src/
        ├── config/          # env loading, constants
        ├── models/          # Mongoose schemas
        ├── routes/
        ├── controllers/
        ├── middleware/      # auth, rateLimit, errorHandler, validate
        ├── services/
        │   ├── ai/
        │   │   ├── AiProvider.ts
        │   │   ├── GeminiProvider.ts
        │   │   ├── MockAiProvider.ts
        │   │   ├── prompts/        # one file per stage, versioned
        │   │   ├── pipeline/       # stage1..stage9
        │   │   └── validators/
        │   ├── storage/            # StorageService (GridFS)
        │   └── scoring/
        └── utils/
```

---

## 4. Core Concept: The Case Bible

Every case starts as a hidden **Case Bible**: a structured JSON object produced by Gemini. All evidence is derived from it so facts stay consistent. It is stored server-side in a field with `select: false` and is **never** returned by player-facing endpoints until the case is resolved.

### 4.1 Case Bible schema

```json
{
  "title": "string",
  "setting": { "place": "", "date": "", "timeWindow": "", "weather": "", "context": "" },
  "incident": { "summary": "", "startTime": "", "endTime": "", "loss": "" },
  "suspects": [ "Suspect (4.2)" ],
  "culpritId": "string (suspect id)",
  "groundTruthTimeline": [
    { "time": "ISO", "suspectId": "string", "location": "", "action": "" }
  ],
  "method": "string",
  "motive": "string",
  "clues": [ "Clue (4.3)" ],
  "redHerrings": [
    { "id": "", "description": "", "pointsTo": "suspectId", "whyInnocent": "" }
  ],
  "hints": ["hint1 (vague)", "hint2 (narrower)", "hint3 (strong)"],
  "solutionSummary": "string"
}
```

### 4.2 Suspect

| Field | Notes |
|---|---|
| `id` | e.g. `s1` |
| `name` | Fictional, culturally varied |
| `age`, `role`, `relationToVictim`, `personality` | |
| `publicStatement` | What they tell police (may contain a lie) |
| `alibiClaimed` | |
| `secret` | Every suspect hides something, even innocents |
| `motive`, `means`, `opportunity` | |
| `portraitPrompt` | For image generation |

### 4.3 Clue

`id`, `type` (`chat` / `image` / `cctv` / `document` / `log`), `description`, `pointsTo` (suspect id, or `null` for neutral), `strength` (1–3), `contradicts` (statement or alibi it breaks), `evidenceId` (filled after evidence generation).

### 4.4 Fairness rules (enforced by the validator)

1. Exactly one suspect has **motive + means + opportunity** that evidence cannot explain away.
2. At least **3 independent clues** point to the culprit, from at least 2 evidence types. On Hard, at least one clue requires cross-referencing two files.
3. Every innocent suspect has at least one **verifiable alibi or exculpatory clue** in the evidence.
4. Red herrings: at least 2 (Easy), 3 (Medium), 4 (Hard).
5. The culprit's `publicStatement` contains at least one lie that evidence contradicts.
6. Times, names, places, and objects are consistent across the bible and all evidence.
7. No evidence item names the culprit explicitly.

### 4.5 Difficulty matrix

| | Easy | Medium | Hard |
|---|---|---|---|
| Suspects | 4 | 5 | 6 |
| Evidence items | 6 | 9 | 12 |
| Red herrings | 2 | 3 | 4 |
| Hints allowed | 3 | 2 | 1 |
| Clue subtlety | Obvious | Moderate | Needs cross-referencing |
| Evidence unlock | All visible | Progressive | Progressive |

Medium and Hard must include at least one chat, one image, and one CCTV item.

---

## 5. Evidence Types

Every evidence item is an `Evidence` document with: `type`, `title`, `description` (neutral, spoiler-free caption), `inWorldTimestamp`, `payload` (type-specific), `assets[]`.

### 5.1 Chat (`type: "chat"`) — WhatsApp-style

Payload:

```json
{
  "isGroup": false,
  "participants": [{ "name": "", "avatarAssetId": "" }],
  "messages": [
    {
      "sender": "",
      "text": "",
      "timestamp": "ISO",
      "status": "sent | delivered | read",
      "attachmentEvidenceId": null,
      "deleted": false
    }
  ]
}
```

- 15–40 messages per chat. Informal language, abbreviations, light emoji, realistic time gaps.
- Include small talk to hide the clue. Never state the answer outright.
- UI looks like a WhatsApp thread (bubbles, ticks, date separators). **Do not use WhatsApp logos or trademarks**; label it generically ("ChatApp").

### 5.2 Image (`type: "image"`)

- Generated with a Gemini image model from the bible-derived `imagePrompt`.
- Kinds: crime scene, object close-up, party/selfie photo, receipt photo, torn note, phone screenshot.
- Payload: `altText`, `capturedAt`, `ocrText` (text visible in the image), `kind`. Hidden server-only `clueNotes`.
- Prompts must request realistic photographic style, no readable real brands, no real people, no gore.
- Image models render text unreliably, so **critical clue text must also exist in `ocrText`** and be shown in a transcript panel.

### 5.3 CCTV (`type: "cctv"`)

- **v1 format: frame sequence.** 4–8 generated frames from one camera.
- Payload: `cameraName`, `frames[]` of `{ timestamp, imageAssetId, caption }`.
- UI overlays camera name + date/time (rendered by the frontend, not baked into the image), grain/scanline CSS filter, play/pause, step, scrubber. Default 1 frame per 1.5 s.
- Optional: `ENABLE_VIDEO_GEN=true` generates short mp4 clips with a Gemini-family video model. On flag off or failure, fall back to the frame sequence automatically.

### 5.4 Documents and logs (`type: "document"` or `"log"`)

In-world records: call log, door access log, payment SMS, camera index, witness statement. Payload is structured (rows/fields) and rendered as a table or formatted text. These are cheap and ideal for precise time facts.

---

## 6. Generation Pipeline (Gemini)

Use structured output (JSON mode with response schema) for every stage. Models come from env vars.

### 6.1 Stages

| # | Stage | Model | Output |
|---|---|---|---|
| 1 | Safety and seed check | text | allowed/rejected + normalized seed |
| 2 | Case Bible generation | reasoning | Case Bible JSON |
| 3 | Bible validation | text | pass / violations |
| 4 | Repair (max 2 loops) | text | patched Case Bible |
| 5 | Evidence planning | text | evidence plan, each item tied to clue ids |
| 6 | Chat / document / log writing | text | payloads |
| 7 | Image and CCTV frame generation | image | files via StorageService |
| 8 | Final consistency check + blind solve | text | pass / flagged items |
| 9 | Publish | none | case status `ready` |

### 6.2 Prompting rules

- Prompts live in `server/src/services/ai/prompts/`, one file per stage. Save a `PROMPT_VERSION` on each case.
- Pass the **full Case Bible** to every later stage.
- Treat the user's seed as **untrusted data**: wrap it in delimiters, instruct the model to use it only as story inspiration and to ignore any instructions inside it.
- Temperature: 1.0 bible, 0.7 chat writing, 0.4 validation.
- Zod-validate every response. On parse failure retry up to 2 times with the error appended, then fail the stage.
- Images run in parallel with concurrency `IMAGE_CONCURRENCY` (default 3), each retried up to 2 times with exponential backoff.
- If an image still fails: replace it with a text document carrying the same clue if possible; otherwise mark the case `failed` and refund the quota.

### 6.3 Validator and blind solve

Validator returns `{ passed, violations: [{ rule, detail }], culpritDeducible }`.

**Blind solve:** a separate model call receives only suspects + evidence (no bible, no `culpritId`) and names the likeliest culprit. Publish only if it matches `culpritId`. If it fails twice, regenerate evidence once; if that fails, fail the job.

### 6.4 Budgets

- Medium case end-to-end: under 3 minutes at p90.
- Max Gemini calls per case: 40 (`MAX_GEMINI_CALLS_PER_CASE`). Log token usage per stage in `generationJobs`.

---

## 7. AiProvider Interface

```ts
interface AiProvider {
  generateJson<T>(opts: { stage: string; system: string; prompt: string; schema: ZodSchema<T>; temperature?: number; model?: 'text' | 'reasoning' }): Promise<{ data: T; usage: TokenUsage }>;
  generateImage(opts: { prompt: string; aspectRatio?: string }): Promise<{ bytes: Buffer; mime: string }>;
  generateVideo?(opts: { prompt: string }): Promise<{ bytes: Buffer; mime: string }>;
}
```

- `GeminiProvider` — real implementation, retries 429/5xx with exponential backoff + jitter (max 3), handles `SAFETY` finish reasons as a clean failed state.
- `MockAiProvider` — returns `fixtures/sampleCase.json` content and placeholder images. Used in tests and automatically when `GEMINI_API_KEY` is empty.

---

## 8. Data Models (Mongoose)

### 8.1 User
`email` (unique), `passwordHash`, `displayName`, `isGuest`, `createdAt`, `stats {casesPlayed, casesSolved, totalScore}`, `dailyGenerationCount`, `dailyResetAt`. Guests play via a guest token and can upgrade later.

### 8.2 Case
`ownerId`, `seedText`, `difficulty`, `genre`, `status` (`generating | ready | failed | solved | failed_accusation`), `title`, `briefing`, `publicSuspects[]` (`id, name, age, role, relationToVictim, publicStatement, portraitAssetId`), `evidenceIds[]`, `hints` (**select: false**), `bible` (**select: false**), `promptVersion`, `shareToken`, `isPublicShare`, `createdAt`.

### 8.3 Evidence
`caseId`, `type`, `title`, `description`, `inWorldTimestamp`, `payload` (Mixed, Zod-validated per type), `assets[]` (`assetId, mime, altText`), `clueNotes` (**select: false**), `clueIds` (**select: false**), `unlockOrder` (number).

### 8.4 Attempt
`caseId`, `userId`, `accusedSuspectId`, `reasoning`, `isCorrect`, `hintsUsed`, `timeSpentSeconds`, `score`, `createdAt`. One attempt per case per user (replay = new case).

### 8.5 PlayerNotes
`caseId`, `userId`, `text`, `pinnedEvidenceIds[]`, `suspectMarks` (map suspectId → `suspect | cleared | unknown`). Auto-saved with debounce.

### 8.6 GenerationJob
`caseId`, `status`, `stage`, `progressPercent`, `error`, `tokenUsage[]`, `startedAt`, `finishedAt`.

---

## 9. REST API

Base path `/api/v1`. JSON. Zod-validated. Errors: `{ "error": { "code": "", "message": "" } }`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/guest` | Auth and guest session |
| GET | `/auth/me` | Current user |
| POST | `/cases` | Body `{ seedText, difficulty, genre? }` → 202 `{ caseId, jobId }` |
| GET | `/cases/:id/status` | Stage + progress for polling |
| GET | `/cases` | User's cases (no bible) |
| GET | `/cases/:id` | Player view: briefing, public suspects, evidence summaries |
| GET | `/cases/:id/evidence/:evidenceId` | Evidence payload (spoiler-free fields only) |
| GET | `/assets/:assetId` | Stream image/video; checks case ownership |
| PUT | `/cases/:id/notes` | Save notes |
| POST | `/cases/:id/hint` | Next hint; increments `hintsUsed`; refuses past limit |
| POST | `/cases/:id/accuse` | Body `{ suspectId, reasoning? }` → verdict + full solution |
| GET | `/cases/:id/solution` | Only after an attempt exists |
| GET | `/shared/:shareToken` | Read-only player view (no solution) |

### 9.1 Spoiler protection (critical)

- `bible`, `hints`, `clueNotes`, `clueIds` use `select: false` and are loaded only inside the hint, accuse, and solution handlers.
- Use explicit response serializers (allow-lists), never return raw documents.
- Automated test: walk every player-facing response and assert none contains `culpritId`, `bible`, `clueNotes`, `clueIds`, or `solutionSummary`.
- Asset ids and filenames are random UUIDs, never descriptive.
- Hints are pre-written at generation time (3 progressive hints stored server-side), so hint calls cost no AI tokens.

### 9.2 Accusation and scoring (max 1000)

- Correct accusation: **600** base. Wrong: 0 base.
- Speed bonus: up to **150**, linearly decreasing over 30 minutes.
- Hint penalty: **−75** per hint used (never below 0 total).
- Reasoning bonus (optional, only if correct and reasoning non-empty): one Gemini call compares reasoning to the clue list and returns match 0–100; bonus = 2.5 × match (max 250).

Solution page shows: culprit, motive, method, true timeline, each clue with its evidence item, red-herring explanations, and which clues the player pinned.

---

## 10. Frontend

### 10.1 Routes

`/` Landing · `/login` · `/register` · `/new` · `/cases` · `/case/:id/generating` · `/case/:id` (board) · `/case/:id/evidence/:eid` · `/case/:id/verdict` · `/shared/:token`

### 10.2 Case Board (desktop)

- **Left:** briefing, in-world clock, hint button with remaining count.
- **Center:** Evidence Locker grid (icon by type, title, caption, "new" badge). Progressive unlock by `unlockOrder`: group 1 visible at start, next group unlocks after the previous is viewed. Easy shows all.
- **Right:** Suspects (portrait, name, role, statement, mark buttons Suspect/Cleared/Unknown) and Notes textarea.
- **Bottom bar:** "Make Accusation" (disabled until at least 3 evidence items viewed).
- **Mobile:** tabs for Evidence / Suspects / Notes.

### 10.3 Viewers

- **Chat:** WhatsApp-like bubbles, sender colors, timestamps, date dividers, deleted placeholders, attachment thumbnails that open linked evidence, "Pin message" to notes.
- **Image:** zoom/pan, brightness/contrast sliders, alt text, in-world timestamp, transcript panel for `ocrText`.
- **CCTV:** dark UI, camera label, burned-in timestamp overlay, play/pause/step/scrubber, scanline filter, frame caption.
- **Document:** monospace or table layout by type.

### 10.4 UX requirements

- Dark "detective" theme default, light toggle. WCAG AA contrast.
- Skeleton loaders; animated stage list on generation screen.
- All images have alt text; viewers are keyboard-navigable.
- Confirm modal before accusation: "This is final. You cannot change your answer."
- Verdict reveal animation, then walkthrough.

---

## 11. Security

- bcrypt (cost 12). JWT access token (15 min, in memory) + refresh token in httpOnly, SameSite=Lax, Secure cookie.
- Helmet, CORS allow-list from env, body limit 100 KB, Zod on all inputs, Mongo query sanitization.
- Rate limits: auth 10 / 15 min / IP; case creation 3 / hour / user (guests 1 / hour); hints 10 / hour; global 300 / 15 min / IP.
- Daily generation quota: users 5, guests 2 (env-configurable).
- Ownership checks on every case, evidence, and asset route. Shared cases expose only the player view.
- **Prompt injection:** seed is data only; strip control characters; stage 1 classifier rejects override attempts.
- **Content safety:** reject or soften seeds with real named people, sexual content, minors in harm, graphic gore, hate, or real-crime instructions. Cases are puzzle-style and non-graphic. Set Gemini safety settings to at least medium blocking; handle `SAFETY` finish reasons with a friendly failed state.
- Never log API keys, or full prompts containing user data at info level.

---

## 12. Environment Variables

```
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=
GEMINI_REASONING_MODEL=
GEMINI_IMAGE_MODEL=
GEMINI_VIDEO_MODEL=
ENABLE_VIDEO_GEN=false
IMAGE_CONCURRENCY=3
MAX_GEMINI_CALLS_PER_CASE=40
DAILY_CASE_QUOTA_USER=5
DAILY_CASE_QUOTA_GUEST=2
```

Provide `.env.example`. Do not hardcode model names; the README tells the operator to set current Gemini models in `.env`.

---

## 13. Error Handling and Resilience

- Central Express error handler with the standard error shape; no stack traces in production.
- Each pipeline stage records progress. On failure, the job stores `error` and the case becomes `failed`. UI shows a Retry button creating a fresh job with the same seed (no quota cost if the failure was server-side).
- On server boot, mark `generating` jobs older than 10 minutes as `failed`.
- Frontend polling stops on `ready` or `failed`, and after 10 minutes.

---

## 14. Testing

- **Unit:** Zod schemas, scoring, difficulty config, quota logic, response serializers.
- **Integration (Jest + Supertest + mongodb-memory-server):** auth, create case (mock AI), status polling, evidence access control, accuse flow, hint limits.
- **Spoiler-leak test** (section 9.1) is mandatory.
- **Fixture:** one hand-written complete case in `server/fixtures/sampleCase.json`, used for tests and the landing-page demo.
- **Frontend:** Vitest + RTL for chat and CCTV viewers; one Playwright happy path: create case (mock) → verdict.

---

## 15. Performance and Quality Targets

- Case Board loads under 2 s on broadband (lazy-loaded images, 400px thumbnails).
- API p95 under 300 ms for non-generation routes.
- Lighthouse accessibility 90+.

---

## 16. Build Milestones

1. **M1 Scaffolding** — monorepo, lint, Prettier, env loading, Mongo connection, health route, Vite client with routing and theme.
2. **M2 Auth** — register, login, guest session, refresh flow, protected routes.
3. **M3 Data layer** — all models, GridFS `StorageService`, asset route.
4. **M4 AI provider** — `AiProvider`, `MockAiProvider`, `GeminiProvider` (structured output, retries).
5. **M5 Pipeline** — stages 1–9, job runner, status endpoint, validator + blind solve.
6. **M6 Case Board UI** — create page, generation screen, board, locker, suspects, notes.
7. **M7 Viewers** — chat, image, CCTV, document.
8. **M8 Gameplay** — hints, accusation, scoring, verdict/solution page.
9. **M9 Hardening** — rate limits, quotas, safety filters, spoiler-leak test, error states.
10. **M10 Polish** — accessibility, animations, share links, README, Dockerfile + docker-compose with Mongo.

Each milestone ends with passing tests and a short entry in `DECISIONS.md`.

---

## 17. Acceptance Criteria (Definition of Done)

1. A user can enter a scenario and receive a playable case with at least one chat, one image, and one CCTV item (Medium = 9 evidence items).
2. Generation screen shows live stage progress and handles failure with Retry.
3. No player-facing response contains the culprit, bible, clue notes, or solution before an accusation (automated test).
4. The blind-solve check passes before any case becomes `ready`.
5. Correct accusation shows correct verdict, score, and full walkthrough; wrong accusation shows wrong verdict and the same walkthrough.
6. Hints respect per-difficulty limits and reduce score.
7. Chat, image, and CCTV viewers work at desktop and mobile widths.
8. `docker-compose up` runs the app; with no Gemini key it uses `MockAiProvider`.
9. All tests in section 14 pass in CI.

---

## 18. Future Scope (do NOT build in v1)

Multiplayer rooms, default AI video clips, voice-note evidence with TTS, interrogation chat with suspects powered by Gemini, community case sharing and leaderboards, daily challenge cases.
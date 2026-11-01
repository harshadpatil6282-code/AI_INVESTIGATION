# AI Mystery Room

A mock-first, full-stack fictional detective game. Enter a scenario, inspect evidence, use limited hints, and make one final accusation.

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173`.

Without `GEMINI_API_KEY`, the server uses the deterministic `MockAiProvider` fixture. Set current Gemini model IDs only in `.env` when adding the live provider credentials.

## Security posture

The Case Bible, hints, clue notes, and clue IDs are hidden Mongoose fields. List, board, and evidence endpoints allow-list player-safe properties. The accusation and solution endpoints are the only routes that load the hidden truth.

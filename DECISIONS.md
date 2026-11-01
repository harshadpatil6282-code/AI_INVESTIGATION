# Decisions

- **M1:** TypeScript with ESM is used in both frontend and server.
- **M4:** Mock AI is the default path when `GEMINI_API_KEY` is empty. It produces a deterministic hand-authored mystery fixture, enabling local development without external AI access.
- **M5:** Player response routes use explicit allow-list serializers and select hidden fields only for hints, accusations, and solutions.

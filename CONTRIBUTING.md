# Contributing to EstateDirect

Thank you for your interest in contributing to **EstateDirect**! We welcome bug reports, UI improvements, documentation updates, and new real-estate workflow enhancements.

## Getting Started

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/vishalmadargaon/EstateDirect.git
   cd EstateDirect
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Leave optional keys blank for local standalone development, or add your own development keys to `.env` (which is gitignored).
4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Secret Hygiene (Required Before Every PR)

- **Never** commit `.env`, `firebase-applet-config.json`, `firebase_applet_config.xml`, API keys, SMTP app passwords, or OAuth tokens.
- Keep all server-side secrets (`GEMINI_API_KEY`, `SMTP_PASS`) strictly in `server.ts` environment variables.
- Keep optional client Firebase settings strictly in `VITE_FIREBASE_*` environment variables.

## Quality Checklist Before Opening a Pull Request

Run all checks locally and ensure zero errors and zero warnings:

```bash
npm test                                                      # Pure unit tests (node:test)
npx tsc --noEmit --strict --noUnusedLocals --noUnusedParameters  # Strict TypeScript check
npm run lint                                                  # Code lint check
npm run build                                                 # Production bundle verification
```

## Pull Request Process

1. Create a feature branch from `main` (e.g., `feat/rera-filter` or `fix/calendar-slot`).
2. Keep pull requests focused and include a short description of what changed and how you tested it.
3. Add or update unit tests in `src/utils/*.test.ts` for any new business logic.
4. For security-related findings, please do **not** open a public issue—follow [SECURITY.md](./SECURITY.md) instead.

## Questions?

Reach out to us at **estatedirect@zohomail.in** or open a GitHub Discussion.

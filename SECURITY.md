# Security Policy — Kavel

## Key Safeguards
- **Server-Side AI Keys**: `GEMINI_API_KEY` is accessed strictly on the Express backend (`server.ts`) and never bundled into client JavaScript.
- **In-Memory Workspace OAuth Tokens**: Google Meet OAuth access tokens are cached strictly in React/JS memory and cleared on sign-out — never written to `localStorage` or `sessionStorage`.
- **Explicit Confirmation for External Mutations**: Creating Google Meet spaces requires explicit user confirmation via an interactive dialog before calling `meet.googleapis.com`.
- **Hardened Firestore Security Rules**: Default-deny catch-all, strict field allowlists (`hasOnly`), string/array bounds, path ID regex validation, and owner-isolated PII in `/leads`.
- **HTTP Security Headers**: Configured in both Express middleware and `vercel.json` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`).
- **Client & Server Input Validation**: Strict validation on forms, file MIME/size checks (max 5 MB, JPG/PNG/WebP), and safe URL validation for WhatsApp/Meet links.

## Reporting a Vulnerability
Please report security issues privately to the project maintainers rather than opening a public issue.

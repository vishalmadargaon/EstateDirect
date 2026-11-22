# Security Policy — EstateDirect

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `main` (v1.x) | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in **EstateDirect**, please report it privately so we can investigate and fix it before public disclosure:

- **Email:** `estatedirect@zohomail.in`
- **Subject:** `[Security] Brief summary of issue`

Please include steps to reproduce, the affected route or component, and any suggested mitigation. We aim to acknowledge reports within **48 hours** and provide a remediation timeline promptly.

## Built-in Security Safeguards

- **Zero Committed Secrets:** No API keys, Firebase config files (`firebase-applet-config.json`), SMTP passwords, or OAuth client secrets are committed to this repository. All credentials are injected at runtime via environment variables.
- **Server-Only Secret Isolation:** Sensitive keys (`GEMINI_API_KEY`, `SMTP_PASS`) are read exclusively by the Node.js Express backend (`server.ts`) and are never bundled into the browser client.
- **In-Memory OAuth Token Handling:** Google Workspace OAuth access tokens (Calendar, Gmail, Meet) are kept strictly in memory and sent to backend proxy routes via `Authorization: Bearer` headers—never written to `localStorage` or `sessionStorage`.
- **Signed Email OTP Verification:** 6-digit verification codes are generated with `crypto.randomInt`, hashed server-side using HMAC-SHA256, rate-limited per email/IP, and expire automatically after 10 minutes.
- **Strict Tenant Isolation (`firestore.rules`):** Private buyer leads and notes are readable and writable only by the owning broker/builder UID (`resource.data.ownerId == request.auth.uid`). Public visitors can only view published listings (`published == true`) and submit validated new inquiries (`status == 'new'`).
- **Hardened HTTP & Input Validation:** All `/api/*` endpoints enforce explicit payload validation, strict CORS/origin hygiene, and security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`).

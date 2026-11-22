# EstateDirect — Luxury Real-Estate Catalog & WhatsApp Lead Platform

EstateDirect is a free-to-start editorial real-estate SaaS platform built for brokers, agents, property owners, and developers. Publish a branded property catalog, share one link or QR code, conduct interactive 3D walkthroughs and Google Meet virtual tours, and receive every enquiry directly on WhatsApp.

## Core Capabilities
- **Branded Public Catalogs (`/c/:slug`)**: Indian currency formatting (`₹ Cr` / `₹ L`), Buy/Rent filters, bedrooms, price bands, live search, and sorting.
- **Editorial Property Detail Pages**: Full gallery with gold active thumbnail ring and drag-to-swipe lightbox, RERA card, amenities checklist, sticky price & WhatsApp enquiry sidebar, QR share modal, and validated site visit booking.
- **Interactive 3D Architectural Studio (`/studio`)**: Composite procedural Three.js residence with studio PBR lighting, day/twilight presets, material finishes, and floorplan cutaway slider.
- **Owner Dashboard (`/dashboard`)**: 7/30/90-day analytics with animated KPIs and daily bar chart, multi-photo property manager with client-side 1600px WebP compression, 6-stage Kanban/List lead CRM with one-tap WhatsApp replies, and agency branding settings.
- **Google Meet Virtual Tours**: Authenticated Google Workspace Meet room creation with explicit confirmation and instant share links.
- **Gemini AI Advisory & Grounding**:
  - Multi-turn real-estate advisor chat (`gemini-4-hydrogen`)
  - Nearby places via Google Maps Grounding (`gemini-4-hydrogen`)
  - Local market trends via Google Search Grounding (`gemini-4-hydrogen`)
  - Instant low-latency copywriting & analytics summaries (`gemini-3.1-flash-lite`)

## Scripts
- `npm run dev` — Start full-stack Express + Vite server on port 3000
- `npm run build` — Build production client bundle
- `npm run test` — Run unit tests for formatters, filters, validation, and analytics math
- `npm run lint` — TypeScript typecheck

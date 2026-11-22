import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  BUSINESS_CONTACT_EMAIL,
  OTP_EXPIRY_MS,
  buildGmailRawMessage,
  buildGoogleCalendarDeepLink,
  buildIcsCalendarInvite,
  canRequestNewOtp,
  evaluateOtpVerification,
  isValidEmail,
  normalizeEmail,
  sanitizeHeaderValue,
  validateContactForm,
  type OtpRecord,
} from './src/utils/bookingAndOtpLogic.ts';
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectGoogleSiteVerificationMeta,
  resolveCanonicalOrigin,
  sanitizeGoogleSiteVerificationToken,
  summarizeWebTraffic,
  type WebAnalyticsHit,
} from './src/utils/seoAndAnalytics.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Security headers (iframe-compatible: avoids X-Frame-Options)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getSafeErrorMessage(err: unknown): string {
  if (IS_PRODUCTION) {
    return 'Service temporarily unavailable. Please try again or contact estatedirect@zohomail.in.';
  }
  if (err instanceof Error) return err.message;
  return 'Unexpected upstream error';
}

function getPublicOrigin(req: express.Request): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ||
    req.protocol ||
    'https';
  const host =
    (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
    req.get('host') ||
    `localhost:${PORT}`;
  return resolveCanonicalOrigin(
    {
      appUrl: process.env.APP_URL,
      renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
    },
    `${proto}://${host}`
  );
}

function getGoogleVerificationToken(): string {
  return sanitizeGoogleSiteVerificationToken(
    process.env.GOOGLE_SITE_VERIFICATION || process.env.VITE_GOOGLE_SITE_VERIFICATION || ''
  );
}

const PUBLIC_SITEMAP_SLUGS = ['aurelia-estates'];
const PUBLIC_SITEMAP_PROPERTIES = [
  { slug: 'aurelia-estates', id: 'blr-2001' },
  { slug: 'aurelia-estates', id: 'blr-2002' },
  { slug: 'aurelia-estates', id: 'blr-2003' },
  { slug: 'aurelia-estates', id: 'blr-2004' },
  { slug: 'aurelia-estates', id: 'blr-2005' },
  { slug: 'aurelia-estates', id: 'aur-1001' },
  { slug: 'aurelia-estates', id: 'aur-1002' },
  { slug: 'aurelia-estates', id: 'aur-1003' },
  { slug: 'aurelia-estates', id: 'aur-1004' },
];

// Cloud Run liveness/readiness probe
app.get('/healthz', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

// Dynamic SEO robots.txt & sitemap.xml (uses Cloud Run APP_URL or live host)
app.get('/robots.txt', (req, res) => {
  const origin = getPublicOrigin(req);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(buildRobotsTxt(origin));
});

app.get('/sitemap.xml', (req, res) => {
  const origin = getPublicOrigin(req);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res
    .type('application/xml')
    .send(buildSitemapXml(origin, PUBLIC_SITEMAP_SLUGS, PUBLIC_SITEMAP_PROPERTIES));
});

app.get('/api/health', (req, res) => {
  const smtp = getSmtpConfig();
  res.json({
    status: 'ok',
    environment: IS_PRODUCTION ? 'production' : 'development',
    publicOrigin: getPublicOrigin(req),
    services: {
      aiConfigured: Boolean(getGeminiClient()),
      smtpConfigured: smtp.configured,
      googleVerificationConfigured: Boolean(getGoogleVerificationToken()),
      seoEnabled: true,
      analyticsEnabled: true,
    },
    seoRoutes: ['/robots.txt', '/sitemap.xml'],
    contactEmail: smtp.businessEmail,
    timestamp: new Date().toISOString(),
  });
});

// 1. Multi-turn Real Estate Concierge Chat (gemini-4-hydrogen)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { messages, contextSummary } = req.body as {
      messages?: Array<{ role: 'user' | 'model'; text: string }>;
      contextSummary?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const trimmedHistory = messages.slice(-14).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 2000) }],
    }));

    const latest = trimmedHistory[trimmedHistory.length - 1];
    const prior = trimmedHistory.slice(0, -1);

    const systemInstruction = [
      'You are EstateDirect Concierge, an editorial luxury Indian real-estate advisor for discerning buyers, investors, and brokers.',
      'Be warm, crisp, quantitative, and practical. Format Indian prices in Crores (Cr) and Lakhs (L).',
      'Answer concisely in 2–4 short paragraphs or crisp bullet points. Never fabricate RERA numbers or legal guarantees; advise verifying official RERA records.',
      contextSummary ? `Active platform context:\n${String(contextSummary).slice(0, 2500)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const chat = ai.chats.create({
      model: 'gemini-4-hydrogen',
      history: prior,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const response = await chat.sendMessage({ message: latest.parts[0].text });
    return res.json({
      text: response.text || 'I could not generate a response right now. Please try again.',
      model: 'gemini-4-hydrogen',
    });
  } catch (err) {
    console.error('Gemini chat error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 2. Ultra-Low-Latency Responses (gemini-3.1-flash-lite)
app.post('/api/ai/quick', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { task, prompt, context } = req.body as {
      task?: 'describe_property' | 'analytics_summary' | 'quick_answer';
      prompt?: string;
      context?: string;
    };

    const safePrompt = String(prompt || '').trim().slice(0, 2000);
    const safeContext = String(context || '').trim().slice(0, 3000);

    if (!safePrompt && !safeContext) {
      return res.status(400).json({ error: 'Prompt or context is required.' });
    }

    let systemInstruction =
      'You are an ultra-fast luxury real-estate assistant. Reply clearly, accurately, and concisely in under 120 words.';
    let contents = safePrompt;

    if (task === 'describe_property') {
      systemInstruction =
        'You write editorial Architectural Digest-grade property descriptions for Indian luxury real estate. Write one refined, concrete 90–120 word listing description without clichés, hashtags, or bullet spam.';
      contents = `Draft an editorial property description from these facts:\n${safeContext}\n${safePrompt}`;
    } else if (task === 'analytics_summary') {
      systemInstruction =
        'You are a sharp real-estate brokerage analyst. Summarize catalog conversion performance in 3 concrete, actionable bullet points citing the exact numbers provided.';
      contents = `Analyze these brokerage metrics:\n${safeContext}\n${safePrompt}`;
    } else if (safeContext) {
      contents = `Context:\n${safeContext}\n\nQuestion: ${safePrompt}`;
    }

    const startedAt = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      text: response.text || '',
      model: 'gemini-3.1-flash-lite',
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error('Gemini quick error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 3. Google Search Grounding for Live Locality Market Intelligence (gemini-4-hydrogen)
app.post('/api/ai/search-insights', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { locality, city, propertyType, kind } = req.body as {
      locality?: string;
      city?: string;
      propertyType?: string;
      kind?: string;
    };

    const loc = String(locality || '').trim().slice(0, 100);
    const cty = String(city || '').trim().slice(0, 80);
    if (!loc || !cty) {
      return res.status(400).json({ error: 'Locality and city are required.' });
    }

    const query = `Provide a concise, up-to-date real estate market briefing for ${loc}, ${cty} (focusing on ${propertyType || 'luxury residences'} for ${kind === 'rent' ? 'leasing' : 'purchase'}). Cover: (1) current price per sq ft or rental band, (2) major infrastructure or metro/road catalysts, and (3) buyer demand and livability highlights. Keep it to 4 crisp bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Array<{ title: string; uri: string }> = [];
    const seen = new Set<string>();

    for (const chunk of rawChunks as Array<{ web?: { uri?: string; title?: string } }>) {
      const uri = chunk?.web?.uri;
      if (uri && (uri.startsWith('https://') || uri.startsWith('http://')) && !seen.has(uri)) {
        seen.add(uri);
        sources.push({
          title: chunk.web?.title || uri,
          uri,
        });
      }
    }

    return res.json({
      text: response.text || 'No market summary returned.',
      sources,
      model: 'gemini-4-hydrogen',
    });
  } catch (err) {
    console.error('Gemini Search Grounding error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 4. Google Maps Grounding for Nearby Landmarks & Places (gemini-4-hydrogen)
app.post('/api/ai/maps-nearby', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { locality, city, latitude, longitude, category } = req.body as {
      locality?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      category?: string;
    };

    const loc = String(locality || '').trim().slice(0, 100);
    const cty = String(city || '').trim().slice(0, 80);
    if (!loc || !cty) {
      return res.status(400).json({ error: 'Locality and city are required.' });
    }

    const cat = String(category || 'top schools, fine dining restaurants, hospitals, parks, and transit hubs').slice(0, 140);
    const prompt = `What are the best ${cat} near ${loc}, ${cty}? Give a concise neighborhood guide with distances/highlights.`;

    const lat = typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : 19.0596;
    const lng = typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : 72.8295;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        },
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const places: Array<{ title: string; uri: string; snippet?: string }> = [];
    const seen = new Set<string>();

    for (const chunk of rawChunks as Array<{
      maps?: {
        uri?: string;
        title?: string;
        placeAnswerSources?: { reviewSnippets?: Array<{ content?: string; text?: string }> };
      };
    }>) {
      const maps = chunk?.maps;
      const uri = maps?.uri;
      if (uri && (uri.startsWith('https://') || uri.startsWith('http://')) && !seen.has(uri)) {
        seen.add(uri);
        const firstSnippet =
          maps?.placeAnswerSources?.reviewSnippets?.[0]?.content ||
          maps?.placeAnswerSources?.reviewSnippets?.[0]?.text;
        places.push({
          title: maps?.title || 'View on Google Maps',
          uri,
          snippet: firstSnippet,
        });
      }
    }

    return res.json({
      text: response.text || 'No neighborhood places returned.',
      places,
      model: 'gemini-4-hydrogen',
    });
  } catch (err) {
    console.error('Gemini Maps Grounding error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 5. Google Meet API proxy (passes client-side Google Workspace OAuth Bearer token)
app.post('/api/meet/spaces', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Google Workspace access token required.' });
    }

    const upstream = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: payload?.error?.message || 'Unable to create Google Meet room.',
      });
    }

    return res.json(payload);
  } catch (err) {
    console.error('Google Meet space creation error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// --- Mailer (Zoho Mail SMTP via environment secrets) & Rate Limiting ---
const otpStore = new Map<string, OtpRecord>();
const rateBucket = new Map<string, number[]>();

// Periodic cleanup prevents unbounded memory growth in long-running production processes
setInterval(() => {
  const now = Date.now();
  for (const [email, rec] of otpStore.entries()) {
    if (now > rec.expiresAtMs) otpStore.delete(email);
  }
  for (const [key, timestamps] of rateBucket.entries()) {
    const active = timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (active.length === 0) rateBucket.delete(key);
    else rateBucket.set(key, active);
  }
}, 5 * 60 * 1000).unref();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (rateBucket.get(key) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= maxRequests) {
    rateBucket.set(key, recent);
    return false;
  }
  recent.push(now);
  rateBucket.set(key, recent);
  return true;
}

function hashOtpCode(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}::${code.trim()}`)
    .digest('hex');
}

function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || 'smtp.zoho.in').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = (process.env.SMTP_USER || BUSINESS_CONTACT_EMAIL).trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const from = (process.env.SMTP_FROM || `EstateDirect <${user}>`).trim();
  const businessEmail = (process.env.BUSINESS_CONTACT_EMAIL || BUSINESS_CONTACT_EMAIL).trim();
  const configured = Boolean(pass && pass !== 'MY_SMTP_PASS');
  return { host, port, secure, user, pass, from, businessEmail, configured };
}

function createSmtpTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}

// 6. Email OTP Sign-In / Verification (Send 6-digit OTP via Zoho Mail SMTP)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const rawEmail = String((req.body as { email?: string })?.email || '');
    if (!isValidEmail(rawEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const email = normalizeEmail(rawEmail);

    const ipKey = `otp:${req.ip || 'local'}:${email}`;
    if (!checkRateLimit(ipKey, 6, 15 * 60 * 1000)) {
      return res
        .status(429)
        .json({ error: 'Too many OTP requests. Please wait a few minutes before retrying.' });
    }

    const existing = otpStore.get(email);
    const cooldown = canRequestNewOtp(existing, Date.now());
    if (!cooldown.allowed) {
      return res.status(429).json({
        error: `Please wait ${cooldown.waitSeconds}s before requesting a new verification code.`,
        waitSeconds: cooldown.waitSeconds,
      });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const now = Date.now();
    otpStore.set(email, {
      email,
      codeHash: hashOtpCode(email, code),
      createdAtMs: now,
      expiresAtMs: now + OTP_EXPIRY_MS,
      attempts: 0,
    });

    const smtpCfg = getSmtpConfig();
    const transporter = createSmtpTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: smtpCfg.from,
        to: email,
        replyTo: smtpCfg.businessEmail,
        subject: `${code} is your EstateDirect verification code`,
        text: [
          `Your EstateDirect one-time verification code is: ${code}`,
          '',
          'This code expires in 10 minutes. If you did not request this sign-in, you can safely ignore this email.',
          '',
          `— EstateDirect (${smtpCfg.businessEmail})`,
        ].join('\n'),
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF7F2; padding: 32px; border-radius: 20px; color: #17120F;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #9D7D44; font-weight: 700; margin: 0 0 8px;">EstateDirect Sign-In</p>
            <h2 style="margin: 0 0 12px; font-size: 22px;">Your verification code</h2>
            <p style="font-size: 14px; color: #4A403A; line-height: 1.6;">Use this 6-digit OTP to verify your email address and access your EstateDirect workspace:</p>
            <div style="background: #17120F; color: #FAF7F2; font-size: 30px; font-weight: 800; letter-spacing: 0.28em; text-align: center; padding: 18px 24px; border-radius: 16px; margin: 22px 0;">${code}</div>
            <p style="font-size: 12px; color: #6E625B;">Valid for 10 minutes. Support: <a href="mailto:${smtpCfg.businessEmail}" style="color: #9D7D44;">${smtpCfg.businessEmail}</a></p>
          </div>
        `,
      });

      return res.json({
        ok: true,
        delivery: 'smtp',
        smtpConfigured: true,
        expiresInMinutes: 10,
        message: `A 6-digit verification code has been emailed to ${email} via ${smtpCfg.user}.`,
      });
    }

    // In production, NEVER return previewOtp in API responses if SMTP_PASS is missing
    if (IS_PRODUCTION) {
      otpStore.delete(email);
      return res.status(503).json({
        error: `Email OTP service requires SMTP_PASS to be configured on the server. Please sign in with Google or contact ${smtpCfg.businessEmail}.`,
      });
    }

    // Development/preview fallback when SMTP_PASS secret is not yet added in Settings > Secrets
    return res.json({
      ok: true,
      delivery: 'preview',
      smtpConfigured: false,
      previewOtp: code,
      expiresInMinutes: 10,
      message: `Preview mode active (add SMTP_PASS for ${smtpCfg.user} in Settings > Secrets to send live Zoho emails).`,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Unable to dispatch verification code. Please try again.' });
  }
});

// 7. Verify 6-digit Email OTP
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email: rawEmail, code: rawCode } = req.body as { email?: string; code?: string };
    if (!isValidEmail(String(rawEmail || ''))) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    const email = normalizeEmail(String(rawEmail));
    const code = String(rawCode || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    }

    const record = otpStore.get(email);
    const submittedHash = hashOtpCode(email, code);
    let hashesMatch = false;
    if (record && record.codeHash.length === submittedHash.length) {
      hashesMatch = crypto.timingSafeEqual(
        Buffer.from(record.codeHash, 'utf-8'),
        Buffer.from(submittedHash, 'utf-8')
      );
    }

    const result = evaluateOtpVerification(record, submittedHash, hashesMatch, Date.now());
    if (!result.ok) {
      if (record && (result.reason === 'mismatch' || result.reason === 'locked')) {
        record.attempts += 1;
        if (result.reason === 'locked') {
          otpStore.delete(email);
        }
      } else if (result.reason === 'expired') {
        otpStore.delete(email);
      }

      const errorMessages: Record<string, string> = {
        missing: 'No active OTP found for this email. Request a fresh code.',
        expired: 'This verification code has expired. Request a new code.',
        locked: 'Too many incorrect attempts. Please request a new code.',
        mismatch: `Incorrect code. ${result.remainingAttempts ?? 0} attempt(s) remaining.`,
      };
      return res.status(400).json({ error: errorMessages[result.reason || 'mismatch'] });
    }

    otpStore.delete(email);
    return res.json({ ok: true, verifiedEmail: email });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'OTP verification failed.' });
  }
});

// 8. Site Visit Calendar Booking + Automatic Email Alert to Registered Owner Mail ID
app.post('/api/bookings/notify', async (req, res) => {
  try {
    const ipKey = `booking:${req.ip || 'local'}`;
    if (!checkRateLimit(ipKey, 12, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many booking requests. Please try again shortly.' });
    }

    const body = req.body as {
      propertyTitle?: string;
      propertyCode?: string;
      location?: string;
      preferredDate?: string;
      preferredTime?: string;
      visitorName?: string;
      visitorPhone?: string;
      visitorEmail?: string;
      agencyName?: string;
      ownerEmail?: string;
      notes?: string;
    };

    const propertyTitle = String(body.propertyTitle || '').trim().slice(0, 140);
    const propertyCode = String(body.propertyCode || 'PROP').trim().slice(0, 32);
    const location = String(body.location || 'Bengaluru').trim().slice(0, 160);
    const preferredDate = String(body.preferredDate || '').trim().slice(0, 20);
    const preferredTime = String(body.preferredTime || '11:00').trim().slice(0, 10);
    const visitorName = String(body.visitorName || '').trim().slice(0, 100);
    const visitorPhone = String(body.visitorPhone || '').trim().slice(0, 30);
    const visitorEmail = body.visitorEmail && isValidEmail(body.visitorEmail)
      ? normalizeEmail(body.visitorEmail)
      : undefined;
    const agencyName = String(body.agencyName || 'EstateDirect Partner').trim().slice(0, 120);
    const smtpCfg = getSmtpConfig();
    const ownerEmail =
      body.ownerEmail && isValidEmail(body.ownerEmail)
        ? normalizeEmail(body.ownerEmail)
        : smtpCfg.businessEmail;
    const notes = String(body.notes || '').trim().slice(0, 800);

    if (!propertyTitle || !visitorName || !visitorPhone || !preferredDate) {
      return res.status(400).json({ error: 'Property, visitor name, phone, and date are required.' });
    }

    const calendarInput = {
      propertyTitle,
      propertyCode,
      location,
      date: preferredDate,
      time: preferredTime,
      visitorName,
      visitorPhone,
      visitorEmail,
      agencyName,
      ownerEmail,
      notes,
    };

    const ics = buildIcsCalendarInvite(calendarInput);
    const googleCalendarUrl = buildGoogleCalendarDeepLink(calendarInput);

    const transporter = createSmtpTransporter();
    let emailSent = false;
    let deliveryMode: 'smtp' | 'preview' = 'preview';

    if (transporter) {
      const bccList =
        ownerEmail.toLowerCase() !== smtpCfg.businessEmail.toLowerCase()
          ? smtpCfg.businessEmail
          : undefined;

      await transporter.sendMail({
        from: smtpCfg.from,
        to: ownerEmail,
        bcc: bccList,
        replyTo: visitorEmail || smtpCfg.businessEmail,
        subject: `New Site Visit Booking: ${sanitizeHeaderValue(propertyTitle)} (${sanitizeHeaderValue(propertyCode)})`,
        text: [
          `Hello ${agencyName},`,
          '',
          `A client has booked a site visit on EstateDirect:`,
          '',
          `Property: ${propertyTitle} (${propertyCode})`,
          `Location: ${location}`,
          `Requested Date & Time: ${preferredDate} at ${preferredTime} IST`,
          `Client Name: ${visitorName}`,
          `Client Phone / WhatsApp: ${visitorPhone}`,
          visitorEmail ? `Client Email: ${visitorEmail}` : '',
          notes ? `Client Message: ${notes}` : '',
          '',
          `Add directly to Google Calendar: ${googleCalendarUrl}`,
          '',
          `A .ics calendar invite is attached to this email.`,
          `— EstateDirect (${smtpCfg.businessEmail})`,
        ]
          .filter(Boolean)
          .join('\n'),
        attachments: [
          {
            filename: ics.filename,
            content: ics.icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
      });

      // Also email a booking confirmation copy to the visitor if they provided their email
      if (visitorEmail) {
        await transporter.sendMail({
          from: smtpCfg.from,
          to: visitorEmail,
          replyTo: ownerEmail,
          subject: `Site Visit Requested: ${sanitizeHeaderValue(propertyTitle)}`,
          text: [
            `Hi ${visitorName},`,
            '',
            `Your site visit request for ${propertyTitle} (${propertyCode}) with ${agencyName} has been sent to their registered email (${ownerEmail}).`,
            '',
            `Date & Time: ${preferredDate} at ${preferredTime} IST`,
            `Location: ${location}`,
            '',
            `Add to Google Calendar: ${googleCalendarUrl}`,
            '',
            `— EstateDirect (${smtpCfg.businessEmail})`,
          ].join('\n'),
          attachments: [
            {
              filename: ics.filename,
              content: ics.icsContent,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });
      }

      emailSent = true;
      deliveryMode = 'smtp';
    }

    return res.json({
      ok: true,
      emailSent,
      deliveryMode,
      recipientEmail: ownerEmail,
      businessEmail: smtpCfg.businessEmail,
      googleCalendarUrl,
      icsContent: ics.icsContent,
      icsFilename: ics.filename,
      startIso: ics.startIso,
      endIso: ics.endIso,
      message: emailSent
        ? `Booking alert & calendar invite emailed to ${ownerEmail}.`
        : `Calendar invite generated for ${ownerEmail}. Configure SMTP_PASS in Settings > Secrets for automatic Zoho Mail dispatch.`,
    });
  } catch (err) {
    console.error('Booking notification error:', err);
    return res.status(500).json({ error: 'Could not process booking notification.' });
  }
});

// 9. Contact Us Enquiry Form -> estatedirect@zohomail.in
app.post('/api/contact', async (req, res) => {
  try {
    const ipKey = `contact:${req.ip || 'local'}`;
    if (!checkRateLimit(ipKey, 8, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many messages sent. Please wait a few minutes.' });
    }

    const body = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      topic?: string;
      message?: string;
    };

    const formInput = {
      name: String(body.name || '').trim(),
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      topic: String(body.topic || 'General Enquiry').trim().slice(0, 80),
      message: String(body.message || '').trim(),
    };

    const validation = validateContactForm(formInput);
    if (!validation.valid) {
      return res.status(400).json({
        error: Object.values(validation.errors)[0] || 'Please check your form details.',
        errors: validation.errors,
      });
    }

    const smtpCfg = getSmtpConfig();
    const transporter = createSmtpTransporter();
    let emailSent = false;

    if (transporter) {
      await transporter.sendMail({
        from: smtpCfg.from,
        to: smtpCfg.businessEmail,
        replyTo: formInput.email,
        subject: `[EstateDirect Contact] ${sanitizeHeaderValue(formInput.topic)} — ${sanitizeHeaderValue(formInput.name)}`,
        text: [
          `New Contact Us message for EstateDirect:`,
          '',
          `Name: ${formInput.name}`,
          `Email: ${formInput.email}`,
          formInput.phone ? `Phone / WhatsApp: ${formInput.phone}` : '',
          `Topic: ${formInput.topic}`,
          '',
          `Message:`,
          formInput.message,
        ]
          .filter(Boolean)
          .join('\n'),
      });
      emailSent = true;
    }

    return res.json({
      ok: true,
      emailSent,
      recipientEmail: smtpCfg.businessEmail,
      message: emailSent
        ? `Your message has been delivered to ${smtpCfg.businessEmail}.`
        : `Message logged for ${smtpCfg.businessEmail}. You can also reach us instantly on WhatsApp or direct email.`,
    });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Unable to send your message right now.' });
  }
});

// 10. Google Calendar API v3 proxy (uses signed-in user's Google Workspace Bearer token)
app.post('/api/calendar/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Google Calendar authorization required. Sign in with Google first.' });
    }

    const body = req.body as {
      summary?: string;
      description?: string;
      location?: string;
      startIso?: string;
      endIso?: string;
      attendeeEmails?: string[];
    };

    const summary = String(body.summary || '').trim().slice(0, 180);
    const description = String(body.description || '').trim().slice(0, 2000);
    const location = String(body.location || '').trim().slice(0, 200);
    const startIso = String(body.startIso || '').trim();
    const endIso = String(body.endIso || '').trim();

    if (!summary || !startIso || !endIso) {
      return res.status(400).json({ error: 'Event summary, start time, and end time are required.' });
    }

    const attendees = Array.isArray(body.attendeeEmails)
      ? body.attendeeEmails
          .filter((e) => typeof e === 'string' && isValidEmail(e))
          .slice(0, 10)
          .map((e) => ({ email: normalizeEmail(e) }))
      : [];

    const upstream = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description,
          location,
          start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
          end: { dateTime: endIso, timeZone: 'Asia/Kolkata' },
          attendees,
        }),
      }
    );

    const payload = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: payload?.error?.message || 'Unable to create Google Calendar event.',
      });
    }

    return res.json({
      id: payload.id,
      htmlLink: payload.htmlLink,
      status: payload.status,
    });
  } catch (err) {
    console.error('Google Calendar event error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 11. Gmail API v1 Send proxy (uses signed-in user's Google Workspace Bearer token)
app.post('/api/gmail/send', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Gmail authorization required. Sign in with Google first.' });
    }

    const body = req.body as {
      to?: string;
      subject?: string;
      textBody?: string;
      replyTo?: string;
    };

    if (!body.to || !isValidEmail(body.to)) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }
    const subject = String(body.subject || '').trim().slice(0, 200);
    const textBody = String(body.textBody || '').trim().slice(0, 5000);
    if (!subject || !textBody) {
      return res.status(400).json({ error: 'Email subject and message body are required.' });
    }

    const raw = buildGmailRawMessage({
      to: normalizeEmail(body.to),
      subject,
      body: textBody,
      replyTo: body.replyTo && isValidEmail(body.replyTo) ? normalizeEmail(body.replyTo) : undefined,
    });

    const upstream = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: payload?.error?.message || 'Unable to send email via Gmail.',
      });
    }

    return res.json({ id: payload.id, threadId: payload.threadId });
  } catch (err) {
    console.error('Gmail send error:', err);
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
});

// 12. First-Party Web Analytics (Privacy-friendly, bounded memory for Cloud Run Free Tier)
const MAX_ANALYTICS_HITS = 5000;
const webAnalyticsHits: WebAnalyticsHit[] = [];

const VALID_SOURCES = new Set<WebAnalyticsHit['source']>([
  'Direct',
  'Google Search',
  'WhatsApp',
  'Social',
  'Referral',
]);

app.post('/api/analytics/collect', (req, res) => {
  const ipKey = `analytics:${req.ip || 'local'}`;
  if (!checkRateLimit(ipKey, 120, 5 * 60 * 1000)) {
    return res.status(204).end();
  }

  const body = req.body as Partial<WebAnalyticsHit>;
  const hitType = body.type === 'event' ? 'event' : 'page_view';
  const name = String(body.name || hitType).replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 64) || 'page_view';
  const rawPath = String(body.path || '/').trim().slice(0, 180);
  const safePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const source = VALID_SOURCES.has(body.source as WebAnalyticsHit['source'])
    ? (body.source as WebAnalyticsHit['source'])
    : 'Direct';
  const device = body.device === 'Mobile' ? 'Mobile' : 'Desktop';
  const sessionId = String(body.sessionId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);

  webAnalyticsHits.push({
    type: hitType,
    name,
    path: safePath,
    title: body.title ? String(body.title).slice(0, 140) : undefined,
    source,
    device,
    sessionId,
    timestamp: new Date().toISOString(),
  });

  if (webAnalyticsHits.length > MAX_ANALYTICS_HITS) {
    webAnalyticsHits.splice(0, webAnalyticsHits.length - MAX_ANALYTICS_HITS);
  }

  return res.status(202).json({ ok: true });
});

app.get('/api/analytics/summary', (req, res) => {
  const rawDays = Number(req.query.days || 30);
  const windowDays = rawDays === 7 || rawDays === 90 ? rawDays : 30;
  return res.json(summarizeWebTraffic(webAnalyticsHits, windowDays));
});

// Explicit JSON 404 for unknown /api/* paths so SPA fallback never returns HTML for API requests
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

async function startServer() {
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const rawHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';
    const verifiedHtml = rawHtml
      ? injectGoogleSiteVerificationMeta(rawHtml, getGoogleVerificationToken())
      : '';

    app.use(express.static(distPath, { maxAge: '1h', etag: true, index: false }));
    app.get('*', (_req, res) => {
      if (verifiedHtml) {
        res.setHeader('Cache-Control', 'no-cache');
        return res.type('text/html; charset=utf-8').send(verifiedHtml);
      }
      return res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EstateDirect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

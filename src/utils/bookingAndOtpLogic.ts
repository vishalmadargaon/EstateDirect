export const BUSINESS_CONTACT_EMAIL = 'estatedirect@zohomail.in';
export const BUSINESS_WHATSAPP_NUMBER = '+91 98204 11890';

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const OTP_MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const clean = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean) && clean.length <= 160;
}

export function sanitizeHeaderValue(value: string): string {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 300);
}

export interface OtpRecord {
  email: string;
  codeHash: string;
  createdAtMs: number;
  expiresAtMs: number;
  attempts: number;
}

export function canRequestNewOtp(
  existing: OtpRecord | undefined,
  nowMs: number = Date.now()
): { allowed: boolean; waitSeconds: number } {
  if (!existing) {
    return { allowed: true, waitSeconds: 0 };
  }
  const elapsed = nowMs - existing.createdAtMs;
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000),
    };
  }
  return { allowed: true, waitSeconds: 0 };
}

export function evaluateOtpVerification(
  record: OtpRecord | undefined,
  submittedHash: string,
  hashesMatch: boolean,
  nowMs: number = Date.now()
): {
  ok: boolean;
  reason?: 'missing' | 'expired' | 'locked' | 'mismatch';
  remainingAttempts?: number;
} {
  if (!record) {
    return { ok: false, reason: 'missing' };
  }
  if (nowMs > record.expiresAtMs) {
    return { ok: false, reason: 'expired' };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: 'locked', remainingAttempts: 0 };
  }
  if (!submittedHash || !hashesMatch) {
    const nextAttempts = record.attempts + 1;
    return {
      ok: false,
      reason: nextAttempts >= OTP_MAX_ATTEMPTS ? 'locked' : 'mismatch',
      remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - nextAttempts),
    };
  }
  return { ok: true };
}

export interface SiteVisitCalendarInput {
  propertyTitle: string;
  propertyCode: string;
  location: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm (24h, defaults to 11:00)
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  agencyName: string;
  ownerEmail: string;
  notes?: string;
}

function escapeIcsText(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function parseDateAndTimeToUtcStamp(dateStr: string, timeStr: string = '11:00'): {
  startUtc: string;
  endUtc: string;
  startIso: string;
  endIso: string;
} {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())
    ? dateStr.trim()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const safeTime = /^\d{2}:\d{2}$/.test((timeStr || '').trim()) ? timeStr.trim() : '11:00';

  // Interpret slot in IST (+05:30) for Indian real-estate site visits
  const startIso = `${safeDate}T${safeTime}:00+05:30`;
  const startDate = new Date(startIso);
  const validStart = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const endDate = new Date(validStart.getTime() + 60 * 60 * 1000);

  const toIcsUtc = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  return {
    startUtc: toIcsUtc(validStart),
    endUtc: toIcsUtc(endDate),
    startIso: validStart.toISOString(),
    endIso: endDate.toISOString(),
  };
}

export function buildIcsCalendarInvite(input: SiteVisitCalendarInput): {
  icsContent: string;
  startIso: string;
  endIso: string;
  filename: string;
} {
  const { startUtc, endUtc, startIso, endIso } = parseDateAndTimeToUtcStamp(
    input.date,
    input.time
  );
  const uid = `estatedirect-${input.propertyCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}@estatedirect.in`;
  const nowUtc = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  const summary = `Site Visit: ${input.propertyTitle} (${input.propertyCode})`;
  const descriptionLines = [
    `Property: ${input.propertyTitle} (${input.propertyCode})`,
    `Agency / Builder: ${input.agencyName}`,
    `Client: ${input.visitorName}`,
    `Client Phone / WhatsApp: ${input.visitorPhone}`,
    input.visitorEmail ? `Client Email: ${input.visitorEmail}` : '',
    input.notes ? `Notes: ${input.notes}` : '',
    `Booked via EstateDirect (${BUSINESS_CONTACT_EMAIL})`,
  ]
    .filter(Boolean)
    .join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EstateDirect//Site Visit Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines)}`,
    `ORGANIZER;CN=${escapeIcsText(input.agencyName)}:mailto:${sanitizeHeaderValue(input.ownerEmail || BUSINESS_CONTACT_EMAIL)}`,
    input.visitorEmail && isValidEmail(input.visitorEmail)
      ? `ATTENDEE;CN=${escapeIcsText(input.visitorName)};RSVP=TRUE:mailto:${sanitizeHeaderValue(input.visitorEmail)}`
      : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const safeSlug = input.propertyCode.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return {
    icsContent: `${lines.join('\r\n')}\r\n`,
    startIso,
    endIso,
    filename: `estatedirect-visit-${safeSlug}.ics`,
  };
}

export function buildGoogleCalendarDeepLink(input: SiteVisitCalendarInput): string {
  const { startUtc, endUtc } = parseDateAndTimeToUtcStamp(input.date, input.time);
  const text = `Site Visit: ${input.propertyTitle} (${input.propertyCode})`;
  const details = [
    `Hosted by ${input.agencyName}`,
    `Client: ${input.visitorName} (${input.visitorPhone})`,
    input.notes ? `Notes: ${input.notes}` : '',
    `Support: ${BUSINESS_CONTACT_EMAIL}`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${startUtc}/${endUtc}`,
    details,
    location: input.location,
  });

  if (input.ownerEmail && isValidEmail(input.ownerEmail)) {
    params.append('add', normalizeEmail(input.ownerEmail));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildGmailRawMessage(input: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): string {
  const headers = [
    `To: ${sanitizeHeaderValue(input.to)}`,
    input.replyTo ? `Reply-To: ${sanitizeHeaderValue(input.replyTo)}` : '',
    `Subject: ${sanitizeHeaderValue(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ].filter(Boolean);

  const mime = `${headers.join('\r\n')}\r\n\r\n${input.body}`;
  return Buffer.from(mime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface ContactFormInput {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}

export function validateContactForm(input: ContactFormInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (input.name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }
  if (!isValidEmail(input.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  const phoneDigits = input.phone.replace(/[^\d]/g, '');
  if (input.phone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
    errors.phone = 'Enter a valid 10–15 digit WhatsApp / phone number.';
  }
  if (input.message.trim().length < 10) {
    errors.message = 'Please include a short message (at least 10 characters).';
  } else if (input.message.trim().length > 2000) {
    errors.message = 'Message must be 2,000 characters or fewer.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSINESS_CONTACT_EMAIL,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  buildGmailRawMessage,
  buildGoogleCalendarDeepLink,
  buildIcsCalendarInvite,
  canRequestNewOtp,
  evaluateOtpVerification,
  isValidEmail,
  sanitizeHeaderValue,
  validateContactForm,
} from './bookingAndOtpLogic';

test('business contact email matches estatedirect@zohomail.in', () => {
  assert.equal(BUSINESS_CONTACT_EMAIL, 'estatedirect@zohomail.in');
  assert.equal(isValidEmail(BUSINESS_CONTACT_EMAIL), true);
  assert.equal(isValidEmail('invalid-email'), false);
});

test('OTP resend cooldown enforces 30s wait and unlocks afterward', () => {
  const baseNow = 1_700_000_000_000;
  const record = {
    email: 'builder@example.in',
    codeHash: 'abc123',
    createdAtMs: baseNow,
    expiresAtMs: baseNow + OTP_EXPIRY_MS,
    attempts: 0,
  };

  const blocked = canRequestNewOtp(record, baseNow + 10_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.waitSeconds, 20);

  const allowed = canRequestNewOtp(record, baseNow + OTP_RESEND_COOLDOWN_MS + 1);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.waitSeconds, 0);
});

test('OTP verification checks missing, expiry, mismatch attempts, and success', () => {
  const baseNow = 1_700_000_000_000;
  assert.equal(evaluateOtpVerification(undefined, 'h', false, baseNow).reason, 'missing');

  const record = {
    email: 'buyer@example.in',
    codeHash: 'expected-hash',
    createdAtMs: baseNow,
    expiresAtMs: baseNow + OTP_EXPIRY_MS,
    attempts: 0,
  };

  const mismatch = evaluateOtpVerification(record, 'wrong', false, baseNow + 1000);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.reason, 'mismatch');
  assert.equal(mismatch.remainingAttempts, OTP_MAX_ATTEMPTS - 1);

  const expired = evaluateOtpVerification(record, 'expected-hash', true, baseNow + OTP_EXPIRY_MS + 1);
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, 'expired');

  const locked = evaluateOtpVerification(
    { ...record, attempts: OTP_MAX_ATTEMPTS },
    'expected-hash',
    true,
    baseNow + 1000
  );
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, 'locked');

  const ok = evaluateOtpVerification(record, 'expected-hash', true, baseNow + 1000);
  assert.equal(ok.ok, true);
});

test('buildIcsCalendarInvite and buildGoogleCalendarDeepLink produce valid calendar payloads', () => {
  const input = {
    propertyTitle: 'The Veranda Residences',
    propertyCode: 'BLR-1001',
    location: 'Indiranagar, Bengaluru',
    date: '2026-12-15',
    time: '11:00',
    visitorName: 'Aarav Mehta',
    visitorPhone: '+91 98200 12345',
    visitorEmail: 'aarav@example.com',
    agencyName: 'Aurelia Estates',
    ownerEmail: 'owner@aureliaestates.in',
    notes: 'Interested in 4 BHK tower A',
  };

  const ics = buildIcsCalendarInvite(input);
  assert.ok(ics.icsContent.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.icsContent.includes('SUMMARY:Site Visit: The Veranda Residences (BLR-1001)'));
  assert.ok(ics.icsContent.includes('LOCATION:Indiranagar\\, Bengaluru'));
  assert.ok(ics.icsContent.includes('mailto:owner@aureliaestates.in'));
  assert.ok(ics.icsContent.includes('mailto:aarav@example.com'));
  assert.equal(ics.filename, 'estatedirect-visit-blr-1001.ics');

  const link = buildGoogleCalendarDeepLink(input);
  assert.ok(link.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(link.includes('action=TEMPLATE'));
  assert.ok(link.includes('owner%40aureliaestates.in'));
});

test('buildGmailRawMessage sanitizes CRLF header injection and base64url encodes', () => {
  assert.equal(sanitizeHeaderValue('Hello\r\nBcc: attacker@evil.com'), 'Hello Bcc: attacker@evil.com');

  const raw = buildGmailRawMessage({
    to: 'client@example.com\r\nBcc: evil@example.com',
    replyTo: BUSINESS_CONTACT_EMAIL,
    subject: 'Site Visit Confirmed',
    body: 'See you at 11:00 AM IST.',
  });
  assert.ok(!raw.includes('+'));
  assert.ok(!raw.includes('/'));
  assert.ok(!raw.includes('='));
  const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  assert.ok(decoded.includes('To: client@example.com Bcc: evil@example.com\r\n'));
  assert.ok(decoded.includes(`Reply-To: ${BUSINESS_CONTACT_EMAIL}\r\n`));
});

test('validateContactForm validates required fields cleanly', () => {
  const invalid = validateContactForm({
    name: 'A',
    email: 'bad',
    phone: '123',
    topic: 'General',
    message: 'short',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.message);

  const valid = validateContactForm({
    name: 'Vishal Madargaon',
    email: 'vishal@example.com',
    phone: '+91 98204 11890',
    topic: 'Builder Onboarding',
    message: 'I would like to list five new Bangalore projects on EstateDirect.',
  });
  assert.equal(valid.valid, true);
});

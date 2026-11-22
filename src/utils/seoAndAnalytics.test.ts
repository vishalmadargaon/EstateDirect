import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPropertyListingJsonLd,
  buildRobotsTxt,
  buildRouteSeo,
  buildSitemapXml,
  classifyTrafficSource,
  injectGoogleSiteVerificationMeta,
  isValidGa4MeasurementId,
  normalizeBaseUrl,
  resolveCanonicalOrigin,
  sanitizeGoogleSiteVerificationToken,
  summarizeWebTraffic,
  type WebAnalyticsHit,
} from './seoAndAnalytics';
import type { Property } from '../types';

const SAMPLE_PROP: Property = {
  id: 'blr-2001',
  ownerId: 'owner-aurelia',
  agencySlug: 'aurelia-estates',
  propertyCode: 'BLR-2001',
  title: 'Prestige Raintree Park — Phase 2 Lakeview Residences',
  builderName: 'Prestige Group',
  description: 'Lakeside luxury residences overlooking Varthur Lake in Whitefield, Bengaluru.',
  locality: 'Whitefield · Varthur Road',
  city: 'Bengaluru',
  kind: 'buy',
  propertyType: 'Apartment',
  projectStage: 'upcoming',
  reraApproved: true,
  reraNumber: 'PRM/KA/RERA/1251/446/PR/270824/006981',
  price: 28500000,
  beds: 3,
  baths: 3,
  sqft: 2450,
  parking: 2,
  amenities: ['Infinity Pool', 'Clubhouse'],
  furnishing: 'Unfurnished',
  facing: 'East',
  floor: '14th of 24',
  status: 'available',
  published: true,
  images: ['/assets/aistudio/Gemini_Generated_Image_e7l37be7l37be7l3_741afc4d.png'],
  createdAt: '2026-10-01T10:00:00.000Z',
};

test('isValidGa4MeasurementId validates standard GA4 measurement IDs', () => {
  assert.equal(isValidGa4MeasurementId('G-AB12CD34EF'), true);
  assert.equal(isValidGa4MeasurementId('g-9x8y7z6w'), true);
  assert.equal(isValidGa4MeasurementId('UA-123456-1'), false);
  assert.equal(isValidGa4MeasurementId(''), false);
  assert.equal(isValidGa4MeasurementId('G-12'), false);
});

test('normalizeBaseUrl strips trailing slashes and preserves scheme', () => {
  assert.equal(
    normalizeBaseUrl('https://estatedirect.run.app///'),
    'https://estatedirect.run.app'
  );
  assert.equal(normalizeBaseUrl('estatedirect.in/'), 'https://estatedirect.in');
});

test('buildRouteSeo produces indexable metadata for property pages and noindex for dashboard', () => {
  const propSeo = buildRouteSeo({
    pathname: '/c/aurelia-estates/p/blr-2001',
    origin: 'https://ais-pre-example.run.app',
    agencyName: 'Aurelia Estates',
    property: SAMPLE_PROP,
  });

  assert.equal(propSeo.robots, 'index, follow');
  assert.equal(propSeo.ogType, 'article');
  assert.ok(propSeo.title.includes('Prestige Raintree Park'));
  assert.ok(propSeo.title.includes('₹2.85 Cr'));
  assert.ok(propSeo.description.length <= 160);
  assert.equal((propSeo.jsonLd as { '@type': string })['@type'], 'RealEstateListing');

  const dashSeo = buildRouteSeo({
    pathname: '/dashboard',
    origin: 'https://ais-pre-example.run.app',
  });
  assert.equal(dashSeo.robots, 'noindex, nofollow');
});

test('buildPropertyListingJsonLd includes INR price, address, and floorSize', () => {
  const jsonLd = buildPropertyListingJsonLd(
    SAMPLE_PROP,
    'Aurelia Estates',
    'https://ais-pre-example.run.app/#/c/aurelia-estates/p/blr-2001',
    'https://ais-pre-example.run.app'
  ) as Record<string, unknown>;

  assert.equal(jsonLd['@type'], 'RealEstateListing');
  assert.equal((jsonLd.offers as { priceCurrency: string }).priceCurrency, 'INR');
  assert.equal((jsonLd.address as { addressRegion: string }).addressRegion, 'Bengaluru');
});

test('buildRobotsTxt and buildSitemapXml generate valid crawler files', () => {
  const robots = buildRobotsTxt('https://ais-pre-example.run.app/');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Sitemap: https://ais-pre-example.run.app/sitemap.xml'));

  const xml = buildSitemapXml(
    'https://ais-pre-example.run.app',
    ['aurelia-estates'],
    [{ slug: 'aurelia-estates', id: 'blr-2001' }],
    '2026-11-21T00:00:00.000Z'
  );
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<loc>https://ais-pre-example.run.app/</loc>'));
  assert.ok(xml.includes('<loc>https://ais-pre-example.run.app/#/c/aurelia-estates</loc>'));
  assert.ok(
    xml.includes('<loc>https://ais-pre-example.run.app/#/c/aurelia-estates/p/blr-2001</loc>')
  );
});

test('classifyTrafficSource categorizes Google, WhatsApp, Social, Referral, and Direct', () => {
  assert.equal(classifyTrafficSource('https://www.google.co.in/search?q=whitefield'), 'Google Search');
  assert.equal(classifyTrafficSource('', '?utm_source=whatsapp'), 'WhatsApp');
  assert.equal(classifyTrafficSource('https://l.instagram.com/'), 'Social');
  assert.equal(classifyTrafficSource('https://partnerblog.in/post'), 'Referral');
  assert.equal(classifyTrafficSource(''), 'Direct');
});

test('summarizeWebTraffic aggregates page views, unique sessions, sources, and events', () => {
  const now = Date.parse('2026-11-21T12:00:00.000Z');
  const hits: WebAnalyticsHit[] = [
    {
      type: 'page_view',
      name: 'page_view',
      path: '/',
      source: 'Google Search',
      device: 'Mobile',
      sessionId: 's1',
      timestamp: '2026-11-21T10:00:00.000Z',
    },
    {
      type: 'page_view',
      name: 'page_view',
      path: '/c/aurelia-estates/p/blr-2001',
      source: 'WhatsApp',
      device: 'Desktop',
      sessionId: 's2',
      timestamp: '2026-11-21T11:00:00.000Z',
    },
    {
      type: 'event',
      name: 'whatsapp_enquiry',
      path: '/c/aurelia-estates/p/blr-2001',
      source: 'WhatsApp',
      device: 'Desktop',
      sessionId: 's2',
      timestamp: '2026-11-21T11:02:00.000Z',
    },
    {
      type: 'page_view',
      name: 'page_view',
      path: '/',
      source: 'Direct',
      device: 'Desktop',
      sessionId: 'old-session',
      timestamp: '2026-08-01T10:00:00.000Z',
    },
  ];

  const summary = summarizeWebTraffic(hits, 30, now);
  assert.equal(summary.totalPageViews, 2);
  assert.equal(summary.uniqueSessions, 2);
  assert.equal(summary.conversionEvents, 1);
  assert.equal(summary.devices.mobile, 1);
  assert.equal(summary.devices.desktop, 1);
  assert.equal(summary.eventBreakdown[0].name, 'whatsapp_enquiry');
});

test('sanitizeGoogleSiteVerificationToken extracts safe tokens and rejects injection payloads', () => {
  assert.equal(
    sanitizeGoogleSiteVerificationToken('abc123_XYZ-987654321'),
    'abc123_XYZ-987654321'
  );
  assert.equal(
    sanitizeGoogleSiteVerificationToken(
      '<meta name="google-site-verification" content="Token_From_Meta_Tag_12345" />'
    ),
    'Token_From_Meta_Tag_12345'
  );
  assert.equal(sanitizeGoogleSiteVerificationToken('"><script>alert(1)</script>'), '');
  assert.equal(sanitizeGoogleSiteVerificationToken('short'), '');
});

test('injectGoogleSiteVerificationMeta injects once before </head> and skips invalid tokens', () => {
  const baseHtml = '<!doctype html><html><head><title>EstateDirect</title></head><body></body></html>';
  const injected = injectGoogleSiteVerificationMeta(baseHtml, 'VerifyToken_2026_Live');
  assert.ok(
    injected.includes('<meta name="google-site-verification" content="VerifyToken_2026_Live" />')
  );
  assert.equal(injectGoogleSiteVerificationMeta(injected, 'VerifyToken_2026_Live'), injected);
  assert.equal(injectGoogleSiteVerificationMeta(baseHtml, 'bad"token'), baseHtml);
});

test('resolveCanonicalOrigin prefers APP_URL, then RENDER_EXTERNAL_URL, then fallback', () => {
  assert.equal(
    resolveCanonicalOrigin(
      { appUrl: 'https://estatedirect.in/', renderExternalUrl: 'https://estatedirect.onrender.com' },
      'http://localhost:3000'
    ),
    'https://estatedirect.in'
  );
  assert.equal(
    resolveCanonicalOrigin(
      { appUrl: 'MY_APP_URL', renderExternalUrl: 'https://estatedirect.onrender.com/' },
      'http://localhost:3000'
    ),
    'https://estatedirect.onrender.com'
  );
  assert.equal(
    resolveCanonicalOrigin({}, 'https://custom-host.example.com/'),
    'https://custom-host.example.com'
  );
});


import type { Property } from '../types';
import { BUSINESS_CONTACT_EMAIL } from './bookingAndOtpLogic';
import { formatIndianPrice } from './realEstateLogic';

export const SITE_NAME = 'EstateDirect';
export const DEFAULT_SEO_TITLE =
  'EstateDirect — Luxury Real-Estate Catalog & WhatsApp Lead Platform';
export const DEFAULT_SEO_DESCRIPTION =
  'Publish a branded property catalog, showcase RERA-verified listings & 3D tours, and receive direct WhatsApp buyer leads free on EstateDirect.';
export const DEFAULT_OG_IMAGE_PATH =
  '/assets/aistudio/Gemini_Generated_Image_e7l37be7l37be7l3_741afc4d.png';

export interface RouteSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogImage: string;
  robots: string;
  jsonLd: Record<string, unknown>;
}

export interface WebAnalyticsHit {
  type: 'page_view' | 'event';
  name: string;
  path: string;
  title?: string;
  source: 'Direct' | 'Google Search' | 'WhatsApp' | 'Social' | 'Referral';
  device: 'Desktop' | 'Mobile';
  sessionId: string;
  timestamp: string;
}

export interface WebTrafficSummary {
  totalPageViews: number;
  uniqueSessions: number;
  conversionEvents: number;
  topPages: Array<{ path: string; views: number }>;
  sources: Array<{ source: string; count: number; percent: number }>;
  devices: { desktop: number; mobile: number };
  eventBreakdown: Array<{ name: string; count: number }>;
}

export function isValidGa4MeasurementId(raw: string): boolean {
  return /^G-[A-Z0-9]{6,12}$/.test(raw.trim().toUpperCase());
}

export function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'https://estatedirect.app';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

export function resolveAbsoluteAssetUrl(origin: string, assetPath: string): string {
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const base = normalizeBaseUrl(origin);
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${base}${cleanPath}`;
}

export function classifyTrafficSource(referrer: string, search = ''): WebAnalyticsHit['source'] {
  const combined = `${referrer} ${search}`.toLowerCase();
  if (combined.includes('whatsapp') || combined.includes('wa.me') || combined.includes('utm_source=whatsapp')) {
    return 'WhatsApp';
  }
  if (
    combined.includes('google.') ||
    combined.includes('bing.') ||
    combined.includes('duckduckgo.') ||
    combined.includes('yahoo.') ||
    combined.includes('utm_medium=organic')
  ) {
    return 'Google Search';
  }
  if (
    combined.includes('instagram.') ||
    combined.includes('facebook.') ||
    combined.includes('linkedin.') ||
    combined.includes('t.co') ||
    combined.includes('x.com') ||
    combined.includes('youtube.')
  ) {
    return 'Social';
  }
  if (referrer.trim().length > 0) {
    return 'Referral';
  }
  return 'Direct';
}

export function buildOrganizationAndAppJsonLd(origin: string): Record<string, unknown> {
  const baseUrl = normalizeBaseUrl(origin);
  const logoUrl = resolveAbsoluteAssetUrl(baseUrl, DEFAULT_OG_IMAGE_PATH);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: baseUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        description: DEFAULT_SEO_DESCRIPTION,
        image: logoUrl,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          email: BUSINESS_CONTACT_EMAIL,
          logo: {
            '@type': 'ImageObject',
            url: logoUrl,
          },
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Is EstateDirect really free to use for brokers and builders?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. EstateDirect is free forever for brokers, agents, property owners, and builders with zero commission or paid tiers.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do buyers enquire on WhatsApp and book site visits?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Every property page includes a one-tap WhatsApp enquiry link with property details prefilled, plus a site-visit booking calendar that routes alerts directly to the owner email.',
            },
          },
        ],
      },
    ],
  };
}

export function buildPropertyListingJsonLd(
  property: Property,
  agencyName: string,
  canonicalUrl: string,
  origin: string
): Record<string, unknown> {
  const primaryImage = property.images[0]
    ? resolveAbsoluteAssetUrl(origin, property.images[0])
    : resolveAbsoluteAssetUrl(origin, DEFAULT_OG_IMAGE_PATH);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description.slice(0, 320),
    url: canonicalUrl,
    image: primaryImage,
    datePosted: property.createdAt,
    identifier: property.propertyCode,
    offeredBy: {
      '@type': 'RealEstateAgent',
      name: property.builderName || agencyName,
      email: BUSINESS_CONTACT_EMAIL,
    },
    offers: {
      '@type': 'Offer',
      price: String(property.price),
      priceCurrency: 'INR',
      availability:
        property.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.locality,
      addressRegion: property.city,
      addressCountry: 'IN',
    },
    numberOfRooms: property.beds || undefined,
    floorSize: property.sqft
      ? {
          '@type': 'QuantitativeValue',
          value: property.sqft,
          unitCode: 'FTK',
        }
      : undefined,
  };
}

export function buildRouteSeo(params: {
  pathname: string;
  origin: string;
  agencyName?: string;
  property?: Property;
}): RouteSeoMeta {
  const baseUrl = normalizeBaseUrl(params.origin);
  const defaultOgImage = resolveAbsoluteAssetUrl(baseUrl, DEFAULT_OG_IMAGE_PATH);
  const path = params.pathname || '/';

  if (path.startsWith('/c/') && params.property) {
    const p = params.property;
    const priceLabel = formatIndianPrice(p.price, p.kind);
    const agencyLabel = params.agencyName || SITE_NAME;
    const canonicalUrl = `${baseUrl}/#${path}`;
    const ogImage = p.images[0]
      ? resolveAbsoluteAssetUrl(baseUrl, p.images[0])
      : defaultOgImage;

    return {
      title: `${p.title} (${priceLabel}) — ${p.locality}, ${p.city} | ${SITE_NAME}`,
      description: `${p.propertyType} in ${p.locality}, ${p.city} at ${priceLabel}. ${p.reraApproved !== false ? 'RERA verified. ' : ''}View photos, walkthrough video, 3D tour & enquire directly on WhatsApp via ${agencyLabel}.`.slice(
        0,
        160
      ),
      canonicalUrl,
      ogType: 'article',
      ogImage,
      robots: 'index, follow',
      jsonLd: buildPropertyListingJsonLd(p, agencyLabel, canonicalUrl, baseUrl),
    };
  }

  if (path.startsWith('/c/')) {
    const agencyLabel = params.agencyName || 'Live Property Catalog';
    const canonicalUrl = `${baseUrl}/#${path}`;
    return {
      title: `${agencyLabel} — Verified Property Catalog | ${SITE_NAME}`,
      description: `Browse RERA-approved apartments, villas, upcoming launches, and land plots by ${agencyLabel}. Filter by locality or budget and chat directly on WhatsApp.`,
      canonicalUrl,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'index, follow',
      jsonLd: buildOrganizationAndAppJsonLd(baseUrl),
    };
  }

  if (path === '/studio') {
    return {
      title: `3D Spatial Residence Studio & Virtual Tours | ${SITE_NAME}`,
      description:
        'Explore interactive 3D architectural residences with golden-hour daylight controls and launch instant Google Meet virtual viewings on EstateDirect.',
      canonicalUrl: `${baseUrl}/#/studio`,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'index, follow',
      jsonLd: buildOrganizationAndAppJsonLd(baseUrl),
    };
  }

  if (path === '/contact') {
    return {
      title: `Contact EstateDirect — Builder Onboarding & WhatsApp Support`,
      description: `Reach the EstateDirect team at ${BUSINESS_CONTACT_EMAIL} or chat directly on WhatsApp for free builder onboarding, catalog setup, and booking alerts.`,
      canonicalUrl: `${baseUrl}/#/contact`,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'index, follow',
      jsonLd: buildOrganizationAndAppJsonLd(baseUrl),
    };
  }

  if (path === '/dashboard' || path === '/auth') {
    return {
      title:
        path === '/dashboard'
          ? `Partner Dashboard & Analytics | ${SITE_NAME}`
          : `Sign In or Start Free | ${SITE_NAME}`,
      description: DEFAULT_SEO_DESCRIPTION,
      canonicalUrl: `${baseUrl}/#${path}`,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'noindex, nofollow',
      jsonLd: buildOrganizationAndAppJsonLd(baseUrl),
    };
  }

  return {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    canonicalUrl: `${baseUrl}/`,
    ogType: 'website',
    ogImage: defaultOgImage,
    robots: 'index, follow',
    jsonLd: buildOrganizationAndAppJsonLd(baseUrl),
  };
}

export function buildRobotsTxt(baseUrl: string): string {
  const cleanBase = normalizeBaseUrl(baseUrl);
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    '',
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(
  baseUrl: string,
  catalogSlugs: string[],
  propertyPaths: Array<{ slug: string; id: string }>,
  lastModIso?: string
): string {
  const cleanBase = normalizeBaseUrl(baseUrl);
  const lastMod = (lastModIso || new Date().toISOString()).slice(0, 10);

  const entries: Array<{ loc: string; priority: string; changefreq: string }> = [
    { loc: `${cleanBase}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${cleanBase}/#/studio`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${cleanBase}/#/contact`, priority: '0.8', changefreq: 'monthly' },
  ];

  for (const slug of catalogSlugs) {
    entries.push({
      loc: `${cleanBase}/#/c/${encodeURIComponent(slug)}`,
      priority: '0.9',
      changefreq: 'daily',
    });
  }

  for (const item of propertyPaths) {
    entries.push({
      loc: `${cleanBase}/#/c/${encodeURIComponent(item.slug)}/p/${encodeURIComponent(item.id)}`,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }

  const urlNodes = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

export function summarizeWebTraffic(
  hits: WebAnalyticsHit[],
  windowDays = 30,
  nowMs = Date.now()
): WebTrafficSummary {
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = hits.filter((h) => {
    const t = new Date(h.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });

  const pageViews = inWindow.filter((h) => h.type === 'page_view');
  const events = inWindow.filter((h) => h.type === 'event');
  const sessionSet = new Set(inWindow.map((h) => h.sessionId).filter(Boolean));

  const pageCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  let desktop = 0;
  let mobile = 0;

  for (const pv of pageViews) {
    pageCounts.set(pv.path, (pageCounts.get(pv.path) || 0) + 1);
    sourceCounts.set(pv.source, (sourceCounts.get(pv.source) || 0) + 1);
    if (pv.device === 'Mobile') mobile += 1;
    else desktop += 1;
  }

  const eventCounts = new Map<string, number>();
  for (const ev of events) {
    eventCounts.set(ev.name, (eventCounts.get(ev.name) || 0) + 1);
  }

  const totalPv = pageViews.length;
  const topPages = Array.from(pageCounts.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percent: totalPv > 0 ? Math.round((count / totalPv) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const eventBreakdown = Array.from(eventCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPageViews: totalPv,
    uniqueSessions: sessionSet.size,
    conversionEvents: events.length,
    topPages,
    sources,
    devices: { desktop, mobile },
    eventBreakdown,
  };
}

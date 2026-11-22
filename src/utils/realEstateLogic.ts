import type {
  AnalyticsEvent,
  CatalogCategoryFilter,
  CatalogFilters,
  Lead,
  LeadStatus,
  ListingKind,
  ProjectStage,
  Property,
} from '../types';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PROPERTY_IMAGES = 10;

export const PROJECT_STAGES: Array<{ id: ProjectStage; label: string; shortLabel: string }> = [
  { id: 'upcoming', label: 'Upcoming / Pre-Launch', shortLabel: 'Upcoming' },
  { id: 'new_launch', label: 'New Launch', shortLabel: 'New Launch' },
  { id: 'under_construction', label: 'Under Construction', shortLabel: 'Under Construction' },
  { id: 'nearing_possession', label: 'Nearing Possession', shortLabel: 'Nearing Possession' },
  { id: 'ready_to_move', label: 'Ready to Move', shortLabel: 'Ready to Move' },
];

export const BUILDER_APPROVALS = [
  'RERA Approved',
  'BBMP / BDA Approved',
  'A-Khata Clear Title',
  'DC Converted Land',
  'Bank Loan Approved',
  'OC / CC Received',
  'IGBC Green Certified',
  'Clear Land Title',
] as const;

export const PROPERTY_TYPES = [
  'Apartment',
  'Plot / Land',
  'Villa',
  'Penthouse',
  'Sky Villa',
  'Row House',
  'Township',
  'Estate',
  'Commercial',
] as const;

export const CATALOG_CATEGORIES: Array<{ id: CatalogCategoryFilter; label: string }> = [
  { id: 'all', label: 'All Projects' },
  { id: 'upcoming', label: 'Upcoming & New Launch' },
  { id: 'under_construction', label: 'Under Construction' },
  { id: 'ready_to_move', label: 'Ready to Move' },
  { id: 'land_plots', label: 'Land & Plots' },
  { id: 'villas_penthouses', label: 'Villas & Penthouses' },
  { id: 'apartments', label: 'Apartments' },
];

export const LEAD_STAGES: Array<{ id: LeadStatus; label: string }> = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'site_visit', label: 'Site visit' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed', label: 'Closed' },
  { id: 'lost', label: 'Lost' },
];

export const ALL_AMENITIES = [
  'Private Elevator Lobby',
  'Infinity Swimming Pool',
  'Concierge & Valet',
  'EV Charging Bays',
  'Landscaped Sky Deck',
  'Private Cinema Salon',
  '24x7 Biometric Security',
  'Full Power Backup',
  'Clubhouse & Spa',
  'Fitness Pavilion',
  'Home Automation',
  'Rainwater Harvesting',
  'Staff Quarters',
  'Pet-Friendly Gardens',
  'Underground Power & Water',
  'Tree-Lined Avenue Roads',
] as const;

export function getProjectStageLabel(stage?: ProjectStage): string {
  const found = PROJECT_STAGES.find((s) => s.id === stage);
  return found ? found.shortLabel : 'Ready to Move';
}

export function isLandProperty(propertyType: string): boolean {
  return /plot|land/i.test(propertyType);
}

/**
 * Formats an INR amount in authentic Indian numbering (Cr / Lakh / ₹).
 */
export function formatIndianPrice(amount: number, kind: ListingKind = 'buy'): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return kind === 'rent' ? '₹0/mo' : 'Price on request';
  }
  const suffix = kind === 'rent' ? '/mo' : '';
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    const formatted = Number.isInteger(cr) ? cr.toFixed(0) : cr.toFixed(2).replace(/0$/, '');
    return `₹${formatted} Cr${suffix}`;
  }
  if (amount >= 100_000) {
    const lakh = amount / 100_000;
    const formatted = Number.isInteger(lakh) ? lakh.toFixed(0) : lakh.toFixed(2).replace(/0$/, '');
    return `₹${formatted} L${suffix}`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}${suffix}`;
}

export function formatPricePerSqft(price: number, sqft: number, kind: ListingKind): string {
  if (!Number.isFinite(price) || !Number.isFinite(sqft) || sqft <= 0 || price <= 0) {
    return '';
  }
  const perSqft = Math.round(price / sqft);
  return `₹${perSqft.toLocaleString('en-IN')}/sq ft${kind === 'rent' ? ' · mo' : ''}`;
}

export function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'studio-estates';
}

export function generatePropertyCode(companyName: string, existingCodes: string[]): string {
  const letters = companyName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');

  let maxNum = 1000;
  for (const code of existingCodes) {
    const match = /-(\d+)$/.exec(code);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return `${letters}-${maxNum + 1}`;
}

export function sanitizePhoneDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = sanitizePhoneDigits(phone);
  const cleanPhone = digits.length >= 10 ? digits : '919820411890';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildPropertyWhatsAppMessage(property: Property, agencyName: string): string {
  const stageText = property.projectStage ? ` [${getProjectStageLabel(property.projectStage)}]` : '';
  return `Hello ${agencyName}, I'm interested in "${property.title}"${stageText} (${property.propertyCode}) listed at ${formatIndianPrice(property.price, property.kind)} in ${property.locality}, ${property.city}. Could you share the brochure, RERA details, and site visit availability?`;
}

export interface VisitFormInput {
  name: string;
  phone: string;
  preferredDate: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateVisitForm(input: VisitFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const phoneDigits = sanitizePhoneDigits(input.phone);

  if (name.length < 2) {
    errors.name = 'Please enter your full name (at least 2 characters).';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid 10–15 digit phone or WhatsApp number.';
  }

  if (!input.preferredDate.trim()) {
    errors.preferredDate = 'Choose a preferred visit date.';
  }

  if (input.message.trim().length > 800) {
    errors.message = 'Message must be 800 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface AuthSignupInput {
  companyName: string;
  whatsapp: string;
  email: string;
  password: string;
}

export function validateSignupForm(input: AuthSignupInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.companyName.trim().length < 2) {
    errors.companyName = 'Enter your agency, firm, or builder name.';
  }
  const digits = sanitizePhoneDigits(input.whatsapp);
  if (digits.length < 10 || digits.length > 15) {
    errors.whatsapp = 'Include country code and WhatsApp number (e.g. +91 98204 11890).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Enter a valid work email address.';
  }
  if (input.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateImageFile(
  fileInfo: { type: string; size: number },
  currentCount: number
): string | null {
  if (currentCount >= MAX_PROPERTY_IMAGES) {
    return `Maximum ${MAX_PROPERTY_IMAGES} photos allowed per property.`;
  }
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(fileInfo.type)) {
    return 'Only JPG, PNG, and WebP images are supported.';
  }
  if (fileInfo.size > MAX_IMAGE_BYTES) {
    return 'Each photo must be 5 MB or smaller.';
  }
  return null;
}

export function matchesCatalogCategory(p: Property, category?: CatalogCategoryFilter): boolean {
  if (!category || category === 'all') return true;
  if (category === 'upcoming') {
    return p.projectStage === 'upcoming' || p.projectStage === 'new_launch';
  }
  if (category === 'under_construction') {
    return p.projectStage === 'under_construction' || p.projectStage === 'nearing_possession';
  }
  if (category === 'ready_to_move') {
    return !p.projectStage || p.projectStage === 'ready_to_move';
  }
  if (category === 'land_plots') {
    return isLandProperty(p.propertyType);
  }
  if (category === 'villas_penthouses') {
    return /villa|penthouse|estate|row house/i.test(p.propertyType);
  }
  if (category === 'apartments') {
    return /apartment|township/i.test(p.propertyType);
  }
  return true;
}

export function filterAndSortProperties(
  properties: Property[],
  filters: CatalogFilters
): Property[] {
  const q = filters.search.trim().toLowerCase();
  const loc = (filters.location || 'all').trim().toLowerCase();

  const filtered = properties.filter((p) => {
    if (!p.published) return false;
    if (filters.kind !== 'all' && p.kind !== filters.kind) return false;
    if (!matchesCatalogCategory(p, filters.category)) return false;
    if (filters.reraOnly && p.reraApproved === false) return false;
    if (filters.propertyType !== 'all' && p.propertyType !== filters.propertyType) return false;
    if (filters.minBeds > 0 && p.beds < filters.minBeds) return false;

    if (loc && loc !== 'all') {
      const locationHay = `${p.locality} ${p.city}`.toLowerCase();
      if (!locationHay.includes(loc)) return false;
    }

    if (filters.priceBand !== 'all') {
      if (filters.priceBand === 'under_1cr' && (p.kind !== 'buy' || p.price >= 10_000_000)) return false;
      if (filters.priceBand === '1cr_3cr' && (p.kind !== 'buy' || p.price < 10_000_000 || p.price > 30_000_000)) return false;
      if (filters.priceBand === '3cr_6cr' && (p.kind !== 'buy' || p.price <= 30_000_000 || p.price > 60_000_000)) return false;
      if (filters.priceBand === '6cr_plus' && (p.kind !== 'buy' || p.price <= 60_000_000)) return false;
      if (filters.priceBand === '1cr_5cr' && (p.kind !== 'buy' || p.price < 10_000_000 || p.price > 50_000_000)) return false;
      if (filters.priceBand === '5cr_plus' && (p.kind !== 'buy' || p.price <= 50_000_000)) return false;
      if (filters.priceBand === 'rent_under_1l' && (p.kind !== 'rent' || p.price >= 100_000)) return false;
      if (filters.priceBand === 'rent_1l_plus' && (p.kind !== 'rent' || p.price < 100_000)) return false;
    }

    if (q) {
      const hay = `${p.title} ${p.builderName || ''} ${p.locality} ${p.city} ${p.propertyType} ${p.propertyCode} ${p.phaseName || ''} ${getProjectStageLabel(p.projectStage)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (filters.sortBy === 'price_asc') {
    sorted.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === 'price_desc') {
    sorted.sort((a, b) => b.price - a.price);
  } else if (filters.sortBy === 'sqft_desc') {
    sorted.sort((a, b) => b.sqft - a.sqft);
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return sorted;
}

export interface DailySeriesPoint {
  dateKey: string;
  label: string;
  views: number;
  enquiries: number;
}

export interface DashboardStats {
  catalogVisits: number;
  propertyViews: number;
  whatsappAndCallTaps: number;
  totalLeads: number;
  closedDeals: number;
  viewToLeadPercent: number;
  dailySeries: DailySeriesPoint[];
  topProperties: Array<{
    propertyId: string;
    title: string;
    propertyCode: string;
    views: number;
    leads: number;
  }>;
  pipelineCounts: Record<LeadStatus, number>;
  sourceCounts: Record<'whatsapp' | 'call' | 'visit' | 'meet', number>;
}

export function computeDashboardStats(
  events: AnalyticsEvent[],
  leads: Lead[],
  properties: Property[],
  rangeDays: 7 | 30 | 90,
  nowMs: number = Date.now()
): DashboardStats {
  const cutoffMs = nowMs - rangeDays * 24 * 60 * 60 * 1000;

  const rangedEvents = events.filter((e) => Date.parse(e.createdAt) >= cutoffMs);
  const rangedLeads = leads.filter((l) => Date.parse(l.createdAt) >= cutoffMs);

  let catalogVisits = 0;
  let propertyViews = 0;
  let whatsappAndCallTaps = 0;

  const propViewMap = new Map<string, number>();
  const propLeadMap = new Map<string, number>();

  for (const ev of rangedEvents) {
    if (ev.eventType === 'catalog_view') catalogVisits += 1;
    if (ev.eventType === 'property_view') {
      propertyViews += 1;
      if (ev.propertyId) {
        propViewMap.set(ev.propertyId, (propViewMap.get(ev.propertyId) || 0) + 1);
      }
    }
    if (ev.eventType === 'whatsapp_click' || ev.eventType === 'call_click') {
      whatsappAndCallTaps += 1;
    }
  }

  const pipelineCounts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    site_visit: 0,
    negotiation: 0,
    closed: 0,
    lost: 0,
  };

  const sourceCounts: Record<'whatsapp' | 'call' | 'visit' | 'meet', number> = {
    whatsapp: 0,
    call: 0,
    visit: 0,
    meet: 0,
  };

  for (const lead of rangedLeads) {
    pipelineCounts[lead.status] = (pipelineCounts[lead.status] || 0) + 1;
    sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    propLeadMap.set(lead.propertyId, (propLeadMap.get(lead.propertyId) || 0) + 1);
  }

  const totalLeads = rangedLeads.length;
  const closedDeals = pipelineCounts.closed;
  const denominator = Math.max(propertyViews, 1);
  const viewToLeadPercent =
    propertyViews === 0 ? 0 : Math.round((totalLeads / denominator) * 1000) / 10;

  const bucketCount = rangeDays === 7 ? 7 : rangeDays === 30 ? 15 : 18;
  const bucketMs = (rangeDays * 24 * 60 * 60 * 1000) / bucketCount;
  const dailySeries: DailySeriesPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = cutoffMs + i * bucketMs;
    const end = start + bucketMs;
    const d = new Date(end);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const dateKey = d.toISOString().slice(0, 10);

    let views = 0;
    let enquiries = 0;
    for (const ev of rangedEvents) {
      const t = Date.parse(ev.createdAt);
      if (t >= start && t < end) {
        if (ev.eventType === 'property_view' || ev.eventType === 'catalog_view') views += 1;
        if (ev.eventType === 'whatsapp_click' || ev.eventType === 'call_click') enquiries += 1;
      }
    }
    for (const lead of rangedLeads) {
      const t = Date.parse(lead.createdAt);
      if (t >= start && t < end) enquiries += 1;
    }

    dailySeries.push({ dateKey, label, views, enquiries });
  }

  const topProperties = properties
    .map((p) => ({
      propertyId: p.id,
      title: p.title,
      propertyCode: p.propertyCode,
      views: propViewMap.get(p.id) || 0,
      leads: propLeadMap.get(p.id) || 0,
    }))
    .sort((a, b) => b.views + b.leads * 4 - (a.views + a.leads * 4))
    .slice(0, 5);

  return {
    catalogVisits,
    propertyViews,
    whatsappAndCallTaps,
    totalLeads,
    closedDeals,
    viewToLeadPercent,
    dailySeries,
    topProperties,
    pipelineCounts,
    sourceCounts,
  };
}

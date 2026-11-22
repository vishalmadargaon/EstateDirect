import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppUrl,
  computeDashboardStats,
  filterAndSortProperties,
  formatIndianPrice,
  formatPricePerSqft,
  generatePropertyCode,
  slugifyCompanyName,
  validateImageFile,
  validateSignupForm,
  validateVisitForm,
} from './realEstateLogic.ts';
import type { AnalyticsEvent, Lead, Property } from '../types.ts';

test('formatIndianPrice formats Crores, Lakhs, and monthly rent accurately', () => {
  assert.equal(formatIndianPrice(67_500_000, 'buy'), '₹6.75 Cr');
  assert.equal(formatIndianPrice(10_000_000, 'buy'), '₹1 Cr');
  assert.equal(formatIndianPrice(8_850_000, 'buy'), '₹88.5 L');
  assert.equal(formatIndianPrice(185_000, 'rent'), '₹1.85 L/mo');
  assert.equal(formatIndianPrice(65_000, 'rent'), '₹65,000/mo');
  assert.equal(formatIndianPrice(0, 'buy'), 'Price on request');
});

test('formatPricePerSqft calculates INR per sq ft', () => {
  assert.equal(formatPricePerSqft(67_500_000, 4250, 'buy'), '₹15,882/sq ft');
  assert.equal(formatPricePerSqft(225_000, 3450, 'rent'), '₹65/sq ft · mo');
  assert.equal(formatPricePerSqft(1000, 0, 'buy'), '');
});

test('slugifyCompanyName and generatePropertyCode create clean identifiers', () => {
  assert.equal(slugifyCompanyName('Aurelia Estates & Co.'), 'aurelia-estates-co');
  assert.equal(slugifyCompanyName('   '), 'studio-estates');
  assert.equal(
    generatePropertyCode('Aurelia Estates', ['AUR-1001', 'AUR-1004']),
    'AUR-1005'
  );
  assert.equal(generatePropertyCode('K2 Homes', []), 'KHO-1001');
});

test('buildWhatsAppUrl sanitizes phone numbers and URL-encodes message', () => {
  const url = buildWhatsAppUrl('+91 98204-11890', 'Hello! Interested in AUR-1001');
  assert.equal(
    url,
    'https://wa.me/919820411890?text=Hello!%20Interested%20in%20AUR-1001'
  );
});

test('validateVisitForm rejects empty/invalid inputs and accepts valid submissions', () => {
  const bad = validateVisitForm({
    name: 'A',
    phone: '123',
    preferredDate: '',
    message: '',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.preferredDate);

  const good = validateVisitForm({
    name: 'Ananya Deshmukh',
    phone: '+91 98201 44510',
    preferredDate: '2026-12-01',
    message: 'Prefer morning slot',
  });
  assert.equal(good.valid, true);
  assert.deepEqual(good.errors, {});
});

test('validateSignupForm enforces company name, WhatsApp, email, and password length', () => {
  const bad = validateSignupForm({
    companyName: '',
    whatsapp: '999',
    email: 'invalid-email',
    password: '123',
  });
  assert.equal(bad.valid, false);
  assert.equal(Object.keys(bad.errors).length, 4);

  const good = validateSignupForm({
    companyName: 'Skyline Builders',
    whatsapp: '+91 98450 11223',
    email: 'founder@skyline.in',
    password: 'securepassword',
  });
  assert.equal(good.valid, true);
});

test('validateImageFile enforces type, 5MB limit, and 10 photo cap', () => {
  assert.equal(
    validateImageFile({ type: 'image/webp', size: 1_200_000 }, 3),
    null
  );
  assert.match(
    validateImageFile({ type: 'image/gif', size: 100_000 }, 0) || '',
    /JPG, PNG, and WebP/
  );
  assert.match(
    validateImageFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 }, 0) || '',
    /5 MB/
  );
  assert.match(
    validateImageFile({ type: 'image/png', size: 500_000 }, 10) || '',
    /Maximum 10/
  );
});

test('filterAndSortProperties filters by category, location, RERA, budget, and search', () => {
  const sample: Property[] = [
    {
      id: 'p1',
      ownerId: 'o1',
      agencySlug: 'a1',
      title: 'Prestige Raintree Park Phase 2',
      builderName: 'Prestige Group',
      description: 'Whitefield upcoming towers',
      locality: 'Whitefield',
      city: 'Bengaluru',
      kind: 'buy',
      propertyType: 'Apartment',
      projectStage: 'upcoming',
      reraApproved: true,
      price: 28_500_000,
      beds: 3,
      baths: 3,
      sqft: 2450,
      parking: 2,
      amenities: [],
      furnishing: 'Unfurnished',
      facing: 'East',
      floor: '12th of 24',
      reraNumber: 'PRM/KA/RERA/1251/446/PR/270824/006981',
      propertyCode: 'BLR-1001',
      status: 'available',
      published: true,
      images: [],
      createdAt: '2026-11-16T00:00:00.000Z',
    },
    {
      id: 'p2',
      ownerId: 'o1',
      agencySlug: 'a1',
      title: 'Sattva Bhumi Plotted Enclave',
      builderName: 'Sattva Group',
      description: 'Devanahalli gated residential land plots',
      locality: 'Devanahalli',
      city: 'Bengaluru',
      kind: 'buy',
      propertyType: 'Plot / Land',
      projectStage: 'under_construction',
      reraApproved: true,
      price: 8_400_000,
      beds: 0,
      baths: 0,
      sqft: 1500,
      parking: 0,
      amenities: [],
      furnishing: 'Unfurnished',
      facing: 'North',
      floor: 'Freehold Plot',
      reraNumber: 'PRM/KA/RERA/1250/303/PR/211024/007160',
      propertyCode: 'BLR-1002',
      status: 'available',
      published: true,
      images: [],
      createdAt: '2026-11-15T00:00:00.000Z',
    },
    {
      id: 'p3',
      ownerId: 'o1',
      agencySlug: 'a1',
      title: 'Aerolane Pre-Launch Villas',
      builderName: 'Aurelia Developments',
      description: 'Devanahalli pre-launch villas awaiting RERA',
      locality: 'Devanahalli',
      city: 'Bengaluru',
      kind: 'buy',
      propertyType: 'Villa',
      projectStage: 'upcoming',
      reraApproved: false,
      price: 31_500_000,
      beds: 4,
      baths: 4,
      sqft: 3400,
      parking: 2,
      amenities: [],
      furnishing: 'Unfurnished',
      facing: 'East',
      floor: 'G + 1',
      reraNumber: 'Applied — Under Review',
      propertyCode: 'BLR-1003',
      status: 'available',
      published: true,
      images: [],
      createdAt: '2026-11-14T00:00:00.000Z',
    },
    {
      id: 'p4',
      ownerId: 'o1',
      agencySlug: 'a1',
      title: 'Hidden Draft Plot',
      description: 'Draft',
      locality: 'Sarjapur Road',
      city: 'Bengaluru',
      kind: 'buy',
      propertyType: 'Plot / Land',
      projectStage: 'upcoming',
      reraApproved: true,
      price: 9_000_000,
      beds: 0,
      baths: 0,
      sqft: 1200,
      parking: 0,
      amenities: [],
      furnishing: 'Unfurnished',
      facing: 'East',
      floor: 'Plot',
      reraNumber: 'R4',
      propertyCode: 'BLR-1004',
      status: 'available',
      published: false,
      images: [],
      createdAt: '2026-11-17T00:00:00.000Z',
    },
  ];

  // Excludes unpublished
  const all = filterAndSortProperties(sample, {
    kind: 'all',
    category: 'all',
    location: 'all',
    reraOnly: false,
    propertyType: 'all',
    minBeds: 0,
    priceBand: 'all',
    search: '',
    sortBy: 'price_asc',
  });
  assert.deepEqual(
    all.map((p) => p.id),
    ['p2', 'p1', 'p3']
  );

  // Category: Land & Plots
  const plots = filterAndSortProperties(sample, {
    kind: 'all',
    category: 'land_plots',
    location: 'all',
    reraOnly: false,
    propertyType: 'all',
    minBeds: 0,
    priceBand: 'all',
    search: '',
    sortBy: 'featured',
  });
  assert.deepEqual(plots.map((p) => p.id), ['p2']);

  // Location + RERA Approved Only
  const devanahalliRera = filterAndSortProperties(sample, {
    kind: 'all',
    category: 'all',
    location: 'Devanahalli',
    reraOnly: true,
    propertyType: 'all',
    minBeds: 0,
    priceBand: 'all',
    search: '',
    sortBy: 'featured',
  });
  assert.deepEqual(devanahalliRera.map((p) => p.id), ['p2']);

  // Price band 1Cr - 3Cr
  const midBand = filterAndSortProperties(sample, {
    kind: 'buy',
    category: 'upcoming',
    location: 'Bengaluru',
    reraOnly: false,
    propertyType: 'all',
    minBeds: 0,
    priceBand: '1cr_3cr',
    search: '',
    sortBy: 'featured',
  });
  assert.deepEqual(midBand.map((p) => p.id), ['p1']);
});

test('computeDashboardStats computes KPIs, conversion %, and respects date ranges', () => {
  const now = Date.parse('2026-11-20T12:00:00.000Z');
  const events: AnalyticsEvent[] = [
    { id: 'e1', ownerId: 'o1', eventType: 'catalog_view', createdAt: '2026-11-19T10:00:00.000Z' },
    { id: 'e2', ownerId: 'o1', propertyId: 'p1', eventType: 'property_view', createdAt: '2026-11-19T11:00:00.000Z' },
    { id: 'e3', ownerId: 'o1', propertyId: 'p1', eventType: 'property_view', createdAt: '2026-11-18T11:00:00.000Z' },
    { id: 'e4', ownerId: 'o1', propertyId: 'p1', eventType: 'whatsapp_click', createdAt: '2026-11-18T12:00:00.000Z' },
    { id: 'e5', ownerId: 'o1', propertyId: 'p1', eventType: 'property_view', createdAt: '2026-09-01T12:00:00.000Z' },
  ];
  const leads: Lead[] = [
    {
      id: 'l1',
      ownerId: 'o1',
      propertyId: 'p1',
      propertyTitle: 'Prop 1',
      propertyCode: 'A-1',
      name: 'Riya',
      phone: '9820012345',
      message: 'Hi',
      source: 'whatsapp',
      status: 'closed',
      notes: '',
      createdAt: '2026-11-19T12:00:00.000Z',
    },
  ];
  const stats7 = computeDashboardStats(events, leads, [], 7, now);
  assert.equal(stats7.catalogVisits, 1);
  assert.equal(stats7.propertyViews, 2);
  assert.equal(stats7.whatsappAndCallTaps, 1);
  assert.equal(stats7.totalLeads, 1);
  assert.equal(stats7.closedDeals, 1);
  assert.equal(stats7.viewToLeadPercent, 50);

  const stats90 = computeDashboardStats(events, leads, [], 90, now);
  assert.equal(stats90.propertyViews, 3);
});

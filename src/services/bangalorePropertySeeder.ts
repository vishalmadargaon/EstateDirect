import { doc, writeBatch } from 'firebase/firestore';
import type { Property } from '../types';
import {
  IMG_BENGALURU_SKYVILLA,
  IMG_BLR_DEVANAHALLI_PLOTS,
  IMG_BLR_WHITEFIELD_TOWERS,
  IMG_DELHI_ESTATE,
  IMG_GOA_VILLA,
  IMG_HERO_TOWER,
  IMG_SEAFACE_PENTHOUSE,
  IMG_WORLI_RESIDENCE,
} from '../data/seedData';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export type BangaloreSeedTemplate = Omit<
  Property,
  'id' | 'ownerId' | 'agencySlug' | 'createdAt'
> & {
  seedKey: string;
};

/**
 * Five representative high-end Bengaluru property listings spanning luxury apartments
 * in Indiranagar, courtyard villas in Whitefield, ultra-luxury penthouse in Sadashivanagar,
 * boutique residences in Koramangala, and pre-launch villa plots in Devanahalli.
 */
export const BANGALORE_LUXURY_SEED_TEMPLATES: readonly BangaloreSeedTemplate[] = [
  {
    seedKey: 'blr-indiranagar-01',
    propertyCode: 'BLR-LUX-01',
    title: 'The Verandah at 12th Main — Luxury Sky Apartments',
    builderName: 'Veranda Signature Developments',
    description:
      'Boutique low-density 4 BHK luxury apartments steps from 12th Main Indiranagar. Engineered with 12-foot clear ceiling heights, private lift foyers, Italian statuario flooring, acoustic triple-glazed windows, and wrap-around landscaped decks overlooking tree-lined Defence Colony.',
    locality: '12th Main, Indiranagar',
    city: 'Bengaluru',
    latitude: 12.9718,
    longitude: 77.6412,
    kind: 'buy',
    propertyType: 'Apartment',
    projectStage: 'nearing_possession',
    phaseName: 'Phase 2 — Sky Deck & Interior Finish',
    possessionDate: 'Jun 2027',
    landArea: '1.85 Acres',
    totalUnits: 48,
    totalTowers: '2 Boutique Towers · G+14 Floors',
    price: 49_500_000,
    beds: 4,
    baths: 4,
    sqft: 3480,
    parking: 3,
    amenities: [
      'Private Elevator Lobby',
      'Landscaped Sky Deck',
      'Infinity Swimming Pool',
      'Concierge & Valet',
      'Home Automation',
      'EV Charging Bays',
      'Fitness Pavilion',
      '24x7 Biometric Security',
      'Full Power Backup',
    ],
    approvals: [
      'RERA Approved',
      'BBMP / BDA Approved',
      'A-Khata Clear Title',
      'Bank Loan Approved',
      'IGBC Green Certified',
    ],
    reraApproved: true,
    furnishing: 'Semi-Furnished',
    facing: 'East',
    floor: '11th of 14',
    reraNumber: 'PRM/KA/RERA/1251/446/PR/140525/008112',
    status: 'available',
    published: true,
    autoWalkthroughVideo: true,
    images: [
      IMG_BENGALURU_SKYVILLA,
      IMG_WORLI_RESIDENCE,
      IMG_BLR_WHITEFIELD_TOWERS,
      IMG_SEAFACE_PENTHOUSE,
    ],
  },
  {
    seedKey: 'blr-whitefield-02',
    propertyCode: 'BLR-LUX-02',
    title: 'Palm Grove Courtyard Villas — Whitefield',
    builderName: 'Aurelia Estates & Builders',
    description:
      'Architectural 4 BHK courtyard villas along ECC Road, Whitefield—10 minutes from ITPL and Hope Farm Metro. Each standalone residence pairs hand-cut Sadarahalli granite with Burma teak pergolas, a heated private plunge pool, double-height dining atrium, and 60% landscaped canopy.',
    locality: 'ECC Road, Whitefield',
    city: 'Bengaluru',
    latitude: 12.9801,
    longitude: 77.7429,
    kind: 'buy',
    propertyType: 'Villa',
    projectStage: 'under_construction',
    phaseName: 'Phase 1 — Superstructure & Facade Stone',
    possessionDate: 'Dec 2027',
    landArea: '14.5 Acres',
    totalUnits: 86,
    totalTowers: '86 Independent Courtyard Villas',
    price: 64_000_000,
    beds: 4,
    baths: 5,
    sqft: 4350,
    parking: 3,
    amenities: [
      'Infinity Swimming Pool',
      'Clubhouse & Spa',
      'Home Automation',
      'EV Charging Bays',
      'Pet-Friendly Gardens',
      'Rainwater Harvesting',
      '24x7 Biometric Security',
      'Staff Quarters',
    ],
    approvals: [
      'RERA Approved',
      'BBMP / BDA Approved',
      'A-Khata Clear Title',
      'Bank Loan Approved',
      'Clear Land Title',
    ],
    reraApproved: true,
    furnishing: 'Unfurnished',
    facing: 'North-East',
    floor: 'Ground + 2 (Independent Villa)',
    reraNumber: 'PRM/KA/RERA/1251/446/PR/220924/007419',
    status: 'available',
    published: true,
    autoWalkthroughVideo: true,
    images: [IMG_GOA_VILLA, IMG_DELHI_ESTATE, IMG_BLR_WHITEFIELD_TOWERS],
  },
  {
    seedKey: 'blr-sadashivanagar-03',
    propertyCode: 'BLR-LUX-03',
    title: 'The Banyan Reserve — Duplex Sanctuary Penthouse',
    builderName: 'Heritage Craft Developers',
    description:
      'An iconic ready-to-move 5 BHK duplex penthouse overlooking the verdant treeline of Sankey Tank in Sadashivanagar. Designed for multi-generational privacy with a private cinema salon, chef-grade Bulthaup kitchen, library mezzanine, and 1,400 sq ft travertine terrace.',
    locality: 'Sankey Tank Road, Sadashivanagar',
    city: 'Bengaluru',
    latitude: 13.0096,
    longitude: 77.5753,
    kind: 'buy',
    propertyType: 'Penthouse',
    projectStage: 'ready_to_move',
    phaseName: 'Completed · Occupancy Certificate Received',
    possessionDate: 'Ready Now',
    landArea: '1.1 Acres',
    totalUnits: 14,
    totalTowers: '1 Signature Tower · 16 Floors',
    price: 112_000_000,
    beds: 5,
    baths: 6,
    sqft: 5800,
    parking: 4,
    amenities: [
      'Private Elevator Lobby',
      'Private Cinema Salon',
      'Landscaped Sky Deck',
      'Concierge & Valet',
      'Home Automation',
      'EV Charging Bays',
      'Staff Quarters',
      'Full Power Backup',
      '24x7 Biometric Security',
    ],
    approvals: [
      'RERA Approved',
      'BBMP / BDA Approved',
      'A-Khata Clear Title',
      'OC / CC Received',
      'Bank Loan Approved',
    ],
    reraApproved: true,
    furnishing: 'Designer Furnished',
    facing: 'North',
    floor: '15th & 16th of 16',
    reraNumber: 'PRM/KA/RERA/1251/309/PR/090323/005892',
    status: 'available',
    published: true,
    autoWalkthroughVideo: true,
    images: [IMG_SEAFACE_PENTHOUSE, IMG_HERO_TOWER, IMG_BENGALURU_SKYVILLA],
  },
  {
    seedKey: 'blr-koramangala-04',
    propertyCode: 'BLR-LUX-04',
    title: 'Elysian Terraces — Koramangala 3rd Block',
    builderName: 'Atelier Urban Spaces',
    description:
      'Newly launched 3 BHK corner residences in Bengaluru’s coveted Koramangala 3rd Block. Built around a stepped central rain-garden with zero shared walls, cantilevered breakfast balconies, rooftop lap pool, and dedicated co-working pavilion for founders and executives.',
    locality: '3rd Block, Koramangala',
    city: 'Bengaluru',
    latitude: 12.9279,
    longitude: 77.6271,
    kind: 'buy',
    propertyType: 'Apartment',
    projectStage: 'new_launch',
    phaseName: 'Phase 1 — Excavation & Foundation',
    possessionDate: 'Sep 2029',
    landArea: '2.4 Acres',
    totalUnits: 92,
    totalTowers: '2 Towers · 2B+G+18 Floors',
    price: 38_500_000,
    beds: 3,
    baths: 3,
    sqft: 2680,
    parking: 2,
    amenities: [
      'Infinity Swimming Pool',
      'Clubhouse & Spa',
      'Fitness Pavilion',
      'EV Charging Bays',
      'Home Automation',
      'Rainwater Harvesting',
      '24x7 Biometric Security',
      'Full Power Backup',
    ],
    approvals: [
      'RERA Approved',
      'BBMP / BDA Approved',
      'A-Khata Clear Title',
      'Bank Loan Approved',
      'IGBC Green Certified',
    ],
    reraApproved: true,
    furnishing: 'Unfurnished',
    facing: 'East',
    floor: '10th of 18',
    reraNumber: 'PRM/KA/RERA/1251/446/PR/180126/008940',
    status: 'available',
    published: true,
    autoWalkthroughVideo: true,
    images: [IMG_BLR_WHITEFIELD_TOWERS, IMG_HERO_TOWER, IMG_WORLI_RESIDENCE],
  },
  {
    seedKey: 'blr-devanahalli-05',
    propertyCode: 'BLR-LUX-05',
    title: 'Devanahalli Heritage Estates — Pre-Launch Villa Plots',
    builderName: 'Aurelia Estates & Builders',
    description:
      'Pre-launch boutique gated residential plots along IVC Road in North Bengaluru, 14 minutes from Kempegowda International Airport. Features 2,400 sq ft freehold villa plots with concealed utilities, avenue palms, and a 25,000 sq ft stone clubhouse. Karnataka RERA registration filed and under final review.',
    locality: 'IVC Road, Devanahalli',
    city: 'Bengaluru',
    latitude: 13.2184,
    longitude: 77.6982,
    kind: 'buy',
    propertyType: 'Plot / Land',
    projectStage: 'upcoming',
    phaseName: 'Pre-Launch EOI · Phase 1',
    possessionDate: 'Dec 2028',
    landArea: '18 Acres',
    totalUnits: 164,
    totalTowers: '164 Freehold Villa Plots',
    price: 14_500_000,
    beds: 0,
    baths: 0,
    sqft: 2400,
    parking: 2,
    amenities: [
      'Underground Power & Water',
      'Tree-Lined Avenue Roads',
      'Clubhouse & Spa',
      'Rainwater Harvesting',
      'Pet-Friendly Gardens',
      '24x7 Biometric Security',
    ],
    approvals: ['DC Converted Land', 'A-Khata Clear Title', 'Clear Land Title'],
    reraApproved: false,
    furnishing: 'Unfurnished',
    facing: 'North-East',
    floor: 'Freehold Residential Plot',
    reraNumber: 'Applied — K-RERA Under Review',
    status: 'available',
    published: true,
    autoWalkthroughVideo: true,
    images: [IMG_BLR_DEVANAHALLI_PLOTS, IMG_GOA_VILLA, IMG_DELHI_ESTATE],
  },
];

export interface BuildBangaloreSeedOptions {
  ownerId: string;
  agencySlug: string;
  createdAt?: string;
}

/**
 * Generates deterministic, blueprint-compliant Property objects for the given owner and catalog slug.
 */
export function buildBangaloreSeedListings(options: BuildBangaloreSeedOptions): Property[] {
  const safeOwner = options.ownerId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'owner';
  const baseTime = options.createdAt ? new Date(options.createdAt).getTime() : Date.now();

  return BANGALORE_LUXURY_SEED_TEMPLATES.map((tpl, index) => {
    const { seedKey, ...rest } = tpl;
    // Deterministic per-owner document ID so re-running the seeder is idempotent
    const docId = `${seedKey}-${safeOwner.slice(0, 12)}`.slice(0, 128);
    const createdAt = new Date(baseTime - index * 60_000).toISOString();

    return {
      ...rest,
      id: docId,
      ownerId: options.ownerId,
      agencySlug: options.agencySlug,
      createdAt,
    };
  });
}

const ALLOWED_STAGES = new Set([
  'upcoming',
  'new_launch',
  'under_construction',
  'nearing_possession',
  'ready_to_move',
]);

/**
 * Validates a Property record against the volumetric and type constraints in firebase-blueprint.json.
 */
export function validatePropertySeedRecord(prop: Property): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  const slugRegex = /^[a-z0-9-]+$/;

  if (!prop.id || prop.id.length > 128 || !idRegex.test(prop.id)) {
    errors.push('Invalid property document id');
  }
  if (!prop.ownerId || prop.ownerId.length > 128 || !idRegex.test(prop.ownerId)) {
    errors.push('Invalid ownerId');
  }
  if (!prop.agencySlug || prop.agencySlug.length < 2 || prop.agencySlug.length > 64 || !slugRegex.test(prop.agencySlug)) {
    errors.push('Invalid agencySlug');
  }
  if (!prop.title || prop.title.length < 4 || prop.title.length > 140) {
    errors.push('Title must be 4–140 characters');
  }
  if (prop.description && prop.description.length > 2500) {
    errors.push('Description exceeds 2500 characters');
  }
  if (!prop.locality || prop.locality.length < 2 || prop.locality.length > 120) {
    errors.push('Invalid locality');
  }
  if (!prop.city || prop.city.length < 2 || prop.city.length > 80) {
    errors.push('Invalid city');
  }
  if (prop.kind !== 'buy' && prop.kind !== 'rent') {
    errors.push('Invalid kind');
  }
  if (!Number.isFinite(prop.price) || prop.price <= 0) {
    errors.push('Price must be positive');
  }
  if (!prop.propertyCode || prop.propertyCode.length < 3 || prop.propertyCode.length > 32) {
    errors.push('Invalid propertyCode');
  }
  if (prop.projectStage && !ALLOWED_STAGES.has(prop.projectStage)) {
    errors.push('Invalid projectStage');
  }
  if (!Array.isArray(prop.amenities) || prop.amenities.length > 25) {
    errors.push('Amenities must be an array of <= 25 items');
  }
  if (prop.approvals && (!Array.isArray(prop.approvals) || prop.approvals.length > 15)) {
    errors.push('Approvals must be an array of <= 15 items');
  }
  if (!Array.isArray(prop.images) || prop.images.length === 0 || prop.images.length > 10) {
    errors.push('Images must be an array of 1–10 items');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Strips undefined values and excludes the client-only `id` key for Firestore document payload cleanliness.
 */
export function sanitizePropertyForFirestore(prop: Property): Record<string, unknown> {
  const { id: _ignored, ...fields } = prop;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Idempotently merges seeded listings into an existing properties list (avoiding duplicates by id or owner+propertyCode).
 */
export function mergeSeededProperties(
  existing: Property[],
  seeded: Property[],
  overwriteExisting = false
): {
  merged: Property[];
  inserted: Property[];
  skippedCount: number;
} {
  const existingById = new Map(existing.map((p) => [p.id, p]));
  const existingByOwnerCode = new Set(
    existing.map((p) => `${p.ownerId}::${p.propertyCode.toUpperCase()}`)
  );

  const inserted: Property[] = [];
  let skippedCount = 0;

  for (const item of seeded) {
    const ownerCodeKey = `${item.ownerId}::${item.propertyCode.toUpperCase()}`;
    const alreadyExists = existingById.has(item.id) || existingByOwnerCode.has(ownerCodeKey);

    if (alreadyExists && !overwriteExisting) {
      skippedCount += 1;
      continue;
    }
    inserted.push(item);
  }

  if (inserted.length === 0) {
    return { merged: existing, inserted: [], skippedCount };
  }

  if (!overwriteExisting) {
    return {
      merged: [...inserted, ...existing],
      inserted,
      skippedCount,
    };
  }

  const insertedIds = new Set(inserted.map((p) => p.id));
  const insertedOwnerCodes = new Set(
    inserted.map((p) => `${p.ownerId}::${p.propertyCode.toUpperCase()}`)
  );
  const retained = existing.filter(
    (p) =>
      !insertedIds.has(p.id) &&
      !insertedOwnerCodes.has(`${p.ownerId}::${p.propertyCode.toUpperCase()}`)
  );

  return {
    merged: [...inserted, ...retained],
    inserted,
    skippedCount: 0,
  };
}

export interface SeedPropertiesResult {
  inserted: Property[];
  skippedCount: number;
  firestoreSynced: boolean;
  totalTemplates: number;
  message: string;
}

/**
 * Database seeder function that validates and injects the 5 representative high-end
 * Bangalore property listings into the Firestore `properties` collection (via an atomic writeBatch)
 * whenever an authenticated Firebase owner is active, and returns the seeded records for local state sync.
 */
export async function seedBangalorePropertiesToFirestore(options: {
  ownerId: string;
  agencySlug: string;
  existingProperties?: Property[];
  overwriteExisting?: boolean;
}): Promise<SeedPropertiesResult> {
  const candidates = buildBangaloreSeedListings({
    ownerId: options.ownerId,
    agencySlug: options.agencySlug,
  });

  // Defensive validation against firebase-blueprint.json constraints prior to any write
  for (const record of candidates) {
    const check = validatePropertySeedRecord(record);
    if (!check.valid) {
      throw new Error(
        `Seed validation failed for ${record.propertyCode}: ${check.errors.join(', ')}`
      );
    }
  }

  const { inserted, skippedCount } = mergeSeededProperties(
    options.existingProperties || [],
    candidates,
    Boolean(options.overwriteExisting)
  );

  if (inserted.length === 0) {
    return {
      inserted: [],
      skippedCount,
      firestoreSynced: false,
      totalTemplates: candidates.length,
      message: 'All 5 high-end Bangalore listings are already in your properties collection.',
    };
  }

  let firestoreSynced = false;
  const currentUser = auth?.currentUser ?? null;

  // Perform atomic Firestore batch write into `properties/{propertyId}` when signed in as the owner
  if (db && currentUser && currentUser.uid === options.ownerId) {
    try {
      const batch = writeBatch(db);
      for (const prop of inserted) {
        const ref = doc(db, 'properties', prop.id);
        batch.set(ref, sanitizePropertyForFirestore(prop), { merge: true });
      }
      await batch.commit();
      firestoreSynced = true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'properties');
    }
  }

  const destination = firestoreSynced
    ? 'Firestore properties collection & workspace'
    : 'workspace properties catalog';

  return {
    inserted,
    skippedCount,
    firestoreSynced,
    totalTemplates: candidates.length,
    message: `Seeded ${inserted.length} high-end Bangalore ${
      inserted.length === 1 ? 'listing' : 'listings'
    } into ${destination}${skippedCount > 0 ? ` (${skippedCount} already existed)` : ''}.`,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BANGALORE_LUXURY_SEED_TEMPLATES,
  buildBangaloreSeedListings,
  mergeSeededProperties,
  sanitizePropertyForFirestore,
  validatePropertySeedRecord,
} from './bangalorePropertySeeder.ts';

test('BANGALORE_LUXURY_SEED_TEMPLATES defines 5 representative high-end Bangalore properties', () => {
  assert.equal(BANGALORE_LUXURY_SEED_TEMPLATES.length, 5);

  const cities = new Set(BANGALORE_LUXURY_SEED_TEMPLATES.map((p) => p.city));
  assert.deepEqual([...cities], ['Bengaluru']);

  const localities = BANGALORE_LUXURY_SEED_TEMPLATES.map((p) => p.locality.toLowerCase());
  assert.ok(
    localities.some((l) => l.includes('indiranagar')),
    'Should include luxury apartments in Indiranagar'
  );
  assert.ok(
    localities.some((l) => l.includes('whitefield')),
    'Should include villas in Whitefield'
  );

  // Verify realistic metadata: RERA registration status, construction phase, and rich amenities
  const stages = new Set(BANGALORE_LUXURY_SEED_TEMPLATES.map((p) => p.projectStage));
  assert.ok(stages.size >= 4, 'Should span distinct construction phases');

  assert.ok(
    BANGALORE_LUXURY_SEED_TEMPLATES.some((p) => p.reraApproved === true && p.reraNumber.startsWith('PRM/KA/RERA')),
    'Should include Karnataka RERA approved projects'
  );
  assert.ok(
    BANGALORE_LUXURY_SEED_TEMPLATES.some((p) => p.reraApproved === false),
    'Should include a pre-launch project with RERA under review'
  );

  for (const tpl of BANGALORE_LUXURY_SEED_TEMPLATES) {
    assert.ok(tpl.amenities.length >= 5, `${tpl.propertyCode} should list realistic amenities`);
    assert.ok(tpl.approvals && tpl.approvals.length >= 3, `${tpl.propertyCode} should list statutory approvals`);
  }
});

test('buildBangaloreSeedListings generates blueprint-valid Property records for any owner', () => {
  const listings = buildBangaloreSeedListings({
    ownerId: 'builder_uid_123',
    agencySlug: 'aurelia-estates',
    createdAt: '2026-11-21T08:00:00.000Z',
  });

  assert.equal(listings.length, 5);
  for (const prop of listings) {
    assert.equal(prop.ownerId, 'builder_uid_123');
    assert.equal(prop.agencySlug, 'aurelia-estates');
    const result = validatePropertySeedRecord(prop);
    assert.equal(result.valid, true, `Validation errors for ${prop.propertyCode}: ${result.errors.join(', ')}`);
  }
});

test('mergeSeededProperties is idempotent and supports optional overwrite', () => {
  const batch = buildBangaloreSeedListings({
    ownerId: 'owner_1',
    agencySlug: 'estatedirect-blr',
  });

  // First run: inserts all 5
  const first = mergeSeededProperties([], batch, false);
  assert.equal(first.inserted.length, 5);
  assert.equal(first.skippedCount, 0);
  assert.equal(first.merged.length, 5);

  // Second run: skips all 5 duplicates
  const second = mergeSeededProperties(first.merged, batch, false);
  assert.equal(second.inserted.length, 0);
  assert.equal(second.skippedCount, 5);
  assert.equal(second.merged.length, 5);

  // Overwrite mode: refreshes all 5 without duplicating
  const third = mergeSeededProperties(first.merged, batch, true);
  assert.equal(third.inserted.length, 5);
  assert.equal(third.merged.length, 5);
});

test('sanitizePropertyForFirestore strips id and undefined values while keeping metadata', () => {
  const [first] = buildBangaloreSeedListings({
    ownerId: 'owner_1',
    agencySlug: 'aurelia-estates',
  });
  const payload = sanitizePropertyForFirestore({ ...first, floor: first.floor });
  assert.equal('id' in payload, false);
  assert.equal(payload.ownerId, 'owner_1');
  assert.equal(payload.reraApproved, true);
  assert.equal(payload.projectStage, 'nearing_possession');
  assert.ok(Array.isArray(payload.amenities));
});

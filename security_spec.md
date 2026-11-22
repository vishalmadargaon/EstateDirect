# Security Specification — EstateDirect Real-Estate Platform

## Data Invariants
1. **Owner Isolation**: Every `Property`, `Lead`, and `AnalyticsEvent` is bound to an immutable `ownerId` matching the creator's verified Auth UID.
2. **PII Isolation**: Visitor phone numbers, messages, and lead notes stored in `/leads` are strictly readable and updatable only by the owning broker (`resource.data.ownerId == request.auth.uid`). Public visitors may only submit validated new leads with `status == 'new'`.
3. **Catalog Visibility**: Visitors may only read `/properties` where `published == true`. Draft/hidden listings are accessible exclusively to `ownerId`.
4. **Input Boundaries**: All document IDs match `^[a-zA-Z0-9_\-]+$` (<= 128 chars), images arrays are bounded to `<= 10`, amenities to `<= 25`, and all string fields enforce explicit max length limits.
5. **Immutable Audit Fields**: `ownerId`, `propertyId` (on leads), and `createdAt` cannot be modified after creation.

## Red-Team Verification Matrix (Dirty Dozen)
1. **Cross-Tenant Lead Read**: Non-owner reading `/leads/{leadId}` -> `PERMISSION_DENIED`.
2. **Blanket Lead List**: Querying `/leads` without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
3. **Draft Property Leak**: Unauthenticated read of property with `published: false` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: Creating a property with `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Updating profile or property with unapproved key (e.g., `isAdmin: true`) -> `PERMISSION_DENIED` via `hasOnly()`.
6. **Immutable Field Mutation**: Changing `ownerId` or `createdAt` during update -> `PERMISSION_DENIED`.
7. **Unverified Email Write**: Writing with `email_verified: false` -> `PERMISSION_DENIED`.
8. **Lead Status Spoofing on Public Create**: Submitting public lead with `status: 'closed'` -> `PERMISSION_DENIED`.
9. **Array Flood Attack**: Submitting `images.length > 10` or `amenities.length > 25` -> `PERMISSION_DENIED`.
10. **ID Poisoning**: Document ID > 128 chars or containing invalid path characters -> `PERMISSION_DENIED`.
11. **Oversized Payload Attack**: String field exceeding max length (e.g. `title > 140` chars) -> `PERMISSION_DENIED`.
12. **Analytics Tampering**: Updating or deleting an `/events/{eventId}` record -> `PERMISSION_DENIED`.

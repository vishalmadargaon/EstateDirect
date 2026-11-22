import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type {
  AgencyProfile,
  AnalyticsEvent,
  AnalyticsEventType,
  Lead,
  LeadSource,
  MeetTour,
  Property,
  ToastItem,
} from '../types';
import {
  DEMO_OWNER_ID,
  SEED_LEADS,
  SEED_MEET_TOURS,
  SEED_PROFILES,
  SEED_PROPERTIES,
  generateSeedEvents,
} from '../data/seedData';
import { generatePropertyCode, slugifyCompanyName } from '../utils/realEstateLogic';
import {
  db,
  getMeetAccessToken,
  signInWithGitHub,
  signInWithGoogleMeet,
  signOutFirebase,
  subscribeFirebaseAuth,
} from '../lib/firebase';
import {
  mergeSeededProperties,
  sanitizePropertyForFirestore,
  seedBangalorePropertiesToFirestore,
  type SeedPropertiesResult,
} from '../services/bangalorePropertySeeder';

const STORAGE_KEY = 'estatedirect_platform_state_v2';
const LEGACY_STORAGE_KEY = 'kavel_platform_state_v2';

interface LocalAccount {
  ownerId: string;
  email: string;
  passwordHash: string;
}

// Non-plaintext salted digest for local preview accounts (never stores raw passwords in localStorage)
function hashLocalPassword(email: string, password: string): string {
  const input = `estatedirect::${email.trim().toLowerCase()}::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `v2_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

interface PersistedState {
  profiles: AgencyProfile[];
  properties: Property[];
  leads: Lead[];
  events: AnalyticsEvent[];
  meetTours: MeetTour[];
  accounts: LocalAccount[];
  activeOwnerId: string | null;
}

function loadInitialState(): PersistedState {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<Partial<PersistedState>, 'accounts'> & {
        accounts?: Array<{ ownerId: string; email: string; password?: string; passwordHash?: string }>;
      };
      if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const migratedProfiles = parsed.profiles.map((p) =>
          p.email === 'advisory@aureliaestates.in'
            ? { ...p, email: 'estatedirect@zohomail.in' }
            : p
        );
        const migratedAccounts: LocalAccount[] = Array.isArray(parsed.accounts)
          ? parsed.accounts.map((a) => {
              const nextEmail =
                a.email === 'advisory@aureliaestates.in' ? 'estatedirect@zohomail.in' : a.email;
              return {
                ownerId: a.ownerId,
                email: nextEmail,
                passwordHash: a.passwordHash || hashLocalPassword(nextEmail, a.password || ''),
              };
            })
          : [];
        return {
          profiles: migratedProfiles,
          properties: Array.isArray(parsed.properties) ? parsed.properties : SEED_PROPERTIES,
          leads: Array.isArray(parsed.leads) ? parsed.leads : SEED_LEADS,
          events: Array.isArray(parsed.events) ? parsed.events : generateSeedEvents(),
          meetTours: Array.isArray(parsed.meetTours) ? parsed.meetTours : SEED_MEET_TOURS,
          accounts: migratedAccounts,
          activeOwnerId: parsed.activeOwnerId ?? null,
        };
      }
    }
  } catch {
    // Fallback to clean seed data
  }

  return {
    profiles: SEED_PROFILES,
    properties: SEED_PROPERTIES,
    leads: SEED_LEADS,
    events: generateSeedEvents(),
    meetTours: SEED_MEET_TOURS,
    accounts: [
      {
        ownerId: DEMO_OWNER_ID,
        email: 'estatedirect@zohomail.in',
        passwordHash: hashLocalPassword('estatedirect@zohomail.in', 'demo-password'),
      },
    ],
    activeOwnerId: null,
  };
}

interface AppStoreContextValue {
  profiles: AgencyProfile[];
  properties: Property[];
  leads: Lead[];
  events: AnalyticsEvent[];
  meetTours: MeetTour[];
  activeOwnerId: string | null;
  currentProfile: AgencyProfile | null;
  firebaseUser: User | null;
  meetAccessToken: string | null;
  toasts: ToastItem[];
  showToast: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
  signUpLocal: (input: {
    companyName: string;
    whatsapp: string;
    email: string;
    password: string;
  }) => { ok: boolean; error?: string };
  loginLocal: (email: string, password: string) => { ok: boolean; error?: string };
  loginWithVerifiedEmailOtp: (input: {
    email: string;
    companyName?: string;
    whatsapp?: string;
  }) => { ok: boolean; isNewAccount: boolean };
  loginDemoBroker: () => void;
  connectGoogleAccount: () => Promise<{ ok: boolean; error?: string }>;
  connectGitHubAccount: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  getProfileBySlug: (slug: string) => AgencyProfile | undefined;
  getProfileByOwnerId: (ownerId: string) => AgencyProfile | undefined;
  addProperty: (
    data: Omit<Property, 'id' | 'ownerId' | 'agencySlug' | 'propertyCode' | 'createdAt'> & {
      propertyCode?: string;
    }
  ) => Property;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  seedBangaloreProperties: (options?: { overwriteExisting?: boolean }) => Promise<SeedPropertiesResult>;
  updateProfile: (patch: Partial<AgencyProfile>) => void;
  captureLead: (input: {
    ownerId: string;
    propertyId: string;
    propertyTitle: string;
    propertyCode: string;
    name: string;
    phone: string;
    email?: string;
    message: string;
    preferredDate?: string;
    preferredTime?: string;
    source: LeadSource;
    meetUri?: string;
    calendarEventLink?: string;
  }) => Lead;
  updateLead: (
    id: string,
    patch: Partial<Pick<Lead, 'status' | 'notes' | 'meetUri' | 'calendarEventLink'>>
  ) => void;
  trackEvent: (ownerId: string, eventType: AnalyticsEventType, propertyId?: string) => void;
  createGoogleMeetSpace: (input: {
    propertyId: string;
    propertyTitle: string;
    clientName: string;
    scheduledAt: string;
  }) => Promise<{ ok: boolean; tour?: MeetTour; error?: string }>;
  scheduleCalendarAndEmailBooking: (input: {
    summary: string;
    description: string;
    location: string;
    startIso: string;
    endIso: string;
    attendeeEmails: string[];
    sendGmailConfirmation: boolean;
    gmailTo?: string;
    gmailSubject?: string;
    gmailBody?: string;
    replyTo?: string;
  }) => Promise<{ ok: boolean; htmlLink?: string; gmailSent?: boolean; error?: string }>;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [meetAccessToken, setMeetAccessToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors if user uploads huge photos
    }
  }, [state]);

  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user, token) => {
      setFirebaseUser(user);
      setMeetAccessToken(token);
    });
    return () => unsub();
  }, []);

  const showToast = useCallback((message: string, tone: ToastItem['tone'] = 'default') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const currentProfile = useMemo(
    () => state.profiles.find((p) => p.ownerId === state.activeOwnerId) || null,
    [state.profiles, state.activeOwnerId]
  );

  const syncDocBestEffort = useCallback(
    async (collectionName: string, docId: string, data: Record<string, unknown>) => {
      if (!firebaseUser || !db) return;
      // Only sync records owned by the authenticated Firebase UID (skip demo/local-only owner IDs)
      if (typeof data.ownerId === 'string' && data.ownerId !== firebaseUser.uid) {
        return;
      }
      const cleanPayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) {
          cleanPayload[k] = v;
        }
      }
      try {
        await setDoc(doc(db, collectionName, docId), cleanPayload, { merge: true });
      } catch {
        // Non-blocking fallback: local state remains authoritative when offline or unverified
      }
    },
    [firebaseUser]
  );

  const signUpLocal = useCallback(
    (input: { companyName: string; whatsapp: string; email: string; password: string }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const exists = state.accounts.some((a) => a.email.toLowerCase() === normalizedEmail);
      if (exists) {
        return { ok: false, error: 'An account with this email already exists. Please log in instead.' };
      }

      const ownerId = `owner_${Date.now().toString(36)}`;
      let baseSlug = slugifyCompanyName(input.companyName);
      if (state.profiles.some((p) => p.slug === baseSlug)) {
        baseSlug = `${baseSlug}-${Math.floor(10 + Math.random() * 89)}`;
      }

      const newProfile: AgencyProfile = {
        ownerId,
        slug: baseSlug,
        companyName: input.companyName.trim(),
        email: normalizedEmail,
        whatsapp: input.whatsapp.trim(),
        tagline: 'Curated residential and investment properties with direct WhatsApp advisory.',
        about: `${input.companyName.trim()} connects discerning buyers and tenants with verified properties and transparent site visits.`,
        city: 'Mumbai',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        profiles: [newProfile, ...prev.profiles],
        accounts: [
          ...prev.accounts,
          {
            ownerId,
            email: normalizedEmail,
            passwordHash: hashLocalPassword(normalizedEmail, input.password),
          },
        ],
        activeOwnerId: ownerId,
      }));

      showToast(`Welcome to EstateDirect, ${newProfile.companyName}!`, 'success');
      return { ok: true };
    },
    [state.accounts, state.profiles, showToast]
  );

  const loginLocal = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const expectedHash = hashLocalPassword(normalized, password);
      const match = state.accounts.find(
        (a) => a.email.toLowerCase() === normalized && a.passwordHash === expectedHash
      );
      if (!match) {
        return {
          ok: false,
          error: 'Invalid email or password. Try the demo broker login or create a free account.',
        };
      }
      setState((prev) => ({ ...prev, activeOwnerId: match.ownerId }));
      showToast('Signed in to your EstateDirect dashboard.', 'success');
      return { ok: true };
    },
    [state.accounts, showToast]
  );

  const loginWithVerifiedEmailOtp = useCallback(
    (input: { email: string; companyName?: string; whatsapp?: string }) => {
      const normalized = input.email.trim().toLowerCase();
      const existingProfile = state.profiles.find(
        (p) => p.email.trim().toLowerCase() === normalized
      );
      if (existingProfile) {
        setState((prev) => ({ ...prev, activeOwnerId: existingProfile.ownerId }));
        showToast(`Verified via Email OTP. Welcome back, ${existingProfile.companyName}!`, 'success');
        return { ok: true, isNewAccount: false };
      }

      const ownerId = `owner_${Date.now().toString(36)}`;
      const fallbackCompany =
        input.companyName?.trim() ||
        `${normalized.split('@')[0].replace(/[^a-zA-Z0-9]+/g, ' ').trim()} Realty`;
      let slug = slugifyCompanyName(fallbackCompany);
      if (state.profiles.some((p) => p.slug === slug)) {
        slug = `${slug}-${Math.floor(10 + Math.random() * 89)}`;
      }

      const newProfile: AgencyProfile = {
        ownerId,
        slug,
        companyName: fallbackCompany,
        email: normalized,
        whatsapp: input.whatsapp?.trim() || '+91 98204 11890',
        tagline: 'Verified direct real-estate catalog with instant WhatsApp & Calendar bookings.',
        about: `${fallbackCompany} connects discerning buyers directly with verified projects and guided site visits.`,
        city: 'Bengaluru',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        profiles: [newProfile, ...prev.profiles],
        activeOwnerId: ownerId,
      }));
      showToast(`Email verified! Workspace created for ${newProfile.companyName}.`, 'success');
      return { ok: true, isNewAccount: true };
    },
    [state.profiles, showToast]
  );

  const loginDemoBroker = useCallback(() => {
    setState((prev) => ({ ...prev, activeOwnerId: DEMO_OWNER_ID }));
    showToast('Signed in as Aurelia Estates (Demo Workspace).', 'success');
  }, [showToast]);

  const connectGoogleAccount = useCallback(async () => {
    try {
      const { user, accessToken } = await signInWithGoogleMeet();
      setFirebaseUser(user);
      setMeetAccessToken(accessToken);

      setState((prev) => {
        const existingProfile = prev.profiles.find(
          (p) =>
            p.ownerId === user.uid ||
            (user.email && p.email.toLowerCase() === user.email.toLowerCase())
        );
        if (existingProfile) {
          return { ...prev, activeOwnerId: existingProfile.ownerId };
        }
        // If user is already in a workspace (e.g. demo), keep their workspace active while attaching Google Workspace!
        if (prev.activeOwnerId) {
          return prev;
        }
        const companyName = user.displayName ? `${user.displayName} Realty` : 'Signature Estates';
        let slug = slugifyCompanyName(companyName);
        if (prev.profiles.some((p) => p.slug === slug)) {
          slug = `${slug}-${user.uid.slice(0, 4).toLowerCase()}`;
        }
        const created: AgencyProfile = {
          ownerId: user.uid,
          slug,
          companyName,
          email: user.email || '',
          whatsapp: '+91 98204 11890',
          tagline: 'Bespoke architectural properties with direct WhatsApp, Calendar & Meet viewings.',
          about: `${companyName} offers curated RERA-registered residences and guided site visits.`,
          city: 'Bengaluru',
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          profiles: [created, ...prev.profiles],
          activeOwnerId: user.uid,
        };
      });

      showToast('Google Account connected (Calendar, Gmail & Meet ready).', 'success');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      return { ok: false, error: message };
    }
  }, [showToast]);

  const connectGitHubAccount = useCallback(async () => {
    try {
      const { user } = await signInWithGitHub();
      setFirebaseUser(user);

      setState((prev) => {
        const existingProfile = prev.profiles.find(
          (p) =>
            p.ownerId === user.uid ||
            (user.email && p.email.toLowerCase() === user.email.toLowerCase())
        );
        if (existingProfile) {
          return { ...prev, activeOwnerId: existingProfile.ownerId };
        }
        const companyName = user.displayName ? `${user.displayName} Realty` : 'EstateDirect Partner';
        let slug = slugifyCompanyName(companyName);
        if (prev.profiles.some((p) => p.slug === slug)) {
          slug = `${slug}-${user.uid.slice(0, 4).toLowerCase()}`;
        }
        const created: AgencyProfile = {
          ownerId: user.uid,
          slug,
          companyName,
          email: user.email || '',
          whatsapp: '+91 98204 11890',
          tagline: 'Curated residential and investment properties with direct WhatsApp advisory.',
          about: `${companyName} connects buyers directly with RERA-verified developments.`,
          city: 'Bengaluru',
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          profiles: [created, ...prev.profiles],
          activeOwnerId: user.uid,
        };
      });

      showToast('Signed in with GitHub.', 'success');
      return { ok: true };
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'GitHub sign-in failed.';
      const friendly = raw.includes('operation-not-allowed')
        ? 'Enable the free GitHub provider in Firebase Console → Authentication → Sign-in method to use GitHub Login.'
        : raw;
      return { ok: false, error: friendly };
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    await signOutFirebase();
    setFirebaseUser(null);
    setMeetAccessToken(null);
    setState((prev) => ({ ...prev, activeOwnerId: null }));
    showToast('Signed out safely.');
  }, [showToast]);

  const getProfileBySlug = useCallback(
    (slug: string) => state.profiles.find((p) => p.slug === slug),
    [state.profiles]
  );

  const getProfileByOwnerId = useCallback(
    (ownerId: string) => state.profiles.find((p) => p.ownerId === ownerId),
    [state.profiles]
  );

  const addProperty: AppStoreContextValue['addProperty'] = useCallback(
    (data) => {
      const ownerId = state.activeOwnerId || DEMO_OWNER_ID;
      const profile = state.profiles.find((p) => p.ownerId === ownerId) || state.profiles[0];
      const existingCodes = state.properties
        .filter((p) => p.ownerId === ownerId)
        .map((p) => p.propertyCode);

      const propertyCode = data.propertyCode?.trim() || generatePropertyCode(profile.companyName, existingCodes);
      const id = `${propertyCode.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
      const created: Property = {
        ...data,
        id,
        ownerId,
        agencySlug: profile.slug,
        propertyCode,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        properties: [created, ...prev.properties],
      }));
      void syncDocBestEffort('properties', created.id, sanitizePropertyForFirestore(created));
      showToast(`Published ${created.title} (${created.propertyCode})`, 'success');
      return created;
    },
    [state.activeOwnerId, state.profiles, state.properties, syncDocBestEffort, showToast]
  );

  const updateProperty = useCallback(
    (id: string, patch: Partial<Property>) => {
      setState((prev) => ({
        ...prev,
        properties: prev.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      void syncDocBestEffort('properties', id, { ...patch, updatedAt: new Date().toISOString() });
    },
    [syncDocBestEffort]
  );

  const deleteProperty = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        properties: prev.properties.filter((p) => p.id !== id),
      }));
      if (firebaseUser && db) {
        void deleteDoc(doc(db, 'properties', id)).catch(() => {});
      }
      showToast('Property and associated gallery removed.', 'default');
    },
    [firebaseUser, showToast]
  );

  const seedBangaloreProperties = useCallback(
    async (options?: { overwriteExisting?: boolean }): Promise<SeedPropertiesResult> => {
      const ownerId = state.activeOwnerId || DEMO_OWNER_ID;
      const profile = state.profiles.find((p) => p.ownerId === ownerId) || state.profiles[0];

      const result = await seedBangalorePropertiesToFirestore({
        ownerId,
        agencySlug: profile.slug,
        existingProperties: state.properties,
        overwriteExisting: options?.overwriteExisting,
      });

      if (result.inserted.length > 0) {
        setState((prev) => ({
          ...prev,
          properties: mergeSeededProperties(
            prev.properties,
            result.inserted,
            Boolean(options?.overwriteExisting)
          ).merged,
        }));
      }

      showToast(result.message, result.inserted.length > 0 ? 'success' : 'default');
      return result;
    },
    [state.activeOwnerId, state.profiles, state.properties, showToast]
  );

  const updateProfile = useCallback(
    (patch: Partial<AgencyProfile>) => {
      if (!state.activeOwnerId) return;
      const targetOwnerId = state.activeOwnerId;
      setState((prev) => {
        const nextProfiles = prev.profiles.map((p) =>
          p.ownerId === targetOwnerId ? { ...p, ...patch } : p
        );
        const updatedProfile = nextProfiles.find((p) => p.ownerId === targetOwnerId);
        const nextProperties =
          patch.slug && updatedProfile
            ? prev.properties.map((prop) =>
                prop.ownerId === targetOwnerId ? { ...prop, agencySlug: updatedProfile.slug } : prop
              )
            : prev.properties;
        return {
          ...prev,
          profiles: nextProfiles,
          properties: nextProperties,
        };
      });
      const { email: _ignoredEmail, ...publicProfilePatch } = patch;
      void syncDocBestEffort('profiles', targetOwnerId, {
        ...publicProfilePatch,
        ownerId: targetOwnerId,
        updatedAt: new Date().toISOString(),
      });
      showToast('Agency profile saved.', 'success');
    },
    [state.activeOwnerId, syncDocBestEffort, showToast]
  );

  const captureLead: AppStoreContextValue['captureLead'] = useCallback(
    (input) => {
      const created: Lead = {
        id: `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        ownerId: input.ownerId,
        propertyId: input.propertyId,
        propertyTitle: input.propertyTitle,
        propertyCode: input.propertyCode,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        message: input.message.trim(),
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        source: input.source,
        status: 'new',
        notes: '',
        meetUri: input.meetUri,
        calendarEventLink: input.calendarEventLink,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        leads: [created, ...prev.leads],
      }));
      void syncDocBestEffort('leads', created.id, {
        ownerId: created.ownerId,
        propertyId: created.propertyId,
        propertyTitle: created.propertyTitle,
        propertyCode: created.propertyCode,
        name: created.name,
        phone: created.phone,
        message: created.message,
        preferredDate: created.preferredDate,
        source: created.source,
        status: created.status,
        notes: created.notes,
        meetUri: created.meetUri,
        createdAt: created.createdAt,
      });
      return created;
    },
    [syncDocBestEffort]
  );

  const updateLead = useCallback(
    (
      id: string,
      patch: Partial<Pick<Lead, 'status' | 'notes' | 'meetUri' | 'calendarEventLink'>>
    ) => {
      setState((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
      const { calendarEventLink: _ignoredLink, ...firestoreLeadPatch } = patch;
      void syncDocBestEffort('leads', id, {
        ...firestoreLeadPatch,
        updatedAt: new Date().toISOString(),
      });
    },
    [syncDocBestEffort]
  );

  const trackEvent = useCallback(
    (ownerId: string, eventType: AnalyticsEventType, propertyId?: string) => {
      const ev: AnalyticsEvent = {
        id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        ownerId,
        propertyId,
        eventType,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        events: [ev, ...prev.events].slice(0, 1200),
      }));
      void syncDocBestEffort('events', ev.id, {
        ownerId: ev.ownerId,
        propertyId: ev.propertyId,
        eventType: ev.eventType,
        createdAt: ev.createdAt,
      });
    },
    [syncDocBestEffort]
  );

  const createGoogleMeetSpace: AppStoreContextValue['createGoogleMeetSpace'] = useCallback(
    async (input) => {
      const token = getMeetAccessToken() || meetAccessToken;
      if (!token) {
        return {
          ok: false,
          error: 'Please sign in with Google first to create a live Google Meet room.',
        };
      }

      try {
        const res = await fetch('/api/meet/spaces', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: data?.error || 'Could not create Google Meet space.',
          };
        }

        const ownerId = state.activeOwnerId || DEMO_OWNER_ID;
        const tour: MeetTour = {
          id: `tour-${Date.now().toString(36)}`,
          ownerId,
          propertyId: input.propertyId,
          propertyTitle: input.propertyTitle,
          clientName: input.clientName.trim() || 'Private Client',
          meetingUri: data.meetingUri || 'https://meet.google.com',
          meetingCode: data.meetingCode || 'LIVE-MEET',
          scheduledAt: input.scheduledAt || new Date().toISOString().slice(0, 16),
          createdAt: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          meetTours: [tour, ...prev.meetTours],
        }));

        showToast(`Google Meet room created: ${tour.meetingCode}`, 'success');
        return { ok: true, tour };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Network error calling Google Meet API.',
        };
      }
    },
    [meetAccessToken, state.activeOwnerId, showToast]
  );

  const scheduleCalendarAndEmailBooking: AppStoreContextValue['scheduleCalendarAndEmailBooking'] =
    useCallback(
      async (input) => {
        const token = getMeetAccessToken() || meetAccessToken;
        if (!token) {
          return {
            ok: false,
            error:
              'Please sign in with Google first to create a Google Calendar event and send Gmail confirmation.',
          };
        }

        try {
          const calRes = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: input.summary,
              description: input.description,
              location: input.location,
              startIso: input.startIso,
              endIso: input.endIso,
              attendeeEmails: input.attendeeEmails,
            }),
          });
          const calData = await calRes.json();
          if (!calRes.ok) {
            return {
              ok: false,
              error: calData?.error || 'Could not create Google Calendar event.',
            };
          }

          let gmailSent = false;
          if (input.sendGmailConfirmation && input.gmailTo && input.gmailSubject && input.gmailBody) {
            const gmailRes = await fetch('/api/gmail/send', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: input.gmailTo,
                subject: input.gmailSubject,
                textBody: `${input.gmailBody}${calData.htmlLink ? `\n\nCalendar Event: ${calData.htmlLink}` : ''}`,
                replyTo: input.replyTo,
              }),
            });
            if (gmailRes.ok) {
              gmailSent = true;
            }
          }

          showToast(
            gmailSent
              ? 'Site visit scheduled on Google Calendar & confirmation emailed via Gmail.'
              : 'Site visit scheduled on your Google Calendar.',
            'success'
          );
          return { ok: true, htmlLink: calData.htmlLink, gmailSent };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : 'Network error connecting to Google Calendar.',
          };
        }
      },
      [meetAccessToken, showToast]
    );

  const value = useMemo<AppStoreContextValue>(
    () => ({
      profiles: state.profiles,
      properties: state.properties,
      leads: state.leads,
      events: state.events,
      meetTours: state.meetTours,
      activeOwnerId: state.activeOwnerId,
      currentProfile,
      firebaseUser,
      meetAccessToken,
      toasts,
      showToast,
      dismissToast,
      signUpLocal,
      loginLocal,
      loginWithVerifiedEmailOtp,
      loginDemoBroker,
      connectGoogleAccount,
      connectGitHubAccount,
      logout,
      getProfileBySlug,
      getProfileByOwnerId,
      addProperty,
      updateProperty,
      deleteProperty,
      seedBangaloreProperties,
      updateProfile,
      captureLead,
      updateLead,
      trackEvent,
      createGoogleMeetSpace,
      scheduleCalendarAndEmailBooking,
    }),
    [
      state,
      currentProfile,
      firebaseUser,
      meetAccessToken,
      toasts,
      showToast,
      dismissToast,
      signUpLocal,
      loginLocal,
      loginWithVerifiedEmailOtp,
      loginDemoBroker,
      connectGoogleAccount,
      connectGitHubAccount,
      logout,
      getProfileBySlug,
      getProfileByOwnerId,
      addProperty,
      updateProperty,
      deleteProperty,
      seedBangaloreProperties,
      updateProfile,
      captureLead,
      updateLead,
      trackEvent,
      createGoogleMeetSpace,
      scheduleCalendarAndEmailBooking,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return ctx;
}

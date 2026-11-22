import React, { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  Film,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCircle,
  Users,
  Video,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import type {
  CatalogCategoryFilter,
  Lead,
  LeadStatus,
  ListingKind,
  ProjectStage,
  Property,
  PropertyStatus,
} from '../types';
import {
  ALL_AMENITIES,
  BUILDER_APPROVALS,
  CATALOG_CATEGORIES,
  LEAD_STAGES,
  PROJECT_STAGES,
  PROPERTY_TYPES,
  buildWhatsAppUrl,
  computeDashboardStats,
  formatIndianPrice,
  generatePropertyCode,
  getProjectStageLabel,
  matchesCatalogCategory,
  slugifyCompanyName,
} from '../utils/realEstateLogic';
import { processPropertyImage } from '../utils/imageProcessor';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { QRShareModal } from '../components/QRShareModal';
import { MeetTourModal } from '../components/MeetTourModal';
import { CalendarBookingModal } from '../components/CalendarBookingModal';
import { PropertyWalkthroughVideo } from '../components/PropertyWalkthroughVideo';
import { SeoAnalyticsPanel } from '../components/SeoAnalyticsPanel';
import { IMG_BLR_WHITEFIELD_TOWERS } from '../data/seedData';

type DashboardTab = 'analytics' | 'properties' | 'leads' | 'profile' | 'tours';

interface PropertyDraft {
  id?: string;
  title: string;
  builderName: string;
  description: string;
  locality: string;
  city: string;
  kind: ListingKind;
  propertyType: string;
  projectStage: ProjectStage;
  phaseName: string;
  possessionDate: string;
  landArea: string;
  totalUnits: string;
  totalTowers: string;
  price: string;
  beds: number;
  baths: number;
  sqft: string;
  parking: number;
  amenities: string[];
  approvals: string[];
  reraApproved: boolean;
  furnishing: Property['furnishing'];
  facing: Property['facing'];
  floor: string;
  reraNumber: string;
  propertyCode: string;
  status: PropertyStatus;
  published: boolean;
  images: string[];
  autoWalkthroughVideo: boolean;
}

function emptyDraft(companyName: string, existingCodes: string[]): PropertyDraft {
  return {
    title: '',
    builderName: companyName,
    description: '',
    locality: '',
    city: 'Bengaluru',
    kind: 'buy',
    propertyType: 'Apartment',
    projectStage: 'upcoming',
    phaseName: 'Phase 1',
    possessionDate: 'Dec 2028',
    landArea: '',
    totalUnits: '',
    totalTowers: '',
    price: '',
    beds: 3,
    baths: 3,
    sqft: '',
    parking: 2,
    amenities: ['24x7 Biometric Security', 'Full Power Backup', 'EV Charging Bays'],
    approvals: ['RERA Approved', 'BBMP / BDA Approved', 'Bank Loan Approved'],
    reraApproved: true,
    furnishing: 'Unfurnished',
    facing: 'East',
    floor: '8th of 20',
    reraNumber: '',
    propertyCode: generatePropertyCode(companyName, existingCodes),
    status: 'available',
    published: true,
    images: [],
    autoWalkthroughVideo: true,
  };
}

export function DashboardPage() {
  const {
    currentProfile,
    properties,
    leads,
    events,
    meetTours,
    meetAccessToken,
    connectGoogleAccount,
    addProperty,
    updateProperty,
    deleteProperty,
    seedBangaloreProperties,
    updateProfile,
    updateLead,
    logout,
    showToast,
  } = useAppStore();

  const [tab, setTab] = useState<DashboardTab>('analytics');
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [leadsView, setLeadsView] = useState<'kanban' | 'list'>('kanban');

  // Property modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PropertyDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [aiDescBusy, setAiDescBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showDraftWalkthrough, setShowDraftWalkthrough] = useState(true);
  const [propCategoryFilter, setPropCategoryFilter] = useState<CatalogCategoryFilter>('all');
  const [propLocationFilter, setPropLocationFilter] = useState<string>('all');
  const [propReraOnly, setPropReraOnly] = useState(false);
  const [seedingBusy, setSeedingBusy] = useState(false);

  // Analytics AI summary state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightBusy, setAiInsightBusy] = useState(false);

  // Profile form state
  const [profileCompany, setProfileCompany] = useState(currentProfile?.companyName || '');
  const [profileSlug, setProfileSlug] = useState(currentProfile?.slug || '');
  const [profileEmail, setProfileEmail] = useState(currentProfile?.email || '');
  const [profileWhatsapp, setProfileWhatsapp] = useState(currentProfile?.whatsapp || '');
  const [profileCity, setProfileCity] = useState(currentProfile?.city || '');
  const [profileTagline, setProfileTagline] = useState(currentProfile?.tagline || '');
  const [profileAbout, setProfileAbout] = useState(currentProfile?.about || '');
  const [profileLogo, setProfileLogo] = useState(currentProfile?.logoUrl || '');
  const [copiedLink, setCopiedLink] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [calendarModalLead, setCalendarModalLead] = useState<Lead | null>(null);
  const [meetModalLead, setMeetModalLead] = useState<{
    propertyId: string;
    propertyTitle: string;
    propertyCode: string;
    clientName: string;
    leadId?: string;
  } | null>(null);

  const ownerProperties = useMemo(
    () => (currentProfile ? properties.filter((p) => p.ownerId === currentProfile.ownerId) : []),
    [properties, currentProfile]
  );

  const ownerLeads = useMemo(
    () => (currentProfile ? leads.filter((l) => l.ownerId === currentProfile.ownerId) : []),
    [leads, currentProfile]
  );

  const ownerEvents = useMemo(
    () => (currentProfile ? events.filter((e) => e.ownerId === currentProfile.ownerId) : []),
    [events, currentProfile]
  );

  const ownerTours = useMemo(
    () => (currentProfile ? meetTours.filter((t) => t.ownerId === currentProfile.ownerId) : []),
    [meetTours, currentProfile]
  );

  const stats = useMemo(
    () => computeDashboardStats(ownerEvents, ownerLeads, ownerProperties, rangeDays),
    [ownerEvents, ownerLeads, ownerProperties, rangeDays]
  );

  if (!currentProfile) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  const catalogUrl = `${window.location.origin}/#/c/${currentProfile.slug}`;

  const openNewProperty = () => {
    setDraft(
      emptyDraft(
        currentProfile.companyName,
        ownerProperties.map((p) => p.propertyCode)
      )
    );
    setDraftError(null);
    setEditorOpen(true);
  };

  const openEditProperty = (prop: Property) => {
    setDraft({
      id: prop.id,
      title: prop.title,
      builderName: prop.builderName || currentProfile.companyName,
      description: prop.description,
      locality: prop.locality,
      city: prop.city,
      kind: prop.kind,
      propertyType: prop.propertyType,
      projectStage: prop.projectStage || 'ready_to_move',
      phaseName: prop.phaseName || '',
      possessionDate: prop.possessionDate || '',
      landArea: prop.landArea || '',
      totalUnits: prop.totalUnits ? String(prop.totalUnits) : '',
      totalTowers: prop.totalTowers || '',
      price: String(prop.price),
      beds: prop.beds,
      baths: prop.baths,
      sqft: String(prop.sqft),
      parking: prop.parking,
      amenities: [...prop.amenities],
      approvals: prop.approvals ? [...prop.approvals] : ['RERA Approved'],
      reraApproved: prop.reraApproved !== false,
      furnishing: prop.furnishing,
      facing: prop.facing,
      floor: prop.floor,
      reraNumber: prop.reraNumber,
      propertyCode: prop.propertyCode,
      status: prop.status,
      published: prop.published,
      images: [...prop.images],
      autoWalkthroughVideo: prop.autoWalkthroughVideo !== false,
    });
    setDraftError(null);
    setShowDraftWalkthrough(true);
    setEditorOpen(true);
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || !draft) return;
    setPhotoBusy(true);
    setDraftError(null);
    const nextImages = [...draft.images];
    try {
      for (const file of Array.from(files)) {
        const encoded = await processPropertyImage(file, nextImages.length, 1600);
        nextImages.push(encoded);
      }
      setDraft({ ...draft, images: nextImages, autoWalkthroughVideo: true });
      setShowDraftWalkthrough(true);
      showToast(
        `${files.length} ${files.length === 1 ? 'photo' : 'photos'} uploaded — walkthrough video ready.`,
        'success'
      );
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!draft) return;
    setAiDescBusy(true);
    setDraftError(null);
    try {
      const priceNum = Number(draft.price) || 0;
      const context = `Title: ${draft.title || 'Luxury Residence'}\nType: ${draft.propertyType} (${draft.kind})\nLocality: ${draft.locality}, ${draft.city}\nPrice: ${formatIndianPrice(priceNum, draft.kind)}\nSpecs: ${draft.beds} Bed, ${draft.baths} Bath, ${draft.sqft} sq ft, ${draft.furnishing}, ${draft.facing} facing, Floor ${draft.floor}\nAmenities: ${draft.amenities.join(', ')}`;
      const res = await fetch('/api/ai/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'describe_property',
          context,
          prompt: 'Write a concise editorial description.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not generate description.');
      setDraft({ ...draft, description: data.text || draft.description });
      showToast('Editorial description drafted.', 'success');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'AI copywriter unavailable.');
    } finally {
      setAiDescBusy(false);
    }
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const priceNum = Number(draft.price);
    const sqftNum = Number(draft.sqft);

    if (draft.title.trim().length < 4) {
      setDraftError('Enter a descriptive property title (at least 4 characters).');
      return;
    }
    if (draft.locality.trim().length < 2 || draft.city.trim().length < 2) {
      setDraftError('Enter both locality and city.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setDraftError('Enter a valid price in INR (e.g. 67500000 for ₹6.75 Cr).');
      return;
    }
    if (!Number.isFinite(sqftNum) || sqftNum < 100) {
      setDraftError('Enter area in sq ft (minimum 100).');
      return;
    }

    const imagesToSave = draft.images.length > 0 ? draft.images : [IMG_BLR_WHITEFIELD_TOWERS];
    const totalUnitsNum = draft.totalUnits.trim() ? Number(draft.totalUnits) : undefined;
    const normalizedApprovals = draft.reraApproved
      ? Array.from(new Set(['RERA Approved', ...draft.approvals]))
      : draft.approvals.filter((a) => a !== 'RERA Approved');

    const payload = {
      title: draft.title.trim(),
      builderName: draft.builderName.trim() || currentProfile.companyName,
      description:
        draft.description.trim() ||
        `${getProjectStageLabel(draft.projectStage)} ${draft.propertyType.toLowerCase()} by ${
          draft.builderName.trim() || currentProfile.companyName
        } in ${draft.locality.trim()}, ${draft.city.trim()}.`,
      locality: draft.locality.trim(),
      city: draft.city.trim(),
      kind: draft.kind,
      propertyType: draft.propertyType,
      projectStage: draft.projectStage,
      phaseName: draft.phaseName.trim() || undefined,
      possessionDate: draft.possessionDate.trim() || undefined,
      landArea: draft.landArea.trim() || undefined,
      totalUnits: Number.isFinite(totalUnitsNum) ? totalUnitsNum : undefined,
      totalTowers: draft.totalTowers.trim() || undefined,
      price: priceNum,
      beds: draft.beds,
      baths: draft.baths,
      sqft: sqftNum,
      parking: draft.parking,
      amenities: draft.amenities,
      approvals: normalizedApprovals,
      reraApproved: draft.reraApproved,
      furnishing: draft.furnishing,
      facing: draft.facing,
      floor: draft.floor.trim() || 'Ground',
      reraNumber:
        draft.reraNumber.trim() ||
        (draft.reraApproved ? 'RERA-VERIFIED' : 'Applied — Under Review'),
      propertyCode: draft.propertyCode.trim(),
      status: draft.status,
      published: draft.published,
      images: imagesToSave,
      autoWalkthroughVideo: draft.autoWalkthroughVideo,
    };

    if (draft.id) {
      updateProperty(draft.id, payload);
      showToast('Project updated with automated walkthrough.', 'success');
    } else {
      addProperty(payload);
    }
    setEditorOpen(false);
    setDraft(null);
  };

  const handleGenerateAnalyticsSummary = async () => {
    setAiInsightBusy(true);
    try {
      const ctx = `Period: Last ${rangeDays} days
Catalog Visits: ${stats.catalogVisits}
Property Views: ${stats.propertyViews}
WhatsApp/Call Taps: ${stats.whatsappAndCallTaps}
Total Leads: ${stats.totalLeads}
Closed Deals: ${stats.closedDeals}
View-to-Lead Conversion: ${stats.viewToLeadPercent}%
Top Property: ${stats.topProperties[0]?.title || 'None'} (${stats.topProperties[0]?.views || 0} views, ${stats.topProperties[0]?.leads || 0} leads)`;
      const res = await fetch('/api/ai/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'analytics_summary',
          context: ctx,
          prompt: 'Provide 3 concise brokerage recommendations.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not summarize analytics.');
      setAiInsight(data.text || '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Analytics summary unavailable.', 'error');
    } finally {
      setAiInsightBusy(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slugifyCompanyName(profileSlug || profileCompany);
    updateProfile({
      companyName: profileCompany.trim() || currentProfile.companyName,
      slug: cleanSlug,
      email: profileEmail.trim() || currentProfile.email,
      whatsapp: profileWhatsapp.trim() || currentProfile.whatsapp,
      city: profileCity.trim() || currentProfile.city,
      tagline: profileTagline.trim(),
      about: profileAbout.trim(),
      logoUrl: profileLogo || undefined,
    });
    setProfileSlug(cleanSlug);
  };

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const dataUrl = await processPropertyImage(files[0], 0, 480);
      setProfileLogo(dataUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid logo image.', 'error');
    }
  };

  const maxDailyValue = Math.max(
    1,
    ...stats.dailySeries.map((d) => Math.max(d.views, d.enquiries))
  );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#FAF7F2] pb-20">
      {/* Top Workspace Header */}
      <div className="bg-[#17120F] text-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">
              Owner Workspace · {currentProfile.city}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {currentProfile.companyName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/c/${currentProfile.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF7F2] text-[#17120F] text-xs font-bold hover:bg-[#EFE6D6] transition-colors whitespace-nowrap"
            >
              View Public Catalog
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#FAF7F2]/25 text-[#FAF7F2] text-xs font-semibold hover:bg-[#FAF7F2]/10 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              Share QR
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#FAF7F2]/15 text-[#FAF7F2]/75 text-xs font-semibold hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 overflow-x-auto">
          <div role="tablist" aria-label="Dashboard sections" className="flex items-center gap-1">
            {(
              [
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'properties', label: `Properties (${ownerProperties.length})`, icon: Building2 },
                { id: 'leads', label: `Leads (${ownerLeads.length})`, icon: Users },
                { id: 'tours', label: `Meet Tours (${ownerTours.length})`, icon: Video },
                { id: 'profile', label: 'Profile', icon: UserCircle },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#C9A96E] text-[#FAF7F2]'
                      : 'border-transparent text-[#FAF7F2]/60 hover:text-[#FAF7F2]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-8">
        {/* 1. ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#17120F]">
                  Catalog Performance
                </h2>
                <p className="text-sm text-[#17120F]/60">
                  Real-time visits, WhatsApp taps, and pipeline conversion.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex p-1 rounded-full bg-[#EFE6D6]/80">
                  {([7, 30, 90] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setRangeDays(days)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        rangeDays === days
                          ? 'bg-[#17120F] text-[#FAF7F2]'
                          : 'text-[#17120F]/75 hover:text-[#17120F]'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleGenerateAnalyticsSummary()}
                  disabled={aiInsightBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#261E19] transition-colors disabled:opacity-60"
                >
                  {aiInsightBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A96E]" />
                  )}
                  Instant AI Briefing
                </button>
              </div>
            </div>

            {aiInsight && (
              <div className="rounded-[24px] bg-white border border-[#C9A96E]/50 p-6 shadow-editorial">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
                    Executive Briefing
                  </p>
                  <button
                    type="button"
                    onClick={() => setAiInsight(null)}
                    aria-label="Dismiss briefing"
                    className="text-[#17120F]/45 hover:text-[#17120F]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-[#17120F]/85 whitespace-pre-line">
                  {aiInsight}
                </p>
              </div>
            )}

            {/* 6 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: 'Catalog Visits', value: stats.catalogVisits },
                { label: 'Property Views', value: stats.propertyViews },
                { label: 'WhatsApp & Call Taps', value: stats.whatsappAndCallTaps },
                { label: 'Total Leads', value: stats.totalLeads },
                { label: 'Closed Deals', value: stats.closedDeals },
                {
                  label: 'View-to-Lead %',
                  value: stats.viewToLeadPercent,
                  suffix: '%',
                  decimals: 1,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-5 shadow-editorial"
                >
                  <p className="text-xs font-medium text-[#17120F]/60">{kpi.label}</p>
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17120F] mt-2">
                    <AnimatedCounter
                      value={kpi.value}
                      suffix={kpi.suffix}
                      decimals={kpi.decimals}
                    />
                  </p>
                </div>
              ))}
            </div>

            {/* Animated Daily Activity Bar Chart */}
            <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#17120F]">
                    Daily Engagement ({rangeDays} Days)
                  </h3>
                  <p className="text-xs text-[#17120F]/55">
                    Views (ink) compared against enquiries &amp; taps (gold)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#17120F]/65">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#17120F]" />
                    Views
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C9A96E]" />
                    Enquiries
                  </span>
                </div>
              </div>

              <div className="h-52 flex items-end gap-2 sm:gap-3 pt-4">
                {stats.dailySeries.map((pt, idx) => {
                  const viewPct = Math.max(4, Math.round((pt.views / maxDailyValue) * 100));
                  const enqPct =
                    pt.enquiries > 0
                      ? Math.max(6, Math.round((pt.enquiries / maxDailyValue) * 100))
                      : 0;
                  return (
                    <div
                      key={`${pt.dateKey}-${idx}`}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-0"
                    >
                      <div className="w-full flex-1 flex items-end justify-center gap-1">
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.45, delay: idx * 0.02 }}
                          style={{ height: `${viewPct}%`, transformOrigin: 'bottom' }}
                          title={`${pt.label}: ${pt.views} views`}
                          className="w-2.5 sm:w-4 rounded-t-md bg-[#17120F]"
                        />
                        {enqPct > 0 && (
                          <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.45, delay: 0.08 + idx * 0.02 }}
                            style={{ height: `${enqPct}%`, transformOrigin: 'bottom' }}
                            title={`${pt.label}: ${pt.enquiries} enquiries`}
                            className="w-2 sm:w-3 rounded-t-md bg-[#C9A96E]"
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-mono-code text-[#17120F]/50 truncate max-w-full">
                        {pt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom 3-column Breakdown: Top Properties, Pipeline, Lead Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial">
                <h3 className="text-base font-bold text-[#17120F] mb-4">Top Properties</h3>
                {stats.topProperties.length === 0 ? (
                  <p className="text-sm text-[#17120F]/55">Publish listings to track views.</p>
                ) : (
                  <div className="space-y-3.5">
                    {stats.topProperties.map((p) => (
                      <div
                        key={p.propertyId}
                        className="flex items-center justify-between gap-3 text-sm pb-3 border-b border-[#17120F]/[0.06] last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#17120F] truncate">{p.title}</p>
                          <p className="text-xs font-mono-code text-[#17120F]/50">
                            {p.propertyCode}
                          </p>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <p className="font-bold text-[#17120F]">{p.views} views</p>
                          <p className="text-xs text-[#9D7D44]">{p.leads} leads</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial">
                <h3 className="text-base font-bold text-[#17120F] mb-4">Pipeline Counts</h3>
                <div className="space-y-3">
                  {LEAD_STAGES.map((stage) => {
                    const count = stats.pipelineCounts[stage.id];
                    const width =
                      stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0;
                    return (
                      <div key={stage.id}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-[#17120F]/80">{stage.label}</span>
                          <span className="tabular-nums text-[#17120F]">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#EFE6D6] overflow-hidden">
                          <div
                            style={{ width: `${width}%` }}
                            className="h-full rounded-full bg-[#17120F]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial">
                <h3 className="text-base font-bold text-[#17120F] mb-4">Lead Sources</h3>
                <div className="space-y-3.5">
                  {(
                    [
                      { key: 'whatsapp', label: 'WhatsApp Enquiries' },
                      { key: 'visit', label: 'Site Visit Requests' },
                      { key: 'meet', label: 'Google Meet Tours' },
                      { key: 'call', label: 'Direct Calls' },
                    ] as const
                  ).map((src) => (
                    <div
                      key={src.key}
                      className="flex items-center justify-between py-2.5 border-b border-[#17120F]/[0.06] last:border-b-0"
                    >
                      <span className="text-sm text-[#17120F]/80">{src.label}</span>
                      <span className="text-base font-bold tabular-nums text-[#17120F]">
                        {stats.sourceCounts[src.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Website Traffic, SEO Health & Google Analytics 4 */}
            <SeoAnalyticsPanel rangeDays={rangeDays} onNotify={showToast} />
          </div>
        )}

        {/* 2. PROPERTIES TAB */}
        {tab === 'properties' && (() => {
          const filteredOwnerProps = ownerProperties.filter((p) => {
            if (!matchesCatalogCategory(p, propCategoryFilter)) return false;
            if (propReraOnly && p.reraApproved === false) return false;
            if (
              propLocationFilter !== 'all' &&
              !`${p.locality} ${p.city}`.toLowerCase().includes(propLocationFilter.toLowerCase())
            ) {
              return false;
            }
            return true;
          });

          const uniqueCities = Array.from(
            new Set(ownerProperties.map((p) => p.city).filter(Boolean))
          ).sort();

          return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#17120F]">
                    Builder &amp; Project Portfolio
                  </h2>
                  <p className="text-sm text-[#17120F]/60">
                    List upcoming launches, under-construction phases, land parcels, RERA approvals &amp; auto walkthrough videos.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    data-testid="seed-bangalore-btn"
                    disabled={seedingBusy}
                    onClick={async () => {
                      setSeedingBusy(true);
                      try {
                        await seedBangaloreProperties();
                      } catch (err) {
                        showToast(
                          err instanceof Error ? err.message : 'Could not seed Bangalore listings.',
                          'error'
                        );
                      } finally {
                        setSeedingBusy(false);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[#17120F]/20 bg-white text-[#17120F] text-sm font-semibold hover:bg-[#EFE6D6]/60 transition-colors disabled:opacity-55 whitespace-nowrap"
                  >
                    {seedingBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#9D7D44]" />
                    ) : (
                      <Database className="w-4 h-4 text-[#9D7D44]" />
                    )}
                    {seedingBusy ? 'Seeding…' : 'Seed 5 Bangalore Listings'}
                  </button>
                  <button
                    type="button"
                    onClick={openNewProperty}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Project / Land
                  </button>
                </div>
              </div>

              {/* Category-wise Inventory Filter Strip */}
              <div className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-4 shadow-editorial flex flex-wrap items-center gap-2.5">
                {CATALOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPropCategoryFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                      propCategoryFilter === cat.id
                        ? 'bg-[#17120F] text-[#FAF7F2]'
                        : 'bg-[#FAF7F2] text-[#17120F]/75 hover:bg-[#EFE6D6]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter portfolio by city"
                    value={propLocationFilter}
                    onChange={(e) => setPropLocationFilter(e.target.value)}
                    className="rounded-full bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-1.5 text-xs font-semibold text-[#17120F]"
                  >
                    <option value="all">All Cities</option>
                    {uniqueCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setPropReraOnly((v) => !v)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      propReraOnly
                        ? 'bg-[#17120F] text-[#C9A96E] border-[#17120F]'
                        : 'bg-[#FAF7F2] text-[#17120F]/75 border-[#17120F]/12'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    RERA Approved
                  </button>
                </div>
              </div>

              {filteredOwnerProps.length === 0 ? (
                <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-12 text-center">
                  <h3 className="text-lg font-bold text-[#17120F]">No projects match this filter</h3>
                  <p className="text-sm text-[#17120F]/65 mt-1 mb-6">
                    Reset filters or add a new upcoming launch, land plot, or under-construction phase.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPropCategoryFilter('all');
                      setPropLocationFilter('all');
                      setPropReraOnly(false);
                    }}
                    className="px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
                  >
                    Show All Projects
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOwnerProps.map((prop) => (
                    <article
                      key={prop.id}
                      className="rounded-[28px] bg-white border border-[#17120F]/[0.08] overflow-hidden shadow-editorial flex flex-col"
                    >
                      <div className="relative aspect-[16/10] bg-[#EFE6D6]">
                        <img
                          src={prop.images[0]}
                          alt={prop.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-1 rounded-full bg-[#17120F]/85 text-[#FAF7F2] text-[11px] font-bold">
                              {prop.published ? getProjectStageLabel(prop.projectStage) : 'Hidden'}
                            </span>
                            {prop.status !== 'available' && (
                              <span className="px-2.5 py-1 rounded-full bg-[#C9A96E] text-[#17120F] text-[11px] font-bold uppercase">
                                {prop.status}
                              </span>
                            )}
                          </div>
                          {prop.reraApproved !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF7F2]/95 text-[#17120F] text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-[#238845]" />
                              RERA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#EFE6D6]/95 text-[#7A5B27] text-[10px] font-bold">
                              RERA Pending
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-[#17120F]/55">
                            <span className="font-mono-code">
                              {prop.propertyCode} · {prop.propertyType}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#9D7D44] font-semibold">
                              <Film className="w-3 h-3" />
                              {prop.images.length} photos · Video
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#17120F] mt-1 line-clamp-1">
                            {prop.title}
                          </h3>
                          <p className="text-xs text-[#17120F]/60 mt-0.5">
                            {prop.locality}, {prop.city}
                            {prop.phaseName ? ` · ${prop.phaseName}` : ''}
                          </p>
                          <div className="flex items-baseline justify-between gap-2 mt-2">
                            <p className="text-lg font-extrabold text-[#17120F] tabular-nums">
                              {formatIndianPrice(prop.price, prop.kind)}
                            </p>
                            {prop.landArea && (
                              <span className="text-[11px] font-semibold text-[#17120F]/55">
                                {prop.landArea}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-[#17120F]/[0.08] flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProperty(prop)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EFE6D6] text-[#17120F] text-xs font-semibold hover:bg-[#E4D6BD]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateProperty(prop.id, { published: !prop.published })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#17120F]/15 text-[#17120F] text-xs font-semibold hover:bg-[#FAF7F2]"
                        >
                          {prop.published ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Publish
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateProperty(prop.id, {
                              status:
                                prop.status === 'available'
                                  ? prop.kind === 'rent'
                                    ? 'rented'
                                    : 'sold'
                                  : 'available',
                            })
                          }
                          className="px-3 py-1.5 rounded-full border border-[#17120F]/15 text-[#17120F] text-xs font-semibold hover:bg-[#FAF7F2]"
                        >
                          {prop.status === 'available'
                            ? prop.kind === 'rent'
                              ? 'Mark Rented'
                              : 'Mark Sold'
                            : 'Mark Available'}
                        </button>
                        <Link
                          to={`/c/${currentProfile.slug}/p/${prop.id}`}
                          className="p-1.5 rounded-full text-[#17120F]/60 hover:text-[#17120F]"
                          aria-label={`View public page for ${prop.title}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteProperty(prop.id)}
                          aria-label={`Delete ${prop.title}`}
                          className="ml-auto p-1.5 rounded-full text-red-700/75 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. LEADS TAB */}
        {tab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#17120F]">
                  Buyer Leads &amp; Site Visits
                </h2>
                <p className="text-sm text-[#17120F]/60">
                  Track every WhatsApp enquiry, visit booking, and virtual tour.
                </p>
              </div>
              <div className="inline-flex p-1 rounded-full bg-[#EFE6D6]/80 self-start">
                <button
                  type="button"
                  onClick={() => setLeadsView('kanban')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                    leadsView === 'kanban'
                      ? 'bg-[#17120F] text-[#FAF7F2]'
                      : 'text-[#17120F]/75'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setLeadsView('list')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                    leadsView === 'list'
                      ? 'bg-[#17120F] text-[#FAF7F2]'
                      : 'text-[#17120F]/75'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
              </div>
            </div>

            {leadsView === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {LEAD_STAGES.map((stage) => {
                  const stageLeads = ownerLeads.filter((l) => l.status === stage.id);
                  return (
                    <div
                      key={stage.id}
                      className="rounded-[24px] bg-[#EFE6D6]/45 border border-[#17120F]/[0.08] p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-[#17120F]">{stage.label}</h3>
                        <span className="text-xs font-mono-code text-[#17120F]/60">
                          {stageLeads.length}
                        </span>
                      </div>

                      {stageLeads.length === 0 ? (
                        <p className="text-xs text-[#17120F]/45 px-1 py-6 text-center">
                          No leads in {stage.label}
                        </p>
                      ) : (
                        stageLeads.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            onStatusChange={(status) => updateLead(lead.id, { status })}
                            onNotesChange={(notes) => updateLead(lead.id, { notes })}
                            onScheduleCalendar={() => setCalendarModalLead(lead)}
                            onLaunchMeet={() =>
                              setMeetModalLead({
                                propertyId: lead.propertyId,
                                propertyTitle: lead.propertyTitle,
                                propertyCode: lead.propertyCode,
                                clientName: lead.name,
                                leadId: lead.id,
                              })
                            }
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] overflow-x-auto shadow-editorial">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#17120F]/[0.08] text-xs uppercase tracking-wider text-[#17120F]/55">
                      <th className="px-5 py-4 font-semibold">Buyer</th>
                      <th className="px-5 py-4 font-semibold">Property</th>
                      <th className="px-5 py-4 font-semibold">Source</th>
                      <th className="px-5 py-4 font-semibold">Stage</th>
                      <th className="px-5 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-[#17120F]/[0.06] last:border-b-0 hover:bg-[#FAF7F2]/60"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-[#17120F]">{lead.name}</p>
                          <p className="text-xs text-[#17120F]/60 font-mono-code">{lead.phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#17120F]">{lead.propertyTitle}</p>
                          <p className="text-xs font-mono-code text-[#17120F]/55">
                            {lead.propertyCode}
                            {lead.preferredDate ? ` · Visit ${lead.preferredDate}` : ''}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs capitalize text-[#17120F]/75">
                          {lead.source}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            aria-label={`Stage for ${lead.name}`}
                            value={lead.status}
                            onChange={(e) =>
                              updateLead(lead.id, { status: e.target.value as LeadStatus })
                            }
                            className="rounded-full bg-[#FAF7F2] border border-[#17120F]/15 px-3 py-1.5 text-xs font-semibold"
                          >
                            {LEAD_STAGES.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                          <a
                            href={buildWhatsAppUrl(
                              lead.phone,
                              `Hello ${lead.name}, following up on ${lead.propertyTitle} (${lead.propertyCode}).`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#3DBF63] text-white text-xs font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => setCalendarModalLead(lead)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-semibold cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#C9A96E]" />
                            Calendar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMeetModalLead({
                                propertyId: lead.propertyId,
                                propertyTitle: lead.propertyTitle,
                                propertyCode: lead.propertyCode,
                                clientName: lead.name,
                                leadId: lead.id,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#EFE6D6] text-[#17120F] text-xs font-semibold"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Meet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. GOOGLE MEET TOURS TAB */}
        {tab === 'tours' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#17120F]">
                  Google Meet Virtual Tours
                </h2>
                <p className="text-sm text-[#17120F]/60">
                  Create live Google Meet rooms for remote walkthroughs and NRI client briefings.
                </p>
              </div>
              {meetAccessToken ? (
                <button
                  type="button"
                  onClick={() => {
                    const firstProp = ownerProperties[0];
                    setMeetModalLead({
                      propertyId: firstProp?.id || 'general',
                      propertyTitle: firstProp?.title || currentProfile.companyName,
                      propertyCode: firstProp?.propertyCode || 'CATALOG',
                      clientName: '',
                    });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19]"
                >
                  <Video className="w-4 h-4 text-[#C9A96E]" />
                  New Google Meet Room
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void connectGoogleAccount()}
                  className="gsi-material-button self-start sm:self-auto"
                >
                  <span className="w-5 h-5 shrink-0">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="block w-full h-full">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  </span>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {ownerTours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial flex flex-col justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9D7D44]">
                      {tour.meetingCode}
                    </p>
                    <h3 className="text-lg font-bold text-[#17120F] mt-1">{tour.propertyTitle}</h3>
                    <p className="text-sm text-[#17120F]/70 mt-1">
                      Client: <span className="font-semibold text-[#17120F]">{tour.clientName}</span>
                    </p>
                    <p className="text-xs font-mono-code text-[#17120F]/55 mt-1">
                      Scheduled: {tour.scheduledAt.replace('T', ' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-[#17120F]/[0.08]">
                    <a
                      href={tour.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-semibold"
                    >
                      Open Meet
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(tour.meetingUri);
                        showToast('Google Meet link copied.', 'success');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#17120F]/15 text-xs font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PROFILE TAB */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleSaveProfile}
              className="lg:col-span-8 rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-8 shadow-editorial space-y-5"
            >
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-[#17120F]">
                  Agency Branding &amp; WhatsApp
                </h2>
                <p className="text-sm text-[#17120F]/60">
                  Displayed on your public catalog header and every property page.
                </p>
              </div>

              <div className="flex items-center gap-4">
                {profileLogo ? (
                  <img
                    src={profileLogo}
                    alt="Agency logo preview"
                    className="w-16 h-16 rounded-full object-cover border border-[#17120F]/15"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#17120F] text-[#FAF7F2] font-bold text-xl flex items-center justify-center">
                    {(profileCompany || 'K').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#17120F]/20 text-xs font-semibold cursor-pointer hover:bg-[#EFE6D6]/60">
                  <ImagePlus className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void handleLogoUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="prof-company"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Company Name
                  </label>
                  <input
                    id="prof-company"
                    type="text"
                    required
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prof-slug"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Catalog Slug
                  </label>
                  <input
                    id="prof-slug"
                    type="text"
                    required
                    value={profileSlug}
                    onChange={(e) => setProfileSlug(e.target.value)}
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm font-mono-code"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="prof-email"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Registered Email ID (receives instant client site-visit booking alerts)
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="estatedirect@zohomail.in"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prof-wa"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    WhatsApp Number
                  </label>
                  <input
                    id="prof-wa"
                    type="tel"
                    required
                    value={profileWhatsapp}
                    onChange={(e) => setProfileWhatsapp(e.target.value)}
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prof-city"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Primary City
                  </label>
                  <input
                    id="prof-city"
                    type="text"
                    required
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prof-tagline"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                >
                  Catalog Tagline
                </label>
                <input
                  id="prof-tagline"
                  type="text"
                  value={profileTagline}
                  onChange={(e) => setProfileTagline(e.target.value)}
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-about"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                >
                  About Your Firm
                </label>
                <textarea
                  id="prof-about"
                  rows={4}
                  value={profileAbout}
                  onChange={(e) => setProfileAbout(e.target.value)}
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm"
                />
              </div>

              <button
                type="submit"
                className="px-7 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19]"
              >
                Save Agency Profile
              </button>
            </form>

            <div className="lg:col-span-4 space-y-5">
              <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
                  Your Public Catalog Link
                </p>
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/10 p-3.5 text-xs font-mono-code break-all text-[#17120F]/80">
                  {catalogUrl}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(catalogUrl);
                      setCopiedLink(true);
                      window.setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-semibold"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-[#17120F]/20 text-xs font-semibold"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT PROPERTY MODAL */}
      {editorOpen && draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={draft.id ? 'Edit Property' : 'Add Property'}
        >
          <div
            onClick={() => setEditorOpen(false)}
            className="fixed inset-0 bg-[#17120F]/65"
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-[#FAF7F2] border border-[#17120F]/10 p-6 sm:p-8 shadow-editorial-lg">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
                  {draft.propertyCode}
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#17120F]">
                  {draft.id ? 'Edit Residence' : 'Add New Residence'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Close property editor"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#EFE6D6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {draftError && (
              <div
                role="alert"
                className="mb-5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
              >
                {draftError}
              </div>
            )}

            <form onSubmit={handleSaveProperty} className="space-y-5">
              {/* Multi-Photo Upload with Reorder & Set Cover */}
              <div className="rounded-2xl bg-white border border-[#17120F]/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#17120F]">
                      Property Photographs ({draft.images.length}/10)
                    </p>
                    <p className="text-[11px] text-[#17120F]/55">
                      JPG, PNG, or WebP · max 5 MB each · auto-resized to 1600px WebP
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-semibold cursor-pointer hover:bg-[#261E19]">
                    <ImagePlus className="w-3.5 h-3.5" />
                    {photoBusy ? 'Optimizing...' : 'Upload Photos'}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => void handlePhotoFiles(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>

                {draft.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {draft.images.map((img, idx) => (
                      <div
                        key={`${idx}-${img.slice(0, 24)}`}
                        className="relative rounded-xl overflow-hidden border border-[#17120F]/10 aspect-[4/3] bg-[#EFE6D6]"
                      >
                        <img
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#C9A96E] text-[#17120F] text-[10px] font-bold">
                            Cover
                          </span>
                        )}
                        <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                aria-label="Set as cover photo"
                                onClick={() => {
                                  const next = [...draft.images];
                                  const [picked] = next.splice(idx, 1);
                                  next.unshift(picked);
                                  setDraft({ ...draft, images: next });
                                }}
                                className="w-6 h-6 rounded-full bg-[#17120F]/80 text-[#C9A96E] flex items-center justify-center"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                            )}
                            {idx > 0 && (
                              <button
                                type="button"
                                aria-label="Move photo left"
                                onClick={() => {
                                  const next = [...draft.images];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  setDraft({ ...draft, images: next });
                                }}
                                className="w-6 h-6 rounded-full bg-[#17120F]/80 text-white flex items-center justify-center"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < draft.images.length - 1 && (
                              <button
                                type="button"
                                aria-label="Move photo right"
                                onClick={() => {
                                  const next = [...draft.images];
                                  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                  setDraft({ ...draft, images: next });
                                }}
                                className="w-6 h-6 rounded-full bg-[#17120F]/80 text-white flex items-center justify-center"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                images: draft.images.filter((_, i) => i !== idx),
                              })
                            }
                            className="w-6 h-6 rounded-full bg-red-700/90 text-white flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {draft.images.length > 0 && (
                  <div className="pt-3 border-t border-[#17120F]/10 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#9D7D44]" />
                        <span className="text-xs font-bold text-[#17120F]">
                          Auto-Generated Walkthrough Video Preview
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDraftWalkthrough((v) => !v)}
                        className="text-xs font-semibold text-[#9D7D44] hover:text-[#17120F]"
                      >
                        {showDraftWalkthrough ? 'Hide Video Preview' : 'Play Auto Walkthrough'}
                      </button>
                    </div>
                    {showDraftWalkthrough && (
                      <PropertyWalkthroughVideo
                        images={draft.images}
                        title={draft.title || 'New Builder Project'}
                        locality={draft.locality || 'Bengaluru'}
                        city={draft.city || 'Bengaluru'}
                        price={Number(draft.price) || 0}
                        kind={draft.kind}
                        propertyType={draft.propertyType}
                        projectStage={draft.projectStage}
                        phaseName={draft.phaseName}
                        landArea={draft.landArea}
                        sqft={Number(draft.sqft) || 0}
                        beds={draft.beds}
                        reraApproved={draft.reraApproved}
                        reraNumber={draft.reraNumber}
                        builderName={draft.builderName || currentProfile.companyName}
                        compact
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="prop-title" className="block text-xs font-semibold mb-1">
                    Project / Property Title
                  </label>
                  <input
                    id="prop-title"
                    type="text"
                    required
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g., Prestige Evergreen Phase 2 — Whitefield"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prop-builder" className="block text-xs font-semibold mb-1">
                    Builder / Developer Name
                  </label>
                  <input
                    id="prop-builder"
                    type="text"
                    value={draft.builderName}
                    onChange={(e) => setDraft({ ...draft, builderName: e.target.value })}
                    placeholder="e.g., Prestige Group, Sobha, Aurelia Developments"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prop-type" className="block text-xs font-semibold mb-1">
                    Category / Property Type (incl. Land &amp; Plots)
                  </label>
                  <select
                    id="prop-type"
                    value={draft.propertyType}
                    onChange={(e) => setDraft({ ...draft, propertyType: e.target.value })}
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prop-stage" className="block text-xs font-semibold mb-1">
                    Construction / Launch Phase
                  </label>
                  <select
                    id="prop-stage"
                    value={draft.projectStage}
                    onChange={(e) =>
                      setDraft({ ...draft, projectStage: e.target.value as ProjectStage })
                    }
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  >
                    {PROJECT_STAGES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prop-kind" className="block text-xs font-semibold mb-1">
                    Listing Kind
                  </label>
                  <select
                    id="prop-kind"
                    value={draft.kind}
                    onChange={(e) => setDraft({ ...draft, kind: e.target.value as ListingKind })}
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  >
                    <option value="buy">For Sale (Buy / Pre-Launch)</option>
                    <option value="rent">For Rent (Lease)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="prop-locality" className="block text-xs font-semibold mb-1">
                    Locality / Micro-Market
                  </label>
                  <input
                    id="prop-locality"
                    type="text"
                    required
                    value={draft.locality}
                    onChange={(e) => setDraft({ ...draft, locality: e.target.value })}
                    placeholder="e.g., Whitefield, Devanahalli, Sarjapur Road"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prop-city" className="block text-xs font-semibold mb-1">
                    City
                  </label>
                  <input
                    id="prop-city"
                    type="text"
                    required
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prop-price" className="block text-xs font-semibold mb-1">
                    Price in INR ({draft.price ? formatIndianPrice(Number(draft.price), draft.kind) : 'Preview'})
                  </label>
                  <input
                    id="prop-price"
                    type="number"
                    required
                    min={1000}
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    placeholder="28500000"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="prop-sqft" className="block text-xs font-semibold mb-1">
                    Unit / Plot Area (sq ft)
                  </label>
                  <input
                    id="prop-sqft"
                    type="number"
                    required
                    min={100}
                    value={draft.sqft}
                    onChange={(e) => setDraft({ ...draft, sqft: e.target.value })}
                    placeholder="2400"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm tabular-nums"
                  />
                </div>
              </div>

              {/* Builder Scale, Phase & Land Area Section */}
              <div className="rounded-2xl bg-white border border-[#17120F]/10 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9D7D44]">
                  Phase, Land &amp; Project Scale
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="prop-phase" className="block text-xs font-semibold mb-1">
                      Phase Label
                    </label>
                    <input
                      id="prop-phase"
                      type="text"
                      value={draft.phaseName}
                      onChange={(e) => setDraft({ ...draft, phaseName: e.target.value })}
                      placeholder="Phase 1 — East Wing"
                      className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="prop-possession" className="block text-xs font-semibold mb-1">
                      Possession Timeline
                    </label>
                    <input
                      id="prop-possession"
                      type="text"
                      value={draft.possessionDate}
                      onChange={(e) => setDraft({ ...draft, possessionDate: e.target.value })}
                      placeholder="Dec 2028"
                      className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="prop-land-area" className="block text-xs font-semibold mb-1">
                      Total Land Area
                    </label>
                    <input
                      id="prop-land-area"
                      type="text"
                      value={draft.landArea}
                      onChange={(e) => setDraft({ ...draft, landArea: e.target.value })}
                      placeholder="18.5 Acres"
                      className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="prop-total-units" className="block text-xs font-semibold mb-1">
                      Total Units / Plots
                    </label>
                    <input
                      id="prop-total-units"
                      type="number"
                      min={1}
                      value={draft.totalUnits}
                      onChange={(e) => setDraft({ ...draft, totalUnits: e.target.value })}
                      placeholder="320"
                      className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="prop-towers" className="block text-xs font-semibold mb-1">
                    Towers / Blocks / Plot Breakdown
                  </label>
                  <input
                    id="prop-towers"
                    type="text"
                    value={draft.totalTowers}
                    onChange={(e) => setDraft({ ...draft, totalTowers: e.target.value })}
                    placeholder="e.g., 4 Towers · 2B+G+24 Floors or 180 Freehold Plots"
                    className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="prop-beds" className="block text-xs font-semibold mb-1">
                    Beds (0 for Land)
                  </label>
                  <input
                    id="prop-beds"
                    type="number"
                    min={0}
                    max={20}
                    value={draft.beds}
                    onChange={(e) => setDraft({ ...draft, beds: Number(e.target.value) })}
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="prop-baths" className="block text-xs font-semibold mb-1">
                    Baths
                  </label>
                  <input
                    id="prop-baths"
                    type="number"
                    min={0}
                    max={20}
                    value={draft.baths}
                    onChange={(e) => setDraft({ ...draft, baths: Number(e.target.value) })}
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="prop-parking" className="block text-xs font-semibold mb-1">
                    Parking
                  </label>
                  <input
                    id="prop-parking"
                    type="number"
                    min={0}
                    max={20}
                    value={draft.parking}
                    onChange={(e) => setDraft({ ...draft, parking: Number(e.target.value) })}
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="prop-furnishing" className="block text-xs font-semibold mb-1">
                    Furnishing
                  </label>
                  <select
                    id="prop-furnishing"
                    value={draft.furnishing}
                    onChange={(e) =>
                      setDraft({ ...draft, furnishing: e.target.value as Property['furnishing'] })
                    }
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  >
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Designer Furnished">Designer Furnished</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prop-facing" className="block text-xs font-semibold mb-1">
                    Facing
                  </label>
                  <select
                    id="prop-facing"
                    value={draft.facing}
                    onChange={(e) =>
                      setDraft({ ...draft, facing: e.target.value as Property['facing'] })
                    }
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  >
                    <option value="East">East</option>
                    <option value="North">North</option>
                    <option value="West">West</option>
                    <option value="South">South</option>
                    <option value="North-East">North-East</option>
                    <option value="South-West">South-West</option>
                    <option value="Sea-Facing">Sea-Facing</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prop-floor" className="block text-xs font-semibold mb-1">
                    Floor / Plot Spec
                  </label>
                  <input
                    id="prop-floor"
                    type="text"
                    value={draft.floor}
                    onChange={(e) => setDraft({ ...draft, floor: e.target.value })}
                    placeholder="12th of 24 or Freehold Plot"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* RERA Approval Toggle + Statutory Checkmarks */}
              <div className="rounded-2xl bg-[#EFE6D6]/55 border border-[#C9A96E]/35 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9D7D44]">
                      RERA &amp; Statutory Approval Checkmarks
                    </p>
                    <p className="text-[11px] text-[#17120F]/65">
                      Toggle RERA status and select all verified municipal/title clearances.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#17120F]/15 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.reraApproved}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          reraApproved: e.target.checked,
                          approvals: e.target.checked
                            ? Array.from(new Set(['RERA Approved', ...draft.approvals]))
                            : draft.approvals.filter((a) => a !== 'RERA Approved'),
                        })
                      }
                      className="w-4 h-4 accent-[#238845]"
                    />
                    <span className="text-xs font-bold text-[#17120F]">
                      {draft.reraApproved ? '✓ RERA Approved' : 'RERA Pending / Pre-Launch'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prop-rera" className="block text-xs font-semibold mb-1">
                      RERA Registration Number
                    </label>
                    <input
                      id="prop-rera"
                      type="text"
                      value={draft.reraNumber}
                      onChange={(e) => setDraft({ ...draft, reraNumber: e.target.value })}
                      placeholder="PRM/KA/RERA/1251/446/PR/..."
                      className="w-full rounded-xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-xs font-mono-code"
                    />
                  </div>
                  <div>
                    <label htmlFor="prop-code" className="block text-xs font-semibold mb-1">
                      Project Code (Auto-generated)
                    </label>
                    <input
                      id="prop-code"
                      type="text"
                      value={draft.propertyCode}
                      onChange={(e) => setDraft({ ...draft, propertyCode: e.target.value })}
                      className="w-full rounded-xl bg-white border border-[#17120F]/15 px-3.5 py-2.5 text-xs font-mono-code"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {BUILDER_APPROVALS.map((approval) => {
                    const checked = draft.approvals.includes(approval);
                    return (
                      <button
                        key={approval}
                        type="button"
                        onClick={() => {
                          const next = checked
                            ? draft.approvals.filter((a) => a !== approval)
                            : [...draft.approvals, approval];
                          setDraft({
                            ...draft,
                            approvals: next,
                            reraApproved:
                              approval === 'RERA Approved' ? !checked : draft.reraApproved,
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          checked
                            ? 'bg-[#17120F] text-[#FAF7F2] border-[#17120F]'
                            : 'bg-white text-[#17120F]/75 border-[#17120F]/15 hover:border-[#17120F]/35'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            checked ? 'text-[#3DBF63]' : 'text-[#17120F]/30'
                          }`}
                        />
                        {approval}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description + Fast Gemini AI Copywriter */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label htmlFor="prop-desc" className="text-xs font-semibold">
                    Editorial Description
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleGenerateDescription()}
                    disabled={aiDescBusy}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9D7D44] hover:text-[#17120F]"
                  >
                    {aiDescBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Write with Gemini AI
                  </button>
                </div>
                <textarea
                  id="prop-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Describe architecture, finishes, views, and neighborhood highlights..."
                  className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm"
                />
              </div>

              {/* Amenities Multi-Select */}
              <div>
                <p className="text-xs font-semibold mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_AMENITIES.map((item) => {
                    const selected = draft.amenities.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            amenities: selected
                              ? draft.amenities.filter((a) => a !== item)
                              : [...draft.amenities, item],
                          })
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          selected
                            ? 'bg-[#17120F] text-[#FAF7F2] border-[#17120F]'
                            : 'bg-white text-[#17120F]/75 border-[#17120F]/15 hover:border-[#17120F]/35'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#17120F]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#17120F]/20 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19]"
                >
                  {draft.id ? 'Save Changes' : 'Publish Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QRShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={currentProfile.companyName}
        subtitle={`Branded Catalog · ${currentProfile.city}`}
        url={catalogUrl}
      />

      {meetModalLead && (
        <MeetTourModal
          open={Boolean(meetModalLead)}
          onClose={() => setMeetModalLead(null)}
          propertyId={meetModalLead.propertyId}
          propertyTitle={meetModalLead.propertyTitle}
          propertyCode={meetModalLead.propertyCode}
          ownerId={currentProfile.ownerId}
          agencyWhatsapp={currentProfile.whatsapp}
          defaultClientName={meetModalLead.clientName}
          onCreated={(tour) => {
            if (meetModalLead.leadId) {
              updateLead(meetModalLead.leadId, { meetUri: tour.meetingUri });
            }
          }}
        />
      )}
      {calendarModalLead && (() => {
        const matchedProp = ownerProperties.find((p) => p.id === calendarModalLead.propertyId);
        const loc = matchedProp
          ? `${matchedProp.locality}, ${matchedProp.city}`
          : currentProfile.city;
        return (
          <CalendarBookingModal
            open={Boolean(calendarModalLead)}
            onClose={() => setCalendarModalLead(null)}
            lead={calendarModalLead}
            agencyName={currentProfile.companyName}
            ownerEmail={currentProfile.email}
            location={loc}
            onSynced={(htmlLink) => {
              updateLead(calendarModalLead.id, {
                status: 'site_visit',
                calendarEventLink: htmlLink,
              });
            }}
          />
        );
      })()}
    </div>
  );
}

function LeadCard({
  lead,
  onStatusChange,
  onNotesChange,
  onScheduleCalendar,
  onLaunchMeet,
}: {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onNotesChange: (notes: string) => void;
  onScheduleCalendar: () => void;
  onLaunchMeet: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(lead.notes);

  return (
    <div className="rounded-[20px] bg-white border border-[#17120F]/[0.08] p-4 space-y-3 shadow-editorial">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#17120F] truncate">{lead.name}</p>
          <p className="text-xs font-mono-code text-[#17120F]/60">{lead.phone}</p>
          {lead.email && (
            <p className="text-[11px] font-mono-code text-[#17120F]/55 truncate">{lead.email}</p>
          )}
        </div>
        <span className="text-[11px] font-semibold capitalize text-[#9D7D44] shrink-0">
          {lead.source}
        </span>
      </div>

      <div className="text-xs text-[#17120F]/75">
        <p className="font-semibold text-[#17120F] line-clamp-1">{lead.propertyTitle}</p>
        <p className="font-mono-code text-[11px] text-[#17120F]/55">
          {lead.propertyCode}
          {lead.preferredDate ? ` · Visit ${lead.preferredDate}` : ''}
          {lead.preferredTime ? ` (${lead.preferredTime})` : ''}
        </p>
        {lead.message && <p className="mt-1.5 text-[#17120F]/70 line-clamp-2">{lead.message}</p>}
      </div>

      <input
        type="text"
        aria-label={`Notes for ${lead.name}`}
        value={notesDraft}
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={() => {
          if (notesDraft !== lead.notes) onNotesChange(notesDraft);
        }}
        placeholder="Add private broker note..."
        className="w-full rounded-xl bg-[#FAF7F2] border border-[#17120F]/10 px-3 py-1.5 text-xs text-[#17120F]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#17120F]/[0.06]">
        <select
          aria-label={`Pipeline stage for ${lead.name}`}
          value={lead.status}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
          className="rounded-full bg-[#FAF7F2] border border-[#17120F]/12 px-2.5 py-1 text-[11px] font-semibold"
        >
          {LEAD_STAGES.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <a
            href={buildWhatsAppUrl(
              lead.phone,
              `Hello ${lead.name}, thank you for your enquiry about ${lead.propertyTitle} (${lead.propertyCode}).`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3DBF63] text-white text-[11px] font-semibold hover:bg-[#33A856]"
          >
            <MessageCircle className="w-3 h-3" />
            Reply
          </a>
          <button
            type="button"
            onClick={onScheduleCalendar}
            aria-label={`Schedule Google Calendar visit with ${lead.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#17120F] text-[#FAF7F2] text-[11px] font-semibold hover:bg-[#261E19] cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-[#C9A96E]" />
            Cal
          </button>
          <button
            type="button"
            onClick={onLaunchMeet}
            aria-label={`Start Google Meet with ${lead.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFE6D6] text-[#17120F] text-[11px] font-semibold hover:bg-[#E4D6BD]"
          >
            <Video className="w-3 h-3" />
            Meet
          </button>
        </div>
      </div>
    </div>
  );
}

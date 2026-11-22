import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Box,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Expand,
  ExternalLink,
  Film,
  LandPlot,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sofa,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import {
  buildPropertyWhatsAppMessage,
  buildWhatsAppUrl,
  formatIndianPrice,
  formatPricePerSqft,
  getProjectStageLabel,
  isLandProperty,
  validateVisitForm,
} from '../utils/realEstateLogic';
import {
  BUSINESS_CONTACT_EMAIL,
  buildGoogleCalendarDeepLink,
  buildIcsCalendarInvite,
} from '../utils/bookingAndOtpLogic';
import { QRShareModal } from '../components/QRShareModal';
import { MeetTourModal } from '../components/MeetTourModal';
import { NeighborhoodIntelligence } from '../components/NeighborhoodIntelligence';
import { ArchitecturalScene3D } from '../components/ArchitecturalScene3D';
import { PropertyWalkthroughVideo } from '../components/PropertyWalkthroughVideo';
import { trackWebEvent } from '../utils/webAnalytics';

export function PropertyDetailPage() {
  const { slug = 'aurelia-estates', propertyId = '' } = useParams();
  const { properties, getProfileBySlug, getProfileByOwnerId, captureLead, trackEvent, showToast } =
    useAppStore();
  const prefersReduced = useReducedMotion();

  const property = properties.find((p) => p.id === propertyId);
  const agency =
    (property ? getProfileByOwnerId(property.ownerId) : undefined) || getProfileBySlug(slug);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'photos' | 'video' | '3d'>('photos');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);

  // Request-a-visit form state
  const visitFormRef = useRef<HTMLDivElement | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('11:00');
  const [visitorMessage, setVisitorMessage] = useState('');
  const [visitErrors, setVisitErrors] = useState<Record<string, string>>({});
  const [visitBusy, setVisitBusy] = useState(false);
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [bookingReceipt, setBookingReceipt] = useState<{
    recipientEmail: string;
    emailSent: boolean;
    googleCalendarUrl: string;
    icsContent: string;
    icsFilename: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    setActiveImageIdx(0);
    setViewMode('photos');
    setVisitSubmitted(false);
    setBookingReceipt(null);
    setVisitErrors({});
    if (property) {
      trackEvent(property.ownerId, 'property_view', property.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  const images = property?.images?.length ? property.images : [];

  useEffect(() => {
    if (!lightboxOpen || images.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveImageIdx((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setActiveImageIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, images.length]);

  if (!property || !agency) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="text-3xl font-extrabold text-[#17120F]">Property not found</h1>
        <p className="text-sm text-[#17120F]/65 mt-2 mb-6">
          This listing may have been removed or unpublished.
        </p>
        <Link
          to={`/c/${slug}`}
          className="inline-flex items-center px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/#/c/${agency.slug}/p/${property.id}`;
  const whatsappMessage = buildPropertyWhatsAppMessage(property, agency.companyName);
  const whatsappUrl = buildWhatsAppUrl(agency.whatsapp, whatsappMessage);

  const handleWhatsAppEnquiry = () => {
    trackEvent(property.ownerId, 'whatsapp_click', property.id);
    trackWebEvent('whatsapp_enquiry', {
      property_id: property.id,
      property_code: property.propertyCode,
      city: property.city,
    });
    captureLead({
      ownerId: property.ownerId,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.propertyCode,
      name: visitorName.trim() || 'WhatsApp Prospect',
      phone: visitorPhone.trim() || agency.whatsapp,
      message: `Initiated WhatsApp enquiry for ${property.title} (${property.propertyCode}).`,
      source: 'whatsapp',
    });
    showToast('WhatsApp enquiry logged to broker CRM.', 'success');
  };

  const scrollToVisitForm = () => {
    visitFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const nameInput = document.getElementById('visit-name');
    if (nameInput) nameInput.focus();
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateVisitForm({
      name: visitorName,
      phone: visitorPhone,
      preferredDate,
      message: visitorMessage,
    });
    if (!result.valid) {
      setVisitErrors(result.errors);
      return;
    }
    setVisitErrors({});
    setVisitBusy(true);

    captureLead({
      ownerId: property.ownerId,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCode: property.propertyCode,
      name: visitorName,
      phone: visitorPhone,
      email: visitorEmail.trim() || undefined,
      preferredDate,
      preferredTime,
      message: visitorMessage || `Requested site visit on ${preferredDate} at ${preferredTime} IST.`,
      source: 'visit',
    });
    trackWebEvent('book_site_visit', {
      property_id: property.id,
      property_code: property.propertyCode,
      city: property.city,
    });

    const ownerMail = agency.email || BUSINESS_CONTACT_EMAIL;
    const locationStr = `${property.locality}, ${property.city}`;
    const fallbackIcs = buildIcsCalendarInvite({
      propertyTitle: property.title,
      propertyCode: property.propertyCode,
      location: locationStr,
      date: preferredDate,
      time: preferredTime,
      visitorName,
      visitorPhone,
      visitorEmail: visitorEmail.trim() || undefined,
      agencyName: agency.companyName,
      ownerEmail: ownerMail,
      notes: visitorMessage,
    });
    const fallbackGcal = buildGoogleCalendarDeepLink({
      propertyTitle: property.title,
      propertyCode: property.propertyCode,
      location: locationStr,
      date: preferredDate,
      time: preferredTime,
      visitorName,
      visitorPhone,
      visitorEmail: visitorEmail.trim() || undefined,
      agencyName: agency.companyName,
      ownerEmail: ownerMail,
      notes: visitorMessage,
    });

    try {
      const res = await fetch('/api/bookings/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyTitle: property.title,
          propertyCode: property.propertyCode,
          location: locationStr,
          preferredDate,
          preferredTime,
          visitorName,
          visitorPhone,
          visitorEmail: visitorEmail.trim() || undefined,
          agencyName: agency.companyName,
          ownerEmail: ownerMail,
          notes: visitorMessage,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setBookingReceipt({
          recipientEmail: data.recipientEmail || ownerMail,
          emailSent: Boolean(data.emailSent),
          googleCalendarUrl: data.googleCalendarUrl || fallbackGcal,
          icsContent: data.icsContent || fallbackIcs.icsContent,
          icsFilename: data.icsFilename || fallbackIcs.filename,
          message: data.message || `Booking notification prepared for ${ownerMail}.`,
        });
      } else {
        setBookingReceipt({
          recipientEmail: ownerMail,
          emailSent: false,
          googleCalendarUrl: fallbackGcal,
          icsContent: fallbackIcs.icsContent,
          icsFilename: fallbackIcs.filename,
          message: `Calendar invite ready for ${ownerMail}.`,
        });
      }
    } catch {
      setBookingReceipt({
        recipientEmail: ownerMail,
        emailSent: false,
        googleCalendarUrl: fallbackGcal,
        icsContent: fallbackIcs.icsContent,
        icsFilename: fallbackIcs.filename,
        message: `Calendar invite ready for ${ownerMail}.`,
      });
    } finally {
      setVisitBusy(false);
      setVisitSubmitted(true);
      showToast(`Site visit requested & alert routed to ${ownerMail}`, 'success');
    }
  };

  const handleDownloadVisitIcs = () => {
    if (!bookingReceipt) return;
    const blob = new Blob([bookingReceipt.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bookingReceipt.icsFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const relatedProperties = properties
    .filter((p) => p.ownerId === agency.ownerId && p.id !== property.id && p.published)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28 lg:pb-20">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-6 sm:pt-8">
        {/* Top Breadcrumb & Media Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <Link
            to={`/c/${agency.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17120F]/75 hover:text-[#17120F] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {agency.companyName}
          </Link>

          <div className="inline-flex p-1 rounded-full bg-[#EFE6D6]/85 self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setViewMode('photos')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'photos'
                  ? 'bg-[#17120F] text-[#FAF7F2]'
                  : 'text-[#17120F]/75 hover:text-[#17120F]'
              }`}
            >
              Photos ({images.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('video')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'video'
                  ? 'bg-[#17120F] text-[#C9A96E]'
                  : 'text-[#17120F]/75 hover:text-[#17120F]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Walkthrough Video
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === '3d'
                  ? 'bg-[#17120F] text-[#FAF7F2]'
                  : 'text-[#17120F]/75 hover:text-[#17120F]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Tour
            </button>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LEFT COLUMN (Gallery + Editorial Details) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Gallery, Automated Walkthrough Video, or 3D Walkthrough */}
            <div>
              {viewMode === '3d' ? (
                <ArchitecturalScene3D
                  title={property.title}
                  subtitle={`${property.locality}, ${property.city} · Interactive 3D Spatial Model`}
                  heightClass="h-[460px] sm:h-[520px]"
                />
              ) : viewMode === 'video' ? (
                <PropertyWalkthroughVideo
                  images={images}
                  title={property.title}
                  locality={property.locality}
                  city={property.city}
                  price={property.price}
                  kind={property.kind}
                  propertyType={property.propertyType}
                  projectStage={property.projectStage}
                  phaseName={property.phaseName}
                  landArea={property.landArea}
                  sqft={property.sqft}
                  beds={property.beds}
                  reraApproved={property.reraApproved}
                  reraNumber={property.reraNumber}
                  builderName={property.builderName || agency.companyName}
                />
              ) : (
                <>
                  <div className="relative rounded-[28px] sm:rounded-[32px] overflow-hidden aspect-[4/3] bg-[#EFE6D6] shadow-editorial">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={images[activeImageIdx] || 'fallback'}
                        layoutId={activeImageIdx === 0 ? `property-hero-${property.id}` : undefined}
                        initial={prefersReduced ? false : { opacity: 0.35 }}
                        animate={{ opacity: 1 }}
                        exit={prefersReduced ? undefined : { opacity: 0.35 }}
                        transition={{ duration: 0.25 }}
                        src={images[activeImageIdx]}
                        alt={`${property.title} — photo ${activeImageIdx + 1}`}
                        referrerPolicy="no-referrer"
                        onClick={() => setLightboxOpen(true)}
                        className="w-full h-full object-cover cursor-zoom-in"
                      />
                    </AnimatePresence>

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIdx((i) => (i - 1 + images.length) % images.length)
                          }
                          aria-label="Previous property photograph"
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#17120F]/75 text-[#FAF7F2] flex items-center justify-center hover:bg-[#17120F] transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveImageIdx((i) => (i + 1) % images.length)}
                          aria-label="Next property photograph"
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#17120F]/75 text-[#FAF7F2] flex items-center justify-center hover:bg-[#17120F] transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Open full-screen photo lightbox"
                      className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17120F]/80 text-[#FAF7F2] text-xs font-semibold hover:bg-[#17120F] transition-colors"
                    >
                      <Expand className="w-3.5 h-3.5" />
                      Fullscreen
                    </button>
                  </div>

                  {/* Clickable Thumbnail Strip with Animated Gold Ring */}
                  {images.length > 1 && (
                    <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
                      {images.map((src, idx) => {
                        const isActive = idx === activeImageIdx;
                        return (
                          <button
                            key={`${src}-${idx}`}
                            type="button"
                            onClick={() => setActiveImageIdx(idx)}
                            aria-label={`View photo ${idx + 1} of ${property.title}`}
                            className="relative rounded-2xl overflow-hidden w-24 h-18 sm:w-28 sm:h-20 shrink-0 focus-visible:outline-none"
                          >
                            <img
                              src={src}
                              alt={`${property.title} thumbnail ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover transition-opacity ${
                                isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                              }`}
                            />
                            {isActive && (
                              <motion.span
                                layoutId="activeThumbRing"
                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                className="absolute inset-0 rounded-2xl ring-[3px] ring-inset ring-[#C9A96E] pointer-events-none"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Badges Row + Title + Locality */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1 rounded-full bg-[#17120F] text-[#FAF7F2] text-[11px] font-bold uppercase tracking-[0.12em]">
                  {property.kind === 'buy' ? 'FOR SALE' : 'FOR RENT'}
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#EFE6D6] text-[#17120F] text-[11px] font-bold uppercase tracking-[0.08em]">
                  {property.propertyType}
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#C9A96E]/25 text-[#17120F] text-[11px] font-bold uppercase tracking-[0.08em]">
                  {getProjectStageLabel(property.projectStage)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                    property.reraApproved !== false
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  {property.reraApproved !== false ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      RERA Approved
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      RERA Filed / EOI
                    </>
                  )}
                </span>
                <span className="text-xs font-mono-code text-[#17120F]/60">
                  ID: {property.propertyCode}
                </span>
                {property.status !== 'available' && (
                  <span className="px-3 py-1 rounded-full bg-[#C9A96E] text-[#17120F] text-[11px] font-bold uppercase">
                    {property.status}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] leading-[1.12] text-[#17120F]">
                {property.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm sm:text-base text-[#17120F]/70">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#9D7D44] shrink-0" />
                  <span>
                    {property.locality}, {property.city}
                  </span>
                </span>
                {property.builderName && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#17120F]/65">
                    <Building2 className="w-4 h-4 text-[#9D7D44] shrink-0" />
                    Developer: <strong className="text-[#17120F]">{property.builderName}</strong>
                  </span>
                )}
              </div>

              {/* Key Facts Row (adapts automatically for Land/Plot vs Homes) */}
              {isLandProperty(property.propertyType) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Maximize2 className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.sqft.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Plot Sq Ft</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <LandPlot className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F]">
                        {property.landArea || 'Freehold'}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Total Land Area</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.totalUnits || 'Limited'}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Total Plots</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F]">
                        {property.possessionDate || 'Ready'}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Possession</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <BedDouble className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.beds}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Bedrooms</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Bath className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.baths}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Bathrooms</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Maximize2 className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.sqft.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Sq Ft</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] p-4 flex items-center gap-3">
                    <Car className="w-5 h-5 text-[#9D7D44] shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[#17120F] tabular-nums">
                        {property.parking}
                      </p>
                      <p className="text-xs text-[#17120F]/55">Parking</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Builder Development Metadata Strip (Phase, Possession, Land Area, Towers/Units) */}
              {(property.phaseName ||
                property.possessionDate ||
                property.landArea ||
                property.totalTowers) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="rounded-2xl bg-[#EFE6D6]/55 border border-[#17120F]/[0.06] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9D7D44]">
                      Phase
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#17120F] mt-0.5">
                      {property.phaseName || getProjectStageLabel(property.projectStage)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#EFE6D6]/55 border border-[#17120F]/[0.06] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9D7D44]">
                      Possession
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#17120F] mt-0.5">
                      {property.possessionDate || 'Ready to Move'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#EFE6D6]/55 border border-[#17120F]/[0.06] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9D7D44]">
                      Land Parcel
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#17120F] mt-0.5">
                      {property.landArea || 'Freehold'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#EFE6D6]/55 border border-[#17120F]/[0.06] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9D7D44]">
                      Scale
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-[#17120F] mt-0.5">
                      {property.totalTowers ||
                        (property.totalUnits ? `${property.totalUnits} Units` : 'Boutique')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <section className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-8 shadow-editorial">
              <h2 className="text-lg font-bold tracking-tight text-[#17120F] mb-3">
                About this residence
              </h2>
              <p className="text-[15px] leading-relaxed text-[#17120F]/80 whitespace-pre-line">
                {property.description}
              </p>
            </section>

            {/* Amenities (2-column list with check icons) */}
            {property.amenities.length > 0 && (
              <section className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-8 shadow-editorial">
                <h2 className="text-lg font-bold tracking-tight text-[#17120F] mb-5">
                  Amenities &amp; Features
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                  {property.amenities.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-[#17120F]/85"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#EFE6D6] text-[#17120F] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Facts Row (Furnishing, Facing, Floor) */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#17120F]/50 mb-1.5">
                  <Sofa className="w-3.5 h-3.5 text-[#9D7D44]" />
                  Furnishing
                </div>
                <p className="text-sm font-bold text-[#17120F]">{property.furnishing}</p>
              </div>
              <div className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#17120F]/50 mb-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#9D7D44]" />
                  Facing
                </div>
                <p className="text-sm font-bold text-[#17120F]">{property.facing}</p>
              </div>
              <div className="rounded-[24px] bg-white border border-[#17120F]/[0.08] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#17120F]/50 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#9D7D44]" />
                  Floor
                </div>
                <p className="text-sm font-bold text-[#17120F]">{property.floor}</p>
              </div>
            </section>

            {/* RERA Registration & Statutory Approvals Checkmarks Card */}
            <section className="rounded-[28px] bg-[#EFE6D6]/65 border border-[#C9A96E]/40 p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#17120F] text-[#C9A96E] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
                        RERA &amp; Statutory Compliance
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          property.reraApproved !== false
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[#17120F]/15 text-[#17120F]'
                        }`}
                      >
                        {property.reraApproved !== false ? '✓ Verified' : 'Application Filed'}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-bold font-mono-code text-[#17120F] mt-1 break-all">
                      {property.reraNumber || 'Registered on Request'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#17120F]/65 max-w-xs">
                  Verify project approvals, land title, and phase timelines directly on the state
                  RERA portal prior to booking.
                </p>
              </div>

              {property.approvals && property.approvals.length > 0 && (
                <div className="pt-4 border-t border-[#17120F]/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {property.approvals.map((approval) => (
                    <div
                      key={approval}
                      className="flex items-center gap-2 text-xs font-semibold text-[#17120F]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#238845] shrink-0" />
                      <span>{approval}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Live Neighborhood & Market Intelligence (Maps Grounding + Search Grounding) */}
            <NeighborhoodIntelligence property={property} />

            {/* Listed By Card */}
            <section className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-8 shadow-editorial">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44] mb-4">
                Listed By
              </p>
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-[#17120F] text-[#FAF7F2] font-bold text-xl flex items-center justify-center shrink-0">
                  {agency.companyName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#17120F]">{agency.companyName}</h2>
                  <p className="text-xs font-medium text-[#17120F]/55 mt-0.5">{agency.city}</p>
                  <p className="text-sm text-[#17120F]/75 leading-relaxed mt-3">{agency.about}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      to={`/c/${agency.slug}`}
                      className="px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors"
                    >
                      View {agency.companyName}&apos;s catalog
                    </Link>
                    {relatedProperties[0] && (
                      <Link
                        to={`/c/${agency.slug}/p/${relatedProperties[0].id}`}
                        className="px-5 py-2.5 rounded-full border border-[#17120F]/20 text-[#17120F] text-sm font-semibold hover:bg-[#EFE6D6]/60 transition-colors"
                      >
                        View more properties
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (Sticky on Desktop: Price + Enquiry + Request Visit) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[88px] space-y-5">
            {/* Price Card */}
            <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9D7D44]">
                PRICE
              </p>
              <p className="text-4xl font-extrabold tracking-[-0.03em] text-[#17120F] mt-1 tabular-nums">
                {formatIndianPrice(property.price, property.kind)}
              </p>
              <div className="mt-3 pt-3 border-t border-[#17120F]/[0.08] flex items-center justify-between text-xs text-[#17120F]/60">
                <span className="font-mono-code">ID: {property.propertyCode}</span>
                <span className="tabular-nums">
                  {formatPricePerSqft(property.price, property.sqft, property.kind)}
                </span>
              </div>
            </div>

            {/* Enquiry Card */}
            <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#17120F]">
                  Interested in this property?
                </h2>
                <p className="text-xs text-[#17120F]/60 mt-0.5">
                  {agency.companyName} · {agency.city}
                </p>
              </div>

              <div className="space-y-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppEnquiry}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#3DBF63] text-white text-sm font-bold hover:bg-[#33A856] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Enquiry
                </a>

                <button
                  type="button"
                  onClick={scrollToVisitForm}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-[#17120F]/20 text-[#17120F] text-sm font-bold hover:bg-[#EFE6D6]/60 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Request a Visit
                </button>

                <button
                  type="button"
                  onClick={() => setMeetOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#EFE6D6]/75 text-[#17120F] text-xs font-bold hover:bg-[#EFE6D6] transition-colors"
                >
                  <Video className="w-4 h-4 text-[#9D7D44]" />
                  Google Meet Virtual Tour
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  trackEvent(property.ownerId, 'qr_share', property.id);
                  setQrOpen(true);
                }}
                className="w-full pt-3 border-t border-[#17120F]/[0.08] inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#17120F]/70 hover:text-[#17120F] transition-colors"
              >
                <QrCode className="w-4 h-4 text-[#9D7D44]" />
                Share / QR code
              </button>
            </div>

            {/* Request-a-Visit Form */}
            <div
              ref={visitFormRef}
              className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 shadow-editorial"
            >
              <h2 className="text-base font-bold tracking-tight text-[#17120F]">
                Request a Site Visit
              </h2>
              <p className="text-xs text-[#17120F]/60 mt-0.5 mb-4">
                Reserve a private viewing with {agency.companyName}.
              </p>

              {visitSubmitted ? (
                <div
                  role="status"
                  data-testid="visit-confirmed-card"
                  className="rounded-2xl bg-[#EFE6D6]/70 border border-[#C9A96E]/45 p-5 space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#17120F] text-[#C9A96E] flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#17120F]">Site visit booked</p>
                      <p className="text-[11px] text-[#17120F]/65">
                        {preferredDate} at {preferredTime} IST
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#17120F]/80 leading-relaxed">
                    Booking alert routed to{' '}
                    <span className="font-mono-code font-semibold text-[#17120F]">
                      {bookingReceipt?.recipientEmail || agency.email || BUSINESS_CONTACT_EMAIL}
                    </span>
                    . {bookingReceipt?.emailSent ? 'Confirmation email dispatched.' : 'Calendar invite ready below.'}
                  </p>

                  <div className="space-y-2 pt-1">
                    {bookingReceipt?.googleCalendarUrl && (
                      <a
                        href={bookingReceipt.googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-bold hover:bg-[#261E19]"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#C9A96E]" />
                        Add to Google Calendar
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadVisitIcs}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#17120F]/15 text-[#17120F] text-xs font-semibold hover:bg-[#FAF7F2] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#9D7D44]" />
                        .ics Invite
                      </button>
                      <a
                        href={buildWhatsAppUrl(
                          agency.whatsapp,
                          `Hello ${agency.companyName}, I just booked a site visit for ${property.title} (${property.propertyCode}) on ${preferredDate} at ${preferredTime} IST. Name: ${visitorName}, Phone: ${visitorPhone}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#3DBF63] text-white text-xs font-bold hover:bg-[#33A856]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVisitSubmitted(false);
                      setBookingReceipt(null);
                      setVisitorName('');
                      setVisitorPhone('');
                      setVisitorEmail('');
                      setPreferredDate('');
                      setVisitorMessage('');
                    }}
                    className="block mx-auto pt-1 text-xs font-semibold text-[#9D7D44] underline cursor-pointer"
                  >
                    Book another slot
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => void handleVisitSubmit(e)} noValidate className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="visit-name"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                    >
                      Your Name
                    </label>
                    <input
                      id="visit-name"
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3.5 py-2.5 text-sm text-[#17120F]"
                    />
                    {visitErrors.name && (
                      <p className="text-xs text-red-700 mt-1">{visitErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="visit-phone"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                    >
                      Phone / WhatsApp
                    </label>
                    <input
                      id="visit-phone"
                      type="tel"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3.5 py-2.5 text-sm text-[#17120F]"
                    />
                    {visitErrors.phone && (
                      <p className="text-xs text-red-700 mt-1">{visitErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="visit-email"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                    >
                      Your Email (for calendar invite copy)
                    </label>
                    <input
                      id="visit-email"
                      type="email"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      placeholder="you@example.com (optional)"
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3.5 py-2.5 text-sm text-[#17120F]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="visit-date"
                        className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                      >
                        Preferred Date
                      </label>
                      <input
                        id="visit-date"
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2.5 text-sm text-[#17120F]"
                      />
                      {visitErrors.preferredDate && (
                        <p className="text-xs text-red-700 mt-1">{visitErrors.preferredDate}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="visit-time"
                        className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                      >
                        Time Slot (IST)
                      </label>
                      <select
                        id="visit-time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3 py-2.5 text-sm text-[#17120F]"
                      >
                        <option value="10:30">10:30 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:30">12:30 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="visit-message"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                    >
                      Message (optional)
                    </label>
                    <textarea
                      id="visit-message"
                      rows={2}
                      value={visitorMessage}
                      onChange={(e) => setVisitorMessage(e.target.value)}
                      placeholder="Preferred unit configuration or questions..."
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3.5 py-2.5 text-sm text-[#17120F] resize-none"
                    />
                    {visitErrors.message && (
                      <p className="text-xs text-red-700 mt-1">{visitErrors.message}</p>
                    )}
                  </div>

                  <p className="text-[11px] text-[#17120F]/55 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#9D7D44] shrink-0" />
                    Sends calendar alert to {agency.email || BUSINESS_CONTACT_EMAIL}
                  </p>

                  <button
                    type="submit"
                    disabled={visitBusy}
                    data-testid="confirm-visit-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {visitBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Booking &amp; Notifying...
                      </>
                    ) : (
                      'Confirm Site Visit Booking'
                    )}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar (<= 15% mobile viewport height) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF7F2]/96 border-t border-[#17120F]/10 px-4 py-3 flex items-center gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppEnquiry}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#3DBF63] text-white text-sm font-bold"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={scrollToVisitForm}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold"
        >
          <Calendar className="w-4 h-4" />
          Request Visit
        </button>
      </div>

      {/* Lightbox Modal with Drag-to-Swipe & Keyboard Arrows */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-[#17120F]/95 flex flex-col items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Property image lightbox"
          >
            <div className="w-full max-w-5xl flex items-center justify-between text-[#FAF7F2] mb-4">
              <span className="text-xs font-mono-code text-[#FAF7F2]/75">
                {activeImageIdx + 1} / {images.length} · {property.title}
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close lightbox"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full max-w-5xl flex items-center justify-center">
              <motion.img
                key={images[activeImageIdx]}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -60) {
                    setActiveImageIdx((i) => (i + 1) % images.length);
                  } else if (info.offset.x > 60) {
                    setActiveImageIdx((i) => (i - 1 + images.length) % images.length);
                  }
                }}
                src={images[activeImageIdx]}
                alt={`${property.title} full view ${activeImageIdx + 1}`}
                referrerPolicy="no-referrer"
                className="max-h-[76vh] w-auto max-w-full rounded-2xl object-contain select-none cursor-grab active:cursor-grabbing"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIdx((i) => (i - 1 + images.length) % images.length)
                    }
                    aria-label="Previous image"
                    className="absolute left-2 sm:left-4 w-11 h-11 rounded-full bg-[#17120F]/80 text-white flex items-center justify-center hover:bg-black"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx((i) => (i + 1) % images.length)}
                    aria-label="Next image"
                    className="absolute right-2 sm:right-4 w-11 h-11 rounded-full bg-[#17120F]/80 text-white flex items-center justify-center hover:bg-black"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      <QRShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={property.title}
        subtitle={`${formatIndianPrice(property.price, property.kind)} · ${property.locality}`}
        url={shareUrl}
      />

      <MeetTourModal
        open={meetOpen}
        onClose={() => setMeetOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
        propertyCode={property.propertyCode}
        ownerId={property.ownerId}
        agencyWhatsapp={agency.whatsapp}
      />
    </div>
  );
}

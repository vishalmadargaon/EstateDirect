import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Film,
  MapPin,
  MessageCircle,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import type { CatalogFilters } from '../types';
import {
  CATALOG_CATEGORIES,
  buildWhatsAppUrl,
  filterAndSortProperties,
  formatIndianPrice,
  getProjectStageLabel,
  isLandProperty,
} from '../utils/realEstateLogic';
import { QRShareModal } from '../components/QRShareModal';

const DEFAULT_FILTERS: CatalogFilters = {
  kind: 'all',
  category: 'all',
  location: 'all',
  reraOnly: false,
  propertyType: 'all',
  minBeds: 0,
  priceBand: 'all',
  search: '',
  sortBy: 'featured',
};

const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'Bengaluru', label: 'Bengaluru (All)' },
  { value: 'Whitefield', label: 'Whitefield · Varthur' },
  { value: 'Devanahalli', label: 'Devanahalli · Airport Rd' },
  { value: 'Sarjapur', label: 'Sarjapur · Panathur' },
  { value: 'Hebbal', label: 'Hebbal · Thanisandra' },
  { value: 'Indiranagar', label: 'Indiranagar · Central BLR' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Goa', label: 'North Goa' },
];

export function PublicCatalogPage() {
  const { slug = 'aurelia-estates' } = useParams();
  const { getProfileBySlug, properties, trackEvent } = useAppStore();
  const prefersReduced = useReducedMotion();

  const agency = getProfileBySlug(slug);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (agency) {
      trackEvent(agency.ownerId, 'catalog_view');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency?.ownerId]);

  const agencyProperties = useMemo(
    () => (agency ? properties.filter((p) => p.ownerId === agency.ownerId) : []),
    [agency, properties]
  );

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of agencyProperties) {
      if (p.published) set.add(p.propertyType);
    }
    return Array.from(set).sort();
  }, [agencyProperties]);

  const dynamicLocations = useMemo(() => {
    const base = [...LOCATION_OPTIONS];
    const existing = new Set(base.map((b) => b.value.toLowerCase()));
    for (const p of agencyProperties) {
      if (p.published && p.city && !existing.has(p.city.toLowerCase())) {
        base.push({ value: p.city, label: p.city });
        existing.add(p.city.toLowerCase());
      }
    }
    return base;
  }, [agencyProperties]);

  const filtered = useMemo(
    () => filterAndSortProperties(agencyProperties, filters),
    [agencyProperties, filters]
  );

  if (!agency) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#17120F]">
          Catalog not found
        </h1>
        <p className="text-sm text-[#17120F]/65 mt-2 mb-6">
          No builder or agency catalog exists at <span className="font-mono-code">/c/{slug}</span>.
        </p>
        <Link
          to="/c/aurelia-estates"
          className="inline-flex items-center px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
        >
          View Aurelia Estates &amp; Builders Demo
        </Link>
      </div>
    );
  }

  const catalogUrl = `${window.location.origin}/#/c/${agency.slug}`;
  const publishedCount = agencyProperties.filter((p) => p.published).length;
  const blrCount = agencyProperties.filter(
    (p) => p.published && /bengaluru|bangalore/i.test(p.city)
  ).length;

  const hasActiveFilter =
    filters.kind !== 'all' ||
    (filters.category && filters.category !== 'all') ||
    (filters.location && filters.location !== 'all') ||
    Boolean(filters.reraOnly) ||
    filters.propertyType !== 'all' ||
    filters.minBeds !== 0 ||
    filters.priceBand !== 'all' ||
    filters.search.trim() !== '';

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      {/* Builder / Agency Header */}
      <section className="bg-[#17120F] text-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-12 sm:py-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex items-start gap-5">
            {agency.logoUrl ? (
              <img
                src={agency.logoUrl}
                alt={`${agency.companyName} logo`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-[#FAF7F2]/20 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C9A96E] text-[#17120F] font-extrabold text-2xl flex items-center justify-center shrink-0">
                {agency.companyName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A96E]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{agency.city}</span>
                <span aria-hidden="true">·</span>
                <span>{publishedCount} Published Projects</span>
                {blrCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{blrCount} Bengaluru Developments</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] mt-2">
                {agency.companyName}
              </h1>
              <p className="text-sm sm:text-base text-[#FAF7F2]/75 mt-2 max-w-2xl">
                {agency.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={buildWhatsAppUrl(
                agency.whatsapp,
                `Hello ${agency.companyName}, I am browsing your upcoming Bengaluru & flagship project catalog on EstateDirect and would like to connect.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent(agency.ownerId, 'whatsapp_click')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#3DBF63] text-white text-sm font-semibold hover:bg-[#33A856] transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Builder
            </a>
            <button
              type="button"
              onClick={() => {
                trackEvent(agency.ownerId, 'qr_share');
                setQrOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#FAF7F2]/25 text-[#FAF7F2] text-sm font-semibold hover:bg-[#FAF7F2]/10 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-4 h-4" />
              Share / QR
            </button>
          </div>
        </div>
      </section>

      {/* Category-Wise, Location & Pricing Filter Bar */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 -mt-6">
        <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-4 sm:p-5 shadow-editorial space-y-4">
          {/* Category-Wise Quick Tabs */}
          <div
            role="tablist"
            aria-label="Category filter"
            className="flex items-center gap-2 overflow-x-auto pb-1"
          >
            {CATALOG_CATEGORIES.map((cat) => {
              const active = (filters.category || 'all') === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilters((f) => ({ ...f, category: cat.id }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-[#17120F] text-[#FAF7F2] border-[#17120F]'
                      : 'bg-[#FAF7F2] text-[#17120F]/75 border-[#17120F]/10 hover:border-[#17120F]/30 hover:text-[#17120F]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Primary Row: Buy/Rent + Search + Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div
              role="group"
              aria-label="Listing type filter"
              className="inline-flex p-1 rounded-full bg-[#EFE6D6]/75 self-start shrink-0"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'buy', label: 'Buy' },
                  { id: 'rent', label: 'Rent' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, kind: opt.id }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    filters.kind === opt.id
                      ? 'bg-[#17120F] text-[#FAF7F2]'
                      : 'text-[#17120F]/75 hover:text-[#17120F]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#17120F]/45 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="catalog-search" className="sr-only">
                Search projects by name, builder, Bengaluru corridor, plot, or code
              </label>
              <input
                id="catalog-search"
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search Whitefield, Devanahalli, Prestige, plots, phase, or code..."
                className="w-full rounded-full bg-[#FAF7F2] border border-[#17120F]/10 pl-11 pr-4 py-2.5 text-sm text-[#17120F] placeholder:text-[#17120F]/45"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="catalog-sort" className="text-xs font-semibold text-[#17120F]/60">
                Sort
              </label>
              <select
                id="catalog-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortBy: e.target.value as CatalogFilters['sortBy'],
                  }))
                }
                className="rounded-full bg-[#FAF7F2] border border-[#17120F]/10 px-4 py-2.5 text-xs font-semibold text-[#17120F]"
              >
                <option value="featured">Newest Launches</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="sqft_desc">Area: Largest First</option>
              </select>
            </div>
          </div>

          {/* Secondary Row: Location + Type + Budget + Bedrooms + RERA Checkmark */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#17120F]/[0.06]">
            {/* Location */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-location" className="text-xs font-medium text-[#17120F]/60">
                Location
              </label>
              <select
                id="filter-location"
                value={filters.location || 'all'}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                className="rounded-full bg-[#FAF7F2] border border-[#17120F]/10 px-3.5 py-2 text-xs font-semibold text-[#17120F]"
              >
                {dynamicLocations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-type" className="text-xs font-medium text-[#17120F]/60">
                Type
              </label>
              <select
                id="filter-type"
                value={filters.propertyType}
                onChange={(e) => setFilters((f) => ({ ...f, propertyType: e.target.value }))}
                className="rounded-full bg-[#FAF7F2] border border-[#17120F]/10 px-3.5 py-2 text-xs font-semibold text-[#17120F]"
              >
                <option value="all">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing / Budget */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-price" className="text-xs font-medium text-[#17120F]/60">
                Pricing
              </label>
              <select
                id="filter-price"
                value={filters.priceBand}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    priceBand: e.target.value as CatalogFilters['priceBand'],
                  }))
                }
                className="rounded-full bg-[#FAF7F2] border border-[#17120F]/10 px-3.5 py-2 text-xs font-semibold text-[#17120F]"
              >
                <option value="all">All Budgets</option>
                <option value="under_1cr">Under ₹1 Cr (Plots &amp; Homes)</option>
                <option value="1cr_3cr">₹1 Cr – ₹3 Cr</option>
                <option value="3cr_6cr">₹3 Cr – ₹6 Cr</option>
                <option value="6cr_plus">₹6 Cr+ Ultra Luxury</option>
                <option value="rent_under_1l">Rent: Under ₹1 L/mo</option>
                <option value="rent_1l_plus">Rent: ₹1 L+/mo</option>
              </select>
            </div>

            {/* Bedrooms */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-beds" className="text-xs font-medium text-[#17120F]/60">
                Config
              </label>
              <select
                id="filter-beds"
                value={filters.minBeds}
                onChange={(e) => setFilters((f) => ({ ...f, minBeds: Number(e.target.value) }))}
                className="rounded-full bg-[#FAF7F2] border border-[#17120F]/10 px-3.5 py-2 text-xs font-semibold text-[#17120F]"
              >
                <option value={0}>Any (incl. Plots)</option>
                <option value={2}>2+ BHK</option>
                <option value={3}>3+ BHK</option>
                <option value={4}>4+ BHK</option>
                <option value={5}>5+ BHK</option>
              </select>
            </div>

            {/* RERA Approved Only toggle */}
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, reraOnly: !f.reraOnly }))}
              aria-pressed={Boolean(filters.reraOnly)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                filters.reraOnly
                  ? 'bg-[#17120F] text-[#C9A96E] border-[#17120F]'
                  : 'bg-[#FAF7F2] text-[#17120F]/80 border-[#17120F]/12 hover:border-[#17120F]/35'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              RERA Approved Only
            </button>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-[#17120F]/55 tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
              </span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#9D7D44] hover:text-[#17120F]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 mt-10">
        {filtered.length === 0 ? (
          <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-12 text-center">
            <h2 className="text-xl font-bold text-[#17120F]">No matching projects</h2>
            <p className="text-sm text-[#17120F]/65 mt-2 mb-6">
              Try switching category, widening your budget, or selecting All Locations.
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((prop) => {
              const isLand = isLandProperty(prop.propertyType);
              const isReraApproved = prop.reraApproved !== false;
              const stageLabel = getProjectStageLabel(prop.projectStage);
              return (
                <motion.article
                  key={prop.id}
                  whileHover={prefersReduced ? undefined : { y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="group rounded-[28px] bg-white border border-[#17120F]/[0.08] overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-shadow flex flex-col"
                >
                  <Link to={`/c/${agency.slug}/p/${prop.id}`} className="flex flex-col flex-1">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#EFE6D6]">
                      {prop.images[0] ? (
                        <motion.img
                          layoutId={`property-hero-${prop.id}`}
                          src={prop.images[0]}
                          alt={prop.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#EFE6D6] to-[#D9C7A8] flex items-center justify-center text-xs font-semibold text-[#17120F]/60">
                          {prop.title}
                        </div>
                      )}

                      {/* Top Badges: Stage + RERA status */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#17120F]/85 text-[#FAF7F2] text-[11px] font-bold tracking-wide">
                          {stageLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isReraApproved
                              ? 'bg-[#FAF7F2]/95 text-[#17120F]'
                              : 'bg-[#EFE6D6]/95 text-[#7A5B27]'
                          }`}
                        >
                          {isReraApproved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#238845]" />
                              RERA
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-[#9D7D44]" />
                              EOI / RERA Filed
                            </>
                          )}
                        </span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#17120F]/80 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-2">
                        <p className="text-2xl font-extrabold text-[#FAF7F2] tabular-nums tracking-tight">
                          {formatIndianPrice(prop.price, prop.kind)}
                        </p>
                        {prop.status !== 'available' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#C9A96E] text-[#17120F] text-[11px] font-bold uppercase tracking-wider">
                            {prop.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#17120F]/75 text-[#C9A96E] text-[10px] font-semibold">
                            <Film className="w-3 h-3" />
                            Walkthrough
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#17120F]/55 mb-2 flex-wrap">
                          <span className="font-semibold text-[#9D7D44] uppercase tracking-[0.06em]">
                            {prop.propertyType}
                          </span>
                          {prop.phaseName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[140px]">{prop.phaseName}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-code">{prop.propertyCode}</span>
                        </div>

                        <h2 className="text-lg font-bold tracking-tight text-[#17120F] group-hover:text-[#9D7D44] transition-colors line-clamp-1">
                          {prop.title}
                        </h2>

                        <p className="flex items-center gap-1.5 text-sm text-[#17120F]/65 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#9D7D44] shrink-0" />
                          <span className="truncate">
                            {prop.locality}, {prop.city}
                          </span>
                        </p>

                        {prop.builderName && (
                          <p className="text-xs text-[#17120F]/50 mt-1">
                            By <span className="font-semibold text-[#17120F]/75">{prop.builderName}</span>
                            {prop.possessionDate ? ` · Possession ${prop.possessionDate}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#17120F]/[0.08] flex items-center justify-between text-xs text-[#17120F]/70 tabular-nums">
                        {isLand ? (
                          <>
                            <span>{prop.sqft.toLocaleString('en-IN')} sq ft Plot</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.landArea || 'Freehold'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.totalUnits ? `${prop.totalUnits} Plots` : 'Clear Title'}</span>
                          </>
                        ) : (
                          <>
                            <span>{prop.beds} Bed</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.baths} Bath</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.sqft.toLocaleString('en-IN')} sq ft</span>
                            <span aria-hidden="true">·</span>
                            <span>{prop.landArea || `${prop.parking} Park`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      <QRShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={agency.companyName}
        subtitle={`Branded builder catalog · ${agency.city}`}
        url={catalogUrl}
      />
    </div>
  );
}

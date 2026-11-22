import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Box,
  Building2,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import { DEMO_SLUG, IMG_HERO_TOWER } from '../data/seedData';
import { buildWhatsAppUrl, formatIndianPrice } from '../utils/realEstateLogic';
import { BUSINESS_CONTACT_EMAIL, BUSINESS_WHATSAPP_NUMBER } from '../utils/bookingAndOtpLogic';

const FEATURES = [
  {
    num: '01',
    title: 'Branded Property Catalog',
    desc: 'Every broker, builder, and owner receives a clean editorial storefront at one memorable link—with Buy/Rent filters, Indian Cr/Lakh formatting, and zero third-party portal clutter.',
    icon: Building2,
    span: 'lg:col-span-2',
  },
  {
    num: '02',
    title: 'Direct WhatsApp Enquiries',
    desc: 'Every listing button opens WhatsApp with the property title, code, locality, and price prefilled so conversations start with context.',
    icon: MessageCircle,
    span: 'lg:col-span-1',
  },
  {
    num: '03',
    title: 'Multi-Photo Property Manager',
    desc: 'Drag-and-drop up to 10 photographs per residence with automatic 1600px WebP optimization, cover reordering, RERA fields, and instant publish controls.',
    icon: ShieldCheck,
    span: 'lg:col-span-1',
  },
  {
    num: '04',
    title: 'Lead Pipeline & Site Visits',
    desc: 'Capture structured site-visit requests and track every prospect from New to Closed across Kanban or list views with one-tap WhatsApp follow-ups.',
    icon: Users,
    span: 'lg:col-span-1',
  },
  {
    num: '05',
    title: 'Live Conversion Analytics',
    desc: 'Measure catalog visits, property views, WhatsApp taps, and view-to-lead ratios across 7, 30, and 90 days—with instant executive summaries.',
    icon: BarChart3,
    span: 'lg:col-span-1',
  },
  {
    num: '06',
    title: 'QR Sharing, 3D Walkthroughs & Google Meet',
    desc: 'Print scannable site-board QR codes, present interactive 3D architectural residences, and spin up live Google Meet viewings for NRI and out-of-city buyers.',
    icon: QrCode,
    span: 'lg:col-span-2',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your agency profile',
    body: 'Sign up free in under 60 seconds with your firm name, city, and WhatsApp number. Your branded catalog link is live immediately.',
  },
  {
    step: '02',
    title: 'Publish your residences',
    body: 'Upload architectural photography, set pricing in INR, select amenities, add RERA registration numbers, and auto-generate property codes.',
  },
  {
    step: '03',
    title: 'Share one link or QR code',
    body: 'Place your catalog link on Instagram, WhatsApp Business, brochures, or site hoardings. Buyers filter, inspect galleries, and explore neighborhoods.',
  },
  {
    step: '04',
    title: 'Convert leads on WhatsApp & Meet',
    body: 'Receive prefilled WhatsApp enquiries, confirmed site-visit dates, and Google Meet virtual tour bookings—all tracked automatically in your dashboard.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Before EstateDirect, we sent messy 40-photo PDF brochures over WhatsApp that clients rarely opened on mobile. Switching to one branded catalog link cut our initial qualification time in half and delivered 38 verified site visits in our first 60 days.',
    name: 'Raghavendra Kulkarni',
    role: 'Managing Partner',
    org: 'Malabar Coast Realty, Mumbai',
  },
  {
    quote:
      'NRI buyers looking at North Goa villas expect editorial presentation, clear RERA credentials, and instant video walkthroughs. Having QR codes on our site boards plus one-tap Google Meet rooms helped us close two ₹9 Cr+ villas last quarter.',
    name: 'Shreya Fernandes',
    role: 'Principal Broker',
    org: 'Casa Verde Advisory, Assagao',
  },
  {
    quote:
      'As a boutique developer in Indiranagar, we refused to pay portal commissions just to share our own inventory. EstateDirect gives our sales team a clean, free catalog and real-time analytics showing exactly which apartments buyers revisit.',
    name: 'Karthik Subramanian',
    role: 'Director of Sales',
    org: 'Veranda Spaces, Bengaluru',
  },
];

const FAQS = [
  {
    q: 'Is EstateDirect really free to use? Are there hidden commissions or paid tiers?',
    a: 'EstateDirect is completely free for brokers, agents, property owners, and builders. There is no pricing page, no per-lead fee, and zero brokerage commission—publish your entire portfolio and keep 100% of your buyer relationships.',
  },
  {
    q: 'How do buyers contact me on WhatsApp?',
    a: 'Every property detail page features a dedicated WhatsApp Enquiry button configured with your WhatsApp number. When tapped, it pre-fills the property title, auto-generated property code, locality, and price so you immediately know which residence the buyer is asking about.',
  },
  {
    q: 'Can builders list upcoming launches, construction phases, land plots, and RERA checkmarks?',
    a: 'Yes. Developers can list apartments, villas, and freehold residential land/plots with explicit Karnataka/state RERA approval toggles, statutory checkmarks (BBMP/BDA, A-Khata, DC Converted, Bank Loan Approved), phase labels, acreage, and possession timelines.',
  },
  {
    q: 'How does the automated photo-to-walkthrough video work?',
    a: 'Whenever you upload project photography in your dashboard, EstateDirect automatically generates a 1280×720 HD Ken Burns walkthrough video with live phase and RERA overlays—playable right on every listing page and exportable as a downloadable .webm video.',
  },
  {
    q: 'Can I showcase Indian pricing formats like Cr and Lakh?',
    a: 'Yes. Prices automatically format into standard Indian notation (such as ₹4.95 Cr, ₹84 L, or ₹2.25 L/mo for rentals), complete with per-sq-ft calculations and category/location/budget filtering.',
  },
  {
    q: 'How do QR codes and Google Meet virtual tours work?',
    a: 'Every agency catalog and individual listing generates a crisp downloadable QR code for print brochures and site boards. Owners can also connect Google Meet to spin up live video walkthrough links directly from the dashboard or listing page.',
  },
];

export function LandingPage() {
  const { properties } = useAppStore();
  const prefersReduced = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const heroMediaRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroMediaRef,
    offset: ['start end', 'end start'],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], prefersReduced ? [1, 1] : [1.08, 1.0]);

  const demoListings = properties
    .filter((p) => p.agencySlug === DEMO_SLUG && p.published)
    .slice(0, 3);

  const headlineSegments = [
    { text: 'Your', gold: false },
    { text: 'complete', gold: false },
    { text: 'real-estate', gold: false },
    { text: 'platform,', gold: false },
    { text: 'free', gold: true },
    { text: 'to', gold: true },
    { text: 'start', gold: true },
  ];

  return (
    <div className="bg-[#FAF7F2] text-[#17120F]">
      {/* HERO SECTION ON INK #17120F */}
      <section className="relative bg-[#17120F] text-[#FAF7F2] overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-14 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-7">
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#C9A96E]/35 bg-[#FAF7F2]/[0.04]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E]">
                  For brokers, agents, owners &amp; builders
                </span>
              </motion.div>

              <h1 className="text-[42px] sm:text-[58px] lg:text-[68px] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#FAF7F2]">
                {headlineSegments.map((word, idx) => (
                  <motion.span
                    key={`${word.text}-${idx}`}
                    initial={prefersReduced ? false : { opacity: 0, y: 36 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 240,
                      damping: 26,
                      delay: prefersReduced ? 0 : idx * 0.055,
                    }}
                    className={`inline-block mr-[0.24em] ${
                      word.gold ? 'text-[#C9A96E]' : 'text-[#FAF7F2]'
                    }`}
                  >
                    {word.text}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="text-base sm:text-lg text-[#FAF7F2]/75 leading-relaxed max-w-xl tracking-[0.005em]"
              >
                Publish an architectural property catalog under your own brand, share one link or QR code,
                and receive every buyer enquiry straight on WhatsApp—complete with 3D walkthroughs,
                Google Meet tours, and live lead analytics.
              </motion.p>

              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 pt-1"
              >
                <motion.div
                  whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                  whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                >
                  <Link
                    to="/auth?mode=signup"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#FAF7F2] text-[#17120F] text-sm font-bold hover:bg-[#EFE6D6] transition-colors whitespace-nowrap"
                  >
                    Start free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                  whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                >
                  <Link
                    to={`/c/${DEMO_SLUG}`}
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-[#FAF7F2]/25 text-[#FAF7F2] text-sm font-semibold hover:bg-[#FAF7F2]/10 transition-colors whitespace-nowrap"
                  >
                    View live demo
                  </Link>
                </motion.div>
              </motion.div>

              <div className="pt-4 border-t border-[#FAF7F2]/10 grid grid-cols-3 gap-4 max-w-md">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#FAF7F2] tabular-nums">₹0</p>
                  <p className="text-xs text-[#FAF7F2]/60 mt-0.5">Forever free, no commission</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#FAF7F2] tabular-nums">60 sec</p>
                  <p className="text-xs text-[#FAF7F2]/60 mt-0.5">From signup to live link</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#FAF7F2] tabular-nums">100%</p>
                  <p className="text-xs text-[#FAF7F2]/60 mt-0.5">Direct WhatsApp leads</p>
                </div>
              </div>
            </div>

            {/* Right Architectural Photo with Scale-Down Parallax & Bobbing Floating Glass Card */}
            <div ref={heroMediaRef} className="lg:col-span-6 relative">
              <div className="relative rounded-[32px] overflow-hidden aspect-[4/3] border border-[#FAF7F2]/12 shadow-editorial-lg">
                <motion.img
                  style={{ scale: imageScale }}
                  src={IMG_HERO_TOWER}
                  alt="Contemporary Mumbai residential tower illuminated at twilight with landscaped sky terraces"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17120F]/75 via-[#17120F]/15 to-transparent" />
              </div>

              {/* Floating Glass Property Card */}
              <motion.div
                animate={
                  prefersReduced
                    ? undefined
                    : {
                        y: [0, -8, 0],
                      }
                }
                transition={{
                  duration: 4.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="mt-4 sm:mt-0 sm:absolute sm:-bottom-6 sm:-left-6 sm:max-w-[330px] rounded-[24px] bg-[#FAF7F2]/95 text-[#17120F] border border-[#FAF7F2]/40 p-4 sm:p-5 shadow-editorial-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
                      Pali Hill · Mumbai
                    </p>
                    <p className="text-sm font-bold text-[#17120F] mt-0.5 leading-snug">
                      Sea-Facing Duplex Penthouse
                    </p>
                  </div>
                  <span className="font-mono-code text-[11px] text-[#17120F]/55 shrink-0">
                    AUR-1001
                  </span>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 pt-3 border-t border-[#17120F]/[0.08]">
                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-[#17120F] tabular-nums">
                      ₹6.75 Cr
                    </p>
                    <p className="text-[11px] text-[#17120F]/60">4 Bed · 4,250 sq ft</p>
                  </div>
                  <Link
                    to={`/c/${DEMO_SLUG}/p/aur-1001`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3DBF63] text-white text-xs font-semibold hover:bg-[#33A856] transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO GRID */}
      <section id="features" className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-3">
            Built for Indian Real Estate
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-[-0.025em] leading-[1.1] text-[#17120F]">
            Everything required to present listings and close buyers directly.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.article
                key={feat.num}
                variants={{
                  hidden: prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
                whileHover={prefersReduced ? undefined : { y: -5 }}
                className={`${feat.span} rounded-[28px] bg-white border border-[#17120F]/[0.08] p-7 sm:p-8 shadow-editorial flex flex-col justify-between transition-shadow hover:shadow-editorial-lg`}
              >
                <div className="flex items-center justify-between gap-4 mb-6">
                  <span className="font-mono-code text-xs font-semibold text-[#9D7D44]">
                    {feat.num}.
                  </span>
                  <div className="w-10 h-10 rounded-full bg-[#EFE6D6] text-[#17120F] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#17120F] mb-2.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#17120F]/70">{feat.desc}</p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </section>

      {/* HOW IT WORKS — 4 STEPS */}
      <section
        id="about"
        className="bg-[#EFE6D6]/45 border-y border-[#17120F]/[0.08] py-20 lg:py-24"
      >
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-3">
                How EstateDirect Works
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] text-[#17120F]">
                Four calm steps from listing to signed deal.
              </h2>
            </div>
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#17120F] hover:text-[#9D7D44] transition-colors whitespace-nowrap"
            >
              Create your catalog now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {HOW_IT_WORKS.map((item) => (
              <motion.div
                key={item.step}
                variants={{
                  hidden: prefersReduced ? { opacity: 1 } : { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
                className="rounded-[28px] bg-[#FAF7F2] border border-[#17120F]/[0.08] p-7"
              >
                <p className="font-mono-code text-sm font-bold text-[#C9A96E] mb-4">
                  {item.step}.
                </p>
                <h3 className="text-lg font-bold tracking-tight text-[#17120F] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#17120F]/70">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* LIVE DEMO CATALOG STRIP + 3D STUDIO SHOWCASE */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-3">
              Live Demo Storefront
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] text-[#17120F]">
              Explore Aurelia Estates’ live catalog.
            </h2>
          </div>
          <Link
            to={`/c/${DEMO_SLUG}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Browse full demo catalog
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {demoListings.map((prop) => (
            <motion.div
              key={prop.id}
              whileHover={prefersReduced ? undefined : { y: -6 }}
              transition={{ duration: 0.22 }}
              className="group rounded-[28px] bg-white border border-[#17120F]/[0.08] overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-shadow"
            >
              <Link to={`/c/${prop.agencySlug}/p/${prop.id}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#EFE6D6]">
                  <motion.img
                    layoutId={`property-hero-${prop.id}`}
                    src={prop.images[0]}
                    alt={prop.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#17120F]/70 to-transparent" />
                  <p className="absolute bottom-4 left-5 text-xl font-extrabold text-[#FAF7F2] tabular-nums">
                    {formatIndianPrice(prop.price, prop.kind)}
                  </p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-[#17120F]/55 mb-2">
                    <span className="font-semibold text-[#9D7D44]">
                      {prop.kind === 'buy' ? 'For Sale' : 'For Rent'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{prop.propertyType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-code">{prop.propertyCode}</span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-[#17120F] group-hover:text-[#9D7D44] transition-colors line-clamp-1">
                    {prop.title}
                  </h3>
                  <p className="text-sm text-[#17120F]/65 mt-1">
                    {prop.locality}, {prop.city}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#17120F]/[0.08] flex items-center gap-3 text-xs text-[#17120F]/70 tabular-nums">
                    <span>{prop.beds} Bed</span>
                    <span aria-hidden="true">·</span>
                    <span>{prop.baths} Bath</span>
                    <span aria-hidden="true">·</span>
                    <span>{prop.sqft.toLocaleString('en-IN')} sq ft</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Interactive 3D & Google Meet Highlight Banner */}
        <div className="mt-12 rounded-[32px] bg-[#17120F] text-[#FAF7F2] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A96E]">
              <span className="inline-flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                3D Spatial Studio
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Video className="w-4 h-4" />
                Google Meet Tours
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Walk buyers through a live 3D architectural model before they even visit the site.
            </h3>
            <p className="text-sm sm:text-base text-[#FAF7F2]/70">
              Orbit golden-hour daylight, basalt and travertine facades, and floorplan cutaways right in
              the browser—then launch a Google Meet virtual tour with one click.
            </p>
          </div>
          <Link
            to="/studio"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#C9A96E] text-[#17120F] text-sm font-bold hover:bg-[#D5B984] transition-colors whitespace-nowrap shrink-0"
          >
            Launch 3D Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white border-y border-[#17120F]/[0.08] py-20 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-3">
              Trusted by Advisory Firms
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] text-[#17120F]">
              Measured outcomes from real brokerages.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-[28px] bg-[#FAF7F2] border border-[#17120F]/[0.08] p-7 sm:p-8 flex flex-col justify-between"
              >
                <p className="text-sm sm:text-[15px] leading-relaxed text-[#17120F]/85">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-6 pt-5 border-t border-[#17120F]/[0.08]">
                  <p className="text-sm font-bold text-[#17120F]">{t.name}</p>
                  <p className="text-xs text-[#17120F]/60 mt-0.5">
                    {t.role} · {t.org}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* TWO-COLUMN EDITORIAL FAQ ACCORDION */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-3">
              Frequently Asked
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.06] text-[#17120F]">
              Frequently asked questions
            </h2>
            <p className="text-sm sm:text-base text-[#17120F]/65 mt-4 max-w-sm leading-relaxed">
              Clear answers on direct builder catalogs, RERA compliance, automated walkthrough videos,
              and WhatsApp lead tracking—zero fine print.
            </p>
          </div>

          <div className="lg:col-span-7 rounded-[28px] bg-white/75 border border-[#17120F]/[0.07] p-3 sm:p-4 shadow-editorial space-y-2.5">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-[20px] bg-white border border-[#17120F]/[0.06] overflow-hidden transition-shadow hover:shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-[#FAF7F2]/55 transition-colors cursor-pointer"
                  >
                    <span className="text-[15px] sm:text-base font-semibold text-[#17120F]">
                      {item.q}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#17120F]/75 flex items-center justify-center shrink-0">
                      {isOpen ? <Minus className="w-4 h-4 text-[#9D7D44]" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-sm leading-relaxed text-[#17120F]/70">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLOSING CTA ON INK */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 pb-16">
        <div className="rounded-[32px] bg-[#17120F] text-[#FAF7F2] px-7 py-14 sm:px-14 sm:py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A96E] mb-4">
            Free Forever · No Credit Card
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] max-w-2xl mx-auto leading-[1.08]">
            Publish your branded catalog in the next five minutes.
          </h2>
          <p className="text-base text-[#FAF7F2]/70 max-w-xl mx-auto mt-4">
            Join independent brokers, luxury advisors, and builders delivering a refined buying
            experience directly over WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FAF7F2] text-[#17120F] text-sm font-bold hover:bg-[#EFE6D6] transition-colors"
            >
              Start free now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/c/${DEMO_SLUG}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#FAF7F2]/25 text-[#FAF7F2] text-sm font-semibold hover:bg-[#FAF7F2]/10 transition-colors"
            >
              Inspect live demo
            </Link>
          </div>
        </div>
      </section>

      {/* ELEVATED ARCHITECTURAL CARD FOOTER */}
      <footer id="contact" className="bg-[#FAF7F2] pt-4 pb-12">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="rounded-[28px] bg-white border border-[#17120F]/[0.07] shadow-editorial p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
              {/* Brand Column */}
              <div className="lg:col-span-4 space-y-5">
                <Link to="/" className="inline-flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#17120F]/10 overflow-hidden flex items-center justify-center">
                    <img
                      src="/assets/aistudio/Gemini_Generated_Image_e7l37be7l37be7l3_741afc4d.png"
                      alt="EstateDirect logo"
                      className="w-9 h-9 object-contain"
                    />
                  </span>
                  <span className="text-lg font-extrabold tracking-[-0.02em] text-[#17120F]">
                    EstateDirect
                  </span>
                </Link>
                <p className="text-sm leading-relaxed text-[#17120F]/65 max-w-xs">
                  The direct real-estate catalog &amp; WhatsApp lead platform for builders, brokers,
                  and property owners. Always free to start.
                </p>
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#17120F] hover:text-[#9D7D44] transition-colors"
                >
                  Start free
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Directory Columns */}
              <div className="lg:col-span-2 space-y-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#17120F]/55">
                  Platform
                </p>
                <ul className="space-y-2.5 text-sm text-[#17120F]/75">
                  <li>
                    <Link to={`/c/${DEMO_SLUG}`} className="hover:text-[#17120F] transition-colors">
                      Live Catalog
                    </Link>
                  </li>
                  <li>
                    <Link to="/studio" className="hover:text-[#17120F] transition-colors">
                      3D Spatial Studio
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="hover:text-[#17120F] transition-colors">
                      Builder Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth?mode=signup" className="hover:text-[#17120F] transition-colors">
                      Create Storefront
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-3 space-y-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#17120F]/55">
                  Bengaluru Portfolio
                </p>
                <ul className="space-y-2.5 text-sm text-[#17120F]/75">
                  <li>
                    <Link to={`/c/${DEMO_SLUG}/p/blr-2001`} className="hover:text-[#17120F] transition-colors">
                      Whitefield Lakeview Towers
                    </Link>
                  </li>
                  <li>
                    <Link to={`/c/${DEMO_SLUG}/p/blr-2002`} className="hover:text-[#17120F] transition-colors">
                      Devanahalli RERA Plots
                    </Link>
                  </li>
                  <li>
                    <Link to={`/c/${DEMO_SLUG}/p/blr-2003`} className="hover:text-[#17120F] transition-colors">
                      North Bengaluru Launches
                    </Link>
                  </li>
                  <li>
                    <Link to={`/c/${DEMO_SLUG}/p/aur-1004`} className="hover:text-[#17120F] transition-colors">
                      Indiranagar Residences
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-3 space-y-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#17120F]/55">
                  Connect
                </p>
                <ul className="space-y-2.5 text-sm text-[#17120F]/75">
                  <li>
                    <a
                      href={`mailto:${BUSINESS_CONTACT_EMAIL}`}
                      className="hover:text-[#17120F] transition-colors font-medium"
                    >
                      {BUSINESS_CONTACT_EMAIL}
                    </a>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-[#17120F] transition-colors">
                      Contact Us &amp; Support
                    </Link>
                  </li>
                  <li>
                    <a
                      href={buildWhatsAppUrl(
                        BUSINESS_WHATSAPP_NUMBER,
                        'Hello EstateDirect, I would like to learn more about listing properties on EstateDirect.'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#238845] font-semibold hover:text-[#1A6B35] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat directly on WhatsApp
                    </a>
                  </li>
                  <li>
                    <Link to="/auth?mode=login" className="hover:text-[#17120F] transition-colors">
                      Partner Sign In (Google / OTP)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quiet Legal & Back-to-Top Row */}
          <div className="mt-8 pt-6 border-t border-[#17120F]/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#17120F]/55 lg:pr-48">
            <p>© 2026 EstateDirect Real Estate Platform · Built for Indian Builders &amp; Brokers</p>
            <div className="flex flex-wrap items-center gap-6">
              <Link to={`/c/${DEMO_SLUG}`} className="hover:text-[#17120F] transition-colors">
                RERA Transparency
              </Link>
              <Link to="/auth?mode=signup" className="hover:text-[#17120F] transition-colors">
                Free Forever Guarantee
              </Link>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1 font-semibold text-[#17120F]/75 hover:text-[#17120F] transition-colors cursor-pointer"
              >
                Back to top
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

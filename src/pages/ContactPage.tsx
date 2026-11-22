import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
} from 'lucide-react';
import { buildWhatsAppUrl } from '../utils/realEstateLogic';
import {
  BUSINESS_CONTACT_EMAIL,
  BUSINESS_WHATSAPP_NUMBER,
  validateContactForm,
} from '../utils/bookingAndOtpLogic';
import { useAppStore } from '../context/AppStoreContext';
import { DEMO_SLUG } from '../data/seedData';

const TOPICS = [
  'Builder / Developer Onboarding',
  'Broker & Agency Catalog Support',
  'Site Visit & Calendar Booking Setup',
  'RERA Verification & Listings',
  'General Enquiry',
] as const;

export function ContactPage() {
  const { showToast } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [quickWaText, setQuickWaText] = useState(
    'Hello EstateDirect team, I would like to list my upcoming residential projects and enable WhatsApp & Calendar bookings.'
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submittedNote, setSubmittedNote] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const directWhatsAppUrl = buildWhatsAppUrl(BUSINESS_WHATSAPP_NUMBER, quickWaText);

  const handleCopyEmail = () => {
    void navigator.clipboard.writeText(BUSINESS_CONTACT_EMAIL);
    setCopiedEmail(true);
    showToast(`Copied ${BUSINESS_CONTACT_EMAIL}`, 'success');
    window.setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedNote(null);
    const check = validateContactForm({ name, email, phone, topic, message });
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, topic, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Could not send enquiry.', 'error');
        return;
      }
      setSubmittedNote(data.message || `Enquiry sent to ${BUSINESS_CONTACT_EMAIL}.`);
      showToast(`Enquiry routed to ${BUSINESS_CONTACT_EMAIL}`, 'success');
      setName('');
      setEmail('');
      setPhone('+91 ');
      setMessage('');
    } catch {
      showToast('Network error sending message. Try WhatsApp or direct email.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#FAF7F2] pb-20">
      {/* Dark Editorial Header */}
      <section className="bg-[#17120F] text-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E] mb-3">
            Contact EstateDirect
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] max-w-2xl">
            Speak directly with our team on <span className="text-[#C9A96E]">WhatsApp</span> or email.
          </h1>
          <p className="text-sm sm:text-base text-[#FAF7F2]/70 mt-4 max-w-xl leading-relaxed">
            Whether you are a builder launching projects in Bengaluru, a luxury brokerage setting up
            calendar booking alerts, or a buyer requesting a guided tour—we reply fast.
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Direct Email + Direct WhatsApp Chat Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Business Email Card */}
            <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#17120F] text-[#C9A96E] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9D7D44]">
                    Official Business Email
                  </p>
                  <a
                    href={`mailto:${BUSINESS_CONTACT_EMAIL}`}
                    data-testid="contact-business-email"
                    className="text-base sm:text-lg font-extrabold text-[#17120F] hover:text-[#9D7D44] transition-colors break-all"
                  >
                    {BUSINESS_CONTACT_EMAIL}
                  </a>
                </div>
              </div>
              <p className="text-xs text-[#17120F]/65 leading-relaxed">
                All partnership enquiries, builder onboarding requests, and booking support emails
                go directly to our Zoho Mail desk.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={`mailto:${BUSINESS_CONTACT_EMAIL}?subject=${encodeURIComponent('EstateDirect Enquiry')}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-bold hover:bg-[#261E19]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Compose Email
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#17120F]/15 text-xs font-semibold text-[#17120F] hover:bg-[#EFE6D6]/60 cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedEmail ? 'Copied' : 'Copy Email'}
                </button>
              </div>
            </div>

            {/* Direct WhatsApp Chat Composer Card */}
            <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#3DBF63] text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#238845]">
                    Instant Direct Chat
                  </p>
                  <h2 className="text-lg font-extrabold text-[#17120F]">
                    Chat Directly on WhatsApp
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#17120F]/65 leading-relaxed">
                Edit your message below and open a direct WhatsApp chat in one tap—works on both
                mobile WhatsApp and WhatsApp Web with zero setup fees.
              </p>
              <div>
                <label
                  htmlFor="contact-wa-draft"
                  className="block text-[11px] font-semibold text-[#17120F]/70 mb-1.5"
                >
                  Pre-filled WhatsApp Message
                </label>
                <textarea
                  id="contact-wa-draft"
                  rows={3}
                  value={quickWaText}
                  onChange={(e) => setQuickWaText(e.target.value)}
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-3.5 py-2.5 text-xs text-[#17120F] resize-none"
                />
              </div>
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="contact-whatsapp-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#3DBF63] text-white text-sm font-bold hover:bg-[#33A856] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp Chat Now
              </a>
            </div>

            {/* Advisory Office Info */}
            <div className="rounded-[24px] bg-[#EFE6D6]/55 border border-[#17120F]/[0.07] p-5 space-y-2.5 text-xs text-[#17120F]/75">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#9D7D44] shrink-0" />
                <span>Indiranagar &amp; Whitefield Partner Desk, Bengaluru · Pan-India Support</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#9D7D44] shrink-0" />
                <span>Mon – Sun · 9:00 AM – 8:00 PM IST</span>
              </p>
              <p className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#9D7D44] shrink-0" />
                <Link to={`/c/${DEMO_SLUG}`} className="font-semibold text-[#17120F] underline">
                  Browse Live Bengaluru &amp; Mumbai Demo Catalog
                </Link>
              </p>
            </div>
          </div>

          {/* RIGHT: Contact Us Enquiry Form -> estatedirect@zohomail.in */}
          <div className="lg:col-span-7 rounded-[32px] bg-white border border-[#17120F]/[0.08] p-7 sm:p-10 shadow-editorial">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9D7D44] mb-1.5">
              Send an Enquiry
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17120F]">
              Message {BUSINESS_CONTACT_EMAIL}
            </h2>
            <p className="text-sm text-[#17120F]/65 mt-1.5">
              Fill out the form below and we will reply directly to your inbox or WhatsApp.
            </p>

            {submittedNote && (
              <div
                role="status"
                data-testid="contact-success-banner"
                className="mt-6 rounded-2xl bg-[#EFE6D6]/70 border border-[#C9A96E]/50 p-5 space-y-2"
              >
                <p className="text-sm font-bold text-[#17120F] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#238845]" />
                  Message Received
                </p>
                <p className="text-xs text-[#17120F]/80">{submittedNote}</p>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Your Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Vishal Madargaon"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  />
                  {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.in"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  />
                  {errors.email && <p className="text-xs text-red-700 mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    WhatsApp / Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98204 11890"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  />
                  {errors.phone && <p className="text-xs text-red-700 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label
                    htmlFor="contact-topic"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Enquiry Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                >
                  How can we help?
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share details about your projects, catalog setup, or site-visit workflow..."
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F] resize-none"
                />
                {errors.message && <p className="text-xs text-red-700 mt-1">{errors.message}</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="contact-submit-btn"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D7D44] hover:text-[#17120F]"
                >
                  Start your free catalog
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

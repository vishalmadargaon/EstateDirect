import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Video, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import type { MeetTour } from '../types';
import { buildWhatsAppUrl } from '../utils/realEstateLogic';

interface MeetTourModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyCode: string;
  ownerId: string;
  agencyWhatsapp?: string;
  defaultClientName?: string;
  onCreated?: (tour: MeetTour) => void;
}

export function MeetTourModal({
  open,
  onClose,
  propertyId,
  propertyTitle,
  propertyCode,
  ownerId,
  agencyWhatsapp,
  defaultClientName = '',
  onCreated,
}: MeetTourModalProps) {
  const {
    meetAccessToken,
    firebaseUser,
    connectGoogleAccount,
    createGoogleMeetSpace,
    captureLead,
  } = useAppStore();

  const [clientName, setClientName] = useState(defaultClientName);
  const [clientPhone, setClientPhone] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [confirmStep, setConfirmStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTour, setCreatedTour] = useState<MeetTour | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    const res = await connectGoogleAccount();
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Unable to connect Google account.');
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (clientName.trim().length < 2) {
      setError('Enter the client or visitor name for this virtual tour.');
      return;
    }
    setConfirmStep(true);
  };

  const handleConfirmCreate = async () => {
    setBusy(true);
    setError(null);
    const res = await createGoogleMeetSpace({
      propertyId,
      propertyTitle,
      clientName,
      scheduledAt,
    });
    setBusy(false);
    if (!res.ok || !res.tour) {
      setError(res.error || 'Failed to create Google Meet room.');
      setConfirmStep(false);
      return;
    }

    setCreatedTour(res.tour);
    setConfirmStep(false);

    if (clientPhone.trim().length >= 8) {
      captureLead({
        ownerId,
        propertyId,
        propertyTitle,
        propertyCode,
        name: clientName,
        phone: clientPhone,
        preferredDate: scheduledAt.slice(0, 10),
        message: `Google Meet virtual tour room created (${res.tour.meetingUri}).`,
        source: 'meet',
        meetUri: res.tour.meetingUri,
      });
    }

    onCreated?.(res.tour);
  };

  const handleCopyUri = async () => {
    if (!createdTour) return;
    try {
      await navigator.clipboard.writeText(createdTour.meetingUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const resetAndClose = () => {
    setConfirmStep(false);
    setError(null);
    setCreatedTour(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule Google Meet Virtual Tour"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-[#17120F]/65"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-lg bg-[#FAF7F2] rounded-[28px] border border-[#17120F]/10 p-6 sm:p-8 shadow-editorial-lg"
          >
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Close Google Meet modal"
              className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-[#17120F]/60 hover:text-[#17120F] hover:bg-[#EFE6D6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-[#9D7D44] text-xs font-semibold uppercase tracking-[0.14em] mb-2">
              <Video className="w-4 h-4" />
              Google Meet Virtual Tour
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#17120F] pr-8">
              {propertyTitle}
            </h2>
            <p className="text-xs font-mono-code text-[#17120F]/55 mt-0.5">
              Property ID: {propertyCode}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {createdTour ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-white border border-[#17120F]/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 mb-1">
                    Room ready
                  </p>
                  <p className="text-base font-bold text-[#17120F]">
                    Virtual tour for {createdTour.clientName}
                  </p>
                  <p className="text-sm font-mono-code text-[#17120F]/75 mt-2 break-all">
                    {createdTour.meetingUri}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <a
                      href={createdTour.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors"
                    >
                      Join Google Meet
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#17120F]/20 text-sm font-semibold text-[#17120F] hover:bg-[#EFE6D6]/60 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </button>
                    {agencyWhatsapp && (
                      <a
                        href={buildWhatsAppUrl(
                          clientPhone || agencyWhatsapp,
                          `Hello ${createdTour.clientName}, here is your Google Meet link for the virtual tour of ${propertyTitle} (${propertyCode}): ${createdTour.meetingUri}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#3DBF63] text-white text-sm font-semibold hover:bg-[#33A856] transition-colors"
                      >
                        Send via WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : !meetAccessToken ? (
              <div className="mt-6 rounded-2xl bg-white border border-[#17120F]/10 p-6 text-center">
                <p className="text-sm text-[#17120F]/75 mb-5">
                  Sign in with Google to authorize Google Meet room creation for live virtual walkthroughs.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="gsi-material-button mx-auto"
                >
                  <span className="w-5 h-5 shrink-0">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="block w-full h-full">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  </span>
                  <span>{busy ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              </div>
            ) : confirmStep ? (
              <div className="mt-6 rounded-2xl bg-white border border-[#C9A96E] p-5 space-y-4">
                <h3 className="text-base font-bold text-[#17120F]">
                  Confirm Google Meet room creation
                </h3>
                <p className="text-sm text-[#17120F]/75">
                  This will create a new Google Meet conference space under your Google account (
                  <span className="font-medium text-[#17120F]">{firebaseUser?.email}</span>) for{' '}
                  <span className="font-medium text-[#17120F]">{clientName}</span> regarding{' '}
                  <span className="font-medium text-[#17120F]">{propertyTitle}</span>.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(false)}
                    disabled={busy}
                    className="px-4 py-2.5 rounded-full border border-[#17120F]/20 text-sm font-semibold text-[#17120F]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={busy}
                    className="px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors disabled:opacity-60"
                  >
                    {busy ? 'Creating Meet Room...' : 'Confirm & Create Room'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProceedToConfirm} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="meet-client-name" className="block text-xs font-semibold text-[#17120F]/70 mb-1.5">
                    Client / Visitor Name
                  </label>
                  <input
                    id="meet-client-name"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Ananya Deshmukh"
                    className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm text-[#17120F]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="meet-client-phone" className="block text-xs font-semibold text-[#17120F]/70 mb-1.5">
                      Client WhatsApp (optional)
                    </label>
                    <input
                      id="meet-client-phone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm text-[#17120F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="meet-time" className="block text-xs font-semibold text-[#17120F]/70 mb-1.5">
                      Preferred Date &amp; Time
                    </label>
                    <input
                      id="meet-time"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-2xl bg-white border border-[#17120F]/15 px-4 py-3 text-sm text-[#17120F]"
                    />
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2.5 rounded-full border border-[#17120F]/20 text-sm font-semibold text-[#17120F]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors"
                  >
                    Review &amp; Create Meet Room
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

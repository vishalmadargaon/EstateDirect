import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  X,
} from 'lucide-react';
import { useAppStore } from '../context/AppStoreContext';
import type { Lead } from '../types';
import { buildWhatsAppUrl } from '../utils/realEstateLogic';
import {
  BUSINESS_CONTACT_EMAIL,
  buildGoogleCalendarDeepLink,
  buildIcsCalendarInvite,
  isValidEmail,
} from '../utils/bookingAndOtpLogic';

interface CalendarBookingModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  agencyName: string;
  ownerEmail: string;
  location: string;
  onSynced?: (htmlLink?: string) => void;
}

export function CalendarBookingModal({
  open,
  onClose,
  lead,
  agencyName,
  ownerEmail,
  location,
  onSynced,
}: CalendarBookingModalProps) {
  const { meetAccessToken, connectGoogleAccount, scheduleCalendarAndEmailBooking } = useAppStore();

  const defaultDate = lead.preferredDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(lead.preferredTime || '11:00');
  const [recipientEmail, setRecipientEmail] = useState(lead.email || ownerEmail || BUSINESS_CONTACT_EMAIL);
  const [sendGmailCopy, setSendGmailCopy] = useState(true);
  const [note, setNote] = useState(
    lead.message || `Confirmed private site visit for ${lead.propertyTitle} (${lead.propertyCode}).`
  );
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [gmailDelivered, setGmailDelivered] = useState(false);

  const calendarPayload = useMemo(
    () => ({
      propertyTitle: lead.propertyTitle,
      propertyCode: lead.propertyCode,
      location,
      date,
      time,
      visitorName: lead.name,
      visitorPhone: lead.phone,
      visitorEmail: isValidEmail(recipientEmail) ? recipientEmail : undefined,
      agencyName,
      ownerEmail: ownerEmail || BUSINESS_CONTACT_EMAIL,
      notes: note,
    }),
    [lead, location, date, time, recipientEmail, agencyName, ownerEmail, note]
  );

  const icsData = useMemo(() => buildIcsCalendarInvite(calendarPayload), [calendarPayload]);
  const gcalDeepLink = useMemo(() => buildGoogleCalendarDeepLink(calendarPayload), [calendarPayload]);

  if (!open) return null;

  const handleDownloadIcs = () => {
    const blob = new Blob([icsData.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsData.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmSync = async () => {
    setBusy(true);
    setError(null);
    const attendees = Array.from(
      new Set([ownerEmail, recipientEmail].filter((e) => e && isValidEmail(e)))
    );

    const res = await scheduleCalendarAndEmailBooking({
      summary: `Site Visit: ${lead.propertyTitle} (${lead.propertyCode}) — ${lead.name}`,
      description: [
        `Client: ${lead.name}`,
        `Phone / WhatsApp: ${lead.phone}`,
        `Property: ${lead.propertyTitle} (${lead.propertyCode})`,
        `Hosted by: ${agencyName}`,
        note ? `Notes: ${note}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      location,
      startIso: icsData.startIso,
      endIso: icsData.endIso,
      attendeeEmails: attendees,
      sendGmailConfirmation: sendGmailCopy && isValidEmail(recipientEmail),
      gmailTo: recipientEmail,
      gmailSubject: `Confirmed Site Visit: ${lead.propertyTitle} on ${date} at ${time} IST`,
      gmailBody: [
        `Hello ${lead.name},`,
        '',
        `Your private site visit for ${lead.propertyTitle} (${lead.propertyCode}) with ${agencyName} is confirmed.`,
        '',
        `Date: ${date}`,
        `Time: ${time} IST`,
        `Location: ${location}`,
        '',
        note,
        '',
        `Warm regards,`,
        `${agencyName}`,
        `Registered Contact: ${ownerEmail || BUSINESS_CONTACT_EMAIL}`,
      ].join('\n'),
      replyTo: ownerEmail || BUSINESS_CONTACT_EMAIL,
    });

    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Could not schedule Google Calendar event.');
      return;
    }

    setCreatedLink(res.htmlLink || gcalDeepLink);
    setGmailDelivered(Boolean(res.gmailSent));
    setStep('done');
    onSynced?.(res.htmlLink);
  };

  const whatsappConfirmUrl = buildWhatsAppUrl(
    lead.phone,
    `Hello ${lead.name}, your site visit for ${lead.propertyTitle} (${lead.propertyCode}) is confirmed for ${date} at ${time} IST (${location}).${
      createdLink ? ` Calendar invite: ${createdLink}` : ''
    }`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Schedule Site Visit on Google Calendar"
    >
      <div onClick={onClose} className="fixed inset-0 bg-[#17120F]/65" />
      <div className="relative w-full max-w-lg rounded-[30px] bg-[#FAF7F2] border border-[#17120F]/10 p-6 sm:p-7 shadow-editorial-lg space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9D7D44]">
              Google Calendar &amp; Gmail Booking
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-[#17120F] mt-0.5">
              Schedule Site Visit
            </h2>
            <p className="text-xs text-[#17120F]/60 mt-0.5">
              {lead.name} · {lead.propertyTitle} ({lead.propertyCode})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar booking modal"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#EFE6D6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'done' ? (
          <div className="rounded-2xl bg-white border border-[#C9A96E]/50 p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-bold">Site Visit Scheduled</p>
            </div>
            <p className="text-xs text-[#17120F]/75 leading-relaxed">
              Added to your Google Calendar for <strong>{date}</strong> at <strong>{time} IST</strong>.
              {gmailDelivered
                ? ` Confirmation email dispatched via Gmail to ${recipientEmail}.`
                : ' Calendar invitations have been queued for attendees.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {createdLink && (
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-bold"
                >
                  Open Calendar Event
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <a
                href={whatsappConfirmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3DBF63] text-white text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Send on WhatsApp
              </a>
            </div>
          </div>
        ) : step === 'confirm' ? (
          <div className="rounded-2xl bg-white border border-[#C9A96E]/55 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9D7D44]">
              Confirm Google Workspace Action
            </p>
            <p className="text-sm text-[#17120F] leading-relaxed">
              You are about to create a <strong>Google Calendar</strong> event on your primary
              calendar for <strong>{date} at {time} IST</strong>
              {sendGmailCopy && isValidEmail(recipientEmail) ? (
                <>
                  {' '}
                  and send a confirmation email via <strong>Gmail</strong> to{' '}
                  <span className="font-mono-code font-semibold">{recipientEmail}</span>
                </>
              ) : null}
              .
            </p>
            <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs text-[#17120F]/75 space-y-1">
              <p>
                <strong>Property:</strong> {lead.propertyTitle} ({lead.propertyCode})
              </p>
              <p>
                <strong>Location:</strong> {location}
              </p>
              <p>
                <strong>Registered Owner Alert Email:</strong> {ownerEmail || BUSINESS_CONTACT_EMAIL}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep('form')}
                className="px-4 py-2.5 rounded-full border border-[#17120F]/20 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmSync()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-bold hover:bg-[#261E19] cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-[#C9A96E]" />}
                Confirm &amp; Schedule
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cal-date"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                >
                  Visit Date
                </label>
                <input
                  id="cal-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-[#17120F]/12 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="cal-time"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1"
                >
                  Time (IST)
                </label>
                <input
                  id="cal-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-[#17120F]/12 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cal-email"
                className="block text-xs font-semibold text-[#17120F]/75 mb-1"
              >
                Email Recipient (Client or Registered Owner Mail ID)
              </label>
              <input
                id="cal-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-2xl bg-white border border-[#17120F]/12 px-3.5 py-2.5 text-sm"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-[#17120F]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={sendGmailCopy}
                onChange={(e) => setSendGmailCopy(e.target.checked)}
                className="w-4 h-4 accent-[#17120F]"
              />
              <Mail className="w-3.5 h-3.5 text-[#9D7D44]" />
              Also email booking confirmation via connected Gmail
            </label>

            <div>
              <label
                htmlFor="cal-note"
                className="block text-xs font-semibold text-[#17120F]/75 mb-1"
              >
                Booking Notes
              </label>
              <textarea
                id="cal-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-2xl bg-white border border-[#17120F]/12 px-3.5 py-2.5 text-sm resize-none"
              />
            </div>

            {meetAccessToken ? (
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#C9A96E]" />
                Review &amp; Sync to Google Calendar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connectGoogleAccount()}
                className="gsi-material-button w-full"
              >
                <span>Connect Google to Sync Calendar &amp; Gmail</span>
              </button>
            )}

            <div className="pt-3 border-t border-[#17120F]/10 flex flex-wrap items-center justify-between gap-2">
              <a
                href={gcalDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17120F]/75 hover:text-[#17120F]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#9D7D44]" />
                Open in Google Calendar Web
              </a>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17120F]/75 hover:text-[#17120F] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#9D7D44]" />
                Download .ics Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

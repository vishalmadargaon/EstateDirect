import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
}

export function QRShareModal({ open, onClose, title, subtitle, url }: QRShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !url) return;
    let active = true;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: '#17120F',
        light: '#FAF7F2',
      },
    })
      .then((data) => {
        if (active) setQrDataUrl(data);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy ignored
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: subtitle || title, url });
      } catch {
        // User cancelled share sheet
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${title}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#17120F]/65"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-md bg-[#FAF7F2] rounded-[28px] border border-[#17120F]/10 p-6 sm:p-8 shadow-editorial-lg"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close share dialog"
              className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-[#17120F]/60 hover:text-[#17120F] hover:bg-[#EFE6D6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9D7D44] mb-1.5">
              Share &amp; QR Code
            </p>
            <h2 className="text-xl font-bold tracking-tight text-[#17120F] pr-8">{title}</h2>
            {subtitle && <p className="text-sm text-[#17120F]/65 mt-1">{subtitle}</p>}

            <div className="my-6 flex flex-col items-center justify-center bg-white rounded-[22px] border border-[#17120F]/[0.08] p-5">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${title}`}
                  className="w-52 h-52 rounded-xl"
                />
              ) : (
                <div className="w-52 h-52 rounded-xl bg-[#EFE6D6]/50 flex items-center justify-center text-xs text-[#17120F]/60">
                  Generating QR code...
                </div>
              )}
              <p className="mt-3 text-xs text-[#17120F]/55 text-center">
                Scan with any phone camera to open directly
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#17120F]/10 px-3.5 py-2.5 flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-mono-code text-[#17120F]/75 truncate">{url}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFE6D6] text-[#17120F] text-xs font-semibold hover:bg-[#E5D7BE] transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[#17120F]/20 text-[#17120F] text-sm font-semibold hover:bg-[#EFE6D6]/60 transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Save QR
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

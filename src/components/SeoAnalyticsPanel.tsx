import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Monitor,
  Search,
  Smartphone,
} from 'lucide-react';
import type { WebTrafficSummary } from '../utils/seoAndAnalytics';
import {
  getActiveGa4MeasurementId,
  isGa4FromEnv,
  saveCustomGa4MeasurementId,
} from '../utils/webAnalytics';

interface HealthReadiness {
  environment: 'production' | 'development';
  publicOrigin: string;
  contactEmail: string;
  services: {
    aiConfigured: boolean;
    smtpConfigured: boolean;
    googleVerificationConfigured: boolean;
    seoEnabled: boolean;
    analyticsEnabled: boolean;
  };
}

interface SeoAnalyticsPanelProps {
  rangeDays: 7 | 30 | 90;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function SeoAnalyticsPanel({ rangeDays, onNotify }: SeoAnalyticsPanelProps) {
  const [traffic, setTraffic] = useState<WebTrafficSummary | null>(null);
  const [health, setHealth] = useState<HealthReadiness | null>(null);
  const [ga4Input, setGa4Input] = useState<string>(() => getActiveGa4MeasurementId());
  const [activeGa4, setActiveGa4] = useState<string>(() => getActiveGa4MeasurementId());
  const [ga4Error, setGa4Error] = useState<string | null>(null);
  const envLocked = isGa4FromEnv();

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/analytics/summary?days=${rangeDays}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WebTrafficSummary | null) => {
        if (!cancelled && data) setTraffic(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [rangeDays]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthReadiness | null) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveGa4 = (e: React.FormEvent) => {
    e.preventDefault();
    setGa4Error(null);
    const result = saveCustomGa4MeasurementId(ga4Input);
    if (!result.ok) {
      setGa4Error(result.error || 'Invalid Measurement ID.');
      return;
    }
    setActiveGa4(result.id);
    onNotify(
      result.id
        ? `Google Analytics 4 (${result.id}) connected and tracking live.`
        : 'Google Analytics 4 ID cleared. First-party web analytics remains active.',
      'success'
    );
  };

  const liveOrigin = health?.publicOrigin || window.location.origin;
  const sitemapUrl = `${liveOrigin.replace(/\/+$/, '')}/sitemap.xml`;

  const handleCopySitemap = async () => {
    try {
      await navigator.clipboard.writeText(sitemapUrl);
      onNotify(`Copied ${sitemapUrl} for Google Search Console.`, 'success');
    } catch {
      onNotify(`Sitemap URL: ${sitemapUrl}`, 'success');
    }
  };

  const totalDeviceViews = (traffic?.devices.desktop || 0) + (traffic?.devices.mobile || 0);
  const mobilePct =
    totalDeviceViews > 0 ? Math.round(((traffic?.devices.mobile || 0) / totalDeviceViews) * 100) : 0;
  const desktopPct = totalDeviceViews > 0 ? 100 - mobilePct : 100;

  const readinessItems = [
    {
      label: 'Zoho Mail SMTP (OTP & Booking Alerts)',
      ready: Boolean(health?.services.smtpConfigured),
      detail: health?.services.smtpConfigured
        ? `Active via ${health.contactEmail}`
        : 'Add SMTP_PASS in Render Environment',
    },
    {
      label: 'Google Analytics 4 (GA4)',
      ready: Boolean(activeGa4),
      detail: activeGa4 ? `Tracking ${activeGa4}` : 'Add VITE_GA_MEASUREMENT_ID or save below',
    },
    {
      label: 'Google Search Console Meta Tag',
      ready: Boolean(health?.services.googleVerificationConfigured),
      detail: health?.services.googleVerificationConfigured
        ? 'Server-side verification meta active'
        : 'Paste GOOGLE_SITE_VERIFICATION in Render',
    },
    {
      label: 'Sitemap & Robots.txt',
      ready: true,
      detail: `${liveOrigin}/sitemap.xml`,
    },
  ];

  return (
    <div data-testid="seo-analytics-panel" className="space-y-6">
      {/* Live Go-Live Launch Readiness Strip */}
      <div className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9D7D44]">
              Production Launch Checklist
            </p>
            <h3 className="text-lg font-bold text-[#17120F] mt-0.5">
              Go-Live Readiness (Render Free Tier · Zoho SMTP · GA4 · Search Console)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopySitemap}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF7F2] border border-[#17120F]/12 text-xs font-semibold text-[#17120F] hover:bg-[#EFE6D6]/70 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Copy className="w-3.5 h-3.5 text-[#9D7D44]" />
            Copy Sitemap URL
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {readinessItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.06] p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#17120F] leading-snug">{item.label}</span>
                {item.ready ? (
                  <CheckCircle2 className="w-4 h-4 text-[#238845] shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-[#9D7D44] shrink-0" />
                )}
              </div>
              <p
                className={`text-[11px] text-[#17120F]/65 ${
                  item.detail.startsWith('http') ? 'break-all' : 'break-words'
                }`}
              >
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live First-Party Website Traffic & Acquisition */}
        <div className="lg:col-span-7 rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9D7D44]">
                Web Traffic &amp; Acquisition
              </p>
              <h3 className="text-lg font-bold text-[#17120F] mt-0.5">
                Live Site Analytics ({rangeDays}d)
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE6D6]/80 text-[#17120F] text-xs font-semibold self-start sm:self-auto">
              <Activity className="w-3.5 h-3.5 text-[#238845]" />
              First-Party Active{activeGa4 ? ` · GA4 ${activeGa4}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.06] p-4">
              <p className="text-xs text-[#17120F]/60">Page Views</p>
              <p
                data-testid="web-analytics-pageviews"
                className="text-2xl font-extrabold text-[#17120F] tabular-nums mt-1"
              >
                {traffic ? traffic.totalPageViews : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.06] p-4">
              <p className="text-xs text-[#17120F]/60">Unique Sessions</p>
              <p className="text-2xl font-extrabold text-[#17120F] tabular-nums mt-1">
                {traffic ? traffic.uniqueSessions : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.06] p-4">
              <p className="text-xs text-[#17120F]/60">Tracked Actions</p>
              <p className="text-2xl font-extrabold text-[#17120F] tabular-nums mt-1">
                {traffic ? traffic.conversionEvents : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#17120F]/55 mb-3">
                Top Visited Pages
              </p>
              {!traffic || traffic.topPages.length === 0 ? (
                <p className="text-xs text-[#17120F]/55">
                  Page views are recorded automatically as buyers browse your storefront.
                </p>
              ) : (
                <div className="space-y-2">
                  {traffic.topPages.slice(0, 5).map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[#17120F]/[0.06] last:border-b-0"
                    >
                      <span className="font-mono-code text-[#17120F]/80 truncate">{item.path}</span>
                      <span className="font-bold tabular-nums text-[#17120F] shrink-0">
                        {item.views}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#17120F]/55 mb-3">
                  Traffic Sources
                </p>
                {!traffic || traffic.sources.length === 0 ? (
                  <p className="text-xs text-[#17120F]/55">
                    Direct, Google Search &amp; WhatsApp links tracked.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {traffic.sources.map((src) => (
                      <div key={src.source} className="flex items-center justify-between text-xs">
                        <span className="text-[#17120F]/80">{src.source}</span>
                        <span className="font-semibold tabular-nums text-[#17120F]">
                          {src.count} ({src.percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#17120F]/[0.06] flex items-center justify-between text-xs text-[#17120F]/70">
                <span className="inline-flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#9D7D44]" />
                  Desktop {desktopPct}%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#9D7D44]" />
                  Mobile {mobilePct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: SEO Readiness + Optional Google Analytics 4 (GA4) */}
        <div className="lg:col-span-5 rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-7 shadow-editorial space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9D7D44]">
              Search Engine Optimization
            </p>
            <h3 className="text-lg font-bold text-[#17120F] mt-0.5">
              SEO &amp; Google Analytics 4
            </h3>
          </div>

          <ul className="space-y-2.5 text-xs text-[#17120F]/85">
            {[
              'Dynamic route titles, meta descriptions & canonical URLs',
              'OpenGraph & X/Twitter rich social share cards',
              'Schema.org JSON-LD (WebApplication, FAQPage & RealEstateListing)',
              'Server-side Google Search Console HTML tag + /sitemap.xml & /robots.txt',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#238845] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF7F2] border border-[#17120F]/12 text-xs font-semibold text-[#17120F] hover:bg-[#EFE6D6]/70 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#9D7D44]" />
              sitemap.xml
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF7F2] border border-[#17120F]/12 text-xs font-semibold text-[#17120F] hover:bg-[#EFE6D6]/70 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#9D7D44]" />
              robots.txt
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF7F2] border border-[#17120F]/12 text-xs font-semibold text-[#17120F] hover:bg-[#EFE6D6]/70 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#9D7D44]" />
              /api/health
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          <form onSubmit={handleSaveGa4} className="pt-4 border-t border-[#17120F]/[0.08] space-y-2.5">
            <label
              htmlFor="ga4-measurement-id"
              className="block text-xs font-semibold text-[#17120F]/80"
            >
              Google Analytics 4 Measurement ID (Optional, Free)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="ga4-measurement-id"
                type="text"
                value={ga4Input}
                disabled={envLocked}
                onChange={(e) => setGa4Input(e.target.value.toUpperCase())}
                placeholder="G-XXXXXXXXXX"
                className="flex-1 rounded-full bg-[#FAF7F2] border border-[#17120F]/15 px-4 py-2 text-xs font-mono-code text-[#17120F] disabled:opacity-60"
              />
              {!envLocked && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#17120F] text-[#FAF7F2] text-xs font-bold hover:bg-[#261E19] transition-colors cursor-pointer shrink-0"
                >
                  Save GA4
                </button>
              )}
            </div>
            {ga4Error && <p className="text-xs text-red-700">{ga4Error}</p>}
            <p className="text-[11px] text-[#17120F]/55">
              {envLocked
                ? `Configured via VITE_GA_MEASUREMENT_ID (${activeGa4}).`
                : 'Paste your free GA4 ID from analytics.google.com or set VITE_GA_MEASUREMENT_ID in Render Environment.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

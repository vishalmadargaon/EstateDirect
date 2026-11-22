import { classifyTrafficSource, isValidGa4MeasurementId } from './seoAndAnalytics';

const GA4_STORAGE_KEY = 'estatedirect_ga4_measurement_id';
const SESSION_KEY = 'estatedirect_analytics_session';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loadedGa4Id: string | null = null;

function getOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated = `ed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return 'ed_anon';
  }
}

export function getActiveGa4MeasurementId(): string {
  const envId = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || '';
  if (isValidGa4MeasurementId(envId)) return envId.trim().toUpperCase();
  try {
    const saved = window.localStorage.getItem(GA4_STORAGE_KEY) || '';
    if (isValidGa4MeasurementId(saved)) return saved.trim().toUpperCase();
  } catch {
    // ignore storage access issues
  }
  return '';
}

export function isGa4FromEnv(): boolean {
  const envId = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || '';
  return isValidGa4MeasurementId(envId);
}

export function saveCustomGa4MeasurementId(rawId: string): { ok: boolean; id: string; error?: string } {
  const cleaned = rawId.trim().toUpperCase();
  if (!cleaned) {
    try {
      window.localStorage.removeItem(GA4_STORAGE_KEY);
    } catch {
      // ignore
    }
    return { ok: true, id: '' };
  }
  if (!isValidGa4MeasurementId(cleaned)) {
    return {
      ok: false,
      id: '',
      error: 'Enter a valid GA4 Measurement ID in the format G-XXXXXXXXXX.',
    };
  }
  try {
    window.localStorage.setItem(GA4_STORAGE_KEY, cleaned);
  } catch {
    // ignore
  }
  ensureGa4ScriptLoaded(cleaned);
  return { ok: true, id: cleaned };
}

export function ensureGa4ScriptLoaded(explicitId?: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const measurementId = explicitId || getActiveGa4MeasurementId();
  if (!measurementId || !isValidGa4MeasurementId(measurementId)) return null;
  if (loadedGa4Id === measurementId) return measurementId;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const scriptId = 'estatedirect-ga4-script';
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  loadedGa4Id = measurementId;
  return measurementId;
}

function sendToFirstPartyCollector(payload: {
  type: 'page_view' | 'event';
  name: string;
  path: string;
  title?: string;
}): void {
  if (typeof window === 'undefined') return;
  const isMobile = window.innerWidth < 768;
  const body = JSON.stringify({
    type: payload.type,
    name: payload.name,
    path: payload.path,
    title: payload.title,
    source: classifyTrafficSource(document.referrer || '', window.location.search || ''),
    device: isMobile ? 'Mobile' : 'Desktop',
    sessionId: getOrCreateSessionId(),
  });

  try {
    void fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics must never interrupt user experience
  }
}

export function trackWebPageView(pathname: string, pageTitle: string): void {
  const gaId = ensureGa4ScriptLoaded();
  if (gaId && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pathname,
      page_location: window.location.href,
    });
  }
  sendToFirstPartyCollector({
    type: 'page_view',
    name: 'page_view',
    path: pathname || '/',
    title: pageTitle,
  });
}

export function trackWebEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  const gaId = ensureGa4ScriptLoaded();
  if (gaId && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params || {});
  }
  const currentPath =
    (typeof window !== 'undefined' && window.location.hash.replace(/^#/, '').split('?')[0]) || '/';
  sendToFirstPartyCollector({
    type: 'event',
    name: eventName,
    path: currentPath,
  });
}

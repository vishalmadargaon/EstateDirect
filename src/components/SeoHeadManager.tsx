import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../context/AppStoreContext';
import { buildRouteSeo, sanitizeGoogleSiteVerificationToken } from '../utils/seoAndAnalytics';
import { trackWebPageView } from '../utils/webAnalytics';

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLdScript(data: Record<string, unknown>): void {
  const id = 'estatedirect-dynamic-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function SeoHeadManager() {
  const { pathname } = useLocation();
  const { properties, profiles } = useAppStore();

  useEffect(() => {
    const origin = window.location.origin;

    // Extract slug and propertyId from route patterns: /c/:slug or /c/:slug/p/:propertyId
    const propMatch = pathname.match(/^\/c\/([^/]+)\/p\/([^/]+)/);
    const catalogMatch = pathname.match(/^\/c\/([^/]+)/);
    const slug = propMatch?.[1] || catalogMatch?.[1];
    const propertyId = propMatch?.[2];

    const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
    const agency =
      (property ? profiles.find((p) => p.ownerId === property.ownerId) : undefined) ||
      (slug ? profiles.find((p) => p.slug === slug) : undefined);

    const seo = buildRouteSeo({
      pathname,
      origin,
      agencyName: agency?.companyName,
      property,
    });

    document.title = seo.title;
    upsertMetaTag('name', 'description', seo.description);
    upsertMetaTag('name', 'robots', seo.robots);
    upsertMetaTag('property', 'og:type', seo.ogType);
    upsertMetaTag('property', 'og:title', seo.title);
    upsertMetaTag('property', 'og:description', seo.description);
    upsertMetaTag('property', 'og:url', seo.canonicalUrl);
    upsertMetaTag('property', 'og:image', seo.ogImage);
    upsertMetaTag('name', 'twitter:title', seo.title);
    upsertMetaTag('name', 'twitter:description', seo.description);
    upsertMetaTag('name', 'twitter:image', seo.ogImage);
    upsertCanonicalLink(seo.canonicalUrl);
    upsertJsonLdScript(seo.jsonLd);

    const clientVerifyToken = sanitizeGoogleSiteVerificationToken(
      ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_GOOGLE_SITE_VERIFICATION) || ''
    );
    if (clientVerifyToken) {
      upsertMetaTag('name', 'google-site-verification', clientVerifyToken);
    }

    trackWebPageView(pathname, seo.title);
  }, [pathname, properties, profiles]);

  return null;
}

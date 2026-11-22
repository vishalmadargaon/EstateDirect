import { useState } from 'react';
import { Compass, ExternalLink, Globe, Loader2, MapPin } from 'lucide-react';
import type { Property } from '../types';

interface GroundedPlace {
  title: string;
  uri: string;
  snippet?: string;
}

interface GroundedSource {
  title: string;
  uri: string;
}

export function NeighborhoodIntelligence({ property }: { property: Property }) {
  const [activeTab, setActiveTab] = useState<'maps' | 'search'>('maps');
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsText, setMapsText] = useState<string | null>(null);
  const [mapsPlaces, setMapsPlaces] = useState<GroundedPlace[]>([]);
  const [mapsCategory, setMapsCategory] = useState(
    'top schools, fine dining restaurants, hospitals, parks, and transit hubs'
  );

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<GroundedSource[]>([]);

  const fetchMapsNearby = async (categoryOverride?: string) => {
    const cat = categoryOverride || mapsCategory;
    setMapsLoading(true);
    setMapsError(null);
    try {
      const res = await fetch('/api/ai/maps-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locality: property.locality,
          city: property.city,
          latitude: property.latitude,
          longitude: property.longitude,
          category: cat,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load Google Maps neighborhood data.');
      }
      setMapsText(data.text || '');
      setMapsPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err) {
      setMapsError(err instanceof Error ? err.message : 'Unable to fetch nearby places.');
    } finally {
      setMapsLoading(false);
    }
  };

  const fetchMarketInsights = async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/ai/search-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locality: property.locality,
          city: property.city,
          propertyType: property.propertyType,
          kind: property.kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load live market insights.');
      }
      setSearchText(data.text || '');
      setSearchSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to fetch market insights.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <section
      aria-label="Neighborhood and Market Intelligence"
      className="rounded-[28px] bg-white border border-[#17120F]/[0.08] p-6 sm:p-8 shadow-editorial"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#17120F]/[0.08]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9D7D44]">
            Live Location Briefing
          </p>
          <h2 className="text-xl font-bold tracking-tight text-[#17120F] mt-1">
            {property.locality}, {property.city}
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Location intelligence views"
          className="inline-flex items-center p-1 rounded-full bg-[#EFE6D6]/75 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'maps'}
            onClick={() => setActiveTab('maps')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'maps'
                ? 'bg-[#17120F] text-[#FAF7F2]'
                : 'text-[#17120F]/75 hover:text-[#17120F]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Nearby Places
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-[#17120F] text-[#FAF7F2]'
                : 'text-[#17120F]/75 hover:text-[#17120F]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Market Insights
          </button>
        </div>
      </div>

      {activeTab === 'maps' ? (
        <div className="pt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Essential Highlights', value: 'top schools, fine dining restaurants, hospitals, parks, and transit hubs' },
              { label: 'Dining & Cafes', value: 'best fine dining restaurants and specialty coffee cafes' },
              { label: 'Schools & Healthcare', value: 'top international schools and multi-specialty hospitals' },
              { label: 'Transit & Connectivity', value: 'nearest metro stations, airport access, and arterial roads' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMapsCategory(item.value);
                  void fetchMapsNearby(item.value);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  mapsCategory === item.value && mapsText
                    ? 'bg-[#EFE6D6] border-[#C9A96E] text-[#17120F]'
                    : 'bg-[#FAF7F2] border-[#17120F]/10 text-[#17120F]/80 hover:border-[#17120F]/30'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!mapsText && !mapsLoading && !mapsError && (
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.08] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-[#17120F]/75">
                Explore verified nearby schools, restaurants, hospitals, and transit around{' '}
                <span className="font-semibold text-[#17120F]">{property.locality}</span> with live Google Maps links.
              </div>
              <button
                type="button"
                onClick={() => void fetchMapsNearby()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors whitespace-nowrap shrink-0"
              >
                <Compass className="w-4 h-4" />
                Load Maps Guide
              </button>
            </div>
          )}

          {mapsLoading && (
            <div className="py-8 flex items-center justify-center gap-2.5 text-sm text-[#17120F]/70">
              <Loader2 className="w-4 h-4 animate-spin text-[#9D7D44]" />
              Fetching live neighborhood places from Google Maps...
            </div>
          )}

          {mapsError && (
            <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              {mapsError}
            </div>
          )}

          {mapsText && !mapsLoading && (
            <div className="space-y-4">
              <div className="text-sm leading-relaxed text-[#17120F]/85 whitespace-pre-line">
                {mapsText}
              </div>

              {mapsPlaces.length > 0 && (
                <div className="pt-4 border-t border-[#17120F]/[0.08]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#17120F]/55 mb-3">
                    Verified Google Maps Places
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mapsPlaces.map((place) => (
                      <a
                        key={place.uri}
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-2xl bg-[#FAF7F2] border border-[#17120F]/10 p-3.5 hover:border-[#C9A96E] transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#17120F] group-hover:text-[#9D7D44] transition-colors truncate">
                            {place.title}
                          </p>
                          {place.snippet && (
                            <p className="text-xs text-[#17120F]/65 mt-1 line-clamp-2">
                              {place.snippet}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#17120F]/45 shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-5 space-y-4">
          {!searchText && !searchLoading && !searchError && (
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.08] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-[#17120F]/75">
                Get live web-grounded price-per-sq-ft benchmarks, infrastructure updates, and demand signals for{' '}
                <span className="font-semibold text-[#17120F]">
                  {property.locality}, {property.city}
                </span>
                .
              </div>
              <button
                type="button"
                onClick={() => void fetchMarketInsights()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors whitespace-nowrap shrink-0"
              >
                <Globe className="w-4 h-4" />
                Load Market Briefing
              </button>
            </div>
          )}

          {searchLoading && (
            <div className="py-8 flex items-center justify-center gap-2.5 text-sm text-[#17120F]/70">
              <Loader2 className="w-4 h-4 animate-spin text-[#9D7D44]" />
              Researching live market data via Google Search...
            </div>
          )}

          {searchError && (
            <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              {searchError}
            </div>
          )}

          {searchText && !searchLoading && (
            <div className="space-y-4">
              <div className="text-sm leading-relaxed text-[#17120F]/85 whitespace-pre-line">
                {searchText}
              </div>

              {searchSources.length > 0 && (
                <div className="pt-4 border-t border-[#17120F]/[0.08]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#17120F]/55 mb-2.5">
                    Web Citations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchSources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#17120F]/10 text-xs font-medium text-[#17120F]/80 hover:border-[#C9A96E] hover:text-[#17120F] transition-colors max-w-[260px]"
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

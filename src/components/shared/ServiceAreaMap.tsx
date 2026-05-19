interface ServiceAreaMapProps {
  localities?: string[];
  city?: string | null;
  state?: string | null;
}

export function ServiceAreaMap({ localities, city, state }: ServiceAreaMapProps) {
  // KAN-761: build the embed URL from the contractor's city/state instead of
  // a hardcoded South Florida default. When city is unknown we hide the map
  // entirely — a default-location map is worse than no map (misleads users
  // about the pro's location and signals data-quality issues to crawlers).
  const mapQuery = city ? (state ? `${city}, ${state}` : city) : null;
  if (!mapQuery) return null;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&z=11`;

  const rawLocalities =
    localities && localities.length > 0
      ? localities
      : [mapQuery];

  // Limit to max 5 entries, single row display
  const displayLocalities = rawLocalities.slice(0, 5);

  return (
    <div className="relative w-full h-full min-h-[360px] border border-cream-dark overflow-hidden">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: 360 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Service Area Map"
        className="absolute inset-0 w-full h-full"
      />
      {/* Locality keyword overlays — max 5, single row */}
      <div className="absolute bottom-0 left-0 right-0 bg-navy/80 px-4 py-2 flex flex-nowrap gap-x-4 overflow-hidden">
        {displayLocalities.map((locality) => (
          <span key={locality} className="text-gold text-xs font-sans font-semibold uppercase tracking-wide whitespace-nowrap flex-shrink-0">
            {locality}
          </span>
        ))}
      </div>
    </div>
  );
}

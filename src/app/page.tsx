export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GiAnchor } from 'react-icons/gi';
import { FiPhone, FiArrowRight, FiClock, FiTool, FiZap, FiUsers } from 'react-icons/fi';
import { GiShipWheel, GiWaves } from 'react-icons/gi';
import { getSiteData } from '@/lib/siteData';
import { requireSiteUrl } from '@/lib/config';
import { formatPhone } from '@/lib/phoneUtils';
import { ParkedLanding } from '@/components/ParkedLanding';
import { SectionWrapper, BoatworkVerifiedBadge, PortfolioGrid, ServiceAreaMap, SmartLogo, UpdatesFeed } from '@/components/shared';

// Extract first sentence from a description
function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
}

function formatReviewDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatCityFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Convert "8:00 AM", "8 AM", "8am", "08:00", "5:00 PM" → "HH:MM" 24-hour.
function toIso24h(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0');
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ?? '00';
  const suffix = m[3]?.toUpperCase();
  if (suffix === 'PM' && h < 12) h += 12;
  if (suffix === 'AM' && h === 12) h = 0;
  if (h > 23 || parseInt(min, 10) > 59) return null;
  return `${h.toString().padStart(2, '0')}:${min}`;
}

// Parse "8:00 AM – 5:00 PM" / "9am-5pm" / "08:00 to 17:00" into
// schema.org-compatible opens/closes pair. Returns null for closed,
// unparseable, ambiguous (bare "9-5" — could be 9am-5pm or 9pm-5am, refuse
// to guess), or zero-length ranges. Each side must carry either an AM/PM
// marker or explicit :MM minutes — bare numerals are rejected so we never
// emit guessed 24-hour values.
function parseHoursPair(input: string): { opens: string; closes: string } | null {
  const s = input.trim();
  if (!s || /^(closed|open|by appointment|appointment only|n\/a)$/i.test(s)) return null;
  const side = '(\\d{1,2}:\\d{2}(?:\\s*[AP]M)?|\\d{1,2}\\s*[AP]M)';
  const m = s.match(new RegExp(`^${side}\\s*(?:[-–—]|to)\\s*${side}$`, 'i'));
  if (!m) return null;
  const opens = toIso24h(m[1]);
  const closes = toIso24h(m[2]);
  if (!opens || !closes) return null;
  if (opens === closes) return null;
  return { opens, closes };
}

// Icon lookup for service summary cards
const iconMap: Record<string, React.ReactNode> = {
  wheel: <GiShipWheel size={22} />,
  anchor: <GiAnchor size={22} />,
  waves: <GiWaves size={22} />,
  wrench: <FiTool size={22} />,
  electric: <FiZap size={22} />,
  engine: <FiTool size={22} />,
  captain: <FiUsers size={22} />,
};

export async function generateMetadata(): Promise<Metadata> {
  const siteData = await getSiteData();
  const siteUrl = requireSiteUrl();
  const apiSeo = siteData.apiSeo;
  const serviceNames = siteData.services.slice(0, 3).map((s) => s.name).join(', ');
  const title = apiSeo?.titles?.homepage ?? `${siteData.name} — Marine Services in ${siteData.city}, ${siteData.state}`;
  const description = apiSeo?.metaDescriptions?.homepage ?? `${siteData.name} provides ${serviceNames} in ${siteData.city}, ${siteData.state}. Request a quote today.`;
  const canonical = apiSeo?.canonicals?.homepage ?? siteUrl;
  return {
    title,
    description,
    alternates: {
      canonical,
    },
  };
}

export default async function HomePage() {
  const siteConfig = await getSiteData();

  // SEO-DUP-7b: parked sites render the "no longer available" landing +
  // similar-pro cross-sells instead of the normal homepage. Early return so
  // the rest of the page logic (reviews, services, portfolio, etc.) doesn't
  // get computed for a site that won't render them.
  if (siteConfig.parked?.isActive) {
    return <ParkedLanding parked={siteConfig.parked} businessName={siteConfig.name} />;
  }

  const siteUrl = requireSiteUrl();

  const reviews = siteConfig.boatwork.staticReviews;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5;

  const phone = formatPhone(siteConfig.phone);
  const hasPortfolio = siteConfig.portfolio.length > 0 || siteConfig.videos.length > 0;

  // LocalBusiness JSON-LD — no reviews on homepage, include sameAs to marketplace
  const baseLocalBusinessSchema = siteConfig.apiSeo?.jsonLd ?? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl || undefined,
    telephone: phone?.href.replace('tel:', '') ?? siteConfig.phone,
    email: siteConfig.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.city,
      addressRegion: siteConfig.state,
      addressCountry: 'US',
    },
    image: siteConfig.logoUrl,
    sameAs: [
      siteConfig.boatwork.profileUrl,
      siteConfig.social.facebook,
      siteConfig.social.instagram,
    ].filter(Boolean),
  };

  // KAN-779 — emit AggregateRating only at the 3+ review threshold so the
  // displayed star block (S5) and the structured-data signal stay aligned.
  // Use the aggregate count/rating from siteData (which reads from the
  // synopsis or the API total) rather than the 5-review display slice.
  const totalReviewCount = siteConfig.aggregateReviewCount;
  const totalAverageRating = siteConfig.aggregateRating;
  const aggregateRating =
    totalReviewCount >= 3 && totalAverageRating !== null
      ? {
          '@type': 'AggregateRating',
          ratingValue: Math.round(totalAverageRating * 10) / 10,
          reviewCount: totalReviewCount,
        }
      : null;

  // KAN-779 — OpeningHoursSpecification per day. Skip days that don't parse
  // (closed, unset, "Open" placeholder) rather than fabricating ranges.
  const openingHoursSpecification = siteConfig.hoursOfOperation
    ? Object.entries(siteConfig.hoursOfOperation)
        .map(([day, value]) => {
          if (!value) return null;
          const pair = parseHoursPair(value);
          if (!pair) return null;
          return {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: day,
            opens: pair.opens,
            closes: pair.closes,
          };
        })
        .filter(Boolean)
    : [];

  const localBusinessSchema = {
    ...baseLocalBusinessSchema,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
  };

  const serviceSchemas = siteConfig.services.map((s) => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: s.name,
    provider: { '@type': 'LocalBusiness', name: siteConfig.name },
    description: s.description,
    areaServed: `${siteConfig.city}, ${siteConfig.state}`,
  }));

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const formatHours = (h: string) => h === 'Open' ? 'Open All Day' : h;

  return (
    <>
      {/* Hero */}
      <section className="relative bg-hero-gradient text-white overflow-hidden" style={{ minHeight: '85vh' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="waves" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M0 40 Q20 20 40 40 Q60 60 80 40" stroke="var(--color-accent)" strokeWidth="1" fill="none"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center" style={{ minHeight: '85vh' }}>
          <div className="mb-8">
            <SmartLogo
              src={siteConfig.logoUrl}
              alt={siteConfig.name}
              size={144}
              fallbackInitial={siteConfig.name.charAt(0)}
              className="border-2 border-gold/40"
              fallbackClassName="bg-gold text-navy border-2 border-gold/40"
            />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-12 bg-gold/60" />
            <span className="text-gold text-xs font-sans font-semibold uppercase tracking-widest">
              {siteConfig.city}, {siteConfig.state}
            </span>
            <div className="h-px w-12 bg-gold/60" />
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 leading-tight">
            {siteConfig.name}
          </h1>
          <p className="text-gold-light font-serif text-xl md:text-2xl italic mb-10">
            {siteConfig.tagline}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/services"
              className="bg-gold text-navy font-sans font-bold px-8 py-4 hover:bg-gold-light transition-colors uppercase tracking-widest text-sm whitespace-nowrap"
            >
              Our Services
            </Link>
            <Link
              href="/contact"
              className="border border-gold/50 text-white font-sans font-semibold px-8 py-4 hover:border-gold hover:bg-white/5 transition-all uppercase tracking-widest text-sm whitespace-nowrap"
            >
              Request a Quote
            </Link>
          </div>

          {phone && (
            <a href={phone.href} className="mt-8 flex items-center gap-2 text-gold-light hover:text-gold transition-colors">
              <FiPhone size={16} />
              <span className="font-sans text-sm">{phone.display}</span>
            </a>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cream to-transparent" />
      </section>

      {/* Gold divider */}
      <div className="gold-rule-full" />

      {/* KAN-779 — first-person, contractor-voice introduction sourced from
          subdomainHeroText. Anchors the subdomain's content differentiation
          from the marketplace surface; hidden when generation hasn't produced
          a value yet. */}
      {siteConfig.subdomainHeroText && (
        <>
          <SectionWrapper variant="white" id="intro">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="h-px w-8 bg-gold/60" />
                <GiAnchor className="text-gold" size={20} />
                <div className="h-px w-8 bg-gold/60" />
              </div>
              <div className="font-sans text-lg leading-relaxed text-text whitespace-pre-line">
                {siteConfig.subdomainHeroText}
              </div>
            </div>
          </SectionWrapper>
          <div className="gold-rule-full" />
        </>
      )}

      {/* Services Preview — first sentence only */}
      <SectionWrapper variant="cream" id="services">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold/60" />
            <GiAnchor className="text-gold" size={20} />
            <div className="h-px w-8 bg-gold/60" />
          </div>
          <h2 className="font-serif text-4xl font-bold text-navy mb-4">What We Do</h2>
          <p className="text-text-light font-sans max-w-2xl mx-auto leading-relaxed">
            Comprehensive marine services delivered with the expertise and care your vessel deserves.
          </p>
        </div>
        <div className={`grid gap-px bg-cream-dark ${
          siteConfig.services.length === 1 ? 'grid-cols-1' :
          siteConfig.services.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          siteConfig.services.length === 4 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {siteConfig.services.map((s) => (
            <div key={s.name} className="bg-white border border-cream-dark hover:border-gold/40 p-8 group transition-all duration-300 hover:shadow-lg">
              <div className="text-gold mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">
                {iconMap[s.icon] ?? iconMap.anchor}
              </div>
              <h3 className="font-serif text-lg font-semibold text-navy mb-3">{s.name}</h3>
              <p className="text-text-light text-sm leading-relaxed font-sans mb-4">
                {firstSentence(s.description)}
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 text-navy font-sans font-semibold text-xs uppercase tracking-widest hover:text-gold transition-colors"
              >
                Learn more <FiArrowRight size={12} className="flex-shrink-0" />
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 whitespace-nowrap text-navy font-sans font-semibold text-sm uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/40 pb-1"
          >
            View All Services <FiArrowRight size={14} className="flex-shrink-0 inline-block" />
          </Link>
        </div>
      </SectionWrapper>

      {/* Reviews — KAN-779: synopsis paragraph removed (overlapped marketplace).
          KAN-784: render up to 12 full-text Boatwork-native reviews in
          pull-quote style (previously capped at 3). Aggregate count + rating
          live in the LocalBusiness JSON-LD + the three-state navbar block (S5).
          Google SERP reviews are NOT rendered in full here — Google ToS — but
          they're counted in the navbar/schema aggregate. A CTA to the
          marketplace profile gives visitors the path to the complete review
          set including the Google ones.
          KAN-785: a first-person, business-owner-voice synthesis of the cached
          reviews is rendered above the pull-quote grid as a "from us about us"
          intro. The text is generated at build/refresh time (no runtime LLM)
          and is intentionally different from the marketplace's third-person
          editorial summary — they share the underlying review pool but the
          voice and framing are the differentiator. */}
      {reviews.length > 0 && (
        <>
          <div className="gold-rule-full" />
          <SectionWrapper variant="cream" id="reviews">
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-8 bg-gold/60" />
                <GiAnchor className="text-gold" size={20} />
                <div className="h-px w-8 bg-gold/60" />
              </div>
              <h2 className="font-serif text-4xl font-bold text-navy mb-4">What Our Clients Say</h2>
            </div>

            {siteConfig.reviewSynopsis?.summary && siteConfig.aggregateReviewCount >= 3 && (
              <div className="max-w-3xl mx-auto mb-12">
                <p className="font-serif text-lg md:text-xl text-text leading-relaxed text-center italic">
                  {siteConfig.reviewSynopsis.summary}
                </p>
              </div>
            )}

            {(() => {
              const shown = reviews.slice(0, 12);
              const total = siteConfig.aggregateReviewCount;
              const moreCount = Math.max(0, total - shown.length);
              return (
                <>
                  <div className={`grid gap-6 max-w-6xl mx-auto ${
                    shown.length === 1 ? 'grid-cols-1 max-w-2xl' :
                    shown.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {shown.map((r, i) => (
                      <blockquote
                        key={r.id ?? `${r.author}-${i}`}
                        className="bg-white border border-cream-dark p-8 flex flex-col"
                      >
                        <div className="flex mb-4">
                          {Array.from({ length: r.rating }).map((_, j) => (
                            <span key={j} className="text-gold text-xl">★</span>
                          ))}
                        </div>
                        <p className="font-serif text-lg text-text leading-relaxed mb-6 italic flex-1">
                          &ldquo;{r.text}&rdquo;
                        </p>
                        <footer className="border-t border-cream-dark pt-4">
                          <p className="font-serif text-base font-semibold text-navy">{r.author}</p>
                          <p className="text-text-light text-xs font-sans mt-1">
                            {formatReviewDate(r.date)}
                          </p>
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                  {moreCount > 0 && siteConfig.boatwork.profileUrl && (
                    <div className="text-center mt-10">
                      <a
                        href={siteConfig.boatwork.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-navy font-sans font-semibold text-sm uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/40 pb-1 whitespace-nowrap"
                      >
                        View all {total} reviews on Boatwork
                        <FiArrowRight size={14} className="flex-shrink-0 inline-block" />
                      </a>
                    </div>
                  )}
                </>
              );
            })()}
          </SectionWrapper>
        </>
      )}

      {/* Updates — hidden if profile has no updates */}
      {siteConfig.updates.length > 0 && (
        <>
          <div className="gold-rule-full" />
          <SectionWrapper variant="white" id="updates">
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-8 bg-gold/60" />
                <GiAnchor className="text-gold" size={20} />
                <div className="h-px w-8 bg-gold/60" />
              </div>
              <h2 className="font-serif text-4xl font-bold text-navy mb-4">Latest Updates</h2>
              <p className="text-text-light font-sans max-w-2xl mx-auto leading-relaxed">
                News and updates from {siteConfig.name}.
              </p>
            </div>
            <UpdatesFeed
              updates={siteConfig.updates}
              businessName={siteConfig.name}
              logoUrl={siteConfig.logoUrl || undefined}
            />
            <div className="text-center mt-10">
              <Link
                href="/news"
                className="inline-flex items-center gap-2 text-navy font-sans font-semibold text-sm uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/40 pb-1 whitespace-nowrap"
              >
                View All Updates <FiArrowRight size={14} className="flex-shrink-0 inline-block" />
              </Link>
            </div>
          </SectionWrapper>
        </>
      )}

      {/* Portfolio — hidden if profile has no photos and no videos */}
      {hasPortfolio && (
        <>
          <div className="gold-rule-full" />
          <SectionWrapper variant="white" id="portfolio">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-8 bg-gold/60" />
                <GiAnchor className="text-gold" size={20} />
                <div className="h-px w-8 bg-gold/60" />
              </div>
              <h2 className="font-serif text-4xl font-bold text-navy mb-4">Our Work</h2>
              <p className="text-text-light font-sans max-w-xl mx-auto">
                A glimpse of what we do for local boat owners.
              </p>
            </div>
            <PortfolioGrid items={siteConfig.portfolio.slice(0, 6)} videos={siteConfig.videos} businessName={siteConfig.name} />
            <div className="text-center mt-10">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 text-navy font-sans font-semibold text-sm uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/40 pb-1 whitespace-nowrap"
              >
                View Full Portfolio <FiArrowRight size={14} className="flex-shrink-0 inline-block" />
              </Link>
            </div>
          </SectionWrapper>
        </>
      )}

      <div className="gold-rule-full" />

      {/* Service Area */}
      <SectionWrapper variant="white" id="service-area">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-gold/60" />
              <span className="text-gold text-xs font-sans font-semibold uppercase tracking-widest">Service Area</span>
            </div>
            <h2 className="font-serif text-4xl font-bold text-navy mb-6">{siteConfig.serviceAreaTitle}</h2>
            <p className="text-text font-sans mb-4 leading-relaxed">
              {siteConfig.serviceAreaDescription}
            </p>
            <ul className="space-y-3">
              {siteConfig.serviceArea.map((a) => (
                <li key={a} className="flex items-center gap-3 font-sans text-text">
                  <span className="w-2 h-2 bg-gold rounded-full flex-shrink-0" />
                  <span className="font-semibold">{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="h-96 lg:h-full min-h-[360px]">
            <ServiceAreaMap
              localities={siteConfig.serviceArea}
              city={siteConfig.city}
              state={siteConfig.state}
            />
          </div>
        </div>
      </SectionWrapper>

      {/* KAN-779 — "Areas We Serve" detail. Renders one per-city paragraph
          from subdomainCityContent (M2 pipeline) keyed by city slug. Hidden
          when the field is null/empty rather than rendering an empty section. */}
      {siteConfig.subdomainCityContent && Object.keys(siteConfig.subdomainCityContent).length > 0 && (
        <>
          <div className="gold-rule-full" />
          <SectionWrapper variant="cream" id="areas-we-serve">
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-8 bg-gold/60" />
                <GiAnchor className="text-gold" size={20} />
                <div className="h-px w-8 bg-gold/60" />
              </div>
              <h2 className="font-serif text-4xl font-bold text-navy mb-4">Areas We Serve</h2>
            </div>
            <div className={`grid gap-8 max-w-5xl mx-auto ${
              Object.keys(siteConfig.subdomainCityContent).length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {Object.entries(siteConfig.subdomainCityContent).map(([slug, block]) => (
                <article key={slug} className="bg-white border border-cream-dark p-8">
                  <h3 className="font-serif text-2xl font-bold text-navy mb-4">
                    {block.headline ?? formatCityFromSlug(slug)}
                  </h3>
                  <p className="text-text font-sans leading-relaxed whitespace-pre-line">
                    {block.body}
                  </p>
                </article>
              ))}
            </div>
          </SectionWrapper>
        </>
      )}

      {/* Business Hours — KAN-780 parity with the marketplace: only render
          days the contractor actually populated; hide the section entirely
          when nothing is set rather than showing "08:00 to 08:00" rows that
          look like real hours to both visitors and Google. */}
      {(() => {
        const populated = dayOrder.filter((d) => !!siteConfig.hoursOfOperation?.[d]);
        if (populated.length === 0) return null;
        return (
          <>
            <div className="gold-rule-full" />
            <SectionWrapper variant="cream" id="hours">
              <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <FiClock className="text-gold flex-shrink-0" size={22} />
                  <h2 className="font-serif text-3xl font-bold text-navy">Business Hours</h2>
                </div>
                <div className="bg-white border border-cream-dark p-6 space-y-2">
                  {populated.map((day) => (
                    <div key={day} className="flex justify-between font-sans text-sm">
                      <span className="text-navy font-semibold w-28">{day}</span>
                      <span className="text-text">{formatHours(siteConfig.hoursOfOperation![day])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionWrapper>
          </>
        );
      })()}

      {/* CTA */}
      <SectionWrapper variant="navy">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gold/40" />
            <GiAnchor className="text-gold" size={20} />
            <div className="h-px w-12 bg-gold/40" />
          </div>
          <h2 className="font-serif text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-slate-300 font-sans mb-3">Speak directly with our team about your vessel.</p>
          {phone ? (
            <a href={phone.href} className="text-gold font-serif text-3xl font-bold block mb-10 hover:text-gold-light transition-colors">
              {phone.display}
            </a>
          ) : (
            <a href={`tel:${siteConfig.phone}`} className="text-gold font-serif text-3xl font-bold block mb-10 hover:text-gold-light transition-colors">
              {siteConfig.phone}
            </a>
          )}
          <Link
            href="/contact"
            className="inline-block bg-gold text-navy font-sans font-bold px-10 py-4 hover:bg-gold-light transition-colors uppercase tracking-widest text-sm whitespace-nowrap"
          >
            Contact Us
          </Link>
        </div>
      </SectionWrapper>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      {serviceSchemas.map((schema, i) => (
        <script
          key={`service-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

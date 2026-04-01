export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GiAnchor } from 'react-icons/gi';
import { FiPhone, FiArrowRight, FiClock, FiTool, FiZap, FiUsers } from 'react-icons/fi';
import { GiShipWheel, GiWaves } from 'react-icons/gi';
import { getSiteData } from '@/lib/siteData';
import { formatPhone } from '@/lib/phoneUtils';
import { ReviewCard, SectionWrapper, BoatworkVerifiedBadge, PortfolioGrid, ServiceAreaMap, SmartLogo, UpdatesFeed } from '@/components/shared';

// Extract first sentence from a description
function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const apiSeo = siteData.apiSeo;
  const serviceNames = siteData.services.slice(0, 3).map((s) => s.name).join(', ');
  const title = apiSeo?.titles?.homepage ?? `${siteData.name} — Marine Services in ${siteData.city}, ${siteData.state}`;
  const description = apiSeo?.metaDescriptions?.homepage ?? `${siteData.name} provides ${serviceNames} in ${siteData.city}, ${siteData.state}. Request a quote today.`;
  const canonical = apiSeo?.canonicals?.homepage ?? (siteUrl || '/');
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const reviews = siteConfig.boatwork.staticReviews;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5;

  const phone = formatPhone(siteConfig.phone);
  const hasPortfolio = siteConfig.portfolio.length > 0 || siteConfig.videos.length > 0;

  // LocalBusiness JSON-LD — no reviews on homepage, include sameAs to marketplace
  const localBusinessSchema = siteConfig.apiSeo?.jsonLd ?? {
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

      {/* Reviews — hidden if profile has no reviews */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cream-dark">
              {siteConfig.boatwork.staticReviews.map((r, i) => (
                <div key={r.id ?? `${r.author}-${i}`} className="bg-cream">
                  <ReviewCard {...r} />
                </div>
              ))}
            </div>
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
            <ServiceAreaMap localities={siteConfig.serviceArea} />
          </div>
        </div>
      </SectionWrapper>

      {/* Business Hours — always shown; falls back to "Available 24/7" when no data */}
      <>
        <div className="gold-rule-full" />
        <SectionWrapper variant="cream" id="hours">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <FiClock className="text-gold flex-shrink-0" size={22} />
              <h2 className="font-serif text-3xl font-bold text-navy">Business Hours</h2>
            </div>
            <div className="bg-white border border-cream-dark p-6 space-y-2">
              {siteConfig.hoursOfOperation && dayOrder.some((d) => !!siteConfig.hoursOfOperation![d])
                ? dayOrder.map((day) => {
                    const hours = siteConfig.hoursOfOperation![day];
                    if (!hours) return null;
                    return (
                      <div key={day} className="flex justify-between font-sans text-sm">
                        <span className="text-navy font-semibold w-28">{day}</span>
                        <span className="text-text">{formatHours(hours)}</span>
                      </div>
                    );
                  })
                : <p className="text-text font-sans text-sm text-center py-2">Available 24/7</p>
              }
            </div>
          </div>
        </SectionWrapper>
      </>

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

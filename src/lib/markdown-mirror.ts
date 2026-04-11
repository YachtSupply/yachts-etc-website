/**
 * Markdown mirror — generates llms.txt and llms-full.txt content.
 *
 * Pure functions: SiteData + BoatworkProfile in, markdown string out.
 * Used by route handlers at /llms.txt and /llms-full.txt to serve
 * machine-readable contractor information for AI agents.
 */

import type { SiteData } from './siteData';
import type { BoatworkProfile, BoatworkReview } from './boatwork';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lines(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

function section(title: string, body: string): string {
  return `## ${title}\n${body}`;
}

function formatReview(r: BoatworkReview): string {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
  const date = r.date ? ` (${r.date})` : '';
  const verified = r.isVerified ? ' [Verified]' : '';
  return `- **${r.author}** ${stars}${date}${verified}\n  ${r.text}`;
}

// ---------------------------------------------------------------------------
// llms.txt — standard summary
// ---------------------------------------------------------------------------

export function generateLlmsTxt(
  data: SiteData,
  profile: BoatworkProfile | null,
): string {
  const slug = data.boatwork.profileSlug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${slug}.boatwork.co`;
  const parts: string[] = [];

  // Title
  parts.push(`# ${data.name}`);

  // Tagline
  if (data.tagline) {
    parts.push(`> ${data.tagline}`);
  }

  // About
  if (data.about) {
    parts.push(data.about);
  }

  // Services
  if (data.services.length > 0) {
    parts.push(section('Services', lines(data.services.map((s) => s.name))));
  }

  // Service Areas
  if (data.serviceArea.length > 0) {
    parts.push(section('Service Areas', lines(data.serviceArea)));
  }

  // Contact
  const contact: string[] = [];
  if (data.phone) contact.push(`Phone: ${data.phone}`);
  if (data.email) contact.push(`Email: ${data.email}`);
  if (data.address) contact.push(`Address: ${data.address}`);
  contact.push(`Website: ${siteUrl}`);
  contact.push(`Boatwork Profile: https://boatwork.co/pro/${slug}`);
  parts.push(section('Contact', lines(contact)));

  // Hours of Operation
  if (data.hoursOfOperation && Object.keys(data.hoursOfOperation).length > 0) {
    const hours = Object.entries(data.hoursOfOperation).map(
      ([day, time]) => `${day}: ${time}`,
    );
    parts.push(section('Hours of Operation', lines(hours)));
  }

  // Reviews
  const reviews = data.boatwork.staticReviews;
  const rating = profile?.rating;
  const reviewCount = profile?.reviewCount ?? reviews.length;
  if (reviews.length > 0) {
    const ratingLine =
      rating != null
        ? `Average Rating: ${rating.toFixed(1)} (${reviewCount} reviews)\n\n`
        : '';
    const reviewLines = reviews.slice(0, 10).map(formatReview).join('\n');
    parts.push(section('Reviews', ratingLine + reviewLines));
  }

  // Certifications & Credentials
  const badges = (profile?.badges ?? data.badges ?? []).filter(
    (b) => b.name,
  );
  if (badges.length > 0) {
    parts.push(
      section(
        'Certifications & Credentials',
        lines(badges.map((b) => b.name!)),
      ),
    );
  }

  // About Boatwork
  parts.push(
    section(
      'About Boatwork',
      'Boatwork is a marine services marketplace. Learn more at https://boatwork.co\nFor AI agent access: https://boatwork.co/llms.txt',
    ),
  );

  return parts.join('\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// llms-full.txt — extended version
// ---------------------------------------------------------------------------

export function generateLlmsFullTxt(
  data: SiteData,
  profile: BoatworkProfile | null,
): string {
  const slug = data.boatwork.profileSlug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${slug}.boatwork.co`;
  const parts: string[] = [];

  // Title
  parts.push(`# ${data.name}`);

  // Tagline
  if (data.tagline) {
    parts.push(`> ${data.tagline}`);
  }

  // About
  if (data.about) {
    parts.push(data.about);
  }

  // Year established
  if (data.yearEstablished) {
    parts.push(`Established in ${data.yearEstablished}.`);
  }

  // Services — with full descriptions
  if (data.services.length > 0) {
    const serviceBlocks = data.services.map((s) => {
      const header = `### ${s.name}`;
      const descLine = s.description || '';
      const extras: string[] = [];
      if (s.priceRange) extras.push(`Price range: ${s.priceRange}`);
      if (s.typicalDuration) extras.push(`Typical duration: ${s.typicalDuration}`);
      if (s.benefits && s.benefits.length > 0) {
        extras.push(`Benefits: ${s.benefits.join(', ')}`);
      }
      return [header, descLine, ...extras.map((e) => `- ${e}`)].filter(Boolean).join('\n');
    });
    parts.push(`## Services\n\n${serviceBlocks.join('\n\n')}`);
  }

  // Specialties with FAQs
  if (data.specialties.length > 0) {
    const withFaqs = data.specialties.filter((sp) => sp.faqs.length > 0);
    if (withFaqs.length > 0) {
      const faqBlocks = withFaqs.map((sp) => {
        const qas = sp.faqs
          .map((f) => `**Q: ${f.question}**\nA: ${f.answer}`)
          .join('\n\n');
        return `### ${sp.name}\n\n${qas}`;
      });
      parts.push(`## Frequently Asked Questions\n\n${faqBlocks.join('\n\n')}`);
    }
  }

  // Service Areas
  if (data.serviceArea.length > 0) {
    let body = lines(data.serviceArea);
    if (data.serviceAreaDescription) {
      body += `\n\n${data.serviceAreaDescription}`;
    }
    parts.push(section('Service Areas', body));
  }

  // Contact
  const contact: string[] = [];
  if (data.phone) contact.push(`Phone: ${data.phone}`);
  if (data.email) contact.push(`Email: ${data.email}`);
  if (data.address) contact.push(`Address: ${data.address}`);
  contact.push(`Website: ${siteUrl}`);
  contact.push(`Boatwork Profile: https://boatwork.co/pro/${slug}`);
  if (data.averageResponseTime) {
    contact.push(`Average Response Time: ${data.averageResponseTime}`);
  }
  parts.push(section('Contact', lines(contact)));

  // Social Media
  const socials: string[] = [];
  if (data.social.facebook) socials.push(`Facebook: ${data.social.facebook}`);
  if (data.social.instagram) socials.push(`Instagram: ${data.social.instagram}`);
  if (data.social.linkedin) socials.push(`LinkedIn: ${data.social.linkedin}`);
  if (data.social.youtube) socials.push(`YouTube: ${data.social.youtube}`);
  if (socials.length > 0) {
    parts.push(section('Social Media', lines(socials)));
  }

  // Hours of Operation
  if (data.hoursOfOperation && Object.keys(data.hoursOfOperation).length > 0) {
    const hours = Object.entries(data.hoursOfOperation).map(
      ([day, time]) => `${day}: ${time}`,
    );
    parts.push(section('Hours of Operation', lines(hours)));
  }

  // Reviews — ALL reviews from profile
  const allReviews = profile?.reviews ?? data.boatwork.staticReviews;
  const rating = profile?.rating;
  const reviewCount = profile?.reviewCount ?? allReviews.length;
  if (allReviews.length > 0) {
    const ratingLine =
      rating != null
        ? `Average Rating: ${rating.toFixed(1)} (${reviewCount} reviews)\n\n`
        : '';
    const reviewLines = allReviews.map(formatReview).join('\n');
    parts.push(section('Reviews', ratingLine + reviewLines));
  }

  // Portfolio
  const portfolio = data.portfolio.filter((p) => p.caption);
  if (portfolio.length > 0) {
    parts.push(
      section('Portfolio', lines(portfolio.map((p) => p.caption))),
    );
  }

  // Certifications & Credentials
  const badges = (profile?.badges ?? data.badges ?? []).filter(
    (b) => b.name,
  );
  if (badges.length > 0) {
    parts.push(
      section(
        'Certifications & Credentials',
        lines(badges.map((b) => b.name!)),
      ),
    );
  }

  // Common Projects
  if (data.commonProjects.length > 0) {
    parts.push(section('Common Projects', lines(data.commonProjects)));
  }

  // JSON-LD structured data → readable markdown
  if (data.apiSeo?.jsonLd && Object.keys(data.apiSeo.jsonLd).length > 0) {
    const ld = data.apiSeo.jsonLd;
    const structuredItems: string[] = [];
    if (ld['@type']) structuredItems.push(`Type: ${ld['@type']}`);
    if (ld.areaServed && Array.isArray(ld.areaServed)) {
      structuredItems.push(
        `Areas Served: ${(ld.areaServed as Array<Record<string, unknown>>).map((a) => a.name ?? a).join(', ')}`,
      );
    }
    if (ld.hasOfferCatalog) {
      const catalog = ld.hasOfferCatalog as Record<string, unknown>;
      if (Array.isArray(catalog.itemListElement)) {
        structuredItems.push(
          `Services Offered: ${(catalog.itemListElement as Array<Record<string, unknown>>).map((i) => i.name ?? i.itemOffered ?? i).join(', ')}`,
        );
      }
    }
    if (structuredItems.length > 0) {
      parts.push(section('Structured Data', lines(structuredItems)));
    }
  }

  // About Boatwork
  parts.push(
    section(
      'About Boatwork',
      'Boatwork is a marine services marketplace. Learn more at https://boatwork.co\nFor AI agent access: https://boatwork.co/llms.txt',
    ),
  );

  return parts.join('\n\n') + '\n';
}

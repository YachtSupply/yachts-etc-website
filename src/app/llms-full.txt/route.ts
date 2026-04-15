import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/siteData';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getSiteData();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

  const sections: string[] = [];

  // ── Header ──
  sections.push(`# ${data.name}`);
  sections.push(`> ${data.description}`);

  const intro = [
    `${data.name} is a marine services business located in ${data.city}, ${data.state}.`,
    data.tagline,
    data.yearEstablished ? `Serving the area since ${data.yearEstablished}.` : '',
    `Verified on Boatwork: ${data.boatwork.profileUrl}`,
    `Website: ${siteUrl}`,
  ]
    .filter(Boolean)
    .join(' ');
  sections.push(intro);

  // ── About ──
  if (data.about) {
    sections.push(`## About\n\n${data.about}`);
  }

  // ── Services ──
  if (data.services.length > 0) {
    const serviceLines = data.services.map((s) => {
      const parts = [`### ${s.name}\n\n${s.description}`];

      if (s.priceRange) parts.push(`**Price range:** ${s.priceRange}`);
      if (s.typicalDuration) parts.push(`**Typical duration:** ${s.typicalDuration}`);

      if (s.benefits && s.benefits.length > 0) {
        parts.push(`**Benefits:**\n${s.benefits.map((b) => `- ${b}`).join('\n')}`);
      }

      if (s.keywords && s.keywords.length > 0) {
        parts.push(`**Related:** ${s.keywords.join(', ')}`);
      }

      return parts.join('\n\n');
    });
    sections.push(`## Services\n\n${serviceLines.join('\n\n---\n\n')}`);
  }

  // ── Common Projects ──
  if (data.commonProjects && data.commonProjects.length > 0) {
    sections.push(
      `## Common Projects\n\n${data.commonProjects.map((p) => `- ${p}`).join('\n')}`
    );
  }

  // ── Service Area ──
  if (data.serviceArea.length > 0) {
    sections.push(
      `## Service Area\n\n${data.serviceAreaDescription}\n\n**Locations served:** ${data.serviceArea.join(', ')}`
    );
  }

  // ── Reviews ──
  const reviews = data.boatwork.staticReviews;
  if (reviews.length > 0 || data.reviewSynopsis) {
    const reviewParts: string[] = [];

    if (data.reviewSynopsis) {
      reviewParts.push(
        `**Overall rating:** ${data.reviewSynopsis.aggregateRating}/5 based on ${data.reviewSynopsis.totalReviewCount} reviews\n\n${data.reviewSynopsis.summary}`
      );
      if (data.reviewSynopsis.keywords.length > 0) {
        reviewParts.push(`**Highlights:** ${data.reviewSynopsis.keywords.join(', ')}`);
      }
    }

    if (reviews.length > 0) {
      const reviewLines = reviews.map((r) => {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        let line = `- ${stars} **${r.author}**: "${r.text}"`;
        if (r.isVerified) line += ' *(Verified)*';
        if (r.response) line += `\n  - **Response:** "${r.response}"`;
        return line;
      });
      reviewParts.push(reviewLines.join('\n'));
    }

    sections.push(`## Reviews\n\n${reviewParts.join('\n\n')}`);
  }

  // ── FAQ ──
  const allFaqs = data.specialties.flatMap((sp) =>
    sp.faqs.map((faq) => ({ ...faq, specialty: sp.name }))
  );
  if (allFaqs.length > 0) {
    const faqLines = allFaqs.map(
      (f) => `**Q: ${f.question}**\nA: ${f.answer}`
    );
    sections.push(`## Frequently Asked Questions\n\n${faqLines.join('\n\n')}`);
  }

  // ── Hours ──
  if (data.hoursOfOperation) {
    const hourLines = Object.entries(data.hoursOfOperation)
      .map(([day, h]) => `- ${day}: ${h}`)
      .join('\n');
    sections.push(`## Business Hours\n\n${hourLines}`);
  }

  // ── Contact ──
  const contactParts = [
    `- **Phone:** ${data.phone}`,
    `- **Email:** ${data.email}`,
    `- **Address:** ${data.address}`,
    `- **Location:** ${data.city}, ${data.state}`,
  ];

  if (data.social.facebook) contactParts.push(`- **Facebook:** ${data.social.facebook}`);
  if (data.social.instagram) contactParts.push(`- **Instagram:** ${data.social.instagram}`);
  if (data.social.linkedin) contactParts.push(`- **LinkedIn:** ${data.social.linkedin}`);
  if (data.social.youtube) contactParts.push(`- **YouTube:** ${data.social.youtube}`);
  if (data.boatwork.profileUrl) contactParts.push(`- **Boatwork:** ${data.boatwork.profileUrl}`);

  sections.push(`## Contact\n\n${contactParts.join('\n')}`);

  // ── News / Updates ──
  if (data.updates.length > 0) {
    const updateLines = data.updates.slice(0, 10).map((u) => {
      const date = new Date(u.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const title = u.title ? `**${u.title}** (${date})` : `Update (${date})`;
      const content =
        u.content.length > 300
          ? u.content.slice(0, 300) + '...'
          : u.content;
      const link = u.isLongForm && u.slug ? `\n  Read more: ${siteUrl}/news/${u.slug}` : '';
      return `- ${title}\n  ${content}${link}`;
    });
    sections.push(`## Recent Updates\n\n${updateLines.join('\n\n')}`);
  }

  const markdown = sections.join('\n\n');

  return new NextResponse(markdown.trim() + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/siteData';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getSiteData();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

  const serviceList = data.services
    .map((s) => `- [${s.name}](${siteUrl}/services): ${s.description}`)
    .join('\n');

  const areaList = data.serviceArea.join(', ');

  const pages = [
    `- [Home](${siteUrl}): Main page with overview, services, reviews, portfolio, and contact information`,
    `- [About](${siteUrl}/about): Background on ${data.name}, experience, and credentials`,
    `- [Services](${siteUrl}/services): Full list of marine services offered with details and FAQ`,
    data.portfolio.length > 0 || data.videos.length > 0
      ? `- [Portfolio](${siteUrl}/portfolio): Photo and video gallery of recent projects`
      : null,
    data.updates.length > 0
      ? `- [News & Updates](${siteUrl}/news): Latest news and updates from the business`
      : null,
    `- [Contact](${siteUrl}/contact): Contact form, phone, email, address, hours, and map`,
    `- [Privacy Policy](${siteUrl}/privacy): How personal information is collected and used`,
  ]
    .filter(Boolean)
    .join('\n');

  const hours = data.hoursOfOperation
    ? Object.entries(data.hoursOfOperation)
        .map(([day, h]) => `${day}: ${h}`)
        .join(', ')
    : 'Available 24/7';

  const markdown = `# ${data.name}

> ${data.description}

${data.name} is a marine services business located in ${data.city}, ${data.state}. ${data.tagline}.${data.yearEstablished ? ` Serving the area since ${data.yearEstablished}.` : ''} Verified on [Boatwork](${data.boatwork.profileUrl}).

## Pages

${pages}

## Services

${serviceList}

## Service Area

Serving ${areaList}. ${data.serviceAreaDescription}

## Contact

- Phone: ${data.phone}
- Email: ${data.email}
- Address: ${data.address}
- Hours: ${hours}

## Optional

- [Full LLM Context](${siteUrl}/llms-full.txt): Complete business information expanded in a single document
- [Sitemap](${siteUrl}/sitemap.xml): XML sitemap for all pages
`;

  return new NextResponse(markdown.trim() + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

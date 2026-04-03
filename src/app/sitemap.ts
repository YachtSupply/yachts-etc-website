import { MetadataRoute } from 'next';
import { getProfileSlug } from '@/lib/config';
import { getSiteData } from '@/lib/siteData';

const BOATWORK_API = 'https://boatwork.co/api/v1';

async function fetchApiSitemap(): Promise<MetadataRoute.Sitemap | null> {
  try {
    const slug = getProfileSlug();
    const res = await fetch(`${BOATWORK_API}/public/contractors/${slug}/sitemap.xml`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || !text.includes('<urlset')) return null;

    // Parse basic <url><loc>...<loc> entries from the XML
    const urls: MetadataRoute.Sitemap = [];
    const urlRegex = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?(?:\s*<changefreq>([^<]+)<\/changefreq>)?(?:\s*<priority>([^<]+)<\/priority>)?/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      urls.push({
        url: match[1],
        ...(match[2] ? { lastModified: match[2] } : {}),
        ...(match[3] ? { changeFrequency: match[3] as MetadataRoute.Sitemap[number]['changeFrequency'] } : {}),
        ...(match[4] ? { priority: parseFloat(match[4]) } : {}),
      });
    }
    return urls.length > 0 ? urls : null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiSitemap = await fetchApiSitemap();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const siteConfig = await getSiteData();
  const longFormUpdates = siteConfig.updates
    .filter((u) => u.isLongForm && u.slug)
    .map((u) => ({
      url: `${siteUrl}/news/${u.slug}`,
      lastModified: new Date(u.publishedAt),
      changeFrequency: 'monthly' as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: 0.6,
    }));

  if (apiSitemap) return [...apiSitemap, ...longFormUpdates];

  // Fallback to default
  const now = new Date().toISOString();

  return [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/portfolio`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    ...longFormUpdates,
  ];
}

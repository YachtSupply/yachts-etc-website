import { MetadataRoute } from 'next';
import { getProfileSlug } from '@/lib/config';

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
  if (apiSitemap) return apiSitemap;

  // Fallback to default
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const now = new Date().toISOString();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/portfolio`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
  ];
}

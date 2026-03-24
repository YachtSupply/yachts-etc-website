import { MetadataRoute } from 'next';
import { getProfileSlug } from '@/lib/config';

const BOATWORK_API = 'https://boatwork.co/api/v1';

async function fetchApiRobots(): Promise<MetadataRoute.Robots | null> {
  try {
    const slug = getProfileSlug();
    const res = await fetch(`${BOATWORK_API}/public/contractors/${slug}/robots.txt`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 10) return null;

    // Parse the robots.txt text into the MetadataRoute.Robots shape
    const rules: MetadataRoute.Robots['rules'] = [];
    let sitemap: string | undefined;
    let currentAgent = '*';

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim();
      if (!value) continue;
      const lower = key.toLowerCase().trim();
      if (lower === 'user-agent') {
        currentAgent = value;
      } else if (lower === 'allow') {
        rules.push({ userAgent: currentAgent, allow: value });
      } else if (lower === 'disallow') {
        rules.push({ userAgent: currentAgent, disallow: value });
      } else if (lower === 'sitemap') {
        sitemap = value;
      }
    }

    if (rules.length === 0) return null;
    return { rules, ...(sitemap ? { sitemap } : {}) };
  } catch {
    return null;
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const apiRobots = await fetchApiRobots();
  if (apiRobots) return apiRobots;

  // Fallback to default
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'bingbot', allow: '/' },
      { userAgent: 'Applebot', allow: '/' },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'YouBot', allow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

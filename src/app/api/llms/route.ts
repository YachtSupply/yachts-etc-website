import { getSiteData } from '@/lib/siteData';
import { fetchBoatworkProfile } from '@/lib/boatwork';
import { getProfileSlug, getProfileId } from '@/lib/config';
import { generateLlmsTxt } from '@/lib/markdown-mirror';

export async function GET() {
  const [data, profile] = await Promise.all([
    getSiteData(),
    fetchBoatworkProfile(getProfileSlug(), getProfileId() || undefined),
  ]);

  const markdown = generateLlmsTxt(data, profile);

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GiAnchor } from 'react-icons/gi';
import { getSiteData } from '@/lib/siteData';
import { SectionWrapper } from '@/components/shared';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function linkifyContent(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[1];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-navy underline decoration-gold/40 hover:decoration-gold transition-colors break-all"
      >
        {url}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const siteConfig = await getSiteData();
  const update = siteConfig.updates.find((u) => u.slug === slug && u.isLongForm);
  if (!update) return {};

  const title = update.title ?? `Update from ${siteConfig.name}`;
  const description = update.content.slice(0, 160);

  return {
    title,
    description,
  };
}

export default async function NewsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const siteConfig = await getSiteData();
  const update = siteConfig.updates.find((u) => u.slug === slug && u.isLongForm);

  if (!update) {
    redirect('/news');
  }

  const hasLinkPreview = update.linkUrl && update.linkTitle;
  const hasImage = update.imageUrl;

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-24 px-4 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold/60" />
            <GiAnchor className="text-gold" size={18} />
            <div className="h-px w-8 bg-gold/60" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 max-w-3xl mx-auto leading-tight">
            {update.title ?? 'Update'}
          </h1>
          <p className="text-gold-light font-sans text-base">
            {formatDate(update.publishedAt)}
          </p>
        </div>
      </section>

      <div className="gold-rule-full" />

      <SectionWrapper variant="cream">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/news"
            className="inline-flex items-center gap-1 text-text-light font-sans text-sm hover:text-navy transition-colors mb-8"
          >
            ← Back to News
          </Link>

          <article className="bg-white border border-cream-dark p-8 flex flex-col gap-6">
            {/* Hero image */}
            {hasImage && (
              <div className="rounded-lg overflow-hidden -mx-0">
                <img
                  src={update.imageUrl!}
                  alt={update.imageAlt ?? update.title ?? ''}
                  className="w-full max-h-[28rem] object-cover rounded-lg"
                />
              </div>
            )}

            {/* Full content */}
            <div className="text-text font-sans leading-relaxed whitespace-pre-line text-base">
              {linkifyContent(update.content)}
            </div>

            {/* Link preview card */}
            {hasLinkPreview && (
              <a
                href={update.linkUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-cream-dark rounded-lg overflow-hidden hover:border-gold/40 transition-colors"
              >
                {update.linkImage && (
                  <div className="relative w-full h-52 bg-cream">
                    <img
                      src={update.linkImage}
                      alt={update.linkTitle ?? ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="font-serif font-bold text-navy mb-1 line-clamp-2">{update.linkTitle}</p>
                  {update.linkDescription && (
                    <p className="text-text-light font-sans text-sm leading-relaxed line-clamp-3 mb-2">
                      {update.linkDescription}
                    </p>
                  )}
                  {update.linkDomain && (
                    <p className="text-text-light/60 font-sans text-xs">{update.linkDomain}</p>
                  )}
                </div>
              </a>
            )}
          </article>

          {/* Back link bottom */}
          <div className="mt-8">
            <Link
              href="/news"
              className="inline-flex items-center gap-1 text-text-light font-sans text-sm hover:text-navy transition-colors"
            >
              ← Back to News
            </Link>
          </div>
        </div>
      </SectionWrapper>

      <div className="gold-rule-full" />
    </>
  );
}

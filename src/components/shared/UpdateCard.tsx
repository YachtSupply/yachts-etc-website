import type { BoatworkUpdate } from '@/lib/boatwork';
import { FiMapPin } from 'react-icons/fi';

/**
 * Format a URL-like string found in plain text into a clickable link.
 * Returns React nodes with URLs wrapped in <a> tags.
 */
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

/**
 * Format a date as a relative timestamp:
 * - Under 1 hour: "Xm ago"
 * - Under 24 hours: "Xh ago"
 * - Under 7 days: "Xd ago"
 * - Otherwise: "Jan 15" or "Jan 15, 2024" (if different year)
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

interface UpdateCardProps {
  update: BoatworkUpdate;
  businessName: string;
  logoUrl?: string;
}

export function UpdateCard({ update, businessName, logoUrl }: UpdateCardProps) {
  const hasLinkPreview = update.linkUrl && update.linkTitle;
  const hasImage = update.imageUrl && !hasLinkPreview;

  return (
    <article className="bg-white border border-cream-dark p-6 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg">
      {/* Header: logo/name + timestamp + pinned badge */}
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName}
            className="w-10 h-10 rounded-full object-cover border border-cream-dark flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gold text-navy flex items-center justify-center font-serif font-bold text-sm flex-shrink-0">
            {businessName.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-serif font-semibold text-navy text-sm truncate">{businessName}</p>
          <p className="text-text-light text-xs font-sans">{formatRelativeTime(update.publishedAt)}</p>
        </div>
        {update.isPinned && (
          <span className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full flex-shrink-0">
            <FiMapPin size={10} />
            Pinned
          </span>
        )}
      </div>

      {/* Text content with auto-linked URLs */}
      <div className="text-text font-sans text-sm leading-relaxed whitespace-pre-line">
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
            <div className="relative w-full h-40 bg-cream">
              <img
                src={update.linkImage}
                alt={update.linkTitle ?? ''}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <p className="font-serif font-bold text-navy text-sm mb-1 line-clamp-1">{update.linkTitle}</p>
            {update.linkDescription && (
              <p className="text-text-light font-sans text-xs leading-relaxed line-clamp-2 mb-2">
                {update.linkDescription}
              </p>
            )}
            {update.linkDomain && (
              <p className="text-text-light/60 font-sans text-xs">{update.linkDomain}</p>
            )}
          </div>
        </a>
      )}

      {/* Standalone image (only when no link preview) */}
      {hasImage && (
        <div className="rounded-lg overflow-hidden max-h-80">
          <img
            src={update.imageUrl!}
            alt={update.imageAlt ?? ''}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      )}
    </article>
  );
}

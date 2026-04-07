interface ReviewSynopsisProps {
  businessName: string;
  aggregateRating: number;
  totalReviewCount: number;
  summary: string;
  keywords: string[];
}

export function ReviewSynopsis({
  businessName,
  aggregateRating,
  totalReviewCount,
  summary,
  keywords,
}: ReviewSynopsisProps) {
  const fullStars = Math.round(aggregateRating);

  return (
    <div className="bg-white border border-cream-dark p-8 mb-8">
      <h3 className="font-serif text-lg font-semibold text-navy mb-3">
        What People are Saying about {businessName}
      </h3>
      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`text-lg ${i < fullStars ? 'text-gold' : 'text-gray-300'}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="font-sans text-sm text-navy font-semibold">
          {aggregateRating.toFixed(1)}
        </span>
        <span className="font-sans text-xs text-text-light">
          ({totalReviewCount} {totalReviewCount === 1 ? 'review' : 'reviews'})
        </span>
      </div>
      <p className="text-text font-sans text-sm leading-relaxed mb-6 italic">
        {summary}
      </p>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.slice(0, 8).map((keyword) => (
            <span
              key={keyword}
              className="bg-cream-dark text-navy text-xs font-sans px-3 py-1 rounded-full"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

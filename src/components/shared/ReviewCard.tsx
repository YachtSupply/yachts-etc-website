import { FiCheckCircle } from 'react-icons/fi';

interface ReviewCardProps {
  author: string;
  rating: number;
  text: string;
  date: string;
  isVerified?: boolean;
  response?: string | null;
  responseDate?: string | null;
}

export function ReviewCard({ author, rating, text, date, isVerified, response, responseDate }: ReviewCardProps) {
  const formatted = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const hasResponse = response && response.trim().length > 0;
  return (
    <div className={`bg-white border border-cream-dark p-8 flex flex-col ${hasResponse ? 'h-auto' : 'h-64'}`}>
      <div className="flex mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <span key={i} className="text-gold text-lg">★</span>
        ))}
      </div>
      <p className="text-text font-sans text-sm leading-relaxed mb-6 flex-1 overflow-hidden line-clamp-5 italic">
        &ldquo;{text}&rdquo;
      </p>
      <div className="border-t border-cream-dark pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-serif font-semibold text-navy text-sm">{author}</p>
          {isVerified && (
            <FiCheckCircle className="text-gold flex-shrink-0" size={14} title="Verified review" />
          )}
        </div>
        <p className="text-text-light text-xs font-sans">{formatted}</p>
      </div>
      {hasResponse && (
        <div className="mt-4 pt-4 border-t border-cream-dark bg-cream/50 -mx-8 -mb-8 px-8 pb-8">
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-navy mb-2">Owner Response</p>
          <p className="text-text-light font-sans text-sm leading-relaxed line-clamp-3">{response}</p>
          {responseDate && (
            <p className="text-text-light text-xs font-sans mt-2">
              {new Date(responseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import type { ParkedBlock } from '@/lib/aiContent';

// SEO-DUP-7b landing: shown when a mini-site's subscription has ended.
// Keeps the DNS/domain pointing at Vercel (so inbound traffic still
// resolves) but flips the content to a "no longer available" message
// plus similar-pro cross-sells linking back to boatwork.co. layout.tsx
// flips metadata to robots:noindex when this renders — we don't want
// Google indexing the parked state.
export function ParkedLanding({
  parked,
  businessName,
}: {
  parked: ParkedBlock;
  businessName: string;
}) {
  const { similarContractors } = parked;
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl md:text-4xl font-heading font-semibold text-navy mb-4">
          {businessName} is no longer available on Boatwork.
        </h1>
        <p className="text-lg text-slate-600 mb-10">
          Looking for similar marine services? Here are a few verified pros you might check out.
        </p>

        {similarContractors.length > 0 ? (
          <ul className="grid gap-3 mb-10">
            {similarContractors.map((c) => (
              <li key={c.slug}>
                <Link
                  href={c.profileUrl}
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-gold hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-navy truncate">
                        {c.name}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {c.primarySpecialty ?? 'Marine services'}
                        {c.city ? ` · ${c.city}${c.state ? `, ${c.state}` : ''}` : ''}
                      </div>
                    </div>
                    {typeof c.googleRating === 'number' && c.googleReviewCount ? (
                      <div className="flex-shrink-0 text-sm text-slate-600">
                        ★ {c.googleRating.toFixed(1)}
                        <span className="text-slate-400"> · {c.googleReviewCount}</span>
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 mb-10">
            Browse verified marine pros on Boatwork to find someone local.
          </p>
        )}

        <Link
          href="https://boatwork.co/pro"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-white font-semibold transition hover:bg-navy-dark"
        >
          Browse all pros on Boatwork →
        </Link>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { BoatworkUpdate } from '@/lib/boatwork';
import { UpdateCard } from './UpdateCard';

interface UpdatesFeedProps {
  updates: BoatworkUpdate[];
  businessName: string;
  logoUrl?: string;
}

export function UpdatesFeed({ updates, businessName, logoUrl }: UpdatesFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? updates : updates.slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visible.map((update) => (
          <UpdateCard
            key={update.id}
            update={update}
            businessName={businessName}
            logoUrl={logoUrl}
          />
        ))}
      </div>
      {!showAll && updates.length > 5 && (
        <div className="text-center mt-10">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-2 text-navy font-sans font-semibold text-sm uppercase tracking-widest hover:text-gold transition-colors border-b border-gold/40 pb-1"
          >
            Show More Updates
          </button>
        </div>
      )}
    </>
  );
}

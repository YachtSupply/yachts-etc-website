'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/site.config';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  logoUrl?: string;
  name?: string;
}

export function Logo({ size = 'md', inverted = false, logoUrl, name }: LogoProps) {
  // Sizes increased by 20%: sm 36→43, md 44→53, lg 56→67
  const imgSize = { sm: 43, md: 53, lg: 67 }[size];
  const textSize = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size];
  const src = logoUrl ?? '';
  const displayName = name || siteConfig.name;
  const hasLogo = !!src;

  const [shape, setShape] = useState<'circle' | 'rounded' | 'loading'>('loading');
  const [error, setError] = useState(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setShape(ratio >= 0.75 && ratio <= 1.33 ? 'circle' : 'rounded');
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const isCircle = shape === 'circle' || shape === 'loading';

  return (
    <Link href="/" className="flex items-center gap-3 group">
      {hasLogo && !error ? (
        <Image
          src={src}
          alt={displayName}
          width={imgSize}
          height={imgSize}
          className={`flex-shrink-0 ${isCircle ? 'rounded-full object-cover' : 'rounded-[8px] object-contain'}`}
          unoptimized
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <span
          className={`flex items-center justify-center rounded-full flex-shrink-0 font-serif font-bold ${
            inverted ? 'bg-gold text-navy' : 'bg-navy text-white'
          }`}
          style={{ width: imgSize, height: imgSize, fontSize: imgSize * 0.4 }}
        >
          {displayName.charAt(0)}
        </span>
      )}
      <span
        className={`font-serif font-bold tracking-tight ${textSize} ${
          inverted ? 'text-white' : 'text-navy'
        } group-hover:text-gold transition-colors`}
      >
        {displayName}
      </span>
    </Link>
  );
}

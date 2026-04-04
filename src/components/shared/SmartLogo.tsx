'use client';
import { useState, useCallback } from 'react';
import Image from 'next/image';

interface SmartLogoProps {
  src: string;
  alt: string;
  size: number;
  fallbackInitial: string;
  className?: string;
  fallbackClassName?: string;
}

export function SmartLogo({ src, alt, size, fallbackInitial, className = '', fallbackClassName = '' }: SmartLogoProps) {
  const [shape, setShape] = useState<'circle' | 'rounded' | 'loading'>('loading');
  const [failed, setFailed] = useState(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setShape(ratio >= 0.75 && ratio <= 1.33 ? 'circle' : 'rounded');
  }, []);

  if (!src || failed) {
    return (
      <span
        className={`flex items-center justify-center rounded-full font-serif font-bold ${fallbackClassName}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitial}
      </span>
    );
  }

  const isCircle = shape === 'circle' || shape === 'loading';

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`mx-auto ${isCircle ? 'rounded-full object-cover' : 'rounded-[12px] object-contain'} ${className}`}
      style={!isCircle ? { width: size, height: size } : undefined}
      unoptimized
      onLoad={handleLoad}
      onError={() => setFailed(true)}
    />
  );
}

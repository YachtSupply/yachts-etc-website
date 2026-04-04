'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** className applied to the wrapping container div. On error the container is removed (null), so the grid reflows naturally. */
  containerClassName?: string;
}

/**
 * Wraps Next.js Image in a container div.
 * On load error the container is unmounted (returns null) so no empty space remains.
 * Use containerClassName to replicate whatever positioning/sizing the parent div had.
 */
export function SafeImage({ containerClassName, alt, ...imageProps }: SafeImageProps) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className={containerClassName}>
      <Image alt={alt} {...imageProps} onError={() => setHidden(true)} />
    </div>
  );
}

'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** className applied to the wrapping container div. On error the container is removed (null), so the grid reflows naturally. */
  containerClassName?: string;
  /** If true, shows a placeholder on error instead of hiding completely. */
  showPlaceholder?: boolean;
  /** Custom placeholder content (defaults to generic icon). */
  placeholderContent?: React.ReactNode;
}

/**
 * Wraps Next.js Image with graceful error handling.
 * On load error, either hides completely (default) or shows a placeholder.
 * Use containerClassName to replicate whatever positioning/sizing the parent div had.
 */
export function SafeImage({
  containerClassName,
  alt,
  showPlaceholder = false,
  placeholderContent,
  ...imageProps
}: SafeImageProps) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
    if (!showPlaceholder) {
      setHidden(true);
    }
  };

  if (hidden) return null;

  if (error && showPlaceholder) {
    return (
      <div className={containerClassName}>
        {placeholderContent || (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <Image alt={alt} {...imageProps} onError={handleError} />
    </div>
  );
}

interface SafeHtmlImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** If true, shows a placeholder on error instead of hiding completely. */
  showPlaceholder?: boolean;
  /** Custom placeholder content. */
  placeholderContent?: React.ReactNode;
}

/**
 * Graceful error handling for regular HTML <img> tags.
 * On load error, either hides the image or shows a placeholder.
 */
export function SafeHtmlImage({
  showPlaceholder = false,
  placeholderContent,
  className,
  alt = '',
  ...imgProps
}: SafeHtmlImageProps) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
    if (!showPlaceholder) {
      setHidden(true);
    }
  };

  if (hidden) return null;

  if (error && showPlaceholder) {
    return placeholderContent || (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-400`}>
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return <img alt={alt} className={className} {...imgProps} onError={handleError} />;
}

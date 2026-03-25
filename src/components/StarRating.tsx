import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StarRatingProps {
  rating: number; // 0-5
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({ rating, onRate, readonly = false, size = 'md', className }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }[size];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (readonly) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    // Eğer imleç yarısından daha solundaysa .5, aksi halde 1 ekle
    const isHalf = percent < 0.5;
    setHoverRating(index + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (readonly || !onRate) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    const isHalf = percent < 0.5;
    onRate(index + (isHalf ? 0.5 : 1));
  };

  return (
    <div 
      className={twMerge('flex gap-1', className)}
      onMouseLeave={handleMouseLeave}
    >
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        
        let isFull = displayRating >= starValue;
        let isHalf = !isFull && displayRating >= starValue - 0.5;

        return (
          <div
            key={i}
            className={clsx(
              'relative cursor-pointer select-none text-zinc-500 transition-colors',
              !readonly && 'hover:text-yellow-400'
            )}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onClick={(e) => handleClick(e, i)}
          >
            {isHalf ? (
              <div className="relative">
                {/* Empty Star Background */}
                <Star className={clsx(sizeClass, 'text-zinc-600')} />
                {/* Half Star Overlay */}
                <StarHalf className={clsx(sizeClass, 'absolute top-0 left-0 text-yellow-400 fill-yellow-400')} />
              </div>
            ) : (
              <Star
                className={clsx(
                  sizeClass,
                  isFull ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600 fill-transparent'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

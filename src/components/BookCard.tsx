import { Book } from '../types';
import { StarRating } from './StarRating';
import { Star } from 'lucide-react';

interface BookCardProps {
  book: Book;
  userRating?: number;
  onRate: (rating: number) => void;
}

export function BookCard({ book, userRating, onRate }: BookCardProps) {
  // Calculate average rating
  const avgRating = book.ratings.length
    ? book.ratings.reduce((a, b) => a + b, 0) / book.ratings.length
    : 0;

  return (
    <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-lg border border-zinc-800 flex flex-col hover:border-zinc-700 transition-colors">
      <div className="relative aspect-[2/3] w-full bg-zinc-800">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 backdrop-blur-sm">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          {avgRating.toFixed(1)}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-1">{book.title}</h3>
        <p className="text-zinc-400 text-sm mb-3">{book.author}</p>
        <p className="text-zinc-500 text-sm line-clamp-3 mb-4 flex-grow">
          {book.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              {userRating ? 'Senin Puanın' : 'Puan Ver'}
            </span>
            <div className="flex items-center justify-between">
              <StarRating
                rating={userRating || 0}
                onRate={onRate}
                size="md"
              />
              {userRating && (
                <span className="text-blue-400 font-bold">{userRating.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
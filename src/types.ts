export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  ratings: number[]; // List of user ratings
}

export interface UserRating {
  bookId: string;
  rating: number;
}

import React, { useState, useEffect, useRef } from "react";
import { 
  Star, Search, BookOpen, Loader2, TrendingUp, Info, 
  BookmarkPlus, BookmarkCheck, User, LogOut, X, 
  Lock, Mail, Library, Trash2, MessageSquare
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- INTERFACES ---
interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  thumbnail: string;
  averageRating: number;
  ratingsCount: number;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

// --- API FETCH FUNCTION ---
const fetchBooks = async (query: string): Promise<Book[]> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query || "subject:fiction"
      )}&maxResults=30&orderBy=relevance&langRestrict=tr`
    );
    const data = await res.json();

    if (!data.items) return [];

    // ÇİFT KİTAPLARI ENGELLEME SİSTEMİ (İsme Göre Filtreleme)
    const uniqueMap = new Map<string, Book>();

    data.items.forEach((item: any) => {
      const volumeInfo = item.volumeInfo;
      // Kitap adını küçük harfe çevirip anahtar yapıyoruz (Boşlukları kırpıyoruz)
      const uniqueKey = volumeInfo.title ? volumeInfo.title.toLowerCase().trim() : item.id;

      // Eğer bu isimde bir kitap daha önce eklenmediyse listeye al
      if (!uniqueMap.has(uniqueKey)) {
        const mockScore = 
          volumeInfo.averageRating || 
          ((volumeInfo.title?.length || 0) % 3) + 2 + (volumeInfo.pageCount ? (volumeInfo.pageCount % 10) / 10 : 0.5);
        
        const mockCount = volumeInfo.ratingsCount || Math.floor(Math.random() * 5000) + 100;

        uniqueMap.set(uniqueKey, {
          id: item.id,
          title: volumeInfo.title || "İsimsiz Kitap",
          authors: volumeInfo.authors || ["Bilinmeyen Yazar"],
          description: volumeInfo.description || "Bu kitap için açıklama bulunmuyor.",
          thumbnail:
            volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ||
            `https://placehold.co/128x192/1f2937/a1a1aa?text=Kapak+Yok`,
          averageRating: Number(Math.min(5, Math.max(1, mockScore)).toFixed(1)),
          ratingsCount: mockCount,
        });
      }
    });

    // Map'teki benzersiz kitapları diziye çevirip döndür
    return Array.from(uniqueMap.values()).slice(0, 20); // Ekranda en fazla 20 tane göster
  } catch (error) {
    console.error("Kitaplar çekilirken hata oluştu:", error);
    return [];
  }
};

// --- COMPONENTS ---

// 1. Interactive Star Rating Component (YILDIZ HATASI DÜZELTİLDİ)
interface StarRatingProps {
  value: number;
  onChange: (newRating: number) => void;
  size?: number;
  readOnly?: boolean;
}

const InteractiveStarRating: React.FC<StarRatingProps> = ({ value, onChange, size = 24, readOnly = false }) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div 
      className={cn("flex items-center", !readOnly && "cursor-pointer")}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFull = displayValue >= starIndex;
          const isHalf = displayValue + 0.5 === starIndex;

          return (
            <div 
              key={starIndex} 
              className="relative" 
              style={{ width: size, height: size }}
              // Hesaplama her bir yıldızın kendi genişliğine göre yapılıyor!
              onMouseMove={(e) => {
                if (readOnly) return;
                const { left, width } = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - left) / width;
                setHoverValue(starIndex - 1 + (percent < 0.5 ? 0.5 : 1));
              }}
              onClick={() => {
                if (readOnly || hoverValue === null) return;
                onChange(hoverValue);
              }}
            >
              <Star className="absolute top-0 left-0 text-zinc-600" size={size} strokeWidth={1.5} />
              {isFull && <Star className="absolute top-0 left-0 text-yellow-500 fill-yellow-500" size={size} />}
              {isHalf && (
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star className="text-yellow-500 fill-yellow-500" size={size} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <span className="ml-3 w-8 text-lg font-bold text-yellow-500">
          {displayValue > 0 ? displayValue.toFixed(1) : "-"}
        </span>
      )}
    </div>
  );
};

// 2. Book Card Component (YORUMLAR EKLENDİ)
const BookCard = ({
  book,
  userRating,
  userComment,
  onRateClick,
  onToggleWishlist,
  isInWishlist,
}: {
  book: Book;
  userRating: number;
  userComment?: string;
  onRateClick: (book: Book) => void;
  onToggleWishlist: (book: Book) => void;
  isInWishlist: boolean;
}) => {
  const blendedRating = userRating > 0
    ? ((book.averageRating * book.ratingsCount + userRating) / (book.ratingsCount + 1)).toFixed(1)
    : book.averageRating.toFixed(1);

  const totalVotes = userRating > 0 ? book.ratingsCount + 1 : book.ratingsCount;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg transition-transform hover:-translate-y-1 hover:shadow-yellow-500/10 flex flex-col h-full group relative">
      
      {/* Wishlist Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleWishlist(book); }}
        className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full hover:bg-black/80 transition-colors z-10"
        title="Okuma Listesine Ekle"
      >
        {isInWishlist ? <BookmarkCheck className="text-yellow-500" size={20} /> : <BookmarkPlus className="text-white" size={20} />}
      </button>

      <div className="relative h-64 overflow-hidden bg-zinc-800">
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent"></div>
        
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md">
          <Star className="text-yellow-500 fill-yellow-500" size={16} />
          <span className="text-white font-bold text-sm">{blendedRating}</span>
          <span className="text-zinc-400 text-xs ml-1">({totalVotes.toLocaleString('tr-TR')})</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-white line-clamp-1" title={book.title}>{book.title}</h3>
        <p className="text-zinc-400 text-sm mb-3 line-clamp-1">{book.authors.join(", ")}</p>
        <p className="text-zinc-500 text-xs line-clamp-3 mb-4 flex-grow">{book.description}</p>
        
        {/* YORUM GÖSTERİM ALANI */}
        {userComment && (
          <div className="mb-4 bg-zinc-800/50 p-3 rounded-lg border-l-2 border-yellow-500">
            <div className="flex gap-2 items-center mb-1">
              <MessageSquare size={14} className="text-yellow-500" />
              <span className="text-xs font-semibold text-zinc-300">Senin Yorumun</span>
            </div>
            <p className="text-sm text-zinc-400 italic line-clamp-2">"{userComment}"</p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-zinc-800">
          <button 
            onClick={() => onRateClick(book)} 
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Star className={userRating > 0 ? "text-yellow-500 fill-yellow-500" : "text-zinc-400"} size={16} />
            {userRating > 0 ? `Puanın: ${userRating}` : "Puan Ver / Yorum Yap"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Rate Modal Component (YORUM KUTUSU EKLENDİ)
const RateModal = ({ 
  book, 
  currentRating, 
  currentComment,
  onClose, 
  onSave,
  onRemove
}: { 
  book: Book; 
  currentRating: number; 
  currentComment: string;
  onClose: () => void; 
  onSave: (rating: number, comment: string) => void;
  onRemove?: () => void;
}) => {
  const [rating, setRating] = useState(currentRating || 0);
  const [comment, setComment] = useState(currentComment || "");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Star className="text-yellow-500 fill-yellow-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Kitabı Değerlendir</h2>
          <p className="text-zinc-400 mb-8 line-clamp-2">{book.title}</p>
          
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 mb-4 flex justify-center w-full">
            <InteractiveStarRating value={rating} onChange={setRating} size={36} />
          </div>

          {/* YORUM KUTUSU */}
          <div className="w-full mb-8">
            <label className="block text-sm font-medium text-zinc-400 mb-2 text-left">Yorumun (İsteğe Bağlı)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bu kitap hakkında ne düşünüyorsun?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none h-24"
            />
          </div>
          
          <div className="w-full space-y-3">
            <button 
              onClick={() => { onSave(rating, comment); onClose(); }}
              disabled={rating === 0}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Kaydet
            </button>
            {currentRating > 0 && onRemove && (
              <button 
                onClick={() => { onRemove(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-colors"
              >
                <Trash2 size={18} />
                Değerlendirmeyi Kaldır
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Auth Modal Component
const AuthModal = ({ onClose }: { onClose: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onClose();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("Bu e-posta adresi zaten kullanılıyor. Lütfen giriş yapmayı deneyin.");
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg("Şifre çok zayıf. Lütfen en az 6 karakterli bir şifre girin.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMsg("Geçersiz e-posta adresi girdiniz.");
      } else if (error.code === 'auth/invalid-credential') {
        setErrorMsg("E-posta veya şifre hatalı.");
      } else {
        setErrorMsg("İşlem başarısız. Bilgilerinizi kontrol edip tekrar deneyin.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        setErrorMsg("HATA: Mevcut site adresi Firebase'de izin verilen domainler listesinde yok!");
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg("Tarayıcınız pencereyi engelledi. Sağ üstten 'Yeni Sekmede Aç' butonuna tıklayarak açmayı deneyin.");
      } else {
        setErrorMsg("Google ile giriş yapılamadı.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10">
        <X size={24} />
      </button>
      
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? "bookDb'ye Giriş Yap" : "Hesap Oluştur"}</h2>
          <p className="text-zinc-400 text-sm">Dünyanın en büyük kitap topluluğuna katıl.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500" placeholder="Kullanıcı Adınız" />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500" placeholder="ornek@email.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold py-2.5 rounded-lg transition-colors mt-2">
            {isLogin ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        </form>

        <div className="my-6 flex items-center text-zinc-600">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="mx-4 text-sm">VEYA</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        {errorMsg && <p className="text-red-500 text-sm text-center mb-4">{errorMsg}</p>}

        <button onClick={handleGoogleLogin} type="button" className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google ile Devam Et
        </button>

        <div className="text-center text-sm text-zinc-400 mt-6">
          {isLogin ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-yellow-500 hover:text-yellow-400 font-semibold hover:underline">
            {isLogin ? "Kayıt Ol" : "Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};


// --- MAIN APP ---
export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("bestseller");
  const [inputValue, setInputValue] = useState("");
  
  // App States (YORUMLAR EKLENDİ)
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [userComments, setUserComments] = useState<Record<string, string>>({}); // YENİ: Yorum durumu
  const [wishlist, setWishlist] = useState<Book[]>([]);
  const [ratedBooks, setRatedBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'discover' | 'wishlist' | 'ratings'>('discover');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rateModalBook, setRateModalBook] = useState<Book | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Kullanıcı",
          email: firebaseUser.email || firebaseUser.uid,
          avatar: firebaseUser.photoURL || undefined
        });
      } else {
        setUser(null);
        // Load global data
        const savedRatings = localStorage.getItem("bookDb_ratings");
        const savedComments = localStorage.getItem("bookDb_comments"); // YENİ
        const savedWishlist = localStorage.getItem("bookDb_wishlist");
        const savedRatedBooks = localStorage.getItem("bookDb_ratedBooks");
        if (savedRatings) setUserRatings(JSON.parse(savedRatings));
        if (savedComments) setUserComments(JSON.parse(savedComments)); // YENİ
        if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
        if (savedRatedBooks) setRatedBooks(JSON.parse(savedRatedBooks));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const uRatings = localStorage.getItem(`bookDb_ratings_${user.email}`);
      const uComments = localStorage.getItem(`bookDb_comments_${user.email}`); // YENİ
      const uWishlist = localStorage.getItem(`bookDb_wishlist_${user.email}`);
      const uRatedBooks = localStorage.getItem(`bookDb_ratedBooks_${user.email}`);
      
      setUserRatings(uRatings ? JSON.parse(uRatings) : {});
      setUserComments(uComments ? JSON.parse(uComments) : {}); // YENİ
      setWishlist(uWishlist ? JSON.parse(uWishlist) : []);
      setRatedBooks(uRatedBooks ? JSON.parse(uRatedBooks) : []);
    }
  }, [user]);

  // Yorumları ve Puanları Kaydetme
  useEffect(() => { 
    if (user) {
      localStorage.setItem(`bookDb_ratings_${user.email}`, JSON.stringify(userRatings));
      localStorage.setItem(`bookDb_comments_${user.email}`, JSON.stringify(userComments)); // YENİ
      localStorage.setItem(`bookDb_ratedBooks_${user.email}`, JSON.stringify(ratedBooks));
    } else {
      localStorage.setItem("bookDb_ratings", JSON.stringify(userRatings));
      localStorage.setItem("bookDb_comments", JSON.stringify(userComments)); // YENİ
      localStorage.setItem("bookDb_ratedBooks", JSON.stringify(ratedBooks));
    }
  }, [userRatings, userComments, ratedBooks, user]);

  useEffect(() => { 
    if (user) {
      localStorage.setItem(`bookDb_wishlist_${user.email}`, JSON.stringify(wishlist));
    } else {
      localStorage.setItem("bookDb_wishlist", JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchBooks(searchQuery).then((fetchedBooks) => {
      if (isMounted) {
        setBooks(fetchedBooks);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [searchQuery]);

  const handleRate = (rating: number, comment: string) => { // YORUM PARAMETRESİ EKLENDİ
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (rateModalBook) {
      setUserRatings(prev => ({ ...prev, [rateModalBook.id]: rating }));
      
      // Yorum varsa kaydet, yoksa sil
      if (comment.trim()) {
        setUserComments(prev => ({ ...prev, [rateModalBook.id]: comment.trim() }));
      } else {
        setUserComments(prev => {
          const newComments = { ...prev };
          delete newComments[rateModalBook.id];
          return newComments;
        });
      }

      setRatedBooks(prev => {
        if (!prev.find(b => b.id === rateModalBook.id)) {
          return [...prev, rateModalBook];
        }
        return prev;
      });
    }
  };

  const handleRemoveRating = () => {
    if (!user || !rateModalBook) return;
    
    setUserRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[rateModalBook.id];
      return newRatings;
    });

    // Yorumu da sil
    setUserComments(prev => {
      const newComments = { ...prev };
      delete newComments[rateModalBook.id];
      return newComments;
    });

    setRatedBooks(prev => prev.filter(b => b.id !== rateModalBook.id));
    setRateModalBook(null);
  };

  const toggleWishlist = (book: Book) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setWishlist(prev => {
      const isExist = prev.some(b => b.id === book.id);
      if (isExist) return prev.filter(b => b.id !== book.id);
      return [...prev, book];
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchQuery(inputValue.trim());
      setActiveTab('discover');
    }
  };

  const openRateModal = (book: Book) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setRateModalBook(book);
  };

  const featuredBook = books.length > 0 ? [...books].sort((a, b) => b.averageRating - a.averageRating)[0] : null;

  const renderBooks = activeTab === 'discover' ? books : (activeTab === 'wishlist' ? wishlist : ratedBooks);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Logo */}
            <div 
              className="flex items-center gap-2 text-yellow-500 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => {setSearchQuery("bestseller"); setInputValue(""); setActiveTab('discover');}}
            >
              <div className="bg-yellow-500 text-zinc-950 p-1.5 rounded-lg">
                <BookOpen size={24} className="fill-zinc-950" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">
                book<span className="text-yellow-500">Db</span>
              </span>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full sm:w-auto flex-1 max-w-xl relative mx-4">
              <input
                type="text"
                placeholder="Kitap, yazar veya tür ara..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <button type="submit" className="hidden" />
            </form>
            
            {/* Nav & Auth */}
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('wishlist')}
                  className={cn("flex items-center gap-2 transition-colors px-3 py-1.5 rounded-md", activeTab === 'wishlist' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                >
                  <Library size={16} />
                  <span className="hidden md:inline">Okuma Listem</span>
                  {wishlist.length > 0 && <span className="bg-yellow-500 text-zinc-950 text-xs px-1.5 py-0.5 rounded ml-1 font-bold">{wishlist.length}</span>}
                </button>
                <button 
                  onClick={() => setActiveTab('ratings')}
                  className={cn("flex items-center gap-2 transition-colors px-3 py-1.5 rounded-md", activeTab === 'ratings' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                >
                  <Star size={16} />
                  <span className="hidden md:inline">Puanlarım</span>
                  {ratedBooks.length > 0 && <span className="bg-zinc-700 text-zinc-200 text-xs px-1.5 py-0.5 rounded ml-1">{ratedBooks.length}</span>}
                </button>
              </div>

              <div className="w-px h-6 bg-zinc-800 hidden sm:block"></div>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-lg text-zinc-300">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={16} className="text-yellow-500" />
                    )}
                    <span>{user.name}</span>
                  </div>
                  <button onClick={() => signOut(auth)} className="text-zinc-400 hover:text-red-400 transition-colors p-1.5" title="Çıkış Yap">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAuthModal(true)} className="text-zinc-300 hover:text-white transition-colors px-3 py-1.5">
                    Giriş Yap
                  </button>
                  <button onClick={() => setShowAuthModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold px-4 py-1.5 rounded-lg transition-colors">
                    Kayıt Ol
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading State */}
        {loading && activeTab === 'discover' && (
          <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
            <p className="text-zinc-400">Kitaplar dünyanın dört bir yanından getiriliyor...</p>
          </div>
        )}

        {/* Empty States */}
        {!loading && activeTab === 'discover' && books.length === 0 && (
          <div className="text-center py-20 min-h-[50vh] flex flex-col items-center justify-center">
            <Info className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Kitap Bulunamadı</h2>
            <p className="text-zinc-400">Aramanıza uygun kitap bulamadık. Lütfen farklı kelimelerle tekrar deneyin.</p>
          </div>
        )}

        {activeTab === 'wishlist' && wishlist.length === 0 && (
          <div className="text-center py-20 min-h-[50vh] flex flex-col items-center justify-center">
            <Library className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Okuma Listeniz Boş</h2>
            <p className="text-zinc-400 mb-6">Henüz okuma listenize kitap eklememişsiniz. Keşfet bölümünden kitapları bulup ekleyebilirsiniz.</p>
            <button 
              onClick={() => setActiveTab('discover')}
              className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Kitapları Keşfet
            </button>
          </div>
        )}

        {activeTab === 'ratings' && ratedBooks.length === 0 && (
          <div className="text-center py-20 min-h-[50vh] flex flex-col items-center justify-center">
            <Star className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Henüz Puan Vermediniz</h2>
            <p className="text-zinc-400 mb-6">Puanladığınız kitaplar burada listelenecek. Başlamak için keşfet bölümünden bir kitap seçin.</p>
            <button 
              onClick={() => setActiveTab('discover')}
              className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Kitapları Keşfet
            </button>
          </div>
        )}

        {/* Featured Book */}
        {!loading && activeTab === 'discover' && featuredBook && (
          <section className="mb-12">
            <h2 className="flex items-center gap-2 text-xl font-bold text-yellow-500 mb-6 uppercase tracking-wider">
              <TrendingUp size={24} /> Günün Öne Çıkanı
            </h2>
            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col md:flex-row min-h-[350px]">
              
              <div className="md:w-1/3 lg:w-1/4 h-64 md:h-auto shrink-0 relative">
                <img 
                  src={featuredBook.thumbnail.replace("zoom=1", "zoom=0")} 
                  alt={featuredBook.title}
                  className="w-full h-full object-cover md:object-fill"
                />
                <div className="hidden md:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-900 to-transparent"></div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center flex-1 relative">
                <div className="flex items-center gap-2 mb-2">
                   <Star className="text-yellow-500 fill-yellow-500" size={24} />
                   <span className="text-3xl font-black text-white">{featuredBook.averageRating.toFixed(1)}</span>
                   <span className="text-zinc-500">/ 5</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black text-white mb-2">{featuredBook.title}</h3>
                <p className="text-lg text-zinc-400 mb-6">{featuredBook.authors.join(", ")}</p>
                <p className="text-zinc-300 leading-relaxed max-w-3xl mb-8 line-clamp-4">{featuredBook.description}</p>

                <div className="mt-auto flex flex-wrap gap-4">
                  <button 
                    onClick={() => openRateModal(featuredBook)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700"
                  >
                    <Star className={userRatings[featuredBook.id] > 0 ? "text-yellow-500 fill-yellow-500" : "text-zinc-400"} size={18} />
                    {userRatings[featuredBook.id] > 0 ? `Puanın: ${userRatings[featuredBook.id]}` : "Puan Ver / Yorum Yap"}
                  </button>
                  <button 
                    onClick={() => toggleWishlist(featuredBook)}
                    className={cn(
                      "font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 border",
                      wishlist.some(b => b.id === featuredBook.id) 
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20" 
                        : "bg-transparent text-white border-zinc-700 hover:bg-zinc-800"
                    )}
                  >
                    {wishlist.some(b => b.id === featuredBook.id) ? (
                      <><BookmarkCheck size={18} /> Listeden Çıkar</>
                    ) : (
                      <><BookmarkPlus size={18} /> Okuma Listesine Ekle</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Grid List */}
        {(!loading && renderBooks.length > 0) && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-yellow-500 rounded-full inline-block"></span>
              {activeTab === 'discover' ? (
                <>Keşfet: <span className="text-zinc-400 font-normal ml-1">"{searchQuery}"</span></>
              ) : activeTab === 'wishlist' ? (
                "Okuma Listem"
              ) : (
                "Puanladığım Kitaplar"
              )}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {renderBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  userRating={userRatings[book.id] || 0}
                  userComment={userComments[book.id]} // YORUM PROP'U EKLENDİ
                  onRateClick={openRateModal}
                  onToggleWishlist={toggleWishlist}
                  isInWishlist={wishlist.some(b => b.id === book.id)}
                />
              ))}
            </div>
          </section>
        )}

      </main>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 text-center bg-zinc-950 mt-auto">
        <div className="flex items-center justify-center gap-2 text-zinc-400 mb-4">
           <BookOpen size={24} />
           <span className="text-xl font-bold">book<span className="text-yellow-500">Db</span></span>
        </div>
        <p className="text-zinc-600 text-sm max-w-md mx-auto">
          Dünyanın tüm kitapları burada. İnternetten canlı olarak çekilen verilerle, gerçek bir IMDb tarzı kitap platformu.
        </p>
      </footer>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {rateModalBook && (
        <RateModal
          book={rateModalBook}
          currentRating={userRatings[rateModalBook.id] || 0}
          currentComment={userComments[rateModalBook.id] || ""} // YORUM EKLENDİ
          onClose={() => setRateModalBook(null)}
          onSave={handleRate}
          onRemove={handleRemoveRating}
        />
      )}
    </div>
  );
}
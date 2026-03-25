import { Book } from './types';

export const initialBooks: Book[] = [
  {
    id: '1',
    title: 'Dune',
    author: 'Frank Herbert',
    coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400',
    description: 'Uzak bir gelecekte, çöl gezegeni Arrakis\'in kontrolünü ele alan genç Paul Atreides\'in destansı hikayesi.',
    ratings: [5, 4.5, 4, 5, 4.5, 5]
  },
  {
    id: '2',
    title: '1984',
    author: 'George Orwell',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400',
    description: 'Totaliter bir rejimin altında ezilen bir toplumda, hakikatin ve özgürlüğün değerini sorgulayan distopik bir başyapıt.',
    ratings: [5, 5, 4.5, 5, 4, 4.5]
  },
  {
    id: '3',
    title: 'Simyacı',
    author: 'Paulo Coelho',
    coverUrl: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=400',
    description: 'İspanya\'dan Mısır piramitlerine hazine aramak için yola çıkan çoban Santiago\'nun masalsı serüveni.',
    ratings: [4, 3.5, 4, 4.5, 3]
  },
  {
    id: '4',
    title: 'Suç ve Ceza',
    author: 'Fyodor Dostoyevski',
    coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
    description: 'Fakir bir öğrenci olan Raskolnikov\'un işlediği cinayet sonrası yaşadığı psikolojik ve vicdani buhran.',
    ratings: [5, 4.5, 5, 5, 4.5]
  },
  {
    id: '5',
    title: 'Körlük',
    author: 'José Saramago',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400',
    description: 'Bir şehirde aniden yayılan körlük salgını ve ardından çöken toplumsal düzen.',
    ratings: [4.5, 4.5, 4, 5, 3.5]
  },
  {
    id: '6',
    title: 'Satranç',
    author: 'Stefan Zweig',
    coverUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=400',
    description: 'Nazi zulmünden kaçan bir adamın, satranç tahtasında zihniyle verdiği hayatta kalma mücadelesi.',
    ratings: [4.5, 4, 5, 4.5]
  }
];

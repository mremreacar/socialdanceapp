const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 5);
const nextMonth = new Date(today);
nextMonth.setDate(today.getDate() + 25);

// İstanbul merkez civarı koordinatlar (konum izni ile mesafe hesaplama için)
export const mockEvents = [
  {
    id: '1',
    title: 'Salsa Sensations Night',
    location: 'Club Havana',
    danceType: 'Salsa',
    date: 'Bugün, 21:00',
    time: '21:00',
    rawDate: today,
    price: '₺150',
    image: 'https://picsum.photos/seed/event1/400/280',
    attendees: 3,
    description: 'Club Havana\'da unutulmaz bir salsa gecesi! Canlı orkestra eşliğinde Latin ritimlerine kendinizi bırakın. Başlangıç seviyesinden ileri seviyeye herkes için uygun bir ortam. Gece boyunca DJ performansları, gösteri dansları ve sosyal dans için bolca alan sizi bekliyor.',
    mapCoordinates: { top: '40%', left: '50%' },
    latitude: 41.008,
    longitude: 28.978,
  },
  {
    id: '2',
    title: 'Bachata Bliss Party',
    location: 'The Dance Floor',
    danceType: 'Bachata',
    date: 'Yarın, 22:00',
    description: 'Romantik Bachata melodileri eşliğinde harika bir akşam. Workshop ve açık pist dansı ile hem öğrenin hem eğlenin. İçecek ikramı dahildir.',
    time: '22:00',
    rawDate: tomorrow,
    price: '₺200',
    image: 'https://picsum.photos/seed/event2/400/280',
    attendees: 5,
    mapCoordinates: { top: '30%', left: '25%' },
    latitude: 41.042,
    longitude: 29.008,
  },
  {
    id: '3',
    title: 'Urban Kizomba Workshop',
    location: 'Studio 34',
    danceType: 'Kizomba',
    date: 'Bu Hafta, 14:00',
    description: 'Kizomba ve urban kiz teknikleri üzerine profesyonel eğitmenlerle workshop. Temel adımlar, bağlantı ve müzikallik çalışılacak. Kayıt sınırlı sayıdadır.',
    time: '14:00',
    rawDate: nextWeek,
    price: '₺250',
    image: 'https://picsum.photos/seed/event3/400/280',
    attendees: 12,
    mapCoordinates: { top: '55%', left: '70%' },
    latitude: 41.018,
    longitude: 28.985,
  },
  {
    id: '4',
    title: 'Tango Milonga Night',
    location: 'Pera Palace',
    danceType: 'Tango',
    date: 'Gelecek Ay, 20:30',
    description: 'Geleneksel Arjantin tango milongası. Canlı bandoneon ve piyano performansı, açık pist ve gösteriler. Resmi kıyafet tercih edilir.',
    time: '20:30',
    rawDate: nextMonth,
    price: '₺180',
    image: 'https://picsum.photos/seed/event4/400/280',
    attendees: 8,
    mapCoordinates: { top: '20%', left: '60%' },
    latitude: 41.032,
    longitude: 28.975,
  },
];

export const mockSchools = [
  {
    id: '1',
    name: 'Salsa Academy Istanbul',
    location: 'Kadıköy, İstanbul',
    distance: '2.1 km',
    image: 'https://picsum.photos/seed/salsa1/400/280',
    rating: 4.8,
    ratingCount: 124,
    isOpen: true,
    tags: ['Salsa', 'Bachata'],
    phone: '02161234567',
  },
  {
    id: '2',
    name: 'Tango Studio',
    location: 'Beşiktaş, İstanbul',
    distance: '5.3 km',
    image: 'https://picsum.photos/seed/tango1/400/280',
    rating: 4.6,
    ratingCount: 89,
    isOpen: false,
    tags: ['Tango'],
  },
  {
    id: '3',
    name: 'Latin Dance House',
    location: 'Şişli, İstanbul',
    distance: '3.7 km',
    image: 'https://picsum.photos/seed/latin1/400/280',
    rating: 4.9,
    ratingCount: 201,
    isOpen: true,
    tags: ['Salsa', 'Bachata', 'Kizomba'],
  },
];

export const mockFollowing = [
  { id: 1, name: 'Can Vural', handle: '@canvural', img: 'https://i.pravatar.cc/150?u=21' },
  { id: 2, name: 'Ayşe Yılmaz', handle: '@ayseyilmaz', img: 'https://i.pravatar.cc/150?u=22' },
  { id: 3, name: 'Mehmet Demir', handle: '@mdemir', img: 'https://i.pravatar.cc/150?u=23' },
  { id: 4, name: 'Selin Kara', handle: '@selink', img: 'https://i.pravatar.cc/150?u=24' },
];

export const mockChats = [
  { id: '1', name: 'Can Vural', avatar: 'https://i.pravatar.cc/150?u=21', lastMessage: 'Yarın geliyor musun?', time: '14:32', unread: 2, isOnline: true },
  { id: '2', name: 'Ayşe Yılmaz', avatar: 'https://i.pravatar.cc/150?u=22', lastMessage: 'Harika bir geceydi!', time: 'Dün', unread: 0, isOnline: false },
];

export const mockFavoritesEvents = [
  { id: 1, title: 'Latino Night Fever', location: 'Moda Sahne', date: 'Cuma, 22:00', day: '12', month: 'EKİ', isFavorite: true, isPast: true, isDanceQueen: true, image: 'https://picsum.photos/seed/latino/400/280', attendees: 26, isPopular: true, attendeeAvatars: ['https://i.pravatar.cc/150?u=21', 'https://i.pravatar.cc/150?u=22'] },
  { id: 2, title: 'Salsa Workshop', location: 'Kadıköy Dans Evi', date: 'Perşembe, 19:00', day: '05', month: 'EKİ', isFavorite: false, isPast: true, isDanceQueen: true, image: 'https://picsum.photos/seed/salsa/400/280', attendees: 12, isPopular: false, attendeeAvatars: ['https://i.pravatar.cc/150?u=23', 'https://i.pravatar.cc/150?u=24'] },
  { id: 3, title: 'Büyük Yılbaşı Partisi', location: 'Swissotel The Bosphorus', date: 'Salı, 20:30', day: '31', month: 'ARA', isFavorite: true, isPast: false, isDanceQueen: false, image: 'https://picsum.photos/seed/nye/400/280', attendees: 48, isPopular: true, attendeeAvatars: ['https://i.pravatar.cc/150?u=25', 'https://i.pravatar.cc/150?u=26'] },
];

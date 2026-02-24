const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 5);
const nextMonth = new Date(today);
nextMonth.setDate(today.getDate() + 25);

export const mockEvents = [
  {
    id: '1',
    title: 'Salsa Sensations Night',
    location: 'Club Havana • 2.5 km',
    date: 'Bugün, 21:00',
    time: '21:00',
    rawDate: today,
    price: '₺150',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGhVSeV2Lgi80rUp4KKEkMy3Ls7pcmKY2EwXAc5R0i68_c9xGCf9rhqBjjbQaBAPv0hWeFvCX-VC4-LiBcDgLTP5qQgDCJuwlkwRM3NV4s9AwmpVxfISsxUKoKbLrcVttOuZOha8ZXqL2EIZw3Dl5rornTeePQnGxJVEXxCn2Jzlcc09hQLbQrS3HjCJkksBFTXVyX2g_ok4TEly8b3YIQ9usbT_3alYA_yDkGjCxD6uF4yHL-6OtbCXvSUuuoMXeEhECFPoUfAHg',
    attendees: 3,
    mapCoordinates: { top: '40%', left: '50%' },
  },
  {
    id: '2',
    title: 'Bachata Bliss Party',
    location: 'The Dance Floor • 5 km',
    date: 'Yarın, 22:00',
    time: '22:00',
    rawDate: tomorrow,
    price: '₺200',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFn_tKPPXVCX8uMjPfIAGOr63Wtqp1hR6ZNwi0fyzjgmi5Xd0WOe07aDJsp5nGr76B6hFa7VOckOY9FKXZRcr850AeoFUE3kRlv63lPSVVCQdZXzLHy7VCV_iEvFPTBpkRaTpwqykG7VuGHukbo0CCUshbbffFzXICrZSZgnUYxUH8vbpOKXwk43iCKxxOlGl3fiS7kCkFWrKMI8HiLqZekseR3lPIWvK2Fh4VtqgrZfK7nLWtPjt-uInQHcpvR7xZ94kJdv-QE68',
    attendees: 5,
    mapCoordinates: { top: '30%', left: '25%' },
  },
  {
    id: '3',
    title: 'Urban Kizomba Workshop',
    location: 'Studio 34 • 1.2 km',
    date: 'Bu Hafta, 14:00',
    time: '14:00',
    rawDate: nextWeek,
    price: '₺250',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBrjKas3zhEJmnWbT4UkkmvB7wxQTJY8Ia0xEfKUhy-vcJTvuV-lhoiioNA8PlLpfdbM3e20DFNruui3lAL3r3tgzapKB233FQmxu2gE-qGZK7DD_ikTKOLCTKK5BIzz3N48OpXtAgCiDX7d5qKsFh_7yzHU4FnZwFWhngl47T4V-jifydR4mqH6P2iRMFEutp-Fiz9y7BRzWiGb0CJa9OPSkY2BcmMrTYEcbextcl4l8p2j0yRc406i90CXtXYxrCYc0471bXM4c',
    attendees: 12,
    mapCoordinates: { top: '55%', left: '70%' },
  },
  {
    id: '4',
    title: 'Tango Milonga Night',
    location: 'Pera Palace • 8 km',
    date: 'Gelecek Ay, 20:30',
    time: '20:30',
    rawDate: nextMonth,
    price: '₺180',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwnGGCb-FXJAztdQSWTY1xcweQTaaRbR8DfRdUSZHYuAi1kU5SJWApfICuE5qtRHiY-saCMGPCzQH_d9bI6120LEXHzWQgcWLNjLJBKJn-_fX9QXRNs65BTGfLglfR1NH6NN2tiVyJxbp9FV1S4N1QnDMjcYj3NkPk6Oa0dtevmCID9VUeS2LrT1UKEshnrHf2sFjAoWKj3yzEp0hS-dqaNre-mSBBgrW4m61OArADGiHAwidhWZya0V6De7_D3vV8fJf1l5D9AY8',
    attendees: 8,
    mapCoordinates: { top: '20%', left: '60%' },
  },
];

export const mockSchools = [
  {
    id: '1',
    name: 'Salsa Academy Istanbul',
    location: 'Kadıköy, İstanbul',
    distance: '2.1 km',
    image: 'https://images.unsplash.com/photo-1547153760-18fc949bc86e?w=400',
    rating: 4.8,
    ratingCount: 124,
    isOpen: true,
    tags: ['Salsa', 'Bachata'],
  },
  {
    id: '2',
    name: 'Tango Studio',
    location: 'Beşiktaş, İstanbul',
    distance: '5.3 km',
    image: 'https://images.unsplash.com/photo-1518609878373-06d7407846cc?w=400',
    rating: 4.6,
    ratingCount: 89,
    isOpen: false,
    tags: ['Tango'],
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
  { id: 1, title: 'Latino Night Fever', location: 'Moda Sahne', date: '2023-10-12', day: '12', month: 'EKİ', isFavorite: true, isPast: true, isDanceQueen: true },
  { id: 2, title: 'Salsa Workshop', location: 'Kadıköy Dans Evi', date: '2023-10-05', day: '05', month: 'EKİ', isFavorite: false, isPast: true, isDanceQueen: true },
  { id: 3, title: 'Büyük Yılbaşı Partisi', location: 'Swissotel The Bosphorus', date: '2024-12-31', day: '31', month: 'ARA', isFavorite: true, isPast: false, isDanceQueen: false },
];

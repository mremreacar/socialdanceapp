export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  price?: string;
  attendees?: number;
  /** Dans türü (örn. Salsa, Bachata) */
  danceType?: string;
  /** Etkinlik açıklaması */
  description?: string;
  type?: string;
  rating?: number;
  ratingCount?: number;
  rawDate?: Date;
  mapCoordinates?: { top: string; left: string };
  /** Enlem/boylam mesafe hesaplama ve sıralama için (konum izni kullanımı) */
  latitude?: number;
  longitude?: number;
}

export interface School {
  id: string;
  name: string;
  location: string;
  distance: string;
  image: string;
  rating: number;
  ratingCount: number;
  isOpen?: boolean;
  tags?: string[];
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  following: number;
  followers: number;
  danced: number;
}

export interface DanceStyle {
  id: string;
  name: string;
  icon?: string;
  selected?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
}

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread?: number;
  isOnline?: boolean;
}

export interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  category: string;
  condition?: string;
  seller?: {
    name: string;
    avatar: string;
    rating: number;
  };
  description?: string;
  images?: string[];
}

export interface DanceClass {
  id: string;
  title: string;
  instructor: string;
  time: string;
  day: string;
  level: string;
  image?: string;
  schoolId?: string;
}

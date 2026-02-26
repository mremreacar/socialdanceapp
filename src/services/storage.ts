import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredProfile {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
}

const DEFAULT_PROFILE: StoredProfile = {
  displayName: 'Elif Yılmaz',
  username: 'elifyilmaz',
  avatarUri: null,
  bio: 'Salsa ve Bachata tutkunu. Yeni insanlarla tanışıp dans etmeyi seviyorum!',
};

const KEYS = {
  USER_LOGGED_IN: '@socialdance/logged_in',
  USER_FAVORITES: '@socialdance/favorites',
  NOTIFICATIONS_ENABLED: '@socialdance/notifications_enabled',
  LOCATION_ENABLED: '@socialdance/location_enabled',
  DANCED_COUNT: '@socialdance/danced_count',
  THEME_MODE: '@socialdance/theme_mode',
  PROFILE: '@socialdance/profile',
} as const;

export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value != null ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  async isLoggedIn(): Promise<boolean> {
    const v = await this.getItem<boolean>(KEYS.USER_LOGGED_IN);
    return v === true;
  },

  async setLoggedIn(value: boolean): Promise<void> {
    await this.setItem(KEYS.USER_LOGGED_IN, value);
  },

  async getFavorites(): Promise<string[]> {
    const v = await this.getItem<string[]>(KEYS.USER_FAVORITES);
    return v || [];
  },

  async setFavorites(ids: string[]): Promise<void> {
    await this.setItem(KEYS.USER_FAVORITES, ids);
  },

  async getDancedCount(): Promise<number> {
    const v = await this.getItem<number>(KEYS.DANCED_COUNT);
    return typeof v === 'number' ? v : 42;
  },

  async setDancedCount(count: number): Promise<void> {
    await this.setItem(KEYS.DANCED_COUNT, count);
  },

  async getProfile(): Promise<StoredProfile> {
    const v = await this.getItem<StoredProfile>(KEYS.PROFILE);
    return v ?? DEFAULT_PROFILE;
  },

  async setProfile(profile: StoredProfile): Promise<void> {
    await this.setItem(KEYS.PROFILE, profile);
  },
};

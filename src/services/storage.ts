import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredProfile {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  city?: string;
  favoriteDances?: string[];
  otherInterests?: string;
  notificationsEnabled?: boolean;
}

export type AuthProvider = 'supabase' | 'apple-native';

export const DEFAULT_PROFILE: StoredProfile = {
  displayName: '',
  username: '',
  avatarUri: null,
  bio: '',
  email: '',
  city: '',
  favoriteDances: [],
  otherInterests: '',
  notificationsEnabled: true,
};

const KEYS = {
  USER_LOGGED_IN: '@socialdance/logged_in',
  ACCESS_TOKEN: '@socialdance/access_token',
  REFRESH_TOKEN: '@socialdance/refresh_token',
  USER_FAVORITES: '@socialdance/favorites',
  NOTIFICATIONS_ENABLED: '@socialdance/notifications_enabled',
  LOCATION_ENABLED: '@socialdance/location_enabled',
  DANCED_COUNT: '@socialdance/danced_count',
  THEME_MODE: '@socialdance/theme_mode',
  PROFILE: '@socialdance/profile',
  AUTH_PROVIDER: '@socialdance/auth_provider',
  APPLE_USER_ID: '@socialdance/apple_user_id',
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

  async getAccessToken(): Promise<string | null> {
    const v = await this.getItem<string>(KEYS.ACCESS_TOKEN);
    return typeof v === 'string' && v.length ? v : null;
  },

  async setAccessToken(token: string): Promise<void> {
    await this.setItem(KEYS.ACCESS_TOKEN, token);
  },

  async clearAccessToken(): Promise<void> {
    await this.removeItem(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    const v = await this.getItem<string>(KEYS.REFRESH_TOKEN);
    return typeof v === 'string' && v.length ? v : null;
  },

  async setRefreshToken(token: string): Promise<void> {
    await this.setItem(KEYS.REFRESH_TOKEN, token);
  },

  async clearRefreshToken(): Promise<void> {
    await this.removeItem(KEYS.REFRESH_TOKEN);
  },

  async getAuthProvider(): Promise<AuthProvider | null> {
    const value = await this.getItem<AuthProvider>(KEYS.AUTH_PROVIDER);
    return value === 'supabase' || value === 'apple-native' ? value : null;
  },

  async setAuthProvider(provider: AuthProvider): Promise<void> {
    await this.setItem(KEYS.AUTH_PROVIDER, provider);
  },

  async clearAuthProvider(): Promise<void> {
    await this.removeItem(KEYS.AUTH_PROVIDER);
  },

  async getAppleUserId(): Promise<string | null> {
    const value = await this.getItem<string>(KEYS.APPLE_USER_ID);
    return typeof value === 'string' && value.length ? value : null;
  },

  async setAppleUserId(value: string): Promise<void> {
    await this.setItem(KEYS.APPLE_USER_ID, value);
  },

  async clearAppleUserId(): Promise<void> {
    await this.removeItem(KEYS.APPLE_USER_ID);
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
    if (!v) return DEFAULT_PROFILE;
    return {
      ...DEFAULT_PROFILE,
      ...v,
      email: v.email ?? '',
      city: v.city ?? '',
      favoriteDances: v.favoriteDances ?? [],
      otherInterests: v.otherInterests ?? '',
      notificationsEnabled: v.notificationsEnabled !== false,
    };
  },

  async setProfile(profile: StoredProfile): Promise<void> {
    await this.setItem(KEYS.PROFILE, profile);
  },

  async getNotificationsEnabled(): Promise<boolean> {
    const v = await this.getItem<boolean>(KEYS.NOTIFICATIONS_ENABLED);
    return v !== false;
  },

  async setNotificationsEnabled(value: boolean): Promise<void> {
    await this.setItem(KEYS.NOTIFICATIONS_ENABLED, value);
  },

  async clearProfile(): Promise<void> {
    await this.removeItem(KEYS.PROFILE);
  },

  async logout(): Promise<void> {
    await Promise.all([
      this.setLoggedIn(false),
      this.clearAccessToken(),
      this.clearRefreshToken(),
      this.clearAuthProvider(),
      this.clearAppleUserId(),
      this.clearProfile(),
    ]);
  },
};

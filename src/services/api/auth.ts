import { supabaseAuthRequest } from './apiClient';
import type { LoginRequestDto, LoginResponseDto, SignUpRequestDto, SignUpResponseDto, UserDto } from './types';
import { storage, type StoredProfile } from '../storage';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: SupabaseAuthUser | null;
};

const GOOGLE_OAUTH_REDIRECT_URL = 'socialdanceapp://auth/callback';
type OAuthProvider = 'google';

function mapSupabaseUser(user?: SupabaseAuthUser | null): UserDto | undefined {
  if (!user?.id) return undefined;
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: typeof user.email === 'string' ? user.email : null,
    displayName: typeof metadata.displayName === 'string' ? metadata.displayName : null,
    username: typeof metadata.username === 'string' ? metadata.username : null,
    city: typeof metadata.city === 'string' ? metadata.city : null,
    avatarUrl: typeof metadata.avatarUrl === 'string' ? metadata.avatarUrl : null,
    bio: typeof metadata.bio === 'string' ? metadata.bio : null,
    favoriteDances: Array.isArray(metadata.favoriteDances)
      ? metadata.favoriteDances.filter((item): item is string => typeof item === 'string')
      : null,
    otherInterests: typeof metadata.otherInterests === 'string' ? metadata.otherInterests : null,
  };
}

async function persistSession(session: { accessToken?: string; refreshToken?: string }): Promise<void> {
  if (!session.accessToken || !session.refreshToken) {
    throw new Error('Supabase session is missing access or refresh token.');
  }

  await Promise.all([
    storage.setAccessToken(session.accessToken),
    storage.setRefreshToken(session.refreshToken),
    storage.setAuthProvider('supabase'),
    storage.clearAppleUserId(),
    storage.setLoggedIn(true),
  ]);
}

function normalizeLoginErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'invalid login credentials') {
    return 'Giriş yapılamadı. Lütfen e-posta adresinizi ve şifrenizi kontrol ederek tekrar deneyiniz.';
  }
  if (normalized === 'email not confirmed') {
    return 'E-posta adresiniz henüz doğrulanmamış. Lütfen e-posta kutunuzu kontrol ederek hesabınızı doğrulayınız.';
  }

  return message;
}

function normalizeSignUpErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'email signups are disabled') {
    return 'Yeni hesap oluşturma işlemi şu anda kullanılamamaktadır.';
  }

  return message;
}

function normalizeForgotPasswordErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes('rate limit')) {
    return 'Şifre yenileme isteği kısa süre önce gönderildi. Lütfen biraz bekleyip tekrar deneyiniz.';
  }

  return message;
}

function parseUrlEncodedParams(value: string): URLSearchParams {
  const normalized = value.startsWith('#') || value.startsWith('?') ? value.slice(1) : value;
  return new URLSearchParams(normalized);
}

function getOAuthCallbackParams(callbackUrl: string): URLSearchParams {
  const hashIndex = callbackUrl.indexOf('#');
  if (hashIndex >= 0 && hashIndex < callbackUrl.length - 1) {
    return parseUrlEncodedParams(callbackUrl.slice(hashIndex + 1));
  }

  const queryIndex = callbackUrl.indexOf('?');
  if (queryIndex >= 0 && queryIndex < callbackUrl.length - 1) {
    return parseUrlEncodedParams(callbackUrl.slice(queryIndex + 1));
  }

  return new URLSearchParams();
}

function readOAuthErrorMessage(params: URLSearchParams): string | null {
  const description = params.get('error_description');
  if (description) return description.replace(/\+/g, ' ');
  return params.get('error');
}

function normalizeOAuthErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes('access_denied')) {
    return 'Sosyal giriş iptal edildi. Devam etmek için tekrar deneyiniz.';
  }
  if (normalized.includes('provider is not enabled')) {
    return 'Bu sosyal giriş yöntemi henüz Supabase projesinde etkinleştirilmemiş.';
  }

  return message;
}

async function loginWithOAuthProvider(provider: OAuthProvider): Promise<void> {
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const publishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase ayarlari eksik. Sosyal giriş başlatılamadı.');
  }

  const authorizeUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(GOOGLE_OAUTH_REDIRECT_URL)}`;

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, GOOGLE_OAUTH_REDIRECT_URL, {
    showInRecents: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sosyal giriş iptal edildi.');
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Sosyal giriş tamamlanamadı.');
  }

  const params = getOAuthCallbackParams(result.url);
  const providerError = readOAuthErrorMessage(params);
  if (providerError) {
    throw new Error(providerError);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    throw new Error('Sosyal giriş tamamlandı ancak token bilgisi alınamadı.');
  }

  await persistSession({ accessToken, refreshToken });
}

function buildAppleStoredProfile(
  previousProfile: StoredProfile,
  credential: AppleAuthentication.AppleAuthenticationCredential,
): StoredProfile {
  const givenName = credential.fullName?.givenName?.trim() ?? '';
  const familyName = credential.fullName?.familyName?.trim() ?? '';
  const displayName = [givenName, familyName].filter(Boolean).join(' ').trim();
  const nextEmail = credential.email?.trim() || previousProfile.email || '';
  const fallbackUsername = credential.user.slice(0, 12);
  const usernameFromEmail = nextEmail.split('@')[0]?.trim() || '';

  return {
    ...previousProfile,
    displayName: displayName || previousProfile.displayName || 'Apple Kullanıcısı',
    username: usernameFromEmail || previousProfile.username || fallbackUsername,
    email: nextEmail,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    try {
      const payload: LoginRequestDto = { email: email.trim(), password };
      const res = await supabaseAuthRequest<SupabaseAuthResponse>('/token?grant_type=password', {
        method: 'POST',
        body: payload,
      });

      const mapped: LoginResponseDto = {
        accessToken: res.access_token || '',
        refreshToken: res.refresh_token || '',
        user: mapSupabaseUser(res.user),
      };

      if (!mapped.accessToken || !mapped.refreshToken) {
        throw new Error('Login response missing access token.');
      }

      await persistSession(mapped);
    } catch (error: any) {
      throw new Error(normalizeLoginErrorMessage(error?.message || 'Giris yapilamadi.'));
    }
  },

  async signUp(input: SignUpRequestDto): Promise<SignUpResponseDto> {
    try {
      const res = await supabaseAuthRequest<SupabaseAuthResponse>('/signup', {
        method: 'POST',
        body: {
          email: input.email.trim(),
          password: input.password,
          data: {
            displayName: input.displayName,
            username: input.username,
            city: '',
            favoriteDances: [],
            otherInterests: '',
            bio: '',
            avatarUrl: null,
          },
        },
      });

      const accessToken = res.access_token;
      const refreshToken = res.refresh_token;
      const needsEmailConfirmation = !accessToken || !refreshToken;

      if (!needsEmailConfirmation) {
        await persistSession({ accessToken, refreshToken });
      } else {
        await Promise.all([
          storage.setLoggedIn(false),
          storage.clearAccessToken(),
          storage.clearRefreshToken(),
          storage.clearAuthProvider(),
        ]);
      }

      return {
        accessToken,
        refreshToken,
        needsEmailConfirmation,
        user: mapSupabaseUser(res.user),
      };
    } catch (error: any) {
      throw new Error(normalizeSignUpErrorMessage(error?.message || 'Kayıt oluşturulamadı.'));
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await supabaseAuthRequest('/recover', {
        method: 'POST',
        body: {
          email: email.trim(),
        },
      });
    } catch (error: any) {
      throw new Error(normalizeForgotPasswordErrorMessage(error?.message || 'Şifre yenileme bağlantısı gönderilemedi.'));
    }
  },

  async loginWithGoogle(): Promise<void> {
    try {
      await loginWithOAuthProvider('google');
    } catch (error: any) {
      throw new Error(normalizeOAuthErrorMessage(error?.message || 'Google ile giriş yapılamadı.'));
    }
  },

  async loginWithApple(): Promise<void> {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple ile giriş bu cihazda kullanılamıyor.');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.user) {
        throw new Error('Apple hesabı doğrulanamadı.');
      }

      const previousProfile = await storage.getProfile();
      const nextProfile = buildAppleStoredProfile(previousProfile, credential);

      await Promise.all([
        storage.setProfile(nextProfile),
        storage.setAuthProvider('apple-native'),
        storage.setAppleUserId(credential.user),
        storage.clearAccessToken(),
        storage.clearRefreshToken(),
        storage.setLoggedIn(true),
      ]);
    } catch (error: any) {
      throw new Error(normalizeOAuthErrorMessage(error?.message || 'Apple ile giriş yapılamadı.'));
    }
  },

  async logout(): Promise<void> {
    const [token, authProvider] = await Promise.all([
      storage.getAccessToken(),
      storage.getAuthProvider(),
    ]);

    if (authProvider === 'supabase' && token) {
      try {
        await supabaseAuthRequest('/logout', {
          method: 'POST',
          accessToken: token,
        });
      } catch {}
    }

    await storage.logout();
  },
};

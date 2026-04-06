import { supabaseAuthRequest } from './apiClient';
import type { LoginRequestDto, LoginResponseDto, SignUpRequestDto, SignUpResponseDto, UserDto } from './types';
import { storage } from '../storage';

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

  async logout(): Promise<void> {
    const token = await storage.getAccessToken();
    if (token) {
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

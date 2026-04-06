import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, StoredProfile } from '../services/storage';
import { hasSupabaseConfig } from '../services/api/apiClient';
import { profileService } from '../services/api/profile';

export interface Profile {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  city: string;
  favoriteDances: string[];
  otherInterests: string;
  notificationsEnabled: boolean;
}

export function getAvatarSource(avatarUri: string | null): string {
  return avatarUri ?? '';
}

const EMPTY_PROFILE: Profile = {
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

function mapStoredProfileToProfile(stored: StoredProfile): Profile {
  return {
    displayName: stored.displayName,
    username: stored.username,
    avatarUri: stored.avatarUri,
    bio: stored.bio,
    email: stored.email ?? '',
    city: stored.city ?? '',
    favoriteDances: stored.favoriteDances ?? [],
    otherInterests: stored.otherInterests ?? '',
    notificationsEnabled: stored.notificationsEnabled !== false,
  };
}

interface ProfileContextValue {
  profile: Profile;
  avatarSource: string;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
  setProfileFromStored: (stored: StoredProfile) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyProfile = useCallback((p: Profile) => {
    setProfileState(p);
    void storage.setNotificationsEnabled(p.notificationsEnabled !== false);
  }, []);

  const refreshProfile = useCallback(async () => {
    setError(null);
    const hasApi = hasSupabaseConfig();
    const [token, refreshToken] = await Promise.all([
      storage.getAccessToken(),
      storage.getRefreshToken(),
    ]);

    // Backend-driven profile: if there is no session hint (or API), never show stale cached profile.
    if (!hasApi || (!token && !refreshToken)) {
      await storage.clearProfile();
      applyProfile(EMPTY_PROFILE);
      return;
    }

    const remote = await profileService.getMe();
    applyProfile(remote);
    await storage.setProfile(remote);
  }, [applyProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedProfile = await storage.getProfile();
        if (!cancelled) {
          applyProfile(mapStoredProfileToProfile(storedProfile));
        }
        await refreshProfile();
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Profile load failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  const setProfileFromStored = useCallback(
    (stored: StoredProfile) => {
      applyProfile(mapStoredProfileToProfile(stored));
      storage.setProfile(stored).catch(() => {});
    },
    [applyProfile],
  );

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    setError(null);

    const nextProfile = { ...profile, ...updates };
    setProfileState(nextProfile);

    await storage.setProfile(nextProfile);

    const hasApi = hasSupabaseConfig();
    const [token, refreshToken] = await Promise.all([
      storage.getAccessToken(),
      storage.getRefreshToken(),
    ]);

    if (!hasApi || (!token && !refreshToken)) {
      return nextProfile;
    }

    try {
      const remoteProfile = await profileService.updateMe(nextProfile);
      applyProfile(remoteProfile);
      await storage.setProfile(remoteProfile);
      return remoteProfile;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Profil güncellenemedi.');
      try {
        const remote = await profileService.getMe();
        applyProfile(remote);
        await storage.setProfile(remote);
      } catch {
        /* ignore */
      }
      throw e;
    }
  }, [applyProfile, profile]);

  const avatarSource = getAvatarSource(profile.avatarUri);

  const value: ProfileContextValue = {
    profile,
    avatarSource,
    loading,
    error,
    updateProfile,
    setProfileFromStored,
    refreshProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

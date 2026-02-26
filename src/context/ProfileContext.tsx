import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, StoredProfile } from '../services/storage';

const DEFAULT_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAozkav3nW4pjxxBTZ9r4bnylgPIqCTaCZfeooT-iWfynJKZXgRv-HsTDa3vAtFwVs-S0q_5DxzyefpzHzF9dxop2EIWngyydzbp00sS9RD_GW7EAYzlT5uL0xw7zjOZu4BhH4QjAGHvnjHbl6blJTPQPYsnNb08fT2JwDrOlRZhBHfCqRwlN3GOJq-wj48GfdD3ZyLxdmrkroY0i1ic51l_ssDbmO_cM2bldocE_cHmHuSYfM4JE3Up_oWcyj3HNikmvQ4rUzFrWE';

export interface Profile {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
}

export function getAvatarSource(avatarUri: string | null): string {
  return avatarUri ?? DEFAULT_AVATAR_URL;
}

interface ProfileContextValue {
  profile: Profile;
  avatarSource: string;
  updateProfile: (updates: Partial<Profile>) => void;
  setProfileFromStored: (stored: StoredProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>({
    displayName: 'Elif Yılmaz',
    username: 'elifyilmaz',
    avatarUri: null,
    bio: 'Salsa ve Bachata tutkunu. Yeni insanlarla tanışıp dans etmeyi seviyorum!',
  });

  useEffect(() => {
    storage.getProfile().then((stored) => {
      setProfileState({
        displayName: stored.displayName,
        username: stored.username,
        avatarUri: stored.avatarUri,
        bio: stored.bio,
      });
    });
  }, []);

  const setProfileFromStored = useCallback((stored: StoredProfile) => {
    setProfileState({
      displayName: stored.displayName,
      username: stored.username,
      avatarUri: stored.avatarUri,
      bio: stored.bio,
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      storage.setProfile({
        displayName: next.displayName,
        username: next.username,
        avatarUri: next.avatarUri,
        bio: next.bio,
      }).catch(() => {});
      return next;
    });
  }, []);

  const avatarSource = getAvatarSource(profile.avatarUri);

  const value: ProfileContextValue = {
    profile,
    avatarSource,
    updateProfile,
    setProfileFromStored,
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

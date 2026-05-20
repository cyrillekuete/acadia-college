'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';
import type { User } from '@supabase/supabase-js';

type UserProfileSessionValue = {
  profile: AcadiaUserProfile | null;
  authUser: User | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

const UserProfileSessionContext = createContext<UserProfileSessionValue | null>(
  null,
);

export function UserProfileSessionProvider({ children }: { children: ReactNode }) {
  const { data: session, isLoading, isError, error } = useAcadiaCollegeSession();

  return (
    <UserProfileSessionContext.Provider
      value={{
        profile: session?.profile ?? null,
        authUser: session?.authUser ?? null,
        isLoading,
        isError,
        error,
      }}
    >
      {children}
    </UserProfileSessionContext.Provider>
  );
}

export function useUserProfileSession(): UserProfileSessionValue {
  const context = useContext(UserProfileSessionContext);
  if (!context) {
    throw new Error(
      'useUserProfileSession must be used within UserProfileSessionProvider',
    );
  }
  return context;
}

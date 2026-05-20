'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  useCurrentAcademicYearQuery,
  type UseCurrentAcademicYearResult,
} from '@/hooks/use-current-academic-year';
import {
  useAcademicYearOptions,
  type AcademicYearOption,
} from '@/hooks/use-academic-calendar-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  activeAcademicYearStorageKey,
  readStoredActiveAcademicYearId,
  resolveInitialActiveYearId,
  writeStoredActiveAcademicYearId,
} from '@/lib/acadia/active-academic-year-storage';
import type {
  AcademicYearSetupStatus,
  CurrentAcademicYear,
} from '@/lib/supabase/queries/academic-year';

export type AcademicYearContextValue = UseCurrentAcademicYearResult & {
  setupStatus: AcademicYearSetupStatus | undefined;
  years: AcademicYearOption[];
  yearsLoading: boolean;
  activeYearId: string | null;
  activeYear: AcademicYearOption | null;
  setActiveYearId: (yearId: string) => void;
  resetToCurrentYear: () => void;
  isViewingCurrentYear: boolean;
  /** True when at least one academic year row exists (even if none is current). */
  hasAnyYear: boolean;
};

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;

  const value = useCurrentAcademicYearQuery();
  const { data: years = [], isLoading: yearsLoading } = useAcademicYearOptions();

  const [activeYearId, setActiveYearIdState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const previousCurrentYearIdRef = useRef<string | null>(null);
  const previousTenantIdRef = useRef<string | null>(null);

  const setActiveYearId = useCallback(
    (yearId: string) => {
      setActiveYearIdState(yearId);
      if (tenantId) {
        writeStoredActiveAcademicYearId(tenantId, yearId, userId);
      }
    },
    [tenantId, userId],
  );

  const resetToCurrentYear = useCallback(() => {
    if (value.currentYearId) {
      setActiveYearId(value.currentYearId);
    }
  }, [value.currentYearId, setActiveYearId]);

  // Reset when tenant changes
  useEffect(() => {
    if (previousTenantIdRef.current === tenantId) {
      return;
    }
    previousTenantIdRef.current = tenantId;
    setInitialized(false);
    setActiveYearIdState(null);
  }, [tenantId]);

  // Initialize active year once years and tenant are available
  useEffect(() => {
    if (!tenantId || yearsLoading || initialized) {
      return;
    }

    const stored = readStoredActiveAcademicYearId(tenantId, userId);
    const resolved = resolveInitialActiveYearId(
      years,
      value.currentYearId,
      stored,
    );
    setActiveYearIdState(resolved);
    if (resolved) {
      writeStoredActiveAcademicYearId(tenantId, resolved, userId);
    }
    previousCurrentYearIdRef.current = value.currentYearId;
    setInitialized(true);
  }, [
    tenantId,
    userId,
    years,
    yearsLoading,
    value.currentYearId,
    initialized,
  ]);

  // Sync active year across browser tabs
  useEffect(() => {
    if (!tenantId || typeof window === 'undefined') {
      return;
    }
    const key = activeAcademicYearStorageKey(tenantId, userId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) {
        return;
      }
      if (years.some((y) => y.id === event.newValue)) {
        setActiveYearIdState(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [tenantId, userId, years]);

  // When DB current year changes, follow it only if user was on the old current year
  useEffect(() => {
    if (!initialized) {
      return;
    }

    const prev = previousCurrentYearIdRef.current;
    const next = value.currentYearId;

    if (prev === next) {
      return;
    }

    previousCurrentYearIdRef.current = next;

    if (!next) {
      return;
    }

    const wasOnPreviousCurrent =
      activeYearId === prev || activeYearId === null || !activeYearId;

    if (wasOnPreviousCurrent) {
      setActiveYearId(next);
    }
  }, [value.currentYearId, initialized, activeYearId, setActiveYearId]);

  // Drop active year if it was removed from the list
  useEffect(() => {
    if (!initialized || yearsLoading || !activeYearId) {
      return;
    }
    if (!years.some((y) => y.id === activeYearId)) {
      const resolved = resolveInitialActiveYearId(
        years,
        value.currentYearId,
        null,
      );
      setActiveYearIdState(resolved);
      if (resolved && tenantId) {
        writeStoredActiveAcademicYearId(tenantId, resolved, userId);
      }
      toast.info('The selected academic year is no longer available. Switched to another year.');
    }
  }, [
    years,
    yearsLoading,
    activeYearId,
    initialized,
    value.currentYearId,
    tenantId,
    userId,
  ]);

  const activeYear = useMemo(
    () => years.find((y) => y.id === activeYearId) ?? null,
    [years, activeYearId],
  );

  const isViewingCurrentYear =
    !!value.currentYearId &&
    !!activeYearId &&
    activeYearId === value.currentYearId;

  const hasAnyYear = years.length > 0;

  const contextValue = useMemo<AcademicYearContextValue>(
    () => ({
      ...value,
      years,
      yearsLoading,
      activeYearId,
      activeYear,
      setActiveYearId,
      resetToCurrentYear,
      isViewingCurrentYear,
      hasAnyYear,
    }),
    [
      value,
      years,
      yearsLoading,
      activeYearId,
      activeYear,
      setActiveYearId,
      resetToCurrentYear,
      isViewingCurrentYear,
      hasAnyYear,
    ],
  );

  return (
    <AcademicYearContext.Provider value={contextValue}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYearContext(): AcademicYearContextValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYearContext must be used within AcademicYearProvider');
  }
  return ctx;
}

export function useAcademicYearContextOptional(): AcademicYearContextValue | null {
  return useContext(AcademicYearContext);
}

export function useCurrentAcademicYear(): Pick<
  AcademicYearContextValue,
  'currentYear' | 'currentYearId' | 'isConfigured' | 'isLoading' | 'yearCount'
> {
  const { currentYear, currentYearId, isConfigured, isLoading, yearCount } =
    useAcademicYearContext();
  return { currentYear, currentYearId, isConfigured, isLoading, yearCount };
}

export function useActiveAcademicYear(): Pick<
  AcademicYearContextValue,
  | 'activeYear'
  | 'activeYearId'
  | 'setActiveYearId'
  | 'resetToCurrentYear'
  | 'isViewingCurrentYear'
  | 'years'
  | 'yearsLoading'
  | 'currentYear'
  | 'currentYearId'
  | 'isConfigured'
  | 'isLoading'
  | 'hasAnyYear'
> {
  const ctx = useAcademicYearContext();
  return {
    activeYear: ctx.activeYear,
    activeYearId: ctx.activeYearId,
    setActiveYearId: ctx.setActiveYearId,
    resetToCurrentYear: ctx.resetToCurrentYear,
    isViewingCurrentYear: ctx.isViewingCurrentYear,
    years: ctx.years,
    yearsLoading: ctx.yearsLoading,
    currentYear: ctx.currentYear,
    currentYearId: ctx.currentYearId,
    isConfigured: ctx.isConfigured,
    isLoading: ctx.isLoading || ctx.yearsLoading,
    hasAnyYear: ctx.hasAnyYear,
  };
}

export type { CurrentAcademicYear, AcademicYearSetupStatus };

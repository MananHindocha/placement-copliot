"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface PrepSummaryBadge {
  pct: number;
  todayCount: number;
}

interface PrepDrawerContextValue {
  mobileOpen: boolean;
  prepSummary: PrepSummaryBadge;
  openDrawer: () => void;
  closeDrawer: () => void;
  setPrepSummary: (summary: PrepSummaryBadge) => void;
}

const PrepDrawerContext = createContext<PrepDrawerContextValue>({
  mobileOpen: false,
  prepSummary: { pct: 0, todayCount: 0 },
  openDrawer: () => {},
  closeDrawer: () => {},
  setPrepSummary: () => {},
});

export function PrepDrawerProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prepSummary, setPrepSummary] = useState<PrepSummaryBadge>({
    pct: 0,
    todayCount: 0,
  });

  const openDrawer = useCallback(() => setMobileOpen(true), []);
  const closeDrawer = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({
      mobileOpen,
      prepSummary,
      openDrawer,
      closeDrawer,
      setPrepSummary,
    }),
    [mobileOpen, prepSummary, openDrawer, closeDrawer]
  );

  return (
    <PrepDrawerContext.Provider value={value}>
      {children}
    </PrepDrawerContext.Provider>
  );
}

export function usePrepDrawer() {
  return useContext(PrepDrawerContext);
}

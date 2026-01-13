'use client';

import { useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'alps-ci-view-mode';
const DEFAULT_VIEW_MODE: ViewMode = 'grid';

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side to avoid hydration mismatch
    setIsClient(true);

    // Read from localStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'list' || saved === 'grid') {
          setViewMode(saved);
        }
      } catch (error) {
        // localStorage might be disabled (private browsing, quota exceeded)
        console.warn('Failed to read view mode from localStorage:', error);
      }
    }
  }, []);

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next: ViewMode = prev === 'grid' ? 'list' : 'grid';

      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (error) {
          // Handle quota exceeded or disabled localStorage
          console.warn('Failed to save view mode to localStorage:', error);
        }
      }

      return next;
    });
  };

  return { viewMode, toggleViewMode, isClient };
}


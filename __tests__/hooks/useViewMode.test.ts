import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useViewMode } from 'app/hooks/useViewMode';

describe('useViewMode', () => {
  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock = {};

    // Mock localStorage methods using Object.defineProperty
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        clear: () => {
          localStorageMock = {};
        },
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorageMock = {};
  });

  test('should default to grid view mode', () => {
    const { result } = renderHook(() => useViewMode());

    expect(result.current.viewMode).toBe('grid');
  });

  test('should read view mode from localStorage on mount', async () => {
    localStorageMock['alps-ci-view-mode'] = 'list';

    const { result } = renderHook(() => useViewMode());

    // Wait for useEffect to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.viewMode).toBe('list');
  });

  test('should toggle from grid to list', () => {
    const { result } = renderHook(() => useViewMode());

    expect(result.current.viewMode).toBe('grid');

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe('list');
    expect(localStorageMock['alps-ci-view-mode']).toBe('list');
  });

  test('should toggle from list to grid', async () => {
    localStorageMock['alps-ci-view-mode'] = 'list';

    const { result } = renderHook(() => useViewMode());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.viewMode).toBe('list');

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe('grid');
    expect(localStorageMock['alps-ci-view-mode']).toBe('grid');
  });

  test('should save view mode to localStorage when toggling', () => {
    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current.toggleViewMode();
    });

    expect(localStorageMock['alps-ci-view-mode']).toBe('list');

    act(() => {
      result.current.toggleViewMode();
    });

    expect(localStorageMock['alps-ci-view-mode']).toBe('grid');
  });

  test('should handle invalid localStorage value and default to grid', async () => {
    localStorageMock['alps-ci-view-mode'] = 'invalid-mode';

    const { result } = renderHook(() => useViewMode());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.viewMode).toBe('grid');
  });

  test('should handle missing localStorage value and default to grid', async () => {
    const { result } = renderHook(() => useViewMode());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.viewMode).toBe('grid');
  });

  test('should handle localStorage errors gracefully', async () => {
    // Mock localStorage.getItem to throw an error
    Object.defineProperty(global, 'localStorage', {
      value: {
        ...global.localStorage,
        getItem: () => {
          throw new Error('localStorage disabled');
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useViewMode());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Should default to grid when localStorage fails
    expect(result.current.viewMode).toBe('grid');
  });

  test('should handle localStorage write errors gracefully', () => {
    // Mock localStorage.setItem to throw an error
    Object.defineProperty(global, 'localStorage', {
      value: {
        ...global.localStorage,
        setItem: () => {
          throw new Error('localStorage quota exceeded');
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useViewMode());

    // Should not throw error when toggling
    act(() => {
      result.current.toggleViewMode();
    });

    // View mode should still change in memory
    expect(result.current.viewMode).toBe('list');
  });

  test('should set isClient to true after mount', async () => {
    const { result } = renderHook(() => useViewMode());

    // In testing environment, useEffect runs synchronously, so isClient should already be true
    // Wait for useEffect to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Should be true after mount
    expect(result.current.isClient).toBe(true);
  });

  test('should persist view mode across multiple toggles', () => {
    const { result } = renderHook(() => useViewMode());

    // Toggle multiple times
    act(() => {
      result.current.toggleViewMode(); // grid -> list
    });
    expect(result.current.viewMode).toBe('list');
    expect(localStorageMock['alps-ci-view-mode']).toBe('list');

    act(() => {
      result.current.toggleViewMode(); // list -> grid
    });
    expect(result.current.viewMode).toBe('grid');
    expect(localStorageMock['alps-ci-view-mode']).toBe('grid');

    act(() => {
      result.current.toggleViewMode(); // grid -> list
    });
    expect(result.current.viewMode).toBe('list');
    expect(localStorageMock['alps-ci-view-mode']).toBe('list');
  });

  test('should only accept valid view modes from localStorage', async () => {
    // Test with grid
    localStorageMock['alps-ci-view-mode'] = 'grid';
    const { result: result1 } = renderHook(() => useViewMode());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result1.current.viewMode).toBe('grid');

    // Test with list
    localStorageMock['alps-ci-view-mode'] = 'list';
    const { result: result2 } = renderHook(() => useViewMode());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result2.current.viewMode).toBe('list');

    // Test with invalid value
    localStorageMock['alps-ci-view-mode'] = 'table';
    const { result: result3 } = renderHook(() => useViewMode());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(result3.current.viewMode).toBe('grid'); // Should default to grid
  });
});


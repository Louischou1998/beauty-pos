import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 * Default behavior: no mock fallback (API-only).
 * Backward compatible:
 *   useApi(apiFn, mockData, deps)
 * Preferred:
 *   useApi(apiFn, { mockData, deps, fallbackToMock })
 */
export function useApi(apiFn, arg2 = null, arg3 = []) {
  const isOptions = arg2 && typeof arg2 === 'object' && !Array.isArray(arg2) && Object.prototype.hasOwnProperty.call(arg2, 'deps');
  const mockData = isOptions ? (arg2.mockData ?? null) : arg2;
  const deps = isOptions ? (arg2.deps ?? []) : arg3;
  const fallbackToMock = isOptions ? Boolean(arg2.fallbackToMock) : false;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState(null);
  const depsKey = JSON.stringify(deps);
  const apiFnRef = useRef(apiFn);
  const fallbackToMockRef = useRef(fallbackToMock);
  const mockDataRef = useRef(mockData);

  useEffect(() => { apiFnRef.current = apiFn; }, [apiFn]);
  useEffect(() => { fallbackToMockRef.current = fallbackToMock; }, [fallbackToMock]);
  useEffect(() => { mockDataRef.current = mockData; }, [mockData]);

  const fetch = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFnRef.current();
      if (signal?.aborted) return result;
      setData(result);
      setUsingMock(false);
      return result;
    } catch (err) {
      if (signal?.aborted) return;
      setError(err);
      if (fallbackToMockRef.current && mockDataRef.current !== null) {
        setData(mockDataRef.current);
        setUsingMock(true);
      } else {
        setUsingMock(false);
      }
      throw err;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [fetch, depsKey]);

  return { data, loading, usingMock, error, refetch: fetch, setData };
}

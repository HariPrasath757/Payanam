'use client';

import { useState, useEffect } from 'react';
import { DatabaseReference, onValue, DataSnapshot } from 'firebase/database';

/**
 * Hook to subscribe to a Realtime Database reference in real-time.
 * Transforms an object-based RTDB "collection" into an array with IDs.
 */
export function useRTDB<T = any>(
  memoizedRef: (DatabaseReference & { __memo?: boolean }) | null | undefined
) {
  const [data, setData] = useState<T[] | null>(null);
  const [singleData, setSingleData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setSingleData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onValue(
      memoizedRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // If it's an object of objects (like a collection), turn it into an array
          const results = Object.entries(val).map(([id, item]) => ({
            ...(item as any),
            id,
          }));
          setData(results as any);
          setSingleData(val as any);
        } else {
          // Otherwise just pass the value
          setData(val ? (Array.isArray(val) ? val : [val]) : []);
          setSingleData(val);
        }
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("RTDB error:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef]);

  if (memoizedRef && !memoizedRef.__memo) {
    throw new Error('RTDB reference was not properly memoized using useMemoFirebase');
  }

  return { data, singleData, isLoading, error };
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Small URL-backed state for filters (?key=value), so filtered views can be
 * shared and survive a refresh. The default value is never written to the URL.
 */
export function useUrlState<T extends string>(key: string, fallback: T, valid: (v: string) => boolean): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(key);
    if (v !== null && valid(v)) setValue(v as T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      const url = new URL(window.location.href);
      if (v === fallback || v === "") url.searchParams.delete(key);
      else url.searchParams.set(key, v);
      window.history.replaceState(window.history.state, "", url);
    },
    [key, fallback],
  );
  return [value, set];
}

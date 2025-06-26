
import { useState, useEffect } from 'react';

interface DebouncedFiltersOptions {
  delay?: number;
}

/**
 * Custom hook for debouncing filter updates to prevent excessive API calls
 * @param initialValue - Initial filter value
 * @param options - Configuration options including delay
 * @returns Object with current value, debounced value, and setter
 */
export function useDebouncedFilters<T>(
  initialValue: T,
  options: DebouncedFiltersOptions = {}
) {
  const { delay = 300 } = options;
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing: value !== debouncedValue
  };
}

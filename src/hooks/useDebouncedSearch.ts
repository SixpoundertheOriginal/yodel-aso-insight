
import { useState, useCallback, useRef } from 'react';

interface UseDebouncedSearchProps {
  delay?: number;
  onSearch: (query: string) => Promise<void>;
}

export const useDebouncedSearch = ({ 
  delay = 500, 
  onSearch 
}: UseDebouncedSearchProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const searchCooldown = 2000; // 2 second cooldown between searches

  const debouncedSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    
    if (timeSinceLastSearch < searchCooldown && lastSearchTime > 0) {
      console.log(`🚫 [DEBOUNCED-SEARCH] Search blocked - cooldown active (${searchCooldown - timeSinceLastSearch}ms remaining)`);
      return;
    }

    // Prevent multiple concurrent searches
    if (isSearching) {
      console.log('🚫 [DEBOUNCED-SEARCH] Search blocked - already in progress');
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setLastSearchTime(Date.now());
      
      try {
        await onSearch(query);
      } catch (error) {
        console.error('❌ [DEBOUNCED-SEARCH] Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, delay);
  }, [delay, onSearch, isSearching, lastSearchTime]);

  const cancelSearch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsSearching(false);
  }, []);

  return {
    debouncedSearch,
    isSearching,
    cancelSearch
  };
};

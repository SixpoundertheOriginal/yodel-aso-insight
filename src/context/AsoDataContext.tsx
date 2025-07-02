// ✅ ADD THIS TO THE TOP OF YOUR WORKING AsoDataContext.tsx (after imports):

import { debounce } from 'lodash';

// ✅ ADD THIS RIGHT AFTER THE registerHookInstance FUNCTION (around line 100):

// ✅ MINIMAL LOOP FIX: Debounce registration to prevent infinite loops
const debouncedRegisterHookInstance = useMemo(() => 
  debounce((instanceId: string, data: HookInstanceData) => {
    registerHookInstance(instanceId, data);
  }, 50), // 50ms debounce
  [registerHookInstance]
);

// ✅ REPLACE the useEffect that registers the fallback hook with this:

useEffect(() => {
  if (fallbackBigQueryResult.meta?.availableTrafficSources) {
    debouncedRegisterHookInstance('fallback-context-hook', {
      instanceId: 'fallback-context-hook',
      availableTrafficSources: fallbackBigQueryResult.meta.availableTrafficSources,
      sourcesCount: fallbackBigQueryResult.meta.availableTrafficSources.length,
      data: fallbackBigQueryResult.data,
      metadata: fallbackBigQueryResult.meta,
      loading: fallbackBigQueryResult.loading,
      error: fallbackBigQueryResult.error,
      lastUpdated: Date.now()
    });
  }
}, [fallbackBigQueryResult.data, fallbackBigQueryResult.meta, fallbackBigQueryResult.loading, fallbackBigQueryResult.error, debouncedRegisterHookInstance]);

// ✅ UPDATE the contextValue to expose the debounced version:

const contextValue: AsoDataContextType = {
  // ... all existing properties ...
  registerHookInstance: debouncedRegisterHookInstance, // ✅ Use debounced version
};

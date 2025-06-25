
import React, { createContext, useContext, useState, useEffect } from 'react';

interface BigQueryAppContextType {
  selectedApps: string[];
  setSelectedApps: (apps: string[]) => void;
}

const BigQueryAppContext = createContext<BigQueryAppContextType | undefined>(undefined);

export const BigQueryAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  // Initialize with all apps selected (empty array means all)
  useEffect(() => {
    // Default to all apps - the selector will handle the "all apps" logic
    setSelectedApps([]);
  }, []);

  return (
    <BigQueryAppContext.Provider value={{ selectedApps, setSelectedApps }}>
      {children}
    </BigQueryAppContext.Provider>
  );
};

export const useBigQueryAppSelection = () => {
  const context = useContext(BigQueryAppContext);
  if (context === undefined) {
    throw new Error('useBigQueryAppSelection must be used within a BigQueryAppProvider');
  }
  return context;
};

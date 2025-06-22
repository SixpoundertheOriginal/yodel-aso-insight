import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface CopilotData {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  category: 'optimization' | 'strategy' | 'analysis' | 'system';
  status: 'available' | 'in-progress' | 'completed';
}

export interface CopilotSession {
  copilotId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  isActive: boolean;
}

interface AsoAiHubContextType {
  copilots: CopilotData[];
  activeCopilot: string | null;
  currentSession: CopilotSession | null;
  setActiveCopilot: (id: string | null) => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  clearSession: () => void;
  updateCopilotProgress: (id: string, progress: number) => void;
}

const AsoAiHubContext = createContext<AsoAiHubContextType | undefined>(undefined);

export const useAsoAiHub = () => {
  const context = useContext(AsoAiHubContext);
  if (!context) {
    throw new Error('useAsoAiHub must be used within AsoAiHubProvider');
  }
  return context;
};

const initialCopilots: CopilotData[] = [
  {
    id: 'metadata-copilot',
    name: 'Metadata Copilot',
    description: 'Generate keyword-optimized metadata sets with strategic positioning',
    icon: '📝',
    progress: 92,
    category: 'optimization',
    status: 'available'
  },
  {
    id: 'cpp-strategy-copilot',
    name: 'CPP Strategy Copilot',
    description: 'Analyze screenshots and generate Custom Product Page themes for better conversion',
    icon: '🎯',
    progress: 88,
    category: 'strategy',
    status: 'available'
  },
  {
    id: 'growth-gap-finder',
    name: 'Growth Gap Finder',
    description: 'Analyze keyword data to uncover ranking gaps and growth opportunities.',
    icon: '💡',
    progress: 75,
    category: 'analysis',
    status: 'available'
  },
  {
    id: 'cpp-strategy-builder',
    name: 'CPP Strategy Builder',
    description: 'Craft seasonal Custom Product Pages with strategic conversion hooks',
    icon: '🎯',
    progress: 87,
    category: 'strategy',
    status: 'available'
  },
  {
    id: 'featuring-assistant',
    name: 'Featuring Assistant',
    description: 'Plan feature-eligible moments using App Store featuring logic',
    icon: '⭐',
    progress: 95,
    category: 'strategy',
    status: 'available'
  },
  {
    id: 'reporting-strategist',
    name: 'Reporting Strategist',
    description: 'Analyze ASO performance data and surface actionable trends',
    icon: '📊',
    progress: 89,
    category: 'analysis',
    status: 'available'
  },
  {
    id: 'system-strategist',
    name: 'System Strategist',
    description: 'AI-powered insights for improving GPT modules and ASO workflows',
    icon: '🧠',
    progress: 78,
    category: 'system',
    status: 'available'
  }
];

export const AsoAiHubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [copilots, setCopilots] = useState<CopilotData[]>(initialCopilots);
  const [activeCopilot, setActiveCopilot] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<CopilotSession | null>(null);

  // Listen for workflow transfers
  useEffect(() => {
    const handleWorkflowTransfer = (event: CustomEvent) => {
      const { targetCopilotId, data } = event.detail;
      console.log(`🔄 [AI-HUB] Workflow transfer to: ${targetCopilotId}`, data);
      
      // Switch to target copilot
      handleSetActiveCopilot(targetCopilotId);
      
      // Add context message about the transfer
      setTimeout(() => {
        if (currentSession) {
          const transferMessage = `🔄 Workflow Transfer: I've received data from the previous step. Let me help you continue with the next phase of your ASO optimization.`;
          addMessage(transferMessage, 'assistant');
        }
      }, 500);
    };

    window.addEventListener('workflow-transfer', handleWorkflowTransfer as EventListener);
    
    return () => {
      window.removeEventListener('workflow-transfer', handleWorkflowTransfer as EventListener);
    };
  }, [currentSession]);

  const handleSetActiveCopilot = (id: string | null) => {
    setActiveCopilot(id);
    if (id) {
      setCurrentSession({
        copilotId: id,
        messages: [],
        isActive: true
      });
    } else {
      setCurrentSession(null);
    }
  };

  const addMessage = (content: string, role: 'user' | 'assistant') => {
    if (!currentSession) return;
    
    const newMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage]
    } : null);
  };

  const clearSession = () => {
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: []
    } : null);
  };

  const updateCopilotProgress = (id: string, progress: number) => {
    setCopilots(prev => 
      prev.map(copilot => 
        copilot.id === id ? { ...copilot, progress } : copilot
      )
    );
  };

  return (
    <AsoAiHubContext.Provider value={{
      copilots,
      activeCopilot,
      currentSession,
      setActiveCopilot: handleSetActiveCopilot,
      addMessage,
      clearSession,
      updateCopilotProgress
    }}>
      {children}
    </AsoAiHubContext.Provider>
  );
};

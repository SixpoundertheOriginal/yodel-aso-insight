
import React from 'react';
import { useAsoAiHub } from '@/context/AsoAiHubContext';
import { CopilotCard } from './CopilotCard';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Target, Settings } from 'lucide-react';

export const CopilotGrid: React.FC = () => {
  const { copilots } = useAsoAiHub();

  // Enhanced categorization with priority levels
  const featuredCopilots = copilots.filter(c => 
    ['metadata-copilot', 'growth-gap-finder', 'cpp-strategy-copilot'].includes(c.id)
  );
  
  const strategyCopilots = copilots.filter(c => 
    ['cpp-strategy-builder', 'featuring-assistant'].includes(c.id)
  );
  
  const analysisCopilots = copilots.filter(c => 
    ['reporting-strategist'].includes(c.id)
  );
  
  const systemCopilots = copilots.filter(c => 
    ['system-strategist'].includes(c.id)
  );

  return (
    <div className="space-y-10">
      {/* Featured Section - Primary Tools */}
      <CopilotSection 
        title="Featured Copilots" 
        description="Most powerful tools for comprehensive ASO optimization"
        copilots={featuredCopilots}
        priority="featured"
        icon={<Star className="h-5 w-5 text-yodel-orange" />}
        badge="Most Popular"
      />
      
      {/* Strategy Section */}
      <CopilotSection 
        title="Strategy & Planning" 
        description="Long-term ASO strategy and campaign planning tools"
        copilots={strategyCopilots}
        priority="high"
        icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
      />
      
      {/* Analysis Section */}
      <CopilotSection 
        title="Performance Analysis" 
        description="Deep insights into app performance and market trends"
        copilots={analysisCopilots}
        priority="medium"
        icon={<Target className="h-5 w-5 text-green-400" />}
      />
      
      {/* System Section */}
      <CopilotSection 
        title="System & Optimization" 
        description="Advanced tools for system optimization and workflow enhancement"
        copilots={systemCopilots}
        priority="low"
        icon={<Settings className="h-5 w-5 text-purple-400" />}
      />
    </div>
  );
};

interface CopilotSectionProps {
  title: string;
  description: string;
  copilots: any[];
  priority: 'featured' | 'high' | 'medium' | 'low';
  icon?: React.ReactNode;
  badge?: string;
}

const CopilotSection: React.FC<CopilotSectionProps> = ({ 
  title, 
  description, 
  copilots, 
  priority, 
  icon,
  badge 
}) => {
  if (copilots.length === 0) return null;

  const getGridCols = () => {
    switch (priority) {
      case 'featured': return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
      case 'high': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 'medium': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      case 'low': return 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {badge && (
                <Badge variant="outline" className="text-yodel-orange border-yodel-orange text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm mt-1">{description}</p>
          </div>
        </div>
        
        {priority === 'featured' && (
          <div className="text-right">
            <div className="text-sm text-zinc-400">Ready to Use</div>
            <div className="text-xs text-yodel-orange">• Professional Grade</div>
          </div>
        )}
      </div>
      
      {/* Enhanced Grid Layout */}
      <div className={`grid gap-6 ${getGridCols()}`}>
        {copilots.map((copilot) => (
          <CopilotCard 
            key={copilot.id} 
            copilot={copilot} 
            priority={priority}
          />
        ))}
      </div>
    </div>
  );
};


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle } from 'lucide-react';
import { useAsoAiHub, CopilotData } from '@/context/AsoAiHubContext';

interface CopilotCardProps {
  copilot: CopilotData;
}

export const CopilotCard: React.FC<CopilotCardProps> = ({ copilot }) => {
  const { setActiveCopilot, activeCopilot } = useAsoAiHub();

  const handleLaunch = () => {
    setActiveCopilot(copilot.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in-progress': return 'bg-yodel-orange/20 text-yodel-orange border-yodel-orange/30';
      default: return 'bg-zinc-700/50 text-zinc-300 border-zinc-600';
    }
  };

  const isActive = activeCopilot === copilot.id;

  return (
    <Card className={`bg-zinc-900/50 backdrop-blur-sm border transition-all duration-300 hover:scale-105 ${
      isActive 
        ? 'border-yodel-orange shadow-lg shadow-yodel-orange/20' 
        : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{copilot.icon}</div>
            <div>
              <CardTitle className="text-lg text-white">{copilot.name}</CardTitle>
              <Badge 
                variant="outline" 
                className={`mt-1 text-xs ${getStatusColor(copilot.status)}`}
              >
                {copilot.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {copilot.status.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-yodel-orange">{copilot.progress}%</div>
            <div className="w-12 h-1 bg-zinc-700 rounded-full mt-1">
              <div 
                className="h-full bg-yodel-orange rounded-full transition-all duration-300"
                style={{ width: `${copilot.progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
          {copilot.description}
        </p>
        
        <Button 
          onClick={handleLaunch}
          className={`w-full transition-all duration-300 ${
            isActive
              ? 'bg-yodel-orange/20 text-yodel-orange border border-yodel-orange'
              : 'bg-yodel-orange hover:bg-yodel-orange/90 text-white'
          }`}
          variant={isActive ? "outline" : "default"}
        >
          <Play className="w-4 h-4 mr-2" />
          {isActive ? 'Active' : 'Launch Copilot'}
        </Button>
      </CardContent>
    </Card>
  );
};

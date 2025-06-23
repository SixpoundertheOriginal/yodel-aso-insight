
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useAsoAiHub, CopilotData } from '@/context/AsoAiHubContext';

interface CopilotCardProps {
  copilot: CopilotData;
  priority?: 'featured' | 'high' | 'medium' | 'low';
}

export const CopilotCard: React.FC<CopilotCardProps> = ({ copilot, priority = 'medium' }) => {
  const { setActiveCopilot, activeCopilot } = useAsoAiHub();

  const handleLaunch = () => {
    setActiveCopilot(copilot.id);
  };

  const getStatusInfo = (status: string, progress: number) => {
    if (status === 'completed') {
      return {
        label: 'Ready to Use',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: <CheckCircle className="w-3 h-3 mr-1" />
      };
    }
    if (status === 'in-progress') {
      return {
        label: 'In Development',
        color: 'bg-yodel-orange/20 text-yodel-orange border-yodel-orange/30',
        icon: <Clock className="w-3 h-3 mr-1" />
      };
    }
    return {
      label: 'Available',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: <Sparkles className="w-3 h-3 mr-1" />
    };
  };

  const getCardSize = () => {
    switch (priority) {
      case 'featured': return 'min-h-[180px]';
      case 'high': return 'min-h-[160px]';
      case 'medium': return 'min-h-[140px]';
      case 'low': return 'min-h-[120px]';
      default: return 'min-h-[140px]';
    }
  };

  const isActive = activeCopilot === copilot.id;
  const statusInfo = getStatusInfo(copilot.status, copilot.progress);
  const isFeatured = priority === 'featured';

  return (
    <Card className={`bg-zinc-900/50 backdrop-blur-sm border transition-all duration-300 hover:scale-105 ${getCardSize()} ${
      isActive 
        ? 'border-yodel-orange shadow-lg shadow-yodel-orange/20' 
        : 'border-zinc-800 hover:border-zinc-700'
    } ${isFeatured ? 'relative overflow-hidden' : ''}`}>
      
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-yodel-orange/20 text-yodel-orange border-yodel-orange/30 text-xs">
            Featured
          </Badge>
        </div>
      )}

      <CardHeader className={`pb-3 ${isFeatured ? 'pt-6' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className={`${isFeatured ? 'text-4xl' : 'text-3xl'}`}>
              {copilot.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-white leading-tight ${
                isFeatured ? 'text-lg' : 'text-base'
              }`}>
                {copilot.name}
              </CardTitle>
              <Badge 
                variant="outline" 
                className={`mt-2 text-xs ${statusInfo.color}`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex flex-col justify-between flex-1">
        <div>
          <p className={`text-zinc-400 leading-relaxed mb-4 ${
            isFeatured ? 'text-sm' : 'text-sm'
          }`}>
            {copilot.description}
          </p>
          
          {/* Enhanced Usage Stats */}
          {copilot.progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-zinc-500">Optimization Level</span>
                <span className="text-xs font-medium text-yodel-orange">
                  {copilot.progress >= 90 ? 'Excellent' : 
                   copilot.progress >= 80 ? 'Very Good' : 
                   copilot.progress >= 70 ? 'Good' : 'Developing'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-700 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-yodel-orange to-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${copilot.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleLaunch}
          className={`w-full transition-all duration-300 mt-auto ${
            isActive
              ? 'bg-yodel-orange/20 text-yodel-orange border border-yodel-orange hover:bg-yodel-orange/30'
              : 'bg-yodel-orange hover:bg-yodel-orange/90 text-white'
          } ${isFeatured ? 'h-10' : 'h-9'}`}
          variant={isActive ? "outline" : "default"}
        >
          <Play className={`${isFeatured ? 'w-4 h-4' : 'w-3 h-3'} mr-2`} />
          {isActive ? 'Active Session' : 'Launch Copilot'}
        </Button>
      </CardContent>
    </Card>
  );
};

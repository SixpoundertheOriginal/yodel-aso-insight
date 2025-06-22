
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { BarChart3, TrendingUp, Users, Zap } from 'lucide-react';

interface Metrics {
  conversionLift: number;
  retentionIncrease: number;
  engagementBoost: number;
}

interface Differentiator {
  id: string;
  text: string;
  type: 'exclusive' | 'first' | 'award' | 'partnership';
}

interface ValueImpactTrackerProps {
  metrics: Metrics;
  differentiators: Differentiator[];
  onMetricsChange: (metrics: Metrics) => void;
  onDifferentiatorsChange: (differentiators: Differentiator[]) => void;
}

export const ValueImpactTracker: React.FC<ValueImpactTrackerProps> = ({
  metrics,
  differentiators,
  onMetricsChange,
  onDifferentiatorsChange
}) => {
  const [newDifferentiator, setNewDifferentiator] = useState('');
  const [selectedType, setSelectedType] = useState<Differentiator['type']>('exclusive');

  const addDifferentiator = () => {
    if (!newDifferentiator.trim()) return;
    
    const differentiator: Differentiator = {
      id: Date.now().toString(),
      text: newDifferentiator,
      type: selectedType
    };
    
    onDifferentiatorsChange([...differentiators, differentiator]);
    setNewDifferentiator('');
  };

  const removeDifferentiator = (id: string) => {
    onDifferentiatorsChange(differentiators.filter(d => d.id !== id));
  };

  const getDifferentiatorIcon = (type: Differentiator['type']) => {
    switch (type) {
      case 'exclusive': return '🔐';
      case 'first': return '🥇';
      case 'award': return '🏆';
      case 'partnership': return '🤝';
    }
  };

  const getDifferentiatorColor = (type: Differentiator['type']) => {
    switch (type) {
      case 'exclusive': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'first': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'award': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'partnership': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" />
          <span>Value Impact</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-yodel-orange" />
            <span>Value Impact Tracker</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics Input */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-sm text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Conversion Lift (%)</label>
                <Input
                  type="number"
                  value={metrics.conversionLift}
                  onChange={(e) => onMetricsChange({
                    ...metrics,
                    conversionLift: Number(e.target.value)
                  })}
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Retention Increase (%)</label>
                <Input
                  type="number"
                  value={metrics.retentionIncrease}
                  onChange={(e) => onMetricsChange({
                    ...metrics,
                    retentionIncrease: Number(e.target.value)
                  })}
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Engagement Boost (%)</label>
                <Input
                  type="number"
                  value={metrics.engagementBoost}
                  onChange={(e) => onMetricsChange({
                    ...metrics,
                    engagementBoost: Number(e.target.value)
                  })}
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Impact Infographics */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-sm text-white">Impact Infographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {/* Conversion Card */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Conversion Impact</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.conversionLift > 0 ? `${metrics.conversionLift}x` : '--'}
                  </div>
                  <div className="text-xs text-zinc-300">higher conversion rate</div>
                </div>

                {/* Retention Card */}
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-lg border border-blue-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">Retention Impact</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.retentionIncrease > 0 ? `+${metrics.retentionIncrease}%` : '--'}
                  </div>
                  <div className="text-xs text-zinc-300">user retention increase</div>
                </div>

                {/* Engagement Card */}
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-lg border border-purple-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-purple-400 font-medium">Engagement Impact</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.engagementBoost > 0 ? `+${metrics.engagementBoost}%` : '--'}
                  </div>
                  <div className="text-xs text-zinc-300">engagement boost</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Differentiators Section */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">Key Differentiators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newDifferentiator}
                onChange={(e) => setNewDifferentiator(e.target.value)}
                placeholder="Add a key differentiator..."
                className="bg-zinc-700 border-zinc-600 text-white"
              />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as Differentiator['type'])}
                className="bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="exclusive">Exclusive</option>
                <option value="first">First-to-Market</option>
                <option value="award">Award-Winning</option>
                <option value="partnership">Partnership</option>
              </select>
              <Button onClick={addDifferentiator} size="sm">Add</Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {differentiators.map((diff) => (
                <Badge
                  key={diff.id}
                  variant="outline"
                  className={`text-xs ${getDifferentiatorColor(diff.type)} cursor-pointer`}
                  onClick={() => removeDifferentiator(diff.id)}
                >
                  {getDifferentiatorIcon(diff.type)} {diff.text} ×
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

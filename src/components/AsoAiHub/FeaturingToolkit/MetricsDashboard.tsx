
import React from 'react';
import { MetricCard } from '@/components/ui/design-system';
import { TrendingUp, Award, Target } from 'lucide-react';

export const MetricsDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCard
      title="Potential Visibility Boost"
      value="8x"
      change={{ value: 700, period: 'vs. baseline', trend: 'up' }}
      icon={<TrendingUp />}
      variant="success"
    />
    <MetricCard
      title="Success Probability"
      value="75%"
      change={{ value: 25, period: 'with toolkit', trend: 'up' }}
      icon={<Target />}
      variant="default"
    />
    <MetricCard
      title="Strategic Alignment"
      value="High"
      icon={<Award />}
      variant="warning"
    />
  </div>
);

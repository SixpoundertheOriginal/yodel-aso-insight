
import { useMemo } from 'react';
import { useComparisonData } from './useComparisonData';
import { useAsoData } from '../context/AsoDataContext';
import { Insight, InsightType, InsightPriority } from '../components/InsightCard';

interface InsightGenerationConfig {
  anomalyThreshold: number;
  trendThreshold: number;
  maxInsights: number;
}

const defaultConfig: InsightGenerationConfig = {
  anomalyThreshold: 30, // ±30% for anomaly detection
  trendThreshold: 15,   // ±15% for trend significance
  maxInsights: 5
};

export const useAsoInsights = (config: Partial<InsightGenerationConfig> = {}) => {
  const { data, loading } = useAsoData();
  const periodComparison = useComparisonData('period');
  const finalConfig = { ...defaultConfig, ...config };

  const insights = useMemo((): Insight[] => {
    if (!data || loading || !periodComparison.current || !periodComparison.previous) {
      return [];
    }

    const generatedInsights: Insight[] = [];

    // 1. Performance Anomaly Detection
    const checkAnomalies = () => {
      const { summary } = data;
      
      // Impressions anomaly
      if (Math.abs(summary.impressions.delta) > finalConfig.anomalyThreshold) {
        const isPositive = summary.impressions.delta > 0;
        generatedInsights.push({
          id: `anomaly-impressions-${Date.now()}`,
          type: 'anomaly',
          priority: Math.abs(summary.impressions.delta) > 50 ? 'high' : 'medium',
          title: `Impressions ${isPositive ? 'Spike' : 'Drop'} Detected`,
          description: `Impressions ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(summary.impressions.delta).toFixed(1)}% vs previous period${isPositive ? ' - identify what drove this success' : ' - investigate potential algorithm changes'}`,
          metric: 'Impressions Change',
          value: summary.impressions.delta,
          confidence: 95,
          actionable: true
        });
      }

      // Downloads anomaly
      if (Math.abs(summary.downloads.delta) > finalConfig.anomalyThreshold) {
        const isPositive = summary.downloads.delta > 0;
        generatedInsights.push({
          id: `anomaly-downloads-${Date.now()}`,
          type: 'anomaly', 
          priority: Math.abs(summary.downloads.delta) > 50 ? 'high' : 'medium',
          title: `Download ${isPositive ? 'Surge' : 'Decline'} Alert`,
          description: `Downloads ${isPositive ? 'spiked' : 'dropped'} ${Math.abs(summary.downloads.delta).toFixed(1)}% vs previous period${isPositive ? ' - analyze successful tactics for replication' : ' - immediate investigation required'}`,
          metric: 'Downloads Change',
          value: summary.downloads.delta,
          confidence: 92,
          actionable: true
        });
      }

      // CVR anomaly (special case)
      if (Math.abs(summary.cvr.delta) > 20) {
        const isPositive = summary.cvr.delta > 0;
        generatedInsights.push({
          id: `anomaly-cvr-${Date.now()}`,
          type: isPositive ? 'trend' : 'anomaly',
          priority: isPositive ? 'medium' : 'high',
          title: `Conversion Rate ${isPositive ? 'Optimization' : 'Issue'}`,
          description: `CVR ${isPositive ? 'improving steadily' : 'declining'} (${summary.cvr.delta > 0 ? '+' : ''}${summary.cvr.delta.toFixed(1)}%)${isPositive ? ' - current optimization strategy is working' : ' - review product page elements immediately'}`,
          metric: 'CVR Change',
          value: summary.cvr.delta,
          confidence: 88,
          actionable: true
        });
      }
    };

    // 2. Trend Analysis & Predictions
    const analyzeTrends = () => {
      const { summary } = data;
      
      // Strong positive trends
      if (summary.downloads.delta > finalConfig.trendThreshold && summary.impressions.delta > finalConfig.trendThreshold) {
        const projectedGrowth = Math.round((summary.downloads.value * (1 + summary.downloads.delta / 100)) * 1.1);
        generatedInsights.push({
          id: `trend-growth-${Date.now()}`,
          type: 'trend',
          priority: 'medium',
          title: 'Strong Growth Trajectory Detected',
          description: `Based on current momentum (+${summary.downloads.delta.toFixed(1)}% downloads, +${summary.impressions.delta.toFixed(1)}% impressions), expect ~${projectedGrowth.toLocaleString()} downloads next period`,
          metric: 'Projected Downloads',
          value: projectedGrowth,
          confidence: 78,
          actionable: false
        });
      }

      // CVR optimization momentum
      if (summary.cvr.delta > 10) {
        generatedInsights.push({
          id: `trend-cvr-${Date.now()}`,
          type: 'trend',
          priority: 'low',
          title: 'CVR Momentum Building',
          description: `Conversion rate at ${summary.cvr.value.toFixed(1)}% (+${summary.cvr.delta.toFixed(1)}%) indicates strong product-market fit and optimization success`,
          metric: 'Current CVR',
          value: parseFloat(summary.cvr.value.toFixed(1)),
          confidence: 85,
          actionable: false
        });
      }
    };

    // 3. Actionable Recommendations
    const generateRecommendations = () => {
      const { summary } = data;
      
      // High CVR + Low Impressions = Scale Opportunity
      if (summary.cvr.value > 3 && summary.impressions.delta < 0) {
        generatedInsights.push({
          id: `rec-scale-${Date.now()}`,
          type: 'recommendation',
          priority: 'high',
          title: 'Scale Opportunity Identified',
          description: `Strong CVR (${summary.cvr.value.toFixed(1)}%) with declining impressions (-${Math.abs(summary.impressions.delta).toFixed(1)}%) - capitalize on conversion momentum by increasing impression volume now`,
          metric: 'CVR Performance',
          value: parseFloat(summary.cvr.value.toFixed(1)),
          confidence: 90,
          actionable: true
        });
      }

      // Impression growth without download growth = CVR issue
      if (summary.impressions.delta > 15 && summary.downloads.delta < 5) {
        generatedInsights.push({
          id: `rec-cvr-opt-${Date.now()}`,
          type: 'recommendation',
          priority: 'medium',
          title: 'Conversion Optimization Needed',
          description: `Impressions growing (+${summary.impressions.delta.toFixed(1)}%) but downloads lagging (+${summary.downloads.delta.toFixed(1)}%) - focus on product page optimization and screenshots`,
          metric: 'CVR Gap',
          value: parseFloat((summary.downloads.delta - summary.impressions.delta).toFixed(1)),
          confidence: 83,
          actionable: true
        });
      }

      // Strong performance overall
      if (summary.downloads.delta > 20 && summary.cvr.delta > 10) {
        generatedInsights.push({
          id: `rec-momentum-${Date.now()}`,
          type: 'recommendation',
          priority: 'low',
          title: 'Maintain Current Strategy',
          description: `Exceptional performance across metrics (+${summary.downloads.delta.toFixed(1)}% downloads, +${summary.cvr.delta.toFixed(1)}% CVR) - document and replicate current tactics`,
          confidence: 92,
          actionable: true
        });
      }
    };

    // Generate insights
    checkAnomalies();
    analyzeTrends();
    generateRecommendations();

    // Sort by priority and limit
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return generatedInsights
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, finalConfig.maxInsights);

  }, [data, loading, periodComparison.current, periodComparison.previous, finalConfig]);

  return {
    insights,
    loading,
    hasInsights: insights.length > 0
  };
};

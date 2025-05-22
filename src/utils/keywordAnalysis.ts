
// Keyword analysis utilities for the Growth Gap Finder

export interface KeywordData {
  keyword: string;
  volume: number;
  maxReach: number;
  results: number;
  difficulty: number;
  chance: number;
  kei: number;
  relevancy: number;
  rank: number | null;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  recommendations: string[];
  chartData?: any[];
}

/**
 * Parse raw keyword data from CSV or tab-delimited text
 */
export const parseKeywordData = (rawData: string): KeywordData[] => {
  try {
    const lines = rawData.trim().split('\n');
    const headers = lines[0].split('\t');
    
    const keywordIndex = headers.findIndex(h => h.toLowerCase().includes('keyword'));
    const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('volume'));
    const maxReachIndex = headers.findIndex(h => h.toLowerCase() === 'max reach');
    const resultsIndex = headers.findIndex(h => h.toLowerCase() === 'results');
    const difficultyIndex = headers.findIndex(h => h.toLowerCase() === 'difficulty');
    const chanceIndex = headers.findIndex(h => h.toLowerCase() === 'chance');
    const keiIndex = headers.findIndex(h => h.toLowerCase() === 'kei');
    const relevancyIndex = headers.findIndex(h => h.toLowerCase() === 'relevancy');
    const rankIndex = headers.findIndex(h => h.toLowerCase().includes('rank'));
    
    const data: KeywordData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length < 3) continue; // Skip invalid lines
      
      data.push({
        keyword: cols[keywordIndex] || '',
        volume: parseInt(cols[volumeIndex]) || 0,
        maxReach: parseInt(cols[maxReachIndex]) || 0,
        results: parseInt(cols[resultsIndex]) || 0,
        difficulty: parseInt(cols[difficultyIndex]) || 0,
        chance: parseInt(cols[chanceIndex]) || 0,
        kei: parseInt(cols[keiIndex]) || 0,
        relevancy: parseInt(cols[relevancyIndex]) || 0,
        rank: cols[rankIndex] === 'null' ? null : parseInt(cols[rankIndex])
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error parsing keyword data:', error);
    return [];
  }
};

/**
 * Classify keywords as branded or generic
 */
export const classifyKeywords = (keywords: KeywordData[], appName: string = 'Jodel'): {
  branded: KeywordData[];
  generic: KeywordData[];
} => {
  const appNameLower = appName.toLowerCase();
  const branded: KeywordData[] = [];
  const generic: KeywordData[] = [];
  
  keywords.forEach(keyword => {
    // If keyword contains app name or is highly relevant (relevancy > 30)
    if (keyword.keyword.toLowerCase().includes(appNameLower) || 
        keyword.relevancy > 30) {
      branded.push(keyword);
    } else {
      generic.push(keyword);
    }
  });
  
  return { branded, generic };
};

/**
 * Analyze brand vs generic keywords
 */
export const analyzeBrandVsGeneric = (
  keywords: KeywordData[], 
  appName: string = 'Jodel'
): AnalysisResult => {
  const { branded, generic } = classifyKeywords(keywords, appName);
  
  // Calculate metrics
  const totalKeywords = keywords.length;
  const brandedPercentage = Math.round((branded.length / totalKeywords) * 100);
  const genericPercentage = Math.round((generic.length / totalKeywords) * 100);
  
  // Calculate average metrics for each group
  const brandedAvgVolume = Math.round(branded.reduce((sum, k) => sum + k.volume, 0) / branded.length);
  const genericAvgVolume = Math.round(generic.reduce((sum, k) => sum + k.volume, 0) / generic.length);
  const volumeRatio = Math.round((genericAvgVolume / brandedAvgVolume) * 100);
  
  // Find high-potential generic keywords (high volume, lower difficulty)
  const highPotentialGeneric = generic
    .filter(k => k.volume > 60 && k.difficulty < 80)
    .sort((a, b) => b.volume - a.volume);
  
  // Find underperforming branded keywords
  const underperformingBranded = branded
    .filter(k => k.rank === null || k.rank > 20)
    .sort((a, b) => b.volume - a.volume);
  
  // Chart data for visualization
  const chartData = [
    { name: "Branded", value: branded.length, fill: "#F97316" },
    { name: "Generic", value: generic.length, fill: "#3B82F6" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (highPotentialGeneric.length > 0) {
    recommendations.push(
      `Target high-volume generic keywords: ${highPotentialGeneric.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (underperformingBranded.length > 0) {
    recommendations.push(
      `Optimize branded keywords with poor rankings: ${underperformingBranded.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (brandedPercentage > 70) {
    recommendations.push('Diversify keyword strategy by adding more generic keywords to your metadata');
  } else if (genericPercentage > 70) {
    recommendations.push('Strengthen your brand presence by targeting more branded terms');
  }
  
  if (recommendations.length < 3) {
    recommendations.push('Maintain balanced approach between branded and generic keywords');
  }
  
  return {
    title: "Brand vs Generic Keyword Analysis",
    summary: `Analysis of your ${keywords.length} keywords shows a ${brandedPercentage}% branded vs ${genericPercentage}% generic keyword distribution.`,
    metrics: [
      { label: "Brand Term Share", value: `${brandedPercentage}%` },
      { label: "Generic Term Share", value: `${genericPercentage}%` },
      { label: "Generic/Brand Volume Ratio", value: `${volumeRatio}%` }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData
  };
};

/**
 * Analyze competitor comparison
 */
export const analyzeCompetitorComparison = (keywords: KeywordData[]): AnalysisResult => {
  // Calculate ranking metrics
  const rankedKeywords = keywords.filter(k => k.rank !== null);
  const unrankedKeywords = keywords.filter(k => k.rank === null);
  const keywordsInTop10 = rankedKeywords.filter(k => k.rank! <= 10);
  const keywordsInTop50 = rankedKeywords.filter(k => k.rank! <= 50);
  
  // Find high-volume keywords where app isn't ranking
  const missedHighVolumeKeywords = unrankedKeywords
    .filter(k => k.volume > 70)
    .sort((a, b) => b.volume - a.volume);
  
  // Find competitor-relevant keywords (based on relevancy)
  const competitorKeywords = keywords
    .filter(k => k.relevancy > 25)
    .sort((a, b) => b.relevancy - a.relevancy);
  
  // Find keywords we could improve position on
  const improvableKeywords = rankedKeywords
    .filter(k => k.rank! > 10 && k.rank! <= 50 && k.volume > 60)
    .sort((a, b) => a.rank! - b.rank!);
  
  // Chart data for ranking distribution
  const rankBuckets = [
    { name: "Top 10", value: keywordsInTop10.length, fill: "#10B981" },
    { name: "11-50", value: keywordsInTop50.length - keywordsInTop10.length, fill: "#3B82F6" },
    { name: "51+", value: rankedKeywords.length - keywordsInTop50.length, fill: "#F97316" },
    { name: "Not Ranking", value: unrankedKeywords.length, fill: "#6B7280" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (missedHighVolumeKeywords.length > 0) {
    recommendations.push(
      `Target high-volume keywords your app isn't ranking for: ${missedHighVolumeKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (improvableKeywords.length > 0) {
    recommendations.push(
      `Improve rankings for keywords just outside top 10: ${improvableKeywords.slice(0, 3).map(k => `"${k.keyword}" (#${k.rank})`).join(', ')}`
    );
  }
  
  if (competitorKeywords.length > 0) {
    recommendations.push(
      `Focus on highly relevant competitor keywords: ${competitorKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  const rankPercentage = Math.round((rankedKeywords.length / keywords.length) * 100);
  
  return {
    title: "Competitor Comparison",
    summary: `Your app is ranking for ${rankPercentage}% of analyzed keywords, with ${keywordsInTop10.length} in the top 10 positions.`,
    metrics: [
      { label: "Keyword Coverage", value: `${rankPercentage}%` },
      { label: "Top 10 Rankings", value: keywordsInTop10.length.toString() },
      { label: "Opportunity Keywords", value: missedHighVolumeKeywords.length.toString() }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData: rankBuckets
  };
};

/**
 * Analyze metadata suggestions
 */
export const analyzeMetadataSuggestions = (keywords: KeywordData[]): AnalysisResult => {
  // Find high-potential keywords for metadata
  const highVolumeKeywords = keywords
    .filter(k => k.volume > 80)
    .sort((a, b) => b.volume - a.volume);
  
  // Find keywords with good balance of volume and lower difficulty
  const balancedKeywords = keywords
    .filter(k => k.volume > 60 && k.difficulty < 70)
    .sort((a, b) => (b.volume / (a.difficulty || 1)) - (a.volume / (b.difficulty || 1)));
  
  // Find keywords with high relevancy but low difficulty
  const relevantKeywords = keywords
    .filter(k => k.relevancy > 25 && k.difficulty < 80)
    .sort((a, b) => b.relevancy - a.relevancy);
  
  // Calculate overall metadata optimization score
  const highPotentialCount = balancedKeywords.length;
  const totalKeywords = keywords.length;
  const metadataScore = Math.min(100, Math.round((highPotentialCount / (totalKeywords * 0.2)) * 100));
  
  // Generate title recommendations
  const titleKeywords = balancedKeywords
    .filter(k => k.volume > 70 && k.keyword.length < 20)
    .slice(0, 5);
  
  // Generate subtitle recommendations
  const subtitleKeywords = relevantKeywords
    .filter(k => !titleKeywords.some(tk => tk.keyword === k.keyword))
    .slice(0, 5);
  
  // Chart data for keyword potential
  const keywordPotential = [
    { name: "High Volume", value: highVolumeKeywords.length, fill: "#F97316" },
    { name: "Balanced", value: balancedKeywords.length, fill: "#3B82F6" },
    { name: "Relevant", value: relevantKeywords.length, fill: "#10B981" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (titleKeywords.length > 0) {
    recommendations.push(
      `Update app title to include: ${titleKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (subtitleKeywords.length > 0) {
    recommendations.push(
      `Add to subtitle: ${subtitleKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  recommendations.push(
    `Highlight key features around: ${relevantKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')} in your screenshots`
  );
  
  return {
    title: "Metadata Optimization Suggestions",
    summary: `Analysis of your keywords reveals ${highPotentialCount} high-potential terms that could improve your app's visibility.`,
    metrics: [
      { label: "Title Optimization Score", value: `${metadataScore}%` },
      { label: "High-Potential Keywords", value: highPotentialCount.toString() },
      { label: "Metadata Impact Potential", value: "Medium-High" }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData: keywordPotential
  };
};

/**
 * Analyze growth opportunities
 */
export const analyzeGrowthOpportunity = (keywords: KeywordData[]): AnalysisResult => {
  // Find high-volume keywords app isn't ranking for
  const highVolumeGaps = keywords
    .filter(k => k.rank === null && k.volume > 70)
    .sort((a, b) => b.volume - a.volume);
  
  // Find low difficulty, high volume opportunities
  const quickGrowthOpp = keywords
    .filter(k => k.volume > 60 && k.difficulty < 60)
    .sort((a, b) => (b.volume / a.difficulty) - (a.volume / b.difficulty));
  
  // Find trending topics based on volume and relevancy
  const trendingKeywords = keywords
    .filter(k => k.volume > 60 && k.relevancy > 20)
    .sort((a, b) => b.volume - a.volume);
  
  // Calculate total potential volume
  const potentialImpressionIncrease = highVolumeGaps
    .reduce((sum, k) => sum + k.maxReach, 0);
  
  // Calculate growth opportunity score
  const growthScore = Math.min(100, Math.round((quickGrowthOpp.length / keywords.length) * 100));
  
  // Chart data for growth potential by keyword type
  const growthPotential = [
    { name: "High Volume Gaps", value: highVolumeGaps.length, fill: "#F97316" },
    { name: "Quick Growth", value: quickGrowthOpp.length, fill: "#3B82F6" },
    { name: "Trending Topics", value: trendingKeywords.length, fill: "#10B981" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (highVolumeGaps.length > 0) {
    recommendations.push(
      `Target high-volume keywords: ${highVolumeGaps.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (quickGrowthOpp.length > 0) {
    recommendations.push(
      `Focus on low-difficulty, high-volume keywords: ${quickGrowthOpp.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (trendingKeywords.length > 0) {
    recommendations.push(
      `Capitalize on trending keywords: ${trendingKeywords.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  // Format the impression increase with commas
  const formattedImpressionIncrease = potentialImpressionIncrease.toLocaleString();
  
  return {
    title: "Growth Opportunity Analysis",
    summary: `Your app has significant growth potential with ${highVolumeGaps.length} high-volume keywords you're not currently ranking for.`,
    metrics: [
      { label: "Growth Potential", value: `${growthScore}%` },
      { label: "Potential Impression Increase", value: formattedImpressionIncrease },
      { label: "High-Value Keywords", value: highVolumeGaps.length.toString() }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData: growthPotential
  };
};

/**
 * Analyze quick wins
 */
export const analyzeQuickWins = (keywords: KeywordData[]): AnalysisResult => {
  // Find low-hanging fruit (low difficulty, decent volume, not ranking)
  const lowHangingFruit = keywords
    .filter(k => k.difficulty < 50 && k.volume > 60 && (k.rank === null || k.rank > 10))
    .sort((a, b) => (b.volume / a.difficulty) - (a.volume / b.difficulty));
  
  // Find borderline rankings (just outside top 10)
  const borderlineRankings = keywords
    .filter(k => k.rank !== null && k.rank > 10 && k.rank <= 30)
    .sort((a, b) => a.rank! - b.rank!);
  
  // Find keywords with high chance of improvement
  const highChanceKeywords = keywords
    .filter(k => k.chance > 10)
    .sort((a, b) => b.chance - a.chance);
  
  // Calculate total potential quick wins
  const totalQuickWins = lowHangingFruit.length + 
    Math.min(borderlineRankings.length, 10) + 
    Math.min(highChanceKeywords.length, 5);
  
  // Calculate potential quick impact score
  const quickImpactScore = Math.min(100, Math.round((totalQuickWins / 20) * 100));
  
  // Chart data for quick win types
  const quickWinTypes = [
    { name: "Low Difficulty", value: lowHangingFruit.length, fill: "#10B981" },
    { name: "Just Outside Top 10", value: borderlineRankings.length, fill: "#3B82F6" },
    { name: "High Chance", value: highChanceKeywords.length, fill: "#F97316" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (lowHangingFruit.length > 0) {
    recommendations.push(
      `Target low-difficulty keywords: ${lowHangingFruit.slice(0, 3).map(k => `"${k.keyword}" (Difficulty: ${k.difficulty})`).join(', ')}`
    );
  }
  
  if (borderlineRankings.length > 0) {
    recommendations.push(
      `Push borderline rankings into top 10: ${borderlineRankings.slice(0, 3).map(k => `"${k.keyword}" (#${k.rank})`).join(', ')}`
    );
  }
  
  if (highChanceKeywords.length > 0) {
    recommendations.push(
      `Focus on high-chance keywords: ${highChanceKeywords.slice(0, 3).map(k => `"${k.keyword}" (Chance: ${k.chance})`).join(', ')}`
    );
  }
  
  recommendations.push(
    "Update screenshots to highlight key features and improve conversion rate"
  );
  
  return {
    title: "Quick Wins Analysis",
    summary: `We identified ${totalQuickWins} quick win opportunities that could improve your visibility with minimal effort.`,
    metrics: [
      { label: "Easy Improvements", value: totalQuickWins.toString() },
      { label: "Estimated Impact", value: `${quickImpactScore}%` },
      { label: "Implementation Time", value: "1-2 weeks" }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData: quickWinTypes
  };
};

/**
 * Analyze missed impressions
 */
export const analyzeMissedImpressions = (keywords: KeywordData[]): AnalysisResult => {
  // Find missing high-volume keywords
  const missingHighVolume = keywords
    .filter(k => k.rank === null && k.volume > 70)
    .sort((a, b) => b.volume - a.volume);
  
  // Find poorly ranked high-volume keywords
  const poorlyRankedHighVolume = keywords
    .filter(k => k.rank !== null && k.rank > 10 && k.volume > 70)
    .sort((a, b) => b.volume - a.volume);
  
  // Calculate total potential impressions
  const potentialImpressions = [
    ...missingHighVolume, 
    ...poorlyRankedHighVolume
  ].reduce((sum, k) => sum + k.maxReach, 0);
  
  // Calculate current visibility percentage
  const rankedKeywords = keywords.filter(k => k.rank !== null && k.rank <= 10);
  const currentImpressions = rankedKeywords.reduce((sum, k) => sum + k.maxReach, 0);
  const totalPossibleImpressions = keywords.reduce((sum, k) => sum + k.maxReach, 0);
  
  const currentVisibilityPct = Math.round((currentImpressions / totalPossibleImpressions) * 100);
  const potentialUpliftPct = Math.round((potentialImpressions / currentImpressions) * 100);
  
  // Chart data for missed impressions by keyword type
  const impressionData = [
    { name: "Missing High Volume", value: missingHighVolume.reduce((sum, k) => sum + k.maxReach, 0), fill: "#F97316" },
    { name: "Poor Rankings", value: poorlyRankedHighVolume.reduce((sum, k) => sum + k.maxReach, 0), fill: "#3B82F6" },
    { name: "Current Visibility", value: currentImpressions, fill: "#10B981" }
  ];
  
  // Generate recommendations
  const recommendations = [];
  
  if (missingHighVolume.length > 0) {
    recommendations.push(
      `Add missing high-volume keywords to metadata: ${missingHighVolume.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}`
    );
  }
  
  if (poorlyRankedHighVolume.length > 0) {
    recommendations.push(
      `Optimize poorly ranked high-volume keywords: ${poorlyRankedHighVolume.slice(0, 3).map(k => `"${k.keyword}" (#${k.rank})`).join(', ')}`
    );
  }
  
  recommendations.push(
    "Add high-volume keywords to your app title and subtitle for better rankings"
  );
  
  // Format the impressions with commas
  const formattedPotentialImpressions = potentialImpressions.toLocaleString();
  
  return {
    title: "Missed Impressions Analysis",
    summary: `Your app is currently capturing ~${currentVisibilityPct}% of potential visibility, with an opportunity for ${potentialUpliftPct}% uplift.`,
    metrics: [
      { label: "Estimated Missed Impressions", value: formattedPotentialImpressions },
      { label: "Current Visibility", value: `${currentVisibilityPct}%` },
      { label: "Potential Visibility Uplift", value: `+${potentialUpliftPct}%` }
    ],
    recommendations: recommendations.slice(0, 3),
    chartData: impressionData
  };
};

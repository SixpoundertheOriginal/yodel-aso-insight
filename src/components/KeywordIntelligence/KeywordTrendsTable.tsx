
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Plus, Search, Filter } from 'lucide-react';
import { KeywordTrend } from '@/services/enhanced-keyword-analytics.service';

interface KeywordTrendsTableProps {
  trends: KeywordTrend[];
  isLoading?: boolean;
  onTimeframeChange?: (days: number) => void;
  selectedTimeframe?: number;
}

export const KeywordTrendsTable: React.FC<KeywordTrendsTableProps> = ({
  trends,
  isLoading,
  onTimeframeChange,
  selectedTimeframe = 30
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rank_change' | 'volume_change' | 'current_rank'>('rank_change');

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'new':
        return <Plus className="h-4 w-4 text-blue-400" />;
      default:
        return <Minus className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTrendBadgeColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'down':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const filteredAndSortedTrends = React.useMemo(() => {
    let filtered = trends.filter(trend => {
      const matchesSearch = trend.keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTrend = trendFilter === 'all' || trend.trend_direction === trendFilter;
      return matchesSearch && matchesTrend;
    });

    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rank_change':
          return Math.abs(b.rank_change) - Math.abs(a.rank_change);
        case 'volume_change':
          return Math.abs(b.volume_change_pct) - Math.abs(a.volume_change_pct);
        case 'current_rank':
          return a.current_rank - b.current_rank;
        default:
          return 0;
      }
    });

    return filtered;
  }, [trends, searchTerm, trendFilter, sortBy]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Trends</CardTitle>
          <CardDescription>Loading trend analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-zinc-700 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Keyword Trends Analysis
        </CardTitle>
        <CardDescription>
          Track keyword ranking changes over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={trendFilter} onValueChange={setTrendFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter trends" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trends</SelectItem>
              <SelectItem value="up">Improving</SelectItem>
              <SelectItem value="down">Declining</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank_change">Rank Change</SelectItem>
              <SelectItem value="volume_change">Volume Change</SelectItem>
              <SelectItem value="current_rank">Current Rank</SelectItem>
            </SelectContent>
          </Select>
          {onTimeframeChange && (
            <Select 
              value={selectedTimeframe.toString()} 
              onValueChange={(value) => onTimeframeChange(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">
              {trends.filter(t => t.trend_direction === 'up').length}
            </div>
            <div className="text-xs text-zinc-400">Improving</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-400">
              {trends.filter(t => t.trend_direction === 'down').length}
            </div>
            <div className="text-xs text-zinc-400">Declining</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-400">
              {trends.filter(t => t.trend_direction === 'new').length}
            </div>
            <div className="text-xs text-zinc-400">New</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-zinc-400">
              {trends.filter(t => t.trend_direction === 'stable').length}
            </div>
            <div className="text-xs text-zinc-400">Stable</div>
          </div>
        </div>

        {/* Trends Table */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead>Keyword</TableHead>
                <TableHead>Current Rank</TableHead>
                <TableHead>Previous Rank</TableHead>
                <TableHead>Rank Change</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Volume Change</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTrends.slice(0, 50).map((trend, index) => (
                <TableRow key={index} className="border-zinc-800">
                  <TableCell className="font-medium">
                    {trend.keyword}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-zinc-300">
                      #{trend.current_rank}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {trend.previous_rank ? (
                      <Badge variant="outline" className="text-zinc-400">
                        #{trend.previous_rank}
                      </Badge>
                    ) : (
                      <span className="text-zinc-500 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {trend.rank_change !== 0 ? (
                      <div className="flex items-center gap-1">
                        {trend.rank_change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        <span className={trend.rank_change > 0 ? 'text-green-400' : 'text-red-400'}>
                          {Math.abs(trend.rank_change)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {trend.current_volume?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell>
                    {trend.volume_change_pct !== 0 ? (
                      <span className={trend.volume_change_pct > 0 ? 'text-green-400' : 'text-red-400'}>
                        {trend.volume_change_pct > 0 ? '+' : ''}{trend.volume_change_pct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getTrendBadgeColor(trend.trend_direction)}
                    >
                      <div className="flex items-center gap-1">
                        {getTrendIcon(trend.trend_direction)}
                        {trend.trend_direction}
                      </div>
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredAndSortedTrends.length === 0 && (
          <div className="text-center py-8 text-zinc-400">
            <Filter className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No trends match your current filters</p>
          </div>
        )}

        {filteredAndSortedTrends.length > 50 && (
          <div className="text-center mt-4 text-sm text-zinc-400">
            Showing top 50 results of {filteredAndSortedTrends.length} trends
          </div>
        )}
      </CardContent>
    </Card>
  );
};

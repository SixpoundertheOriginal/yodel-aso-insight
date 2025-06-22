
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit,
  Database,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';
import { useEnhancedKeywordAnalytics } from '@/hooks/useEnhancedKeywordAnalytics';
import { toast } from 'sonner';

interface KeywordPoolManagerProps {
  organizationId: string;
  onPoolSelect?: (poolId: string, keywords: string[]) => void;
}

export const KeywordPoolManager: React.FC<KeywordPoolManagerProps> = ({
  organizationId,
  onPoolSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoolType, setSelectedPoolType] = useState<string>('all');
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [newPoolData, setNewPoolData] = useState({
    name: '',
    type: 'custom' as 'category' | 'competitor' | 'trending' | 'custom',
    keywords: '',
    description: ''
  });

  const {
    keywordPools,
    isLoadingPools,
    saveKeywordPool,
    refetchPools
  } = useEnhancedKeywordAnalytics({
    organizationId,
    enabled: true
  });

  const filteredPools = keywordPools.filter(pool => {
    const matchesSearch = pool.pool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pool.keywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedPoolType === 'all' || pool.pool_type === selectedPoolType;
    
    return matchesSearch && matchesType;
  });

  const handleCreatePool = async () => {
    if (!newPoolData.name.trim() || !newPoolData.keywords.trim()) {
      toast.error('Please provide pool name and keywords');
      return;
    }

    try {
      const keywords = newPoolData.keywords
        .split('\n')
        .map(kw => kw.trim())
        .filter(kw => kw.length > 0);

      const pool = await saveKeywordPool(
        newPoolData.name,
        newPoolData.type,
        keywords,
        { description: newPoolData.description }
      );

      if (pool) {
        toast.success('Keyword pool created successfully');
        setIsCreatingPool(false);
        setNewPoolData({ name: '', type: 'custom', keywords: '', description: '' });
        refetchPools();
      } else {
        toast.error('Failed to create keyword pool');
      }
    } catch (error) {
      console.error('❌ [POOL-MANAGER] Create pool failed:', error);
      toast.error('Failed to create keyword pool');
    }
  };

  const handlePoolSelect = (pool: any) => {
    if (onPoolSelect) {
      onPoolSelect(pool.id, pool.keywords);
    }
    toast.success(`Selected ${pool.keywords.length} keywords from ${pool.pool_name}`);
  };

  const handleExportPool = (pool: any) => {
    const csvContent = pool.keywords.map((kw: string) => `"${kw}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pool.pool_name}_keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPoolTypeIcon = (type: string) => {
    switch (type) {
      case 'category':
        return <Database className="h-4 w-4" />;
      case 'competitor':
        return <Users className="h-4 w-4" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'custom':
        return <Target className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getPoolTypeColor = (type: string) => {
    switch (type) {
      case 'category':
        return 'bg-blue-500/20 text-blue-400';
      case 'competitor':
        return 'bg-purple-500/20 text-purple-400';
      case 'trending':
        return 'bg-green-500/20 text-green-400';
      case 'custom':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Keyword Pool Manager</CardTitle>
            <CardDescription>
              Organize and manage keyword collections for different strategies
            </CardDescription>
          </div>
          <Dialog open={isCreatingPool} onOpenChange={setIsCreatingPool}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">Create Keyword Pool</DialogTitle>
                <DialogDescription>
                  Create a new keyword collection for targeted analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white">Pool Name</label>
                  <Input
                    value={newPoolData.name}
                    onChange={(e) => setNewPoolData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., High-Value Keywords"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Pool Type</label>
                  <Select 
                    value={newPoolData.type} 
                    onValueChange={(value) => setNewPoolData(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="competitor">Competitor</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Keywords (one per line)</label>
                  <Textarea
                    value={newPoolData.keywords}
                    onChange={(e) => setNewPoolData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword 1&#10;keyword 2&#10;keyword 3"
                    className="bg-zinc-800 border-zinc-700 text-white h-32"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Description (optional)</label>
                  <Input
                    value={newPoolData.description}
                    onChange={(e) => setNewPoolData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of this keyword pool"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingPool(false)}
                    className="border-zinc-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePool}>
                    Create Pool
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pools" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
            <TabsTrigger value="pools">Keyword Pools</TabsTrigger>
            <TabsTrigger value="analytics">Pool Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pools" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search pools or keywords..."
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Select value={selectedPoolType} onValueChange={setSelectedPoolType}>
                <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="competitor">Competitor</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pool List */}
            <div className="space-y-3">
              {isLoadingPools ? (
                <div className="text-center text-zinc-400 py-8">Loading keyword pools...</div>
              ) : filteredPools.length === 0 ? (
                <div className="text-center text-zinc-400 py-8">
                  {keywordPools.length === 0 ? 'No keyword pools created yet' : 'No pools match your search'}
                </div>
              ) : (
                filteredPools.map((pool) => (
                  <Card key={pool.id} className="bg-zinc-800/50 border-zinc-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getPoolTypeColor(pool.pool_type)}`}>
                            {getPoolTypeIcon(pool.pool_type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{pool.pool_name}</h4>
                            <p className="text-sm text-zinc-400">
                              {pool.keywords.length} keywords • Created {new Date(pool.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPoolTypeColor(pool.pool_type)}>
                            {pool.pool_type}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePoolSelect(pool)}
                            className="border-zinc-700 text-white"
                          >
                            Use Pool
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExportPool(pool)}
                            className="text-zinc-400"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Sample Keywords */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {pool.keywords.slice(0, 5).map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {pool.keywords.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{pool.keywords.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{keywordPools.length}</div>
                  <div className="text-sm text-zinc-400">Total Pools</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {keywordPools.reduce((sum, pool) => sum + pool.keywords.length, 0)}
                  </div>
                  <div className="text-sm text-zinc-400">Total Keywords</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {keywordPools.filter(p => p.pool_type === 'trending').length}
                  </div>
                  <div className="text-sm text-zinc-400">Trending Pools</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, X } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface AppSearchResultsModalProps {
  results: ScrapedMetadata[];
  onSelect: (app: ScrapedMetadata) => void;
  onCancel: () => void;
  searchTerm: string;
  isOpen: boolean;
}

export const AppSearchResultsModal: React.FC<AppSearchResultsModalProps> = React.memo(({
  results,
  onSelect,
  onCancel,
  searchTerm,
  isOpen
}) => {
  const renderRatingStars = React.useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-zinc-600" />);
      }
    }
    return stars;
  }, []);

  const limitedResults = React.useMemo(() => results.slice(0, 10), [results]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Choose an app for "{searchTerm}"</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            We found multiple apps matching your search. Please select the one you want to analyze.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {limitedResults.map((app, index) => (
              <Card key={`${app.appId}-${index}`} className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {app.icon ? (
                        <img
                          src={app.icon}
                          alt={`${app.name} icon`}
                          className="w-16 h-16 rounded-xl"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-yodel-orange to-orange-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {app.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm leading-tight mb-1 truncate">
                        {app.name || 'Unknown App'}
                      </h3>
                      <p className="text-zinc-400 text-xs mb-1 truncate">
                        {app.developer || 'Unknown Developer'}
                      </p>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          {renderRatingStars(app.rating || 0)}
                        </div>
                        <span className="text-zinc-500 text-xs">
                          {app.rating ? app.rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                      
                      {app.applicationCategory && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-zinc-700 text-zinc-300 border-zinc-600 mb-2"
                        >
                          {app.applicationCategory}
                        </Badge>
                      )}
                      
                      <Button
                        onClick={() => onSelect(app)}
                        size="sm"
                        className="w-full bg-yodel-orange hover:bg-orange-600 text-white text-xs"
                      >
                        Select This App
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm">
            Showing {limitedResults.length} of {results.length} results
          </p>
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AppSearchResultsModal.displayName = 'AppSearchResultsModal';

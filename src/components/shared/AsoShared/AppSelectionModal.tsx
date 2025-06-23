
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, Download } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface AppSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ScrapedMetadata[];
  onSelect: (app: ScrapedMetadata) => void;
  searchTerm: string;
}

export const AppSelectionModal: React.FC<AppSelectionModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onSelect,
  searchTerm
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white">
            Multiple apps found for "{searchTerm}"
          </DialogTitle>
          <DialogDescription>
            Select the app you want to analyze:
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {candidates.map((app, index) => (
              <div key={index} className="border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  {app.icon && (
                    <img 
                      src={app.icon} 
                      alt={app.name}
                      className="w-16 h-16 rounded-xl"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {app.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-2">
                      by {app.developer || 'Unknown Developer'}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-2">
                      {app.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-zinc-300">
                            {app.rating}
                          </span>
                        </div>
                      )}
                      {app.applicationCategory && (
                        <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                          {app.applicationCategory}
                        </Badge>
                      )}
                    </div>
                    
                    {app.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {app.description}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => onSelect(app)}
                    className="bg-yodel-orange hover:bg-yodel-orange/90 text-white"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

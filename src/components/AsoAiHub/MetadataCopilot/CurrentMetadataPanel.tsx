
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrapedMetadata } from './MetadataWorkspace';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CurrentMetadataPanelProps {
  metadata: ScrapedMetadata;
}

const RatingStars = ({ rating = 0, reviews = 0 }: { rating?: number; reviews?: number }) => {
    const formattedReviews = reviews > 1000 ? `${(reviews / 1000).toFixed(1)}K` : reviews;
    return (
        <div className="flex items-center space-x-2">
            <div className="flex items-center">
                <span className="text-sm font-bold text-zinc-300 mr-1">{rating.toFixed(1)}</span>
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${
                            i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
                        }`}
                    />
                ))}
            </div>
            {reviews > 0 && <span className="text-xs text-zinc-400">{formattedReviews} Ratings</span>}
        </div>
    );
};

export const CurrentMetadataPanel: React.FC<CurrentMetadataPanelProps> = ({ metadata }) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Current App Store Listing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Store Listing Preview */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <img
              src={metadata.icon || '/placeholder.svg'}
              alt={`${metadata.name} icon`}
              className="w-24 h-24 rounded-[22.5%] border border-zinc-700"
              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-xl leading-tight truncate" title={metadata.title}>
                {metadata.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-tight truncate" title={metadata.subtitle}>
                {metadata.subtitle}
              </p>
              <div className="mt-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-6 h-8">
                  GET
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-700/50 flex items-center justify-between">
             <RatingStars rating={metadata.rating} reviews={metadata.reviews} />
             <div className="text-center">
                <div className="font-bold text-zinc-200 text-lg">4+</div>
                <div className="text-xs text-zinc-400">Age</div>
             </div>
             <div className="text-center">
                <div className="font-bold text-zinc-200 text-lg">#1</div>
                <div className="text-xs text-zinc-400 capitalize">{metadata.applicationCategory || 'Category'}</div>
             </div>
             <div className="text-center">
                 <div className="text-2xl">👤</div>
                <div className="text-xs text-zinc-400">Developer</div>
             </div>
          </div>
        </div>
        
        {/* Raw Metadata Fields */}
        <div>
          <h4 className="font-semibold text-zinc-300 mb-2">Full Description</h4>
          <div className="bg-zinc-800/50 rounded p-3 text-zinc-300 mt-1 text-sm h-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
            {metadata.description ? metadata.description : <span className="text-zinc-500">Not available</span>}
          </div>
        </div>

        <div>
            <h4 className="font-semibold text-zinc-300 mb-2">Other Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">Developer: {metadata.developer || 'N/A'}</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">Category: {metadata.applicationCategory || 'N/A'}</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">Price: {metadata.price || 'Free'}</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">Locale: {metadata.locale.toUpperCase()}</Badge>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

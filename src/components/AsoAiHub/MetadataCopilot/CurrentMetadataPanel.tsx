
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrapedMetadata } from '@/types/aso';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CurrentMetadataPanelProps {
  metadata: ScrapedMetadata;
}

const RatingStars = ({ rating = 0, reviews = 0 }: { rating?: number; reviews?: number }) => {
  console.log('⭐ [RATING] Rendering stars with rating:', rating, 'reviews:', reviews);
  
  // Enterprise-grade rating validation
  const validRating = typeof rating === 'number' && !isNaN(rating) && rating >= 0 && rating <= 5 ? rating : 0;
  const validReviews = typeof reviews === 'number' && !isNaN(reviews) && reviews >= 0 ? reviews : 0;
  
  const formattedReviews = validReviews > 1000 ? `${(validReviews / 1000).toFixed(1)}K` : validReviews.toString();
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <span className="text-sm font-bold text-zinc-300 mr-1">
          {validRating > 0 ? validRating.toFixed(1) : '—'}
        </span>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.round(validRating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
            }`}
          />
        ))}
      </div>
      {validReviews > 0 && (
        <span className="text-xs text-zinc-400">{formattedReviews} Ratings</span>
      )}
    </div>
  );
};

const AppIcon = ({ src, alt, name }: { src?: string; alt: string; name: string }) => {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  console.log('🖼️ [ICON] Rendering icon with src:', src);
  
  const handleImageLoad = () => {
    console.log('✅ [ICON] Image loaded successfully');
    setIsLoading(false);
  };
  
  const handleImageError = () => {
    console.warn('⚠️ [ICON] Image failed to load, using fallback');
    setImageError(true);
    setIsLoading(false);
  };
  
  if (!src || imageError) {
    return (
      <div className="w-24 h-24 rounded-[22.37%] border border-zinc-700 bg-zinc-800 flex items-center justify-center">
        <span className="text-2xl">{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  
  return (
    <div className="relative w-24 h-24">
      {isLoading && (
        <div className="absolute inset-0 rounded-[22.37%] border border-zinc-700 bg-zinc-800 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className="w-24 h-24 rounded-[22.37%] border border-zinc-700"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export const CurrentMetadataPanel: React.FC<CurrentMetadataPanelProps> = ({ metadata }) => {
  console.log('🎯 [PANEL] Rendering CurrentMetadataPanel with metadata:', JSON.stringify(metadata, null, 2));
  
  // Enterprise debugging in development
  const showDebug = process.env.NODE_ENV === 'development';
  
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Current App Store Listing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Debug Panel - Development Only */}
        {showDebug && (
          <div className="bg-red-900/20 border border-red-700/50 rounded p-3">
            <h4 className="text-red-300 font-semibold mb-2 text-xs">Debug Info</h4>
            <div className="text-xs text-red-200 space-y-1">
              <div>Icon: {metadata.icon ? '✅ Present' : '❌ Missing'}</div>
              <div>Developer: {metadata.developer ? '✅ Present' : '❌ Missing'}</div>
              <div>Rating: {metadata.rating ? `✅ ${metadata.rating}` : '❌ Missing/Zero'}</div>
              <div>Reviews: {metadata.reviews ? `✅ ${metadata.reviews}` : '❌ Missing/Zero'}</div>
              <div>Subtitle: {metadata.subtitle ? '✅ Present' : '❌ Missing'}</div>
            </div>
          </div>
        )}

        {/* App Store Listing Preview */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <AppIcon 
              src={metadata.icon} 
              alt={`${metadata.name} icon`}
              name={metadata.name}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-xl leading-tight truncate" title={metadata.title}>
                {metadata.title || metadata.name || 'Unknown App'}
              </h3>
              <p className="text-zinc-400 text-sm leading-tight truncate" title={metadata.subtitle}>
                {metadata.subtitle || 'No subtitle available'}
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
        
        {/* Full Description */}
        <div>
          <h4 className="font-semibold text-zinc-300 mb-2">Full Description</h4>
          <div className="bg-zinc-800/50 rounded p-3 text-zinc-300 mt-1 text-sm h-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
            {metadata.description || <span className="text-zinc-500">No description available</span>}
          </div>
        </div>

        {/* App Details */}
        <div>
          <h4 className="font-semibold text-zinc-300 mb-2">Other Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Developer: {metadata.developer || 'N/A'}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Category: {metadata.applicationCategory || 'N/A'}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Price: {metadata.price || 'Free'}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Locale: {metadata.locale?.toUpperCase() || 'US'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

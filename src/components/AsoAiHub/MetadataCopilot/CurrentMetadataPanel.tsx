
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CharacterCounter } from './CharacterCounter';
import { ScrapedMetadata } from './MetadataWorkspace';

interface CurrentMetadataPanelProps {
  metadata: ScrapedMetadata;
}

const FieldDisplay = ({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) => (
    <div className="space-y-2">
      <Label className="text-zinc-300">{label}</Label>
      <div className="bg-zinc-800/50 rounded p-3 text-white mt-1 text-sm h-auto min-h-[40px] break-words">
        {value ? (truncate && value.length > 300 ? `${value.substring(0, 300)}...` : value) : <span className="text-zinc-500">Not available</span>}
      </div>
    </div>
);

export const CurrentMetadataPanel: React.FC<CurrentMetadataPanelProps> = ({ metadata }) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Current Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <FieldDisplay label="Title" value={metadata.title} />
            <CharacterCounter current={metadata.title.length} limit={30} label="Title Limit" />
        </div>
        <div className="space-y-4">
            <FieldDisplay label="Subtitle" value={metadata.subtitle} />
            <CharacterCounter current={metadata.subtitle.length} limit={30} label="Subtitle Limit" />
        </div>
        <div className="space-y-4">
            <FieldDisplay label="Description" value={metadata.description} truncate={true} />
        </div>
      </CardContent>
    </Card>
  );
};

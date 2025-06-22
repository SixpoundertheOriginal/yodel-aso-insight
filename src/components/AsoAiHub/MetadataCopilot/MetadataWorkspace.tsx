
import React, { useState } from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';
import { ManualMetadataEditor } from './ManualMetadataEditor';
import { ModeToggle, WorkspaceMode } from './ModeToggle';
import { DataIntegrityChecker } from './DataIntegrityChecker';
import { ScrapedMetadata, MetadataField, MetadataScore } from '@/types/aso';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MetadataWorkspaceProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const MetadataWorkspace: React.FC<MetadataWorkspaceProps> = React.memo(({ initialData, organizationId }) => {
  const [mode, setMode] = useState<WorkspaceMode>('ai-generation');
  const [generatedMetadata, setGeneratedMetadata] = useState<MetadataField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { sendMessage } = useCopilotChat();
  const { toast } = useToast();

  // Memoize debug data to prevent JSON.stringify on every render
  const debugData = React.useMemo(() => {
    return {
      appId: initialData.appId,
      name: initialData.name,
      hasDescription: !!initialData.description,
      organizationId,
      mode
    };
  }, [initialData.appId, initialData.name, initialData.description, organizationId, mode]);
  
  React.useEffect(() => {
    console.log('🏗️ [WORKSPACE] Hybrid workspace initialized:', debugData);
  }, [debugData]);

  const handleSaveMetadata = async (metadata: MetadataField, score: MetadataScore) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('metadata_versions')
        .insert({
          app_store_id: initialData.appId,
          organization_id: organizationId,
          created_by: user?.id || null,
          title: metadata.title,
          subtitle: metadata.subtitle,
          keywords: metadata.keywords,
          score: score as any,
          notes: `Created via ${mode === 'manual-editor' ? 'Manual Editor' : 'AI Generation'}`
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Metadata Saved!",
        description: "Your metadata has been saved successfully.",
      });

    } catch (error: any) {
      console.error('Error saving metadata:', error);
      toast({
        title: "Save Error",
        description: error.message || "Failed to save metadata. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiSuggestion = async (field: keyof MetadataField, currentValue: string) => {
    const prompt = `Suggest an optimized ${field} for this app:

App Name: ${initialData.title}
Current ${field}: ${currentValue || 'None'}
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}

Requirements:
- ${field === 'title' ? 'Maximum 30 characters' : field === 'subtitle' ? 'Maximum 30 characters' : 'Maximum 100 characters, comma-separated'}
- App Store optimized
- Use compelling, search-friendly language

Respond with ONLY the suggested ${field}, no formatting or explanation.`;

    try {
      const response = await sendMessage(prompt, 'metadata-copilot-suggestion');
      if (response) {
        toast({
          title: "AI Suggestion Ready",
          description: `AI has suggested a new ${field}. Check the chat for details.`,
        });
      }
    } catch (error) {
      toast({
        title: "Suggestion Failed",
        description: "Could not generate AI suggestion. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGenerationSuccess = (metadata: MetadataField) => {
    setGeneratedMetadata(metadata);
    // Auto-switch to manual mode when user wants to edit AI results
  };

  const switchToManualMode = () => {
    setMode('manual-editor');
  };
  
  return (
    <div className="space-y-6">
      {/* Data Quality Report - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <DataIntegrityChecker metadata={initialData} />
      )}

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <ModeToggle 
          mode={mode} 
          onModeChange={setMode}
          disabled={isSaving}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <CurrentMetadataPanel metadata={initialData} />
        </div>
        <div>
          {mode === 'ai-generation' ? (
            <SuggestedMetadataPanel 
              initialData={initialData} 
              organizationId={organizationId}
              onEditResults={switchToManualMode}
              onGenerationSuccess={handleGenerationSuccess}
            />
          ) : (
            <ManualMetadataEditor
              initialData={generatedMetadata || undefined}
              onSave={handleSaveMetadata}
              onRequestAiSuggestion={handleAiSuggestion}
              appName={initialData.name}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.organizationId === nextProps.organizationId &&
    prevProps.initialData.appId === nextProps.initialData.appId &&
    prevProps.initialData.name === nextProps.initialData.name &&
    prevProps.initialData.description === nextProps.initialData.description
  );
});

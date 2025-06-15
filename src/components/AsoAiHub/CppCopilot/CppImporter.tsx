
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cppStrategyService } from '@/services/cpp-strategy.service';
import { CppStrategyData } from '@/types/cpp';
import { DataImporter } from '@/components/shared/DataImporter';
import { Target } from 'lucide-react';

interface CppImporterProps {
  onStrategySuccess: (data: CppStrategyData, organizationId: string) => void;
}

export const CppImporter: React.FC<CppImporterProps> = ({ onStrategySuccess }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        console.log('🔍 [CPP-DEBUG] Fetching user organization...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
            console.log('✅ [CPP-DEBUG] Organization ID found:', profile.organization_id);
          } else {
            console.warn('⚠️ [CPP-DEBUG] User has no organization_id.');
            toast({
              title: 'Organization Not Found',
              description: 'Your user account is not associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('⚠️ [CPP-DEBUG] User not authenticated.');
          toast({
            title: 'Authentication Error',
            description: 'You must be logged in to analyze apps for CPP strategy.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [CPP-DEBUG] Error fetching user profile/organization:", err);
        toast({ title: 'Could not load your user profile. Please try again.', variant: 'destructive' });
      }
    };
    fetchOrgId();
  }, [toast]);

  const handleAnalyze = async (appStoreUrl: string) => {
    if (!organizationId) {
      toast({
        title: 'Organization context is missing.',
        description: 'Could not perform the analysis without an active organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    console.log('🚀 [CPP-IMPORT] Starting CPP analysis for:', appStoreUrl);

    try {
      const strategyData = await cppStrategyService.generateCppStrategy(appStoreUrl, {
        organizationId,
        includeScreenshotAnalysis: true,
        generateThemes: true,
        includeCompetitorAnalysis: true,
        debugMode: process.env.NODE_ENV === 'development'
      });

      toast({
        title: 'CPP Strategy Generated!',
        description: `Found ${strategyData.suggestedThemes.length} theme opportunities for ${strategyData.originalApp.name}.`,
      });

      onStrategySuccess(strategyData, organizationId);

    } catch (error: any) {
      console.error('❌ [CPP-IMPORT] Analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'An unknown error occurred while analyzing the app for CPP strategy.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <DataImporter
        title="Analyze App for CPP Strategy"
        description="Enter an App Store URL or app name to analyze screenshots and generate Custom Product Page themes"
        placeholder="e.g., 'Notion' or https://apps.apple.com/..."
        onImport={handleAnalyze}
        isLoading={isAnalyzing || !organizationId}
        icon={<Target className="w-4 h-4 ml-2" />}
      />
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300">
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>CPP Debug Mode: Active</div>
          <div>Features: Screenshot Analysis + Theme Generation + Competitor Insights</div>
        </div>
      )}
    </div>
  );
};

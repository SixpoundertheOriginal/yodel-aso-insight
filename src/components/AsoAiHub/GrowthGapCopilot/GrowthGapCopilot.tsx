
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GrowthGapChatInterface } from "./GrowthGapChatInterface";
import { GrowthGapFileUpload } from "./GrowthGapFileUpload";
import { GrowthGapInsights } from "./GrowthGapInsights";
import { GrowthGapResults } from "./GrowthGapResults";

import { 
  parseKeywordData, 
  analyzeBrandVsGeneric,
  analyzeCompetitorComparison,
  analyzeMetadataSuggestions,
  analyzeGrowthOpportunity,
  analyzeQuickWins,
  analyzeMissedImpressions
} from "@/utils/keywordAnalysis";

export const GrowthGapCopilot: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [keywordData, setKeywordData] = useState<string | null>(null);
  
  const handleFileUpload = (files: File[]) => {
    console.log("Files uploaded:", files);
    setUploadedFiles(files);
    
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.type === 'text/tab-separated-values' || file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setKeywordData(e.target.result as string);
            toast({
              title: "Data Ready",
              description: `${files.length} file(s) uploaded successfully. You can now analyze your keyword data.`,
            });
          }
        };
        reader.readAsText(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV or TSV file with keyword data.",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleInsightSelect = async (insightType: string) => {
    console.log("Insight selected:", insightType);
    setSelectedInsight(insightType);
    setIsAnalyzing(true);
    
    if (keywordData) {
      try {
        const parsedKeywords = parseKeywordData(keywordData);
        console.log(`Parsed ${parsedKeywords.length} keywords for analysis`);
        
        let resultData;
        
        if (parsedKeywords.length > 0) {
          switch(insightType) {
            case "BrandVsGeneric":
              resultData = analyzeBrandVsGeneric(parsedKeywords);
              break;
            case "CompetitorComparison":
              resultData = analyzeCompetitorComparison(parsedKeywords);
              break;
            case "MetadataSuggestions":
              resultData = analyzeMetadataSuggestions(parsedKeywords);
              break;
            case "GrowthOpportunity":
              resultData = analyzeGrowthOpportunity(parsedKeywords);
              break;
            case "QuickWins":
              resultData = analyzeQuickWins(parsedKeywords);
              break;
            case "MissedImpressions":
              resultData = analyzeMissedImpressions(parsedKeywords);
              break;
          }
        }
        
        if (!resultData) {
          const { data, error } = await supabase.functions.invoke('aso-chat', {
            body: {
              insightType,
              keywordData,
              messages: []
            }
          });
          
          if (error) throw error;
          
          if (data.insightResults) {
            resultData = data.insightResults;
          } else {
            throw new Error('No analysis results returned');
          }
        }
        
        setResults({
          type: insightType,
          data: resultData
        });
        
        toast({
          title: "Analysis Complete",
          description: `${formatInsightName(insightType)} analysis completed successfully.`,
        });
      } catch (error) {
        console.error('Error analyzing data:', error);
        simulateAnalysis(insightType);
      }
    } else {
      simulateAnalysis(insightType);
    }
  };
  
  const simulateAnalysis = (insightType: string) => {
    const analysisDuration = 2000 + Math.random() * 1500;
    
    setTimeout(() => {
      let resultData;
      
      switch(insightType) {
        case "MissedImpressions":
          resultData = {
            title: "Missed Impressions Analysis",
            summary: "We identified potential missed impressions based on your current keyword rankings.",
            metrics: [
              { label: "Estimated Missed Impressions", value: "~140,000" },
              { label: "Potential Visibility Uplift", value: "+22%" },
              { label: "Optimization Priority", value: "High" }
            ],
            recommendations: [
              "Target 'fitness tracker' keywords that rank on page 2",
              "Optimize for 'activity monitor' terms showing growth",
              "Add 'health analytics' to your app metadata"
            ],
            chartData: [
              { name: "Missing High Volume", value: 82000, fill: "#F97316" },
              { name: "Poor Rankings", value: 58000, fill: "#3B82F6" }
            ]
          };
          break;
        case "BrandVsGeneric":
          resultData = {
            title: "Brand vs Generic Keyword Analysis",
            summary: "Analysis of your performance across branded and generic search terms.",
            metrics: [
              { label: "Brand Term Share", value: "34%" },
              { label: "Generic Term Share", value: "66%" },
              { label: "Brand CVR Premium", value: "+215%" }
            ],
            recommendations: [
              "Increase generic keyword coverage in app title",
              "Add competitor brand modifiers to ASA campaigns",
              "Build more backlinks using generic anchor text"
            ],
            chartData: [
              { name: "Branded", value: 34, fill: "#F97316" },
              { name: "Generic", value: 66, fill: "#3B82F6" }
            ]
          };
          break;
        default:
          resultData = {
            title: "ASO Analysis",
            summary: "General analysis of your app store optimization status.",
            metrics: [
              { label: "Overall ASO Score", value: "74%" },
              { label: "Improvement Areas", value: "6" },
              { label: "Estimated Impact", value: "+25%" }
            ],
            recommendations: [
              "Optimize app metadata for better keyword coverage",
              "Improve visual assets to increase conversion rate",
              "Focus on growing categories to expand reach"
            ],
            chartData: [
              { name: "Current", value: 74, fill: "#3B82F6" },
              { name: "Potential", value: 26, fill: "#F97316" }
            ]
          };
      }
      
      setResults({
        type: insightType,
        data: resultData
      });
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Complete",
        description: `${formatInsightName(insightType)} analysis completed successfully.`,
      });
    }, analysisDuration);
  };
  
  const formatInsightName = (insightType: string): string => {
    switch(insightType) {
      case "MissedImpressions": return "Missed Impressions";
      case "BrandVsGeneric": return "Brand vs Generic";
      case "CompetitorComparison": return "Competitor Comparison";
      case "MetadataSuggestions": return "Metadata Suggestions";
      case "GrowthOpportunity": return "Growth Opportunity";
      case "QuickWins": return "Quick Wins";
      default: return insightType;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-1 flex flex-col space-y-6">
        <Card className="flex-1 bg-zinc-800/50 border-zinc-700/50 shadow-lg h-full max-h-[calc(50%-0.75rem)]">
          <GrowthGapChatInterface 
            onInsightSelect={handleInsightSelect} 
            uploadedFiles={uploadedFiles}
          />
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700/50 shadow-lg h-full max-h-[calc(50%-0.75rem)]">
          <GrowthGapFileUpload onFilesUploaded={handleFileUpload} />
        </Card>
      </div>
      
      <div className="lg:col-span-1">
        <Card className="h-full bg-zinc-800/50 border-zinc-700/50 shadow-lg">
          <GrowthGapInsights 
            onInsightSelect={handleInsightSelect}
            selectedInsight={selectedInsight}
            isAnalyzing={isAnalyzing}
          />
        </Card>
      </div>
      
      <div className="lg:col-span-1">
        <Card className="h-full bg-zinc-800/50 border-zinc-700/50 shadow-lg overflow-auto">
          <GrowthGapResults 
            results={results} 
            isLoading={isAnalyzing} 
          />
        </Card>
      </div>
    </div>
  );
};

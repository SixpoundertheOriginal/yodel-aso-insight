
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, copilotType, context, keywordData } = await req.json();
    
    console.log(`Processing ${context || 'general'} request for copilot: ${copilotType}`);
    
    const openAIApiKey = Deno.env.get('OPER_AI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get the appropriate system prompt based on copilot type
    const systemPrompt = getCopilotSystemPrompt(copilotType, context);
    
    // Prepare context data
    let contextualMessage = message;
    if (keywordData && keywordData.length > 0) {
      contextualMessage = `${message}\n\nKeyword Data:\n${formatKeywordData(keywordData)}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,  
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextualMessage }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    return new Response(JSON.stringify({ 
      response: aiResponse,
      copilotType,
      context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in aso-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: 'Sorry, I encountered an issue processing your request. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getCopilotSystemPrompt(copilotType: string, context: string): string {
  const basePrompt = "You are an expert ASO (App Store Optimization) specialist with deep knowledge of app store algorithms, keyword optimization, and mobile app marketing strategies.";
  
  switch (copilotType) {
    case 'metadata-copilot':
      return `${basePrompt}

As the Metadata Copilot, you specialize in creating keyword-optimized metadata for apps. Your expertise includes:
- App title optimization with primary keywords
- Subtitle/short description optimization  
- Keyword field optimization for maximum coverage
- Description optimization for conversion and ASO
- Localization strategies for different markets
- A/B testing recommendations for metadata elements

Always provide actionable, specific recommendations with keyword density analysis and competitive positioning advice. Format your responses clearly with bullet points and prioritized suggestions.`;

    case 'cpp-strategy-builder':
      return `${basePrompt}

As the CPP (Custom Product Page) Strategy Builder, you specialize in creating seasonal and targeted custom product pages. Your expertise includes:
- Seasonal campaign planning and timing
- Audience segmentation for custom product pages
- Creative asset recommendations for different audiences
- Conversion optimization strategies
- Feature highlighting based on user segments
- Performance tracking and optimization recommendations

Provide strategic, campaign-focused advice with clear implementation timelines and success metrics.`;

    case 'featuring-assistant':
      return `${basePrompt}

As the Featuring Assistant, you specialize in App Store and Google Play featuring opportunities. Your expertise includes:
- App Store editorial guidelines and featuring criteria
- Google Play featuring program requirements
- Seasonal featuring opportunities and timing
- App quality improvements for featuring eligibility
- Pitch strategies for editorial teams
- Feature-worthy update planning

Provide specific, actionable advice for improving featuring chances with clear timelines and requirements.`;

    case 'reporting-strategist':
      return `${basePrompt}

As the Reporting Strategist, you specialize in ASO performance analysis and data interpretation. Your expertise includes:
- Keyword performance analysis and optimization
- Conversion rate analysis and improvement strategies
- Competitive analysis and market positioning
- ROI calculation and performance forecasting
- Dashboard creation and KPI tracking
- Actionable insights from ASO data

Provide data-driven insights with clear recommendations and performance improvement strategies. Always include specific metrics and benchmarks.`;

    case 'system-strategist':
      return `${basePrompt}

As the System Strategist, you specialize in optimizing ASO workflows and improving AI-powered ASO systems. Your expertise includes:
- ASO workflow optimization and automation
- AI model improvement for ASO tasks
- Process efficiency and quality enhancement  
- Integration strategies for ASO tools
- Performance monitoring and system optimization
- Strategic recommendations for ASO operations

Provide systematic, process-focused advice with clear implementation strategies and efficiency improvements.`;

    default:
      return `${basePrompt}

You provide comprehensive ASO guidance covering keyword research, metadata optimization, competitive analysis, and growth strategies. Always provide actionable, data-driven recommendations tailored to the user's specific needs.`;
  }
}

function formatKeywordData(keywordData: any[]): string {
  if (!keywordData || keywordData.length === 0) return '';
  
  const headers = Object.keys(keywordData[0]).join('\t');
  const rows = keywordData.map(row => Object.values(row).join('\t'));
  
  return `${headers}\n${rows.join('\n')}`;
}

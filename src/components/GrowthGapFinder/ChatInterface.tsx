
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, BarChart, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ChatInterfaceProps {
  onInsightSelect: (insightType: string) => void;
  uploadedFiles?: File[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onInsightSelect, 
  uploadedFiles = [] 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "👋 Hi there! I'm your ASO Growth Gap Finder. Upload your keyword data or ask me about missed visibility opportunities.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiErrorCount, setApiErrorCount] = useState(0);
  const [keywordData, setKeywordData] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const examplePrompts = [
    {
      text: "Upload your keyword export to analyze missed visibility",
      icon: <Upload className="h-4 w-4" />,
      insight: "MissedImpressions"
    },
    {
      text: "Find gaps in our branded keyword coverage",
      icon: <BarChart className="h-4 w-4" />,
      insight: "BrandVsGeneric"
    },
    {
      text: "Compare our rankings with top 3 competitors",
      icon: <TrendingUp className="h-4 w-4" />,
      insight: "CompetitorComparison"
    },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to process uploaded files
  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      if (file.type === 'text/csv' || file.type === 'text/tab-separated-values' || file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setKeywordData(e.target.result as string);
            toast({
              title: "Keyword Data Processed",
              description: `Successfully processed ${file.name}. You can now run insight analyses.`,
              duration: 5000,
            });
            
            // Add a message about the processed file
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `I've processed your keyword data file (${file.name}). You can now ask me specific questions about it or run one of the insight modules for detailed analysis.`,
              timestamp: new Date()
            }]);
          }
        };
        reader.readAsText(file);
      } else {
        toast({
          title: "Invalid File Format",
          description: "Please upload a CSV or TSV file containing keyword data.",
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  }, [uploadedFiles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const newUserMessage: ChatMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Prepare files info for context
      const fileInfos = uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }));

      // Get conversation history for context
      const conversationHistory = messages
        .concat(newUserMessage)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Call our edge function
      const { data, error } = await supabase.functions.invoke('aso-chat', {
        body: {
          messages: conversationHistory,
          uploadedFiles: fileInfos,
          keywordData: keywordData // Send parsed keyword data
        }
      });

      if (error) {
        console.error("Error calling ASO chat function:", error);
        throw new Error(error.message);
      }

      // Check if the response contains an error message from the OpenAI API
      if (data.error && data.error.includes("OpenAI API error")) {
        setApiErrorCount(prev => prev + 1);
        
        // Add error message as assistant response
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: data.message || "I'm having trouble connecting to my knowledge base. Please try using one of the insight modules instead.",
          timestamp: new Date(),
          error: true
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Show a toast with the error
        toast({
          title: "AI Service Issue",
          description: "There's a problem with the AI service. Try using the pre-built insight modules on the right.",
          variant: "destructive",
          duration: 5000,
        });
        
        return;
      }

      // Process the response
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Reset error count on successful message
      if (apiErrorCount > 0) {
        setApiErrorCount(0);
      }

      // If the AI detected a recommended insight, trigger it
      if (data.insight) {
        setTimeout(() => {
          onInsightSelect(data.insight);
          toast({
            title: "Analysis Suggestion",
            description: `I've started a ${data.insight} analysis based on our conversation.`,
            duration: 5000,
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Error calling ASO chat function:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try using one of the insight modules instead.",
        timestamp: new Date(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setApiErrorCount(prev => prev + 1);
      
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again or use the insight modules.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamplePrompt = async (prompt: typeof examplePrompts[0]) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: prompt.text,
        timestamp: new Date(),
      },
    ]);

    // Trigger the insight selection
    onInsightSelect(prompt.insight);

    // If we've had API errors, skip calling the API and just add a generic response
    if (apiErrorCount > 1) {
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: `I'll help you with that. Let me run a ${prompt.insight} analysis for you.`,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 800);
      return;
    }

    // Use the new AI function for example prompts too
    setIsLoading(true);
    
    // Process example prompts through the API
    setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('aso-chat', {
          body: {
            messages: [{ role: "user", content: prompt.text }],
            uploadedFiles: uploadedFiles.map(file => ({
              name: file.name,
              type: file.type,
              size: file.size
            })),
            keywordData: keywordData // Send parsed keyword data
          }
        });

        if (error) throw new Error(error.message);

        // Check if the response contains an error message from the OpenAI API
        if (data.error && data.error.includes("OpenAI API error")) {
          const fallbackMessage: ChatMessage = {
            role: "assistant",
            content: `I'll help you with that. Let me run a ${prompt.insight} analysis for you.`,
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, fallbackMessage]);
          setApiErrorCount(prev => prev + 1);
          return;
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.message || `I'll help you with that. Let me run a ${prompt.insight} analysis for you.`,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Reset error count on successful message
        if (apiErrorCount > 0) {
          setApiErrorCount(0);
        }
      } catch (error) {
        console.error("Error in example prompt:", error);
        
        const fallbackMessage: ChatMessage = {
          role: "assistant",
          content: `I'll help you with that. Let me run a ${prompt.insight} analysis for you.`,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, fallbackMessage]);
        setApiErrorCount(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <Card className="border-none shadow-none bg-transparent flex flex-col h-full">
      <CardHeader className="p-4">
        <CardTitle className="text-lg text-white">
          Opportunity Strategist
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-0 overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          <div className="flex flex-col space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-yodel-orange text-white"
                      : message.error 
                        ? "bg-red-900/70 text-red-100" 
                        : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {message.error && (
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2 text-red-200" />
                      <span className="text-red-200 text-sm font-semibold">AI Service Issue</span>
                    </div>
                  )}
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 text-zinc-100 max-w-[80%] rounded-lg p-3">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {messages.length === 1 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-zinc-400 mb-2">Try asking about:</p>
            <div className="flex flex-col space-y-2">
              {examplePrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-left text-zinc-200"
                  onClick={() => handleExamplePrompt(prompt)}
                  disabled={isLoading}
                >
                  <div className="mr-2">{prompt.icon}</div>
                  {prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {apiErrorCount > 1 && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium">AI Service Unavailable</h4>
                <p className="text-red-300 text-sm">
                  There seems to be an issue with the AI service. Please try the pre-built insight modules instead.
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadedFiles && uploadedFiles.length > 0 && keywordData && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded-md">
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-medium">Keyword Data Ready</h4>
                <p className="text-green-300 text-sm">
                  Your keyword data has been processed. Try running an analysis using the insight modules.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Ask about missed opportunities..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            disabled={isLoading || apiErrorCount > 1}
          />
          <Button 
            size="icon" 
            className="bg-yodel-orange hover:bg-yodel-orange/90"
            onClick={handleSendMessage}
            disabled={isLoading || apiErrorCount > 1}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

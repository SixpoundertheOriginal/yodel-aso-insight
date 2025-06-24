
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { AsoDataProvider } from "@/context/AsoDataContext";
import Index from "./pages/Index";
import AsoAiHubPage from "./pages/aso-ai-hub";
import AsoIntelligencePage from "./pages/aso-intelligence";
import KeywordIntelligencePage from "./pages/keyword-intelligence";
import AppsPage from "./pages/apps";
import Dashboard from "./pages/dashboard";
import OverviewPage from "./pages/overview";
import ConversionAnalysisPage from "./pages/conversion-analysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AsoDataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/apps" element={<AppsPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/conversion-analysis" element={<ConversionAnalysisPage />} />
                <Route path="/aso-ai-hub" element={<AsoAiHubPage />} />
                <Route path="/aso-intelligence" element={<AsoIntelligencePage />} />
                <Route path="/keyword-intelligence" element={<KeywordIntelligencePage />} />
                {/* Legacy routes for backward compatibility */}
                <Route path="/metadata-copilot" element={<AsoIntelligencePage />} />
                <Route path="/app-audit" element={<AsoIntelligencePage />} />
              </Routes>
            </TooltipProvider>
          </AsoDataProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

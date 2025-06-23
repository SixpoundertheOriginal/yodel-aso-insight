
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index";
import AsoAiHubPage from "./pages/aso-ai-hub";
import AsoIntelligencePage from "./pages/aso-intelligence";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/aso-ai-hub" element={<AsoAiHubPage />} />
              <Route path="/aso-intelligence" element={<AsoIntelligencePage />} />
              {/* Legacy routes for backward compatibility */}
              <Route path="/metadata-copilot" element={<AsoIntelligencePage />} />
              <Route path="/app-audit" element={<AsoIntelligencePage />} />
            </Routes>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;


import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AsoDataProvider } from "./context/AsoDataContext";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import SignInPage from "./pages/auth/sign-in";
import SignUpPage from "./pages/auth/sign-up";
import Dashboard from "./pages/dashboard";
import TrafficSourcesPage from "./pages/traffic-sources";
import ConversionAnalysisPage from "./pages/conversion-analysis";
import OverviewPage from "./pages/overview";
import AsoAiHubPage from "./pages/aso-ai-hub";
import FeaturingToolkitPage from './pages/featuring-toolkit';
import NotFound from "./pages/NotFound";
import { withAuth } from "./components/Auth/withAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Apply the withAuth HOC to protect routes
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedTrafficSourcesPage = withAuth(TrafficSourcesPage);
const ProtectedConversionAnalysisPage = withAuth(ConversionAnalysisPage);
const ProtectedOverviewPage = withAuth(OverviewPage);
const ProtectedAsoAiHubPage = withAuth(AsoAiHubPage);
const ProtectedFeaturingToolkitPage = withAuth(FeaturingToolkitPage);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <AsoDataProvider>
              <div className="min-h-screen bg-background">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth/sign-in" element={<SignInPage />} />
                  <Route path="/auth/sign-up" element={<SignUpPage />} />
                  <Route path="/dashboard" element={<ProtectedDashboard />} />
                  <Route path="/traffic-sources" element={<ProtectedTrafficSourcesPage />} />
                  <Route path="/conversion-analysis" element={<ProtectedConversionAnalysisPage />} />
                  <Route path="/overview" element={<ProtectedOverviewPage />} />
                  <Route path="/aso-ai-hub" element={<ProtectedAsoAiHubPage />} />
                  <Route path="/featuring-toolkit" element={<ProtectedFeaturingToolkitPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Toaster />
              <Sonner />
            </AsoDataProvider>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

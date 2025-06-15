
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
import NotFound from "./pages/NotFound";
import { withAuth } from "./components/Auth/withAuth";

const queryClient = new QueryClient();

// Apply the withAuth HOC to protect routes
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedTrafficSourcesPage = withAuth(TrafficSourcesPage);
const ProtectedConversionAnalysisPage = withAuth(ConversionAnalysisPage);
const ProtectedOverviewPage = withAuth(OverviewPage);
const ProtectedAsoAiHubPage = withAuth(AsoAiHubPage);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AsoDataProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth/sign-in" element={<SignInPage />} />
              <Route path="/auth/sign-up" element={<SignUpPage />} />
              <Route path="/dashboard" element={<ProtectedDashboard />} />
              <Route path="/traffic-sources" element={<ProtectedTrafficSourcesPage />} />
              <Route path="/conversion-analysis" element={<ProtectedConversionAnalysisPage />} />
              <Route path="/overview" element={<ProtectedOverviewPage />} />
              <Route path="/aso-ai-hub" element={<ProtectedAsoAiHubPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AsoDataProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

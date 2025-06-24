
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContextProvider } from "./context/AuthContext";
import { AsoDataProvider } from "./context/AsoDataContext";
import { AppContextProvider } from "./context/AppContext";
import { AsoAiHubProvider } from "./context/AsoAiHubContext";
import { WorkflowProvider } from "./context/WorkflowContext";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const TrafficSources = lazy(() => import("./pages/traffic-sources"));
const ConversionAnalysis = lazy(() => import("./pages/conversion-analysis"));
const Overview = lazy(() => import("./pages/overview"));
const KeywordIntelligence = lazy(() => import("./pages/keyword-intelligence"));
const AsoAiHub = lazy(() => import("./pages/aso-ai-hub"));
const AsoIntelligence = lazy(() => import("./pages/aso-intelligence"));
const FeaturingToolkit = lazy(() => import("./pages/featuring-toolkit"));
const Apps = lazy(() => import("./pages/apps"));
const AppDiscovery = lazy(() => import("./pages/app-discovery"));
const Profile = lazy(() => import("./pages/profile"));
const Settings = lazy(() => import("./pages/settings"));
const Admin = lazy(() => import("./pages/admin"));
const SignIn = lazy(() => import("./pages/auth/sign-in"));
const SignUp = lazy(() => import("./pages/auth/sign-up"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthContextProvider>
            <AsoDataProvider>
              <AppContextProvider>
                <AsoAiHubProvider>
                  <WorkflowProvider>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/traffic-sources" element={<TrafficSources />} />
                        <Route path="/conversion-analysis" element={<ConversionAnalysis />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/keyword-intelligence" element={<KeywordIntelligence />} />
                        <Route path="/aso-ai-hub" element={<AsoAiHub />} />
                        <Route path="/aso-intelligence" element={<AsoIntelligence />} />
                        <Route path="/featuring-toolkit" element={<FeaturingToolkit />} />
                        <Route path="/apps" element={<Apps />} />
                        <Route path="/app-discovery" element={<AppDiscovery />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/auth/sign-in" element={<SignIn />} />
                        <Route path="/auth/sign-up" element={<SignUp />} />
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                      </Routes>
                    </Suspense>
                  </WorkflowProvider>
                </AsoAiHubProvider>
              </AppContextProvider>
            </AsoDataProvider>
          </AuthContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

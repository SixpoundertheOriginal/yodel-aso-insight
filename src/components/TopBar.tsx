
import React from "react";
import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import DatePicker from "./DatePicker";
import ResetButton from "./ResetButton";
import { UserMenu } from "./UserMenu";
import { AppSelector } from "./AppSelector";
import { BigQueryAppSelector } from "./BigQueryAppSelector";
import { Heading3 } from "./ui/design-system";
import { useBigQueryAppSelection } from "@/context/BigQueryAppContext";
import { useAuth } from "@/context/AuthContext";

const TopBar: React.FC = React.memo(() => {
  const location = useLocation();
  const { selectedApps, setSelectedApps } = useBigQueryAppSelection();
  const { user } = useAuth();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/overview':
        return 'Overview';
      case '/dashboard':
        return 'Store Performance';
      case '/conversion-analysis':
        return 'Conversion Analysis';
      case '/aso-ai-hub':
        return 'ASO AI Hub';
      case '/keyword-intelligence':
        return 'Keyword Intelligence';
      case '/apps':
        return 'Apps';
      case '/profile':
        return 'Profile';
      case '/settings':
        return 'Settings';
      case '/admin':
        return 'Admin Panel';
      default:
        return 'Dashboard';
    }
  };

  const showDateControls = ['/dashboard', '/overview', '/conversion-analysis'].includes(location.pathname);
  
  // Analytics pages use BigQuery data
  const analyticsPages = ['/dashboard', '/overview', '/conversion-analysis'];
  const isAnalyticsPage = analyticsPages.includes(location.pathname);
  
  // AI Copilots pages use manual apps
  const authPages = ['/auth/sign-in', '/auth/sign-up', '/'];
  const systemPages = ['/profile', '/settings', '/admin'];
  const showManualAppSelector = !isAnalyticsPage && !authPages.includes(location.pathname) && !systemPages.includes(location.pathname);

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-700 bg-zinc-900/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8 text-zinc-400 hover:text-white" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yodel-orange"></div>
            <Heading3 className="text-lg font-semibold text-white sm:text-2xl">
              {getPageTitle()}
            </Heading3>
            {isAnalyticsPage && (
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <div className="px-2 py-1 bg-zinc-800 rounded-md text-xs text-zinc-400">
                  Data Source: BigQuery
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* BigQuery App Selector for Analytics pages */}
          {isAnalyticsPage && (
            <div className="hidden md:block">
              <BigQueryAppSelector
                organizationId={user?.organization_id}
                selectedApps={selectedApps}
                onSelectionChange={setSelectedApps}
              />
            </div>
          )}
          
          {/* Manual App Selector for AI Copilots pages */}
          {showManualAppSelector && (
            <div className="hidden md:block">
              <AppSelector />
            </div>
          )}
          
          {showDateControls && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block">
                <DatePicker />
              </div>
              <ResetButton />
            </div>
          )}
          <UserMenu />
        </div>
      </div>
      
      {/* Mobile controls - show below header on mobile when needed */}
      <div className="border-t border-zinc-800 px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          {isAnalyticsPage && (
            <BigQueryAppSelector
              organizationId={user?.organization_id}
              selectedApps={selectedApps}
              onSelectionChange={setSelectedApps}
            />
          )}
          {showManualAppSelector && <AppSelector />}
          {showDateControls && <DatePicker />}
        </div>
      </div>
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;

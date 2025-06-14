
import React from "react";
import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import DatePicker from "./DatePicker";
import ResetButton from "./ResetButton";
import { Heading3 } from "./ui/design-system";

const TopBar: React.FC = React.memo(() => {
  const location = useLocation();
  
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
      default:
        return 'Dashboard';
    }
  };

  const showDateControls = ['/dashboard', '/overview', '/conversion-analysis'].includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-700 bg-zinc-900/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8 text-zinc-400 hover:text-white" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yodel-orange"></div>
            <Heading3 className="text-lg font-semibold text-white sm:text-2xl">
              {getPageTitle()}
            </Heading3>
          </div>
        </div>
        
        {showDateControls && (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <DatePicker />
            </div>
            <ResetButton />
          </div>
        )}
      </div>
      
      {/* Mobile date controls - show below header on mobile when needed */}
      {showDateControls && (
        <div className="border-t border-zinc-800 px-4 py-3 sm:hidden">
          <DatePicker />
        </div>
      )}
    </header>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;

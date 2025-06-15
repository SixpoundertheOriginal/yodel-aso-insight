
import React from "react";
import { useLocation } from "react-router-dom";
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
    <div className="border-b border-zinc-700 bg-zinc-900/80 backdrop-blur-sm p-6 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 rounded-full bg-yodel-orange"></div>
        <Heading3 className="text-white font-semibold">
          {getPageTitle()}
        </Heading3>
      </div>
      
      {showDateControls && (
        <div className="flex items-center space-x-4">
          <DatePicker />
          <ResetButton />
        </div>
      )}
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;

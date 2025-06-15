
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar: React.FC = React.memo(() => {
  const location = useLocation();
  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-700 min-h-0 h-full">
      <div className="py-6 px-4">
        <div className="flex items-center mb-8 px-2">
          <div className="w-10 h-10 rounded-md bg-gradient-to-r from-yodel-orange to-yodel-orange/90 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">Y</span>
          </div>
          <div className="ml-3">
            <h2 className="text-xl font-semibold text-white">Yodel</h2>
            <p className="text-xs text-zinc-400">App Store Optimization</p>
          </div>
        </div>
        {/* -- Reporting Dashboard Group -- */}
        <div className="mb-6">
          <h3 className="uppercase text-xs text-zinc-500 font-bold pl-3 mb-2 tracking-wide">Reporting Dashboard</h3>
          <nav className="space-y-1">
            <SidebarItem 
              href="/overview" 
              label="Overview" 
              isActive={location.pathname === '/overview'}
            />
            <SidebarItem 
              href="/dashboard" 
              label="Store Performance" 
              isActive={location.pathname === '/dashboard'}
            />
            <SidebarItem 
              href="/conversion-analysis" 
              label="Conversion Analysis" 
              isActive={location.pathname === '/conversion-analysis'}
            />
          </nav>
        </div>
        {/* -- AI Copilots Group -- */}
        <div>
          <h3 className="uppercase text-xs text-zinc-500 font-bold pl-3 mb-2 tracking-wide">AI Copilots</h3>
          <nav className="space-y-1">
            <SidebarItem 
              href="/aso-ai-hub" 
              label="ASO AI Hub" 
              isActive={location.pathname === '/aso-ai-hub'}
            />
            {/* Future copilots go here */}
          </nav>
        </div>
      </div>
    </aside>
  );
});

interface SidebarItemProps {
  href: string;
  label: string;
  isActive?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, label, isActive }) => {
  return (
    <Link
      to={href}
      className={`flex items-center px-3 py-2 rounded-md transition-colors ${
        isActive 
          ? "bg-yodel-orange text-white" 
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {/* You may want to add an icon here as needed */}
      <span>{label}</span>
    </Link>
  );
};

Sidebar.displayName = "Sidebar";
export default Sidebar;

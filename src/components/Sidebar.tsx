
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Bot, 
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const Sidebar: React.FC = React.memo(() => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <aside className={cn(
      "bg-zinc-900 border-r border-zinc-700 transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">Y</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Yodel ASO</h2>
                <p className="text-xs text-zinc-400">Insights Platform</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {/* Dashboard Section */}
        <div>
          <SidebarSection title="Dashboard" isCollapsed={isCollapsed}>
            <SidebarItem 
              href="/overview" 
              icon={Home}
              label="Overview" 
              isActive={location.pathname === '/overview'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/dashboard" 
              icon={BarChart3}
              label="Store Performance" 
              isActive={location.pathname === '/dashboard'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/conversion-analysis" 
              icon={Target}
              label="Conversion Analysis" 
              isActive={location.pathname === '/conversion-analysis'}
              isCollapsed={isCollapsed}
            />
          </SidebarSection>
        </div>

        {/* AI Tools Section */}
        <div>
          <SidebarSection title="AI Copilots" isCollapsed={isCollapsed}>
            <SidebarItem 
              href="/aso-ai-hub" 
              icon={Bot}
              label="ASO AI Hub" 
              isActive={location.pathname === '/aso-ai-hub'}
              isCollapsed={isCollapsed}
            />
          </SidebarSection>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-700">
        <div className={cn(
          "text-xs text-zinc-500 transition-opacity",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          © 2024 Yodel Mobile
        </div>
      </div>
    </aside>
  );
});

interface SidebarSectionProps {
  title: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, isCollapsed, children }) => {
  if (isCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="uppercase text-xs text-zinc-500 font-bold px-3 tracking-wide">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  href, 
  icon: Icon, 
  label, 
  isActive, 
  isCollapsed 
}) => {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
        isActive 
          ? "bg-yodel-orange text-white shadow-md" 
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
        isCollapsed ? "justify-center" : "justify-start"
      )}
    >
      <Icon className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
      {!isCollapsed && <span className="ml-3 font-medium">{label}</span>}
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  );
};

Sidebar.displayName = "Sidebar";
export default Sidebar;

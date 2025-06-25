
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Bot, 
  Home,
  Search,
  Shield,
  User,
  Settings as SettingsIcon,
  Smartphone,
  Database,
  PieChart
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";

// Analytics & Insights - Pure data visualization from BigQuery
const analyticsItems = [
  {
    title: "Overview",
    url: "/overview",
    icon: Home,
  },
  {
    title: "Store Performance", 
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Conversion Analysis",
    url: "/conversion-analysis", 
    icon: Target,
  },
];

// AI Copilots & Tools - Manual management and AI features
const aiToolsItems = [
  {
    title: "ASO AI Hub",
    url: "/aso-ai-hub",
    icon: Bot,
  },
  {
    title: "Keyword Intelligence",
    url: "/keyword-intelligence",
    icon: Search,
  },
  {
    title: "Apps",
    url: "/apps",
    icon: Smartphone,
  },
];

// User account items
const userItems = [
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: SettingsIcon,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { isSuperAdmin, isOrganizationAdmin } = usePermissions();

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-700">
      <SidebarHeader className="border-b border-zinc-700 p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
            <span className="text-lg font-bold text-white">Y</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-white">Yodel ASO</span>
            <span className="truncate text-xs text-zinc-400">Insights Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Analytics & Insights Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            📊 Analytics & Insights
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 data-[active=true]:bg-yodel-orange data-[active=true]:text-white hover:bg-zinc-800 hover:text-white"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Copilots & Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            🤖 AI Copilots & Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiToolsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 data-[active=true]:bg-yodel-orange data-[active=true]:text-white hover:bg-zinc-800 hover:text-white"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration Section - visible to org admins and super admins */}
        {(isSuperAdmin || isOrganizationAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              🔧 Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/app-discovery'}
                    tooltip="App Discovery"
                    className="h-10 data-[active=true]:bg-yodel-orange data-[active=true]:text-white hover:bg-zinc-800 hover:text-white"
                  >
                    <Link to="/app-discovery" className="flex items-center gap-3">
                      <Database className="h-4 w-4 shrink-0" />
                      <span className="truncate">App Discovery</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/admin'}
                      tooltip="Admin Panel"
                      className="h-10 data-[active=true]:bg-yodel-orange data-[active=true]:text-white hover:bg-zinc-800 hover:text-white"
                    >
                      <Link to="/admin" className="flex items-center gap-3">
                        <Shield className="h-4 w-4 shrink-0" />
                        <span className="truncate">Admin Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 data-[active=true]:bg-yodel-orange data-[active=true]:text-white hover:bg-zinc-800 hover:text-white"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-700 p-4">
        <div className="text-xs text-zinc-500 group-data-[collapsible=icon]:hidden">
          © 2024 Yodel Mobile
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

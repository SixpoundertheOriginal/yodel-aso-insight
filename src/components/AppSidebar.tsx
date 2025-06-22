
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Bot, 
  Home,
  Search
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

const navigationItems = [
  {
    title: "Dashboard",
    items: [
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
    ],
  },
  {
    title: "AI Copilots",
    items: [
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
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();

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
        {navigationItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
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
        ))}
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


import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User, FileText, Save, ChevronDown } from 'lucide-react';

interface FeaturingNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectName?: string;
  onSave?: () => void;
}

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'editor', label: 'Editor', icon: '✏️' },
  { id: 'strategy', label: 'Strategy', icon: '🎯' },
  { id: 'submission', label: 'Submission', icon: '📤' },
  { id: 'export', label: 'Export', icon: '📁' }
];

export const FeaturingNav: React.FC<FeaturingNavProps> = ({
  activeTab,
  onTabChange,
  projectName = "Untitled Project",
  onSave
}) => {
  return (
    <div className="bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Branding & Tabs */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">⭐</div>
              <h1 className="text-lg font-bold text-white">Featuring Strategy Toolkit</h1>
            </div>
            
            <nav className="flex space-x-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 ${
                    activeTab === tab.id 
                      ? 'bg-yodel-orange text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </Button>
              ))}
            </nav>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{projectName}</span>
              <Badge variant="outline" className="text-xs">
                Unsaved
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="flex items-center space-x-1"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="hidden md:block">Agency</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem className="text-zinc-300">
                  Yodel Mobile ASO
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300">
                  Saved Projects
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300">
                  Team Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

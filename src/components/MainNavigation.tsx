import { Navigation, BarChart3, Building2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PanelType = 'navigate' | 'analyze' | 'plan' | 'settings';

interface MainNavigationProps {
  activePanel: PanelType | null;
  onPanelToggle: (panel: PanelType) => void;
}

const TABS: { id: PanelType; label: string; icon: typeof Navigation }[] = [
  { id: 'navigate', label: 'Navigate', icon: Navigation },
  { id: 'analyze', label: 'Plan', icon: BarChart3 },
  { id: 'plan', label: 'City', icon: Building2 },
  { id: 'settings', label: 'Setting', icon: Settings },
];

const MainNavigation = ({ activePanel, onPanelToggle }: MainNavigationProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1.5 bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onPanelToggle(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-transform duration-300",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
              
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MainNavigation;

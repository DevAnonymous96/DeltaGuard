'use client';

import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Layers, 
  TrendingUp, 
  History, 
  Settings, 
  HelpCircle,
  Calculator,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Positions',
    href: '/dashboard/positions',
    icon: Layers,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: TrendingUp,
  },
  {
    title: 'History',
    href: '/dashboard/history',
    icon: History,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

const quickLinks = [
  {
    title: 'IL Simulator',
    href: '/simulator',
    icon: Calculator,
  },
  {
    title: 'Help & Docs',
    href: '/docs',
    icon: HelpCircle,
  },
];

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 border-r border-border bg-card transition-transform duration-300 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-border">
            <span className="text-lg font-semibold">Menu</span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Main
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </a>
                );
              })}
            </div>

            <div className="pt-4 space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Links
              </p>
              {quickLinks.map((item) => {
                const Icon = item.icon;
                
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose()}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Footer Stats */}
          <div className="p-4 border-t border-border">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">
                System Status
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Oracle:</span>
                  <span className="flex items-center gap-1 text-green-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="text-foreground">Sepolia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
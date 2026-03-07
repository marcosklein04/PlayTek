import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Gamepad2,
  FolderOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PlaytekLogo } from './PlaytekLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { adminNavItems } from '@/components/admin/adminNavigation';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/buy-credits', label: 'Comprar creditos', icon: Wallet },
  { path: '/catalog', label: 'Catalogo', icon: Gamepad2 },
  { path: '/my-games', label: 'Mis Juegos', icon: FolderOpen },
  { path: '/settings', label: 'Configuracion', icon: Settings },
];

export function Sidebar() {
  const { user, logout, contractedGames, walletBalance } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = user?.role === "admin";

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("flex justify-center border-b border-sidebar-border", collapsed ? "px-3 py-5" : "px-6 py-7")}>
        <PlaytekLogo size={collapsed ? "sm" : "md"} showText={!collapsed} />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const isContractsCustomization = item.path === "/my-games" && location.pathname.startsWith("/contracts/");
          const isActive = location.pathname === item.path || isContractsCustomization;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200",
                isActive
                  ? "border border-primary/20 bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="font-medium">{item.label}</span>}

              {!collapsed && item.path === '/my-games' && contractedGames.length > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {contractedGames.length}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className={cn("mt-4 border-t border-sidebar-border pt-4", collapsed && "pt-3")}>
          <div className={cn("rounded-lg border border-primary/20 bg-primary/5", collapsed ? "px-2 py-3" : "px-4 py-3")}>
            <div className={cn("flex items-center", collapsed ? "justify-center gap-1 text-xs" : "gap-3")}>
              <Coins className={cn("text-primary", collapsed ? "h-4 w-4" : "h-5 w-5")} />
              {!collapsed ? (
                <>
                  <span className="font-medium text-sidebar-foreground">Creditos</span>
                  <span className="text-base font-semibold text-primary">
                    {walletBalance === null ? "..." : walletBalance.toLocaleString("es-AR")}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-primary">
                  {walletBalance === null ? "..." : walletBalance.toLocaleString("es-AR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className={cn("mt-4 border-t border-sidebar-border pt-4", collapsed && "pt-3")}>
            {!collapsed && (
              <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Superadmin
              </div>
            )}

            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200",
                    isActive
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-4 px-2">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.organization}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "px-2"
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar sesion</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

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

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/buy-credits', label: 'Comprar créditos', icon: Wallet },
  { path: '/catalog', label: 'Catálogo', icon: Gamepad2 },
  { path: '/my-games', label: 'Mis Juegos', icon: FolderOpen },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

const adminItems = [
  { path: "/admin/overview", label: "Superadmin · Panel", icon: LayoutDashboard },
  { path: "/admin/credit-packs", label: "Superadmin · Packs", icon: Wallet },
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
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <PlaytekLogo size={collapsed ? "sm" : "md"} showText={!collapsed} />
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isContractsCustomization =
            item.path === "/my-games" && location.pathname.startsWith("/contracts/");
          const isActive = location.pathname === item.path || isContractsCustomization;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="font-medium">{item.label}</span>}

              {!collapsed && item.path === '/my-games' && contractedGames.length > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {contractedGames.length}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className={cn("pt-4 mt-4 border-t border-sidebar-border", collapsed && "pt-3")}>
          <div
            className={cn(
              "rounded-lg border border-primary/20 bg-primary/5",
              collapsed ? "px-2 py-3 flex flex-col items-center gap-2" : "px-4 py-3"
            )}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Coins className="w-4 h-4 text-primary" />
              {!collapsed && <span>Créditos</span>}
            </div>
            <p className={cn("font-semibold text-primary", collapsed ? "text-xs" : "text-lg")}>
              {walletBalance === null ? "..." : walletBalance.toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        {/* 👇 ACA VA EL BLOQUE ADMIN */}
        {isAdmin && (
          <div className={cn("pt-4 mt-4 border-t border-sidebar-border", collapsed && "pt-3")}>
            {!collapsed && (
              <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Superadmin
              </div>
            )}

            {adminItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
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

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-4 px-2">
            <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.organization}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "px-2"
          )}
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

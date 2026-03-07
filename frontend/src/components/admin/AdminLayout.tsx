import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { adminNavItems } from "@/components/admin/adminNavigation";

export function AdminLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 space-y-6 p-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
              <p className="mt-1 text-muted-foreground">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>

          <nav className="flex flex-wrap gap-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </header>

        {children}
      </main>
    </div>
  );
}

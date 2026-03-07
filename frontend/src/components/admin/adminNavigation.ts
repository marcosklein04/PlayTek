import { FolderOpen, LayoutDashboard, Users, Wallet } from "lucide-react";

export const adminNavItems = [
  { path: "/admin/overview", label: "Resumen", icon: LayoutDashboard },
  { path: "/admin/clients", label: "Clientes", icon: Users },
  { path: "/admin/contracts", label: "Contratos", icon: FolderOpen },
  { path: "/admin/credit-packs", label: "Packs", icon: Wallet },
];

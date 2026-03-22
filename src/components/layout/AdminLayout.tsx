import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag, Users, FileText,
  BarChart3, Settings, ChevronLeft, Menu, X, Tag, Shield, Layers, LayoutTemplate,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { usePermissions } from "@/hooks/usePermissions";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "Products", icon: Package, path: "/admin/products" },
  { label: "Categories", icon: Layers, path: "/admin/categories" },
  { label: "Inventory", icon: Warehouse, path: "/admin/inventory" },
  { label: "Orders", icon: ShoppingBag, path: "/admin/orders" },
  { label: "Customers", icon: Users, path: "/admin/customers" },
  { label: "Discounts", icon: Tag, path: "/admin/discounts" },
  { label: "Landing", icon: LayoutTemplate, path: "/admin/landing" },
  { label: "CMS", icon: FileText, path: "/admin/cms" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Access Control", icon: Shield, path: "/admin/access" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const { permissions } = usePermissions();

  // Show loading state while checking auth
  if (isLoading) {
    return <RemquipLoadingScreen variant="fullscreen" message="Verifying admin access" />;
  }

  // Staff routes — send to login with return path (LoginPage honors state.from and ?redirect=)
  if (!isAuthenticated || !user) {
    console.warn('[AdminLayout] Access denied: Not authenticated');
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/admin/login?redirect=${encodeURIComponent(returnTo)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // Redirect to home if user doesn't have admin role
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager';
  if (!isAdmin) {
    console.warn('[AdminLayout] Access denied: User role is', user.role, 'but admin role required');
    return <Navigate to="/" replace />;
  }

  console.log('[AdminLayout] Access granted for:', user.email, 'with role:', user.role);

  const currentPage = navItems.find(
    (item) => location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path))
  );

  return (
    <div className="min-h-screen flex bg-secondary">
      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col animate-slide-in-right" style={{ animationName: 'none', transform: 'translateX(0)' }}>
            <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
              <span className="font-display text-lg font-bold tracking-wider text-sidebar-primary">REMQUIP</span>
              <button onClick={() => setMobileNav(false)} className="text-sidebar-foreground"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
              {navItems.map((item) => {
                const active = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNav(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                      active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <Link to="/" className="text-sm text-sidebar-foreground hover:text-sidebar-primary transition-colors">
                ← Back to Store
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex bg-sidebar text-sidebar-foreground flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && <span className="font-display text-lg font-bold tracking-wider text-sidebar-primary">REMQUIP</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground hover:text-sidebar-primary transition-colors">
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Link to="/" className={`text-sm text-sidebar-foreground hover:text-sidebar-primary transition-colors ${collapsed ? "text-center block" : ""}`}>
            {collapsed ? "←" : "← Back to Store"}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 bg-card border-b border-border flex items-center px-4 md:px-6 gap-3">
          <button onClick={() => setMobileNav(true)} className="md:hidden text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-display font-bold text-base md:text-lg">{currentPage?.label || "Admin Dashboard"}</h2>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

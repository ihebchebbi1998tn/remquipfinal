import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag, ShoppingCart, Users, FileText,
  BarChart3, Settings, ChevronLeft, Menu, X, Tag, Shield, Layers, LayoutTemplate,
  Phone, MessageCircle, LogOut, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { usePermissions } from "@/hooks/usePermissions";
import { ADMIN_NO_AUTH } from "@/config/constants";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";

type NavGroup = {
  label: string;
  items: { label: string; icon: React.ElementType; path: string }[];
};

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/admin" },
      { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", icon: Package, path: "/admin/products" },
      { label: "Categories", icon: Layers, path: "/admin/categories" },
      { label: "Inventory", icon: Warehouse, path: "/admin/inventory" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", icon: ShoppingBag, path: "/admin/orders" },
      { label: "Abandoned Carts", icon: ShoppingCart, path: "/admin/carts" },
      { label: "Customers", icon: Users, path: "/admin/customers" },
      { label: "Discounts", icon: Tag, path: "/admin/discounts" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Landing", icon: LayoutTemplate, path: "/admin/landing" },
      { label: "CMS", icon: FileText, path: "/admin/cms" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users", icon: Users, path: "/admin/users" },
      { label: "Admin Contacts", icon: Phone, path: "/admin/admin-contacts" },
      { label: "Access Control", icon: Shield, path: "/admin/access" },
      { label: "Chat Inbox", icon: MessageCircle, path: "/admin/chat" },
      { label: "Settings", icon: Settings, path: "/admin/settings" },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "AD";
}

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

  // Staff routes — send to login with return path
  if (!ADMIN_NO_AUTH) {
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

    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager';
    if (!isAdmin) {
      console.warn('[AdminLayout] Access denied: User role is', user.role, 'but admin role required');
      return <Navigate to="/" replace />;
    }

    console.log('[AdminLayout] Access granted for:', user.email, 'with role:', user.role);
  }

  const currentPage = allNavItems.find(
    (item) => location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path))
  );

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));

  const initials = getInitials(user?.full_name, user?.email);
  const displayName = user?.full_name || user?.email || "Admin";
  const displayRole = user?.role?.replace(/_/g, " ") || "admin";

  /* ── Sidebar content (shared between mobile & desktop) ── */
  function NavContent({ isMobile = false }: { isMobile?: boolean }) {
    return (
      <>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed || isMobile ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="font-display text-xs font-black text-sidebar-primary-foreground">R</span>
              </div>
              <span className="font-display text-base font-bold tracking-wider text-sidebar-foreground">REMQUIP</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
              <span className="font-display text-xs font-black text-sidebar-primary-foreground">R</span>
            </div>
          )}
          {isMobile ? (
            <button onClick={() => setMobileNav(false)} className="text-sidebar-foreground p-1 rounded-lg hover:bg-sidebar-accent transition-colors">
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded-lg hover:bg-sidebar-accent transition-colors">
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto admin-scroll space-y-1">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {(!collapsed || isMobile) && (
                <div className="admin-section-label mt-3 first:mt-0 mb-1 px-2">
                  <span>{group.label}</span>
                </div>
              )}
              {collapsed && !isMobile && gi > 0 && (
                <div className="mx-3 my-2 border-t border-sidebar-border/40" />
              )}
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed && !isMobile ? item.label : undefined}
                    onClick={isMobile ? () => setMobileNav(false) : undefined}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    } ${collapsed && !isMobile ? "justify-center px-2" : ""}`}
                  >
                    <div className={`relative flex-shrink-0 ${active ? "" : ""}`}>
                      {active && (
                        <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
                      )}
                      <item.icon className={`h-[18px] w-[18px] transition-transform duration-150 ${
                        collapsed && !isMobile ? "group-hover:scale-110" : ""
                      }`} />
                    </div>
                    {(!collapsed || isMobile) && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section — user + back to store */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {(!collapsed || isMobile) ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/40">
              <div className="admin-avatar w-8 h-8 text-[11px]" style={{ background: 'hsl(var(--sidebar-primary) / 0.2)', color: 'hsl(var(--sidebar-primary))', borderColor: 'hsl(var(--sidebar-primary) / 0.3)' }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{displayRole}</p>
              </div>
            </div>
          ) : (
            <div className="admin-avatar w-8 h-8 text-[11px] mx-auto" style={{ background: 'hsl(var(--sidebar-primary) / 0.2)', color: 'hsl(var(--sidebar-primary))', borderColor: 'hsl(var(--sidebar-primary) / 0.3)' }} title={displayName}>
              {initials}
            </div>
          )}
          <Link
            to="/"
            className={`flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/40 ${
              collapsed && !isMobile ? "justify-center" : ""
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Back to Store</span>}
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl">
            <NavContent isMobile />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex bg-sidebar text-sidebar-foreground flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border/30 ${collapsed ? "w-[68px]" : "w-64"}`}>
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 md:h-16 bg-card border-b border-border flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setMobileNav(true)} className="md:hidden text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">{getGreeting()}</span>
              <span className="text-muted-foreground hidden sm:inline">·</span>
              <h2 className="font-display font-bold text-base md:text-lg truncate">{currentPage?.label || "Admin Dashboard"}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminGlobalSearch />
          </div>
        </header>

        {/* Main — page-enter animation + scrollbar */}
        <main className="flex-1 p-4 md:p-6 overflow-auto admin-scroll admin-page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

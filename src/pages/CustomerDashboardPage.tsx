import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrapApiList, type Order } from "@/lib/api";
import {
  Package, User, MapPin, Clock, Truck, CheckCircle, Eye, ArrowLeft,
  Shield, ChevronDown, ChevronUp, Loader2, AlertCircle,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

type Tab = "orders" | "profile" | "security";

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  confirmed: "badge-info",
  processing: "badge-info",
  shipped: "badge-info",
  delivered: "badge-success",
  completed: "badge-success",
  cancelled: "badge-destructive",
};

const statusFlow = ["pending", "processing", "shipped", "completed"];
const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  completed: CheckCircle,
};

interface UserOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  items_count: number;
  tracking_number?: string;
  estimated_delivery_date?: string;
}

export default function CustomerDashboardPage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user, isAuthenticated, isLoading: authLoading, updateProfile } = useAuth();

  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({ full_name: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Sync profile form with auth user
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || "",
        phone: (user as any).phone || "",
      });
    }
  }, [user?.id]);

  // Redirect unauthenticated
  if (!authLoading && (!isAuthenticated || !user)) {
    return <Navigate to="/login" replace />;
  }

  // Load orders
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetch = async () => {
      try {
        setOrdersLoading(true);
        setOrdersError(null);
        const res = await api.getUserOrders(1, 50);
        const rows = unwrapApiList<Record<string, unknown>>(res as any, []);
        setOrders(
          rows.map((o) => ({
            id: String(o.id ?? ""),
            order_number: String(o.order_number ?? o.id ?? ""),
            total: Number(o.total ?? 0),
            status: String(o.status ?? "pending"),
            created_at: String(o.created_at ?? ""),
            items_count: Number(o.items_count ?? 0),
            tracking_number: o.tracking_number != null ? String(o.tracking_number) : undefined,
            estimated_delivery_date: o.estimated_delivery_date != null ? String(o.estimated_delivery_date) : undefined,
          }))
        );
      } catch {
        setOrdersError("Failed to load orders. Please refresh to try again.");
      } finally {
        setOrdersLoading(false);
      }
    };
    fetch();
  }, [isAuthenticated]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfile({ full_name: profileData.full_name, phone: profileData.phone });
      showSuccessToast("Profile updated successfully.");
    } catch {
      showErrorToast("Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      showErrorToast("New passwords do not match.");
      return;
    }
    if (passwords.next.length < 8) {
      showErrorToast("New password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.updatePassword(user!.id, passwords.current, passwords.next);
      showSuccessToast("Password updated successfully.");
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to update password. Please check your current password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const tabs: { key: Tab; labelKey: string; icon: React.ElementType }[] = [
    { key: "orders",   labelKey: "customer.my_orders",        icon: Package },
    { key: "profile",  labelKey: "customer.profile",          icon: User },
    { key: "security", labelKey: "customer.security",         icon: Shield },
  ];

  const pendingCount = orders.filter((o) => o.status !== "completed" && o.status !== "delivered" && o.status !== "cancelled").length;

  // Order detail view
  if (selectedOrder) {
    const currentIdx = statusFlow.indexOf(selectedOrder.status);
    return (
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => setSelectedOrder(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
          <ArrowLeft className="h-4 w-4" /> {t("customer.back_to_orders")}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl">{selectedOrder.order_number || selectedOrder.id}</h2>
            <p className="text-sm text-muted-foreground">{t("customer.placed_on")} {selectedOrder.created_at?.split("T")[0] || selectedOrder.created_at}</p>
          </div>
          <span className={statusStyles[selectedOrder.status] || "badge-warning"}>{t(`order.status.${selectedOrder.status}`) || selectedOrder.status}</span>
        </div>

        {/* Status timeline */}
        <div className="dashboard-card mb-6">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.order_progress")}</h3>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
            {statusFlow.map((s, i) => {
              const Icon = statusIcons[s];
              const isActive = i <= currentIdx;
              const isCurrent = s === selectedOrder.status;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`h-0.5 flex-1 min-w-4 ${i <= currentIdx ? "bg-accent" : "bg-border"}`} />}
                  <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap ${
                    isCurrent ? "bg-accent text-accent-foreground" : isActive ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline capitalize">{t(`order.status.${s}`)}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {selectedOrder.tracking_number && (
            <div className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded-sm mt-4">
              <Truck className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{t("customer.tracking")}:</span>
              <span className="font-mono text-xs">{selectedOrder.tracking_number}</span>
            </div>
          )}
          {selectedOrder.estimated_delivery_date && (
            <p className="text-xs text-muted-foreground mt-3">
              Estimated delivery: <strong>{selectedOrder.estimated_delivery_date}</strong>
            </p>
          )}
        </div>

        <div className="dashboard-card">
          <p className="text-sm text-muted-foreground">
            {selectedOrder.items_count} item{selectedOrder.items_count !== 1 ? "s" : ""} ·{" "}
            <span className="font-bold text-foreground">{formatPrice(selectedOrder.total)}</span>
          </p>
          <Link to="/dashboard" className="text-xs text-accent hover:underline mt-3 block">
            View full order details in your dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6">{t("customer.dashboard")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="dashboard-card flex items-center gap-3">
          <Package className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.total_orders")}</p>
            <p className="text-xl font-bold font-display">{ordersLoading ? "—" : orders.length}</p>
          </div>
        </div>
        <div className="dashboard-card flex items-center gap-3">
          <Clock className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.pending_orders")}</p>
            <p className="text-xl font-bold font-display">{ordersLoading ? "—" : pendingCount}</p>
          </div>
        </div>
        <div className="dashboard-card flex items-center gap-3">
          <User className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.account_type")}</p>
            <p className="text-xl font-bold font-display">{t("customer.wholesale")}</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="space-y-3">
          {ordersLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading your orders…</span>
            </div>
          )}
          {!ordersLoading && ordersError && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-sm text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {ordersError}
            </div>
          )}
          {!ordersLoading && !ordersError && orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No orders found. Start shopping to see your orders here.</p>
              <Link to="/products" className="btn-accent text-xs py-2 px-4 rounded-sm font-medium mt-4 inline-block">
                Browse Products
              </Link>
            </div>
          )}
          {!ordersLoading && !ordersError && orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="dashboard-card">
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{order.order_number || order.id}</span>
                        <span className={statusStyles[order.status] || "badge-warning"}>{t(`order.status.${order.status}`) || order.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.created_at?.split("T")[0] || order.created_at}
                        {order.items_count > 0 && ` · ${order.items_count} ${t("customer.items")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-sm font-bold">{formatPrice(order.total)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {order.tracking_number && (
                      <div className="flex items-center gap-2 text-xs bg-secondary/50 p-2.5 rounded-sm">
                        <Truck className="h-3.5 w-3.5 text-accent" />
                        <span className="text-muted-foreground">{t("customer.tracking")}:</span>
                        <span className="font-mono">{order.tracking_number}</span>
                      </div>
                    )}
                    <button onClick={() => setSelectedOrder(order)} className="btn-accent text-xs py-2 px-4 rounded-sm font-medium flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> {t("customer.view_details")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <form onSubmit={handleProfileSave} className="dashboard-card max-w-lg space-y-4">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.account_info")}</h3>
          <div>
            <label className="block text-sm font-medium mb-1">{t("contact.name")}</label>
            <input
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
            <input
              value={user?.email || ""}
              readOnly
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-secondary/30 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("checkout.phone")}</label>
            <input
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              type="tel"
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="btn-accent px-6 py-2.5 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("customer.save_changes")}
          </button>
        </form>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <form onSubmit={handlePasswordSave} className="dashboard-card max-w-lg space-y-4">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.change_password")}</h3>
          <div>
            <label className="block text-sm font-medium mb-1">{t("customer.current_password")}</label>
            <input
              type="password"
              required
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("customer.new_password")}</label>
            <input
              type="password"
              required
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.confirm_password")}</label>
            <input
              type="password"
              required
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="btn-accent px-6 py-2.5 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("customer.update_password")}
          </button>
        </form>
      )}
    </div>
  );
}

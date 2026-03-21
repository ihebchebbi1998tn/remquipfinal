import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Package, User, MapPin, Clock, Truck, CheckCircle, Eye, Edit, ArrowLeft, CreditCard, FileText, Shield, X, ChevronDown, ChevronUp, Settings } from "lucide-react";

type Tab = "orders" | "addresses" | "profile" | "security";

const mockOrders = [
  { id: "RMQ-001234", date: "2026-03-10", total: 2450.00, status: "processing", items: 4, trackingNumber: "", carrier: "",
    products: [{ name: "Air Spring W01-358 9781", sku: "1T15ZR-6", qty: 2, price: 89.99 }, { name: "30/30 Long Stroke Brake Chamber", sku: "SC3030LS", qty: 2, price: 134.50 }],
    timeline: [{ date: "2026-03-10 09:15", status: "pending", label: "" }, { date: "2026-03-10 10:30", status: "processing", label: "" }] },
  { id: "RMQ-001220", date: "2026-02-28", total: 890.50, status: "shipped", items: 2, trackingNumber: "1Z999AA10123456784", carrier: "Purolator",
    products: [{ name: "4707Q Brake Shoe Kit", sku: "BS-4707Q", qty: 2, price: 74.99 }],
    timeline: [{ date: "2026-02-28 08:00", status: "pending", label: "" }, { date: "2026-02-28 12:00", status: "processing", label: "" }, { date: "2026-03-01 14:00", status: "shipped", label: "" }] },
  { id: "RMQ-001198", date: "2026-02-15", total: 3200.00, status: "completed", items: 8, trackingNumber: "1Z999AA10123456785", carrier: "Purolator",
    products: [{ name: "ADB22X Air Disc Brake Pad Kit", sku: "ADB22X-PAD", qty: 4, price: 156.00 }, { name: "4709 Hardware Kit", sku: "HW-4709", qty: 4, price: 28.50 }],
    timeline: [{ date: "2026-02-15 07:30", status: "pending", label: "" }, { date: "2026-02-15 10:00", status: "processing", label: "" }, { date: "2026-02-16 09:00", status: "shipped", label: "" }, { date: "2026-02-18 16:00", status: "completed", label: "" }] },
];

const mockAddresses = [
  { id: "addr-1", label: "", street: "456 Route de la Traverse", city: "Lévis", province: "QC", postal: "G6V 6N2", country: "Canada", isDefault: true },
  { id: "addr-2", label: "", street: "789 Boulevard Laurier", city: "Québec", province: "QC", postal: "G1V 4T3", country: "Canada", isDefault: false },
];

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  completed: "badge-success",
  cancelled: "badge-destructive",
};

const statusFlow = ["pending", "processing", "shipped", "completed"];
const statusIcons: Record<string, React.ElementType> = { pending: Clock, processing: Package, shipped: Truck, completed: CheckCircle };

export default function CustomerDashboardPage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const tabs: { key: Tab; labelKey: string; icon: React.ElementType }[] = [
    { key: "orders", labelKey: "customer.my_orders", icon: Package },
    { key: "addresses", labelKey: "customer.addresses", icon: MapPin },
    { key: "profile", labelKey: "customer.profile", icon: User },
    { key: "security", labelKey: "customer.security", icon: Shield },
  ];

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
            <h2 className="font-display font-bold text-lg md:text-xl">{selectedOrder.id}</h2>
            <p className="text-sm text-muted-foreground">{t("customer.placed_on")} {selectedOrder.date}</p>
          </div>
          <span className={statusStyles[selectedOrder.status]}>{t(`order.status.${selectedOrder.status}`)}</span>
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
          {selectedOrder.status === "shipped" && selectedOrder.trackingNumber && (
            <div className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded-sm mt-4">
              <Truck className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{t("customer.tracking")}:</span>
              <span className="font-mono text-xs">{selectedOrder.trackingNumber}</span>
              <span className="text-xs text-muted-foreground">({selectedOrder.carrier})</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="dashboard-card mb-6">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.items_ordered")}</h3>
          <div className="space-y-3">
            {selectedOrder.products.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-medium">{formatPrice(p.price * p.qty)}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} × {formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between font-bold">
            <span>{t("cart.total")}</span>
            <span>{formatPrice(selectedOrder.total)}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.activity")}</h3>
          <div className="space-y-3">
            {selectedOrder.timeline.map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{entry.date}</p>
                  <p className="text-sm capitalize">{t(`order.status.${entry.status}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6">{t("customer.dashboard")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="dashboard-card flex items-center gap-3">
          <Package className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.total_orders")}</p>
            <p className="text-xl font-bold font-display">{mockOrders.length}</p>
          </div>
        </div>
        <div className="dashboard-card flex items-center gap-3">
          <Clock className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.pending_orders")}</p>
            <p className="text-xl font-bold font-display">{mockOrders.filter(o => o.status !== "completed").length}</p>
          </div>
        </div>
        <div className="dashboard-card flex items-center gap-3">
          <User className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.account_type")}</p>
            <p className="text-xl font-bold font-display">{t("customer.wholesale")}</p>
          </div>
        </div>
        <div className="dashboard-card flex items-center gap-3">
          <MapPin className="h-7 w-7 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-muted-foreground">{t("customer.addresses")}</p>
            <p className="text-xl font-bold font-display">{mockAddresses.length}</p>
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
          {mockOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="dashboard-card">
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{order.id}</span>
                        <span className={statusStyles[order.status]}>{t(`order.status.${order.status}`)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.date} · {order.items} {t("customer.items")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-sm font-bold">{formatPrice(order.total)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {order.products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku} · {t("cart.quantity")}: {p.qty}</p>
                        </div>
                        <span className="font-medium">{formatPrice(p.price * p.qty)}</span>
                      </div>
                    ))}
                    {order.trackingNumber && (
                      <div className="flex items-center gap-2 text-xs bg-secondary/50 p-2.5 rounded-sm">
                        <Truck className="h-3.5 w-3.5 text-accent" />
                        <span className="text-muted-foreground">{t("customer.tracking")}:</span>
                        <span className="font-mono">{order.trackingNumber}</span>
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

      {/* Addresses tab */}
      {tab === "addresses" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {mockAddresses.map((addr) => (
              <div key={addr.id} className="dashboard-card relative">
                {addr.isDefault && (
                  <span className="badge-success text-xs absolute top-3 right-3">{t("customer.default")}</span>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{addr.label || t("customer.shipping_address")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{addr.street}</p>
                    <p className="text-sm text-muted-foreground">{addr.city}, {addr.province} {addr.postal}</p>
                    <p className="text-sm text-muted-foreground">{addr.country}</p>
                    <button className="text-xs text-accent hover:underline mt-2 flex items-center gap-1">
                      <Edit className="h-3 w-3" /> {t("customer.edit")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-accent text-sm py-2.5 px-5 rounded-sm font-medium">
            + {t("customer.add_address")}
          </button>
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="dashboard-card max-w-lg">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.account_info")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("contact.name")}</label>
              <input defaultValue="Jean-Pierre Lavoie" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("checkout.company")}</label>
              <input defaultValue="Groupe Transport Lévis" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
              <input defaultValue="jp@gtl.ca" type="email" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("checkout.phone")}</label>
              <input defaultValue="+1 418 555 0101" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("checkout.tax_id")}</label>
              <input defaultValue="QC-12345678" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <button className="btn-accent px-6 py-2.5 rounded-sm text-sm font-medium">{t("customer.save_changes")}</button>
          </div>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div className="space-y-6 max-w-lg">
          <div className="dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-4">{t("customer.change_password")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("customer.current_password")}</label>
                <input type="password" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("customer.new_password")}</label>
                <input type="password" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.confirm_password")}</label>
                <input type="password" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <button className="btn-accent px-6 py-2.5 rounded-sm text-sm font-medium">{t("customer.update_password")}</button>
            </div>
          </div>
          <div className="dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-3">{t("customer.delete_account")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("customer.delete_account_desc")}</p>
            <button className="px-4 py-2 border border-destructive text-destructive rounded-sm text-sm font-medium hover:bg-destructive/10 transition-colors">
              {t("customer.delete_account")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

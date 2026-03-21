import React from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, Users, DollarSign, TrendingUp, AlertTriangle, ArrowRight, Tag, Truck, FileText } from "lucide-react";
import { products } from "@/config/products";

const stats = [
  { label: "Total Products", value: products.length.toString(), icon: Package, change: "+3 this month", color: "text-accent" },
  { label: "Total Orders", value: "156", icon: ShoppingBag, change: "+12 this week", color: "text-blue-500" },
  { label: "Customers", value: "89", icon: Users, change: "+5 this month", color: "text-green-500" },
  { label: "Revenue", value: "C$48,290", icon: DollarSign, change: "+18% vs last month", color: "text-accent" },
];

const recentOrders = [
  { id: "RMQ-001234", customer: "Groupe Transport Lévis", total: "C$2,450.00", status: "processing", date: "2026-03-10" },
  { id: "RMQ-001233", customer: "Fleet Services Ontario", total: "C$1,890.50", status: "shipped", date: "2026-03-09" },
  { id: "RMQ-001232", customer: "Québec Truck Parts Inc.", total: "C$3,200.00", status: "completed", date: "2026-03-08" },
  { id: "RMQ-001231", customer: "Maritime Heavy Hauling", total: "C$675.00", status: "pending", date: "2026-03-08" },
  { id: "RMQ-001230", customer: "Prairie Fleet Maintenance", total: "C$1,120.00", status: "completed", date: "2026-03-07" },
];

const activityLog = [
  { time: "10:32 AM", user: "Marc Dupont", action: "Updated stock for Air Spring W01-358", type: "inventory" },
  { time: "09:45 AM", user: "System", action: "Order RMQ-001234 payment confirmed", type: "order" },
  { time: "09:15 AM", user: "Julie Martin", action: "Shipped order RMQ-001233 via Purolator", type: "shipping" },
  { time: "08:30 AM", user: "System", action: "New customer registration: BC Trucking", type: "customer" },
  { time: "Yesterday", user: "Marc Dupont", action: "Created discount code FLEET10", type: "discount" },
  { time: "Yesterday", user: "System", action: "Low stock alert: 4707Q Brake Shoe Kit (12 remaining)", type: "alert" },
  { time: "Yesterday", user: "Julie Martin", action: "Published updated Shipping Policy page", type: "cms" },
];

const activityIcons: Record<string, React.ElementType> = {
  inventory: Package,
  order: ShoppingBag,
  shipping: Truck,
  customer: Users,
  discount: Tag,
  alert: AlertTriangle,
  cms: FileText,
};

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  completed: "badge-success",
  cancelled: "badge-destructive",
};

export default function AdminOverview() {
  const lowStockProducts = products.filter((p) => p.stock < 50);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="dashboard-card">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold font-display mt-1">{stat.value}</p>
                <p className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3 flex-shrink-0" /><span className="truncate">{stat.change}</span></p>
              </div>
              <stat.icon className={`h-7 w-7 md:h-8 md:w-8 flex-shrink-0 ${stat.color}`} strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm uppercase">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{order.id}</span>
                    <span className={statusStyles[order.status]}>{order.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{order.customer}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-medium">{order.total}</p>
                  <p className="text-xs text-muted-foreground">{order.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-3 py-2">Order</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-sm">{order.id}</td>
                    <td className="px-3 py-2.5 text-sm truncate max-w-[200px]">{order.customer}</td>
                    <td className="px-3 py-2.5 font-medium text-sm">{order.total}</td>
                    <td className="px-3 py-2.5"><span className={statusStyles[order.status]}>{order.status}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm uppercase flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Low Stock
            </h3>
            <Link to="/admin/inventory" className="text-xs text-accent font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {lowStockProducts.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate mr-2 text-xs md:text-sm">{p.name}</span>
                <span className={`font-medium flex-shrink-0 text-xs md:text-sm ${p.stock < 20 ? "text-destructive" : "text-warning"}`}>{p.stock}</span>
              </div>
            ))}
            {lowStockProducts.length === 0 && <p className="text-sm text-muted-foreground">All products well-stocked.</p>}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm uppercase flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Recent Activity
          </h3>
        </div>
        <div className="space-y-3">
          {activityLog.map((entry, i) => {
            const Icon = activityIcons[entry.type] || FileText;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{entry.user} · {entry.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Add Product", to: "/admin/products/new", icon: Package },
          { label: "View Orders", to: "/admin/orders", icon: ShoppingBag },
          { label: "Discounts", to: "/admin/discounts", icon: Tag },
          { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="dashboard-card flex items-center gap-3 hover:border-accent transition-colors"
          >
            <action.icon className="h-5 w-5 text-accent flex-shrink-0" />
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

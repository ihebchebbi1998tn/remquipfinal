import React, { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Eye, Loader2, AlertCircle } from "lucide-react";
import {
  useAnalyticsDashboard,
  useAnalyticsMetrics,
  useRevenueStats,
  useAnalyticsSales,
  useAnalyticsEvents,
} from "@/hooks/useApi";
import { unwrapApiList } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

const periods = ["7d", "30d", "90d", "12m"] as const;

/** Maps UI range to Backend `GET /analytics/sales?period=`. */
function uiPeriodToSalesPeriod(p: (typeof periods)[number]): "day" | "week" | "month" | "year" {
  if (p === "7d") return "day";
  if (p === "12m") return "year";
  return "month";
}

function formatSalesPeriodLabel(period: unknown): string {
  if (period == null || period === "") return "—";
  const s = String(period);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  }
  if (/^\d{4}$/.test(s)) return s;
  return s.length > 14 ? `${s.slice(0, 12)}…` : s;
}

// Calculate date range based on period
function getDateRange(period: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "12m":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<typeof periods[number]>("30d");
  const queryClient = useQueryClient();

  // Get date range for the selected period
  const { startDate, endDate } = getDateRange(period);

  // Fetch analytics data from API
  const { data: dashboardResponse, isLoading: dashboardLoading, isError: dashboardError } = useAnalyticsDashboard();
  const { data: metricsResponse, isLoading: metricsLoading } = useAnalyticsMetrics(startDate, endDate);
  const { data: revenueResponse, isLoading: revenueLoading } = useRevenueStats(startDate, endDate);
  const salesPeriod = uiPeriodToSalesPeriod(period);
  const { data: salesResponse, isLoading: salesLoading } = useAnalyticsSales(salesPeriod);
  const { data: eventsResponse, isLoading: eventsLoading } = useAnalyticsEvents(40, 0);
  const events = unwrapApiList<Record<string, unknown>>(eventsResponse, []);

  const isLoading = dashboardLoading;
  const isError = dashboardError;

  // Get data from responses
  const dashboard = dashboardResponse?.data || {};
  const rawMetrics = metricsResponse?.data;
  const metrics = Array.isArray(rawMetrics) ? {} : rawMetrics || {};
  const rev = revenueResponse?.data || {};
  const revenueData =
    rev && typeof rev === "object" && !Array.isArray(rev)
      ? { ...rev, total_revenue: (rev as { revenue?: number }).revenue ?? (rev as { total_revenue?: number }).total_revenue }
      : {};

  // Fallback data if API doesn't return expected structure
  const stats = {
    views:
      dashboard.page_views != null
        ? String(dashboard.page_views)
        : metrics.page_views != null
          ? String(metrics.page_views)
          : "0",
    conversion: dashboard.conversion_rate || metrics.conversion_rate || "0%",
    aov: `C$${dashboard.average_order_value || metrics.average_order_value || 0}`,
    returning: dashboard.returning_customers || metrics.returning_customers || "0%",
    totalOrders: dashboard.total_orders || 0,
    totalRevenue: dashboard.total_revenue || 0,
    newCustomers: dashboard.new_customers || 0,
  };

  // Revenue by category (from API or fallback)
  const revenueByCategory = revenueData.by_category || dashboard.revenue_by_category || [
    { category: "Brake Shoes & Pads", percentage: 38, value: 0, trend: "+0%" },
    { category: "Brake Chambers", percentage: 26, value: 0, trend: "+0%" },
    { category: "Air Suspension", percentage: 22, value: 0, trend: "+0%" },
    { category: "Brake Drums", percentage: 14, value: 0, trend: "+0%" },
  ];

  // Top products (from API or fallback)
  const topProducts = dashboard.top_products || revenueData.top_products || [];

  const salesRows = Array.isArray(salesResponse?.data) ? salesResponse.data : [];
  const monthlySalesFromApi = salesRows.map((row: Record<string, unknown>) => ({
    month: formatSalesPeriodLabel(row.period),
    value: Number(row.revenue ?? 0),
  }));

  // Monthly sales chart: prefer /analytics/sales, else dashboard / revenue aggregates
  const monthlySales =
    monthlySalesFromApi.length > 0
      ? monthlySalesFromApi.slice(-24)
      : (revenueData.monthly as { month: string; value: number }[] | undefined) ||
        (dashboard.monthly_sales as { month: string; value: number }[] | undefined) || [
          { month: "Oct", value: 0 },
          { month: "Nov", value: 0 },
          { month: "Dec", value: 0 },
          { month: "Jan", value: 0 },
          { month: "Feb", value: 0 },
          { month: "Mar", value: 0 },
        ];

  const maxSales = Math.max(...monthlySales.map((m: any) => m.value || 0), 1);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[min(420px,72vh)] flex items-center justify-center">
        <RemquipLoadingScreen variant="embedded" message="Loading analytics" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Failed to load analytics</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Unable to fetch analytics data from the server.
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics'] })}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display font-bold text-lg md:text-xl">Analytics</h2>
        <div className="flex gap-1 bg-secondary rounded-sm p-0.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Page Views", value: stats.views.toLocaleString(), icon: Eye, color: "text-info" },
          { label: "Conversion Rate", value: stats.conversion, icon: TrendingUp, color: "text-success" },
          { label: "Avg Order Value", value: stats.aov, icon: DollarSign, color: "text-accent" },
          { label: "Return Customers", value: stats.returning, icon: Users, color: "text-info" },
        ].map((stat) => (
          <div key={stat.label} className="dashboard-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold font-display mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="dashboard-card">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display mt-1">{stats.totalOrders}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            <p className="text-xs md:text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display mt-1">C${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-info" />
            <p className="text-xs md:text-sm text-muted-foreground">New Customers</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display mt-1">{stats.newCustomers}</p>
        </div>
      </div>

      {/* Sales revenue chart (GET /analytics/sales when available) */}
      {monthlySales.length > 0 && (
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-1 flex items-center gap-2 flex-wrap">
            <BarChart3 className="h-4 w-4 text-accent" /> Sales revenue
            <span className="text-xs font-normal text-muted-foreground normal-case">({period} · {salesPeriod})</span>
            {salesLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
            )}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Bar height = revenue (C$) from analytics sales API when returned.</p>
          <div className="flex items-end gap-2 md:gap-4 h-40">
            {monthlySales.map((m: any, i: number) => (
              <div key={`${i}-${String(m.month)}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-xs font-medium tabular-nums truncate max-w-full">
                  {typeof m.value === "number" ? Math.round(m.value) : m.value || 0}
                </span>
                <div
                  className="w-full bg-accent/80 rounded-t-sm transition-all"
                  style={{ height: `${((m.value || 0) / maxSales) * 100}%`, minHeight: m.value > 0 ? "4px" : "0" }}
                />
                <span className="text-xs text-muted-foreground text-center leading-tight px-0.5">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue by Category */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" /> Revenue by Category
          </h3>
          <div className="space-y-4">
            {revenueByCategory.map((item: any) => (
              <div key={item.category || item.cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-xs md:text-sm">{item.category || item.cat}</span>
                  <div className="flex items-center gap-2">
                    {item.trend && (
                      <span className={`text-xs ${item.trend.startsWith("+") ? "text-success" : "text-destructive"} flex items-center gap-0.5`}>
                        {item.trend.startsWith("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {item.trend}
                      </span>
                    )}
                    <span className="font-medium text-xs md:text-sm">
                      {typeof item.value === "number" ? `C$${item.value.toLocaleString()}` : item.val || item.value}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-sm h-2.5">
                  <div 
                    className="bg-accent h-2.5 rounded-sm transition-all" 
                    style={{ width: `${item.percentage || item.pct || 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Top Products
          </h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p: any, i: number) => (
                <div key={p.name || p.product_name || i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span className="truncate text-xs md:text-sm">{p.name || p.product_name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">{p.units || p.quantity_sold} units</span>
                    <span className="text-xs font-medium hidden sm:inline">
                      {typeof p.revenue === "number" ? `C$${p.revenue.toLocaleString()}` : p.revenue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No product data available.</p>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent" /> Tracked events
          <span className="text-xs font-normal text-muted-foreground normal-case">(last 40 · `analytics` table)</span>
          {eventsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Public storefront sends <code className="text-[10px] bg-secondary px-1 rounded">page_view</code> via{" "}
          <code className="text-[10px] bg-secondary px-1 rounded">POST /analytics/events</code>.
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-header text-left">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((ev) => (
                  <tr key={String(ev.id ?? Math.random())}>
                    <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                      {ev.created_at ? new Date(String(ev.created_at)).toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-1.5 font-medium">{String(ev.event_type ?? "")}</td>
                    <td className="px-2 py-1.5 truncate max-w-[100px]" title={String(ev.user_id ?? "")}>
                      {ev.user_id ? String(ev.user_id).slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[200px] font-mono text-[10px]" title={String(ev.data ?? "")}>
                      {ev.data ? String(ev.data) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

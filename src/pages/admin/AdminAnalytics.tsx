import React, { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Eye } from "lucide-react";

const periods = ["7d", "30d", "90d", "12m"] as const;

const periodData: Record<string, { views: string; conversion: string; aov: string; returning: string }> = {
  "7d": { views: "3,120", conversion: "3.8%", aov: "C$1,380", returning: "61%" },
  "30d": { views: "12,480", conversion: "3.2%", aov: "C$1,240", returning: "64%" },
  "90d": { views: "38,200", conversion: "3.0%", aov: "C$1,190", returning: "58%" },
  "12m": { views: "156,400", conversion: "2.8%", aov: "C$1,150", returning: "52%" },
};

const revenueByCategory = [
  { cat: "Brake Shoes & Pads", pct: 38, val: "C$18,350", trend: "+12%" },
  { cat: "Brake Chambers", pct: 26, val: "C$12,555", trend: "+8%" },
  { cat: "Air Suspension", pct: 22, val: "C$10,624", trend: "+15%" },
  { cat: "Brake Drums", pct: 14, val: "C$6,761", trend: "-3%" },
];

const topProducts = [
  { name: "ADB22X Air Disc Brake Pad Kit", units: 45, revenue: "C$7,020" },
  { name: "30/30 Long Stroke Brake Chamber", units: 38, revenue: "C$5,111" },
  { name: "4707Q Brake Shoe Kit", units: 32, revenue: "C$2,400" },
  { name: "Brake Drum - Gunite 3600A", units: 28, revenue: "C$5,544" },
  { name: "Air Spring W01-358 9781", units: 24, revenue: "C$2,160" },
];

const monthlySales = [
  { month: "Oct", value: 32 }, { month: "Nov", value: 45 }, { month: "Dec", value: 38 },
  { month: "Jan", value: 52 }, { month: "Feb", value: 48 }, { month: "Mar", value: 65 },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<typeof periods[number]>("30d");
  const data = periodData[period];
  const maxSales = Math.max(...monthlySales.map(m => m.value));

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
          { label: "Page Views", value: data.views, icon: Eye, color: "text-info" },
          { label: "Conversion Rate", value: data.conversion, icon: TrendingUp, color: "text-success" },
          { label: "Avg Order Value", value: data.aov, icon: DollarSign, color: "text-accent" },
          { label: "Return Customers", value: data.returning, icon: Users, color: "text-info" },
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

      {/* Sales chart (simplified bar) */}
      <div className="dashboard-card">
        <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" /> Monthly Sales (units)
        </h3>
        <div className="flex items-end gap-2 md:gap-4 h-40">
          {monthlySales.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium">{m.value}</span>
              <div
                className="w-full bg-accent/80 rounded-t-sm transition-all"
                style={{ height: `${(m.value / maxSales) * 100}%` }}
              />
              <span className="text-xs text-muted-foreground">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" /> Revenue by Category</h3>
          <div className="space-y-4">
            {revenueByCategory.map((item) => (
              <div key={item.cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-xs md:text-sm">{item.cat}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${item.trend.startsWith("+") ? "text-success" : "text-destructive"} flex items-center gap-0.5`}>
                      {item.trend.startsWith("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {item.trend}
                    </span>
                    <span className="font-medium text-xs md:text-sm">{item.val}</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-sm h-2.5">
                  <div className="bg-accent h-2.5 rounded-sm transition-all" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Top Products</h3>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="truncate text-xs md:text-sm">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{p.units} units</span>
                  <span className="text-xs font-medium hidden sm:inline">{p.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Copy, Tag, Percent, DollarSign, Calendar, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";

interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "scheduled" | "disabled";
  appliesTo: "all" | "category" | "product";
  target?: string;
}

const discounts: Discount[] = [
  { id: "d1", code: "FLEET10", type: "percentage", value: 10, minOrder: 500, maxUses: 100, usedCount: 34, startDate: "2026-01-01", endDate: "2026-06-30", status: "active", appliesTo: "all" },
  { id: "d2", code: "BRAKE50", type: "fixed", value: 50, minOrder: 300, maxUses: 50, usedCount: 12, startDate: "2026-02-01", endDate: "2026-04-30", status: "active", appliesTo: "category", target: "Brake Shoes & Pads" },
  { id: "d3", code: "WELCOME15", type: "percentage", value: 15, minOrder: 0, maxUses: 200, usedCount: 67, startDate: "2025-12-01", endDate: "2026-12-31", status: "active", appliesTo: "all" },
  { id: "d4", code: "SUMMER25", type: "percentage", value: 25, minOrder: 1000, maxUses: 30, usedCount: 0, startDate: "2026-06-01", endDate: "2026-08-31", status: "scheduled", appliesTo: "all" },
  { id: "d5", code: "HOLIDAY20", type: "percentage", value: 20, minOrder: 200, maxUses: 75, usedCount: 75, startDate: "2025-12-15", endDate: "2026-01-05", status: "expired", appliesTo: "all" },
  { id: "d6", code: "AIRSPRING100", type: "fixed", value: 100, minOrder: 800, maxUses: 20, usedCount: 5, startDate: "2026-03-01", endDate: "2026-05-31", status: "disabled", appliesTo: "category", target: "Air Suspension" },
];

const statusStyles: Record<string, string> = {
  active: "badge-success",
  expired: "badge-destructive",
  scheduled: "badge-info",
  disabled: "badge-warning",
};

export default function AdminDiscounts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", type: "percentage" as "percentage" | "fixed", value: 0, minOrder: 0, maxUses: 100, startDate: "", endDate: "", appliesTo: "all" as "all" | "category" | "product", target: "" });

  const filtered = discounts.filter((d) => {
    const matchSearch = !search || d.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCodes = discounts.filter(d => d.status === "active").length;
  const totalUsed = discounts.reduce((s, d) => s + d.usedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display font-bold text-lg md:text-xl">Discounts & Coupons</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-accent px-3 md:px-4 py-2 rounded-sm text-xs md:text-sm font-medium flex items-center gap-2 self-start">
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Create Discount</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Total Codes</p>
          <p className="text-xl font-bold font-display">{discounts.length}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-bold font-display text-success">{activeCodes}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Total Uses</p>
          <p className="text-xl font-bold font-display">{totalUsed}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Avg. Discount</p>
          <p className="text-xl font-bold font-display">{Math.round(discounts.filter(d => d.type === "percentage").reduce((s, d) => s + d.value, 0) / discounts.filter(d => d.type === "percentage").length)}%</p>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">New Discount Code</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. FLEET10" className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min. Order (CAD)</label>
              <input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Applies To</label>
              <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value as "all" | "category" | "product" })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none">
                <option value="all">All Products</option>
                <option value="category">Specific Category</option>
                <option value="product">Specific Product</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setShowForm(false); }} className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 w-full justify-center">
                <CheckCircle className="h-4 w-4" /> Create Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search codes..." className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none w-full sm:w-auto">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-2">
          {filtered.map((d) => {
            const isExpanded = expandedDiscount === d.id;
            return (
              <div key={d.id} className="border border-border rounded-md overflow-hidden">
                <button onClick={() => setExpandedDiscount(isExpanded ? null : d.id)} className="w-full p-3 text-left flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Tag className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="font-mono font-medium text-sm">{d.code}</span>
                      <span className={statusStyles[d.status]}>{d.status}</span>
                    </div>
                    <p className="text-sm font-bold">
                      {d.type === "percentage" ? `${d.value}% off` : `C$${d.value} off`}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-1.5 bg-secondary/30">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Min. Order</span><span>C${d.minOrder}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Uses</span><span>{d.usedCount} / {d.maxUses}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Applies To</span><span>{d.appliesTo === "all" ? "All Products" : d.target}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Period</span><span>{d.startDate} → {d.endDate}</span></div>
                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
                      <button className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1"><Edit className="h-3 w-3" /> Edit</button>
                      <button className="px-3 py-1.5 border border-destructive rounded-sm text-destructive text-xs hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Discount</th>
                <th className="text-right px-3 py-2">Min. Order</th>
                <th className="text-right px-3 py-2">Uses</th>
                <th className="text-left px-3 py-2">Applies To</th>
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono font-medium">{d.code}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium">
                    <span className="flex items-center gap-1">
                      {d.type === "percentage" ? <><Percent className="h-3 w-3" />{d.value}%</> : <><DollarSign className="h-3 w-3" />C${d.value}</>}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">C${d.minOrder}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={d.usedCount >= d.maxUses ? "text-destructive" : ""}>{d.usedCount}</span>
                    <span className="text-muted-foreground"> / {d.maxUses}</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{d.appliesTo === "all" ? "All Products" : d.target}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.startDate}</div>
                    <div className="text-muted-foreground/60">→ {d.endDate}</div>
                  </td>
                  <td className="px-3 py-3"><span className={statusStyles[d.status]}>{d.status}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Copy Code"><Copy className="h-4 w-4" /></button>
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No discount codes found.</div>}
      </div>
    </div>
  );
}
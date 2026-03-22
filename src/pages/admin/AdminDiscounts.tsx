import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Copy, Tag, Percent, DollarSign, Calendar, CheckCircle, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { useDiscounts, useApiMutation } from "@/hooks/useApi";
import { api, Discount, unwrapApiList, unwrapPagination } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

const statusStyles: Record<string, string> = {
  active: "badge-success",
  expired: "badge-destructive",
  scheduled: "badge-info",
  disabled: "badge-warning",
};

function getDiscountStatus(discount: Discount): string {
  if (!discount.is_active) return "disabled";
  const now = new Date();
  const validFrom = new Date(discount.valid_from);
  const validUntil = new Date(discount.valid_until);
  if (now < validFrom) return "scheduled";
  if (now > validUntil) return "expired";
  if (discount.max_usage_count && discount.current_usage_count >= discount.max_usage_count) return "expired";
  return "active";
}

export default function AdminDiscounts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    code: "", 
    discount_type: "percentage" as "percentage" | "fixed_amount", 
    discount_value: 0, 
    min_purchase_amount: 0, 
    max_usage_count: 100, 
    valid_from: "", 
    valid_until: "",
    description: "",
  });

  const queryClient = useQueryClient();

  // Fetch discounts from API
  const { data: discountsResponse, isLoading, isError, error } = useDiscounts(page, 50);

  // Mutations
  const createDiscountMutation = useApiMutation(
    (data: any) => api.createDiscount(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['discounts'] });
        setShowForm(false);
        resetForm();
      },
    }
  );

  const updateDiscountMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => api.updateDiscount(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['discounts'] });
        setShowForm(false);
        setEditingId(null);
        resetForm();
      },
    }
  );

  const deleteDiscountMutation = useApiMutation(
    (id: string) => api.deleteDiscount(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['discounts'] });
      },
    }
  );

  function resetForm() {
    setForm({ 
      code: "", 
      discount_type: "percentage", 
      discount_value: 0, 
      min_purchase_amount: 0, 
      max_usage_count: 100, 
      valid_from: "", 
      valid_until: "",
      description: "",
    });
  }

  const discounts: Discount[] = unwrapApiList<Discount>(discountsResponse, []);
  const pagination = unwrapPagination(discountsResponse);

  // Filter discounts locally
  const filtered = discounts.filter((d) => {
    const status = getDiscountStatus(d);
    const matchSearch = !search || d.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCodes = discounts.filter(d => getDiscountStatus(d) === "active").length;
  const totalUsed = discounts.reduce((s, d) => s + d.current_usage_count, 0);

  const handleSubmit = () => {
    if (!form.code || !form.valid_from || !form.valid_until) return;

    const data = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_purchase_amount: form.min_purchase_amount || undefined,
      max_usage_count: form.max_usage_count || undefined,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      description: form.description || undefined,
      is_active: true,
    };

    if (editingId) {
      updateDiscountMutation.mutate({ id: editingId, data });
    } else {
      createDiscountMutation.mutate(data);
    }
  };

  const handleEdit = (discount: Discount) => {
    setForm({
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_purchase_amount: discount.min_purchase_amount || 0,
      max_usage_count: discount.max_usage_count || 100,
      valid_from: discount.valid_from.split('T')[0],
      valid_until: discount.valid_until.split('T')[0],
      description: discount.description || "",
    });
    setEditingId(discount.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this discount code?")) {
      deleteDiscountMutation.mutate(id);
    }
  };

  const handleToggleStatus = (discount: Discount) => {
    updateDiscountMutation.mutate({
      id: discount.id,
      data: { is_active: !discount.is_active }
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[min(420px,72vh)] flex items-center justify-center">
        <RemquipLoadingScreen variant="embedded" message="Loading discounts" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Failed to load discounts</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {error instanceof Error ? error.message : "An error occurred while fetching discounts."}
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['discounts'] })}
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
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl">Discounts & Coupons</h2>
          {pagination && <p className="text-sm text-muted-foreground">{pagination.total} total codes</p>}
        </div>
        <button 
          onClick={() => { 
            resetForm(); 
            setEditingId(null); 
            setShowForm(!showForm); 
          }} 
          className="btn-accent px-3 md:px-4 py-2 rounded-sm text-xs md:text-sm font-medium flex items-center gap-2 self-start"
        >
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
          <p className="text-xl font-bold font-display">
            {discounts.filter(d => d.discount_type === "percentage").length > 0 
              ? Math.round(discounts.filter(d => d.discount_type === "percentage").reduce((s, d) => s + d.discount_value, 0) / discounts.filter(d => d.discount_type === "percentage").length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">
            {editingId ? "Edit Discount Code" : "New Discount Code"}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input 
                value={form.code} 
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                placeholder="e.g. FLEET10" 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select 
                value={form.discount_type} 
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed_amount" })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input 
                type="number" 
                value={form.discount_value} 
                onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min. Order (CAD)</label>
              <input 
                type="number" 
                value={form.min_purchase_amount} 
                onChange={(e) => setForm({ ...form, min_purchase_amount: parseFloat(e.target.value) || 0 })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses</label>
              <input 
                type="number" 
                value={form.max_usage_count} 
                onChange={(e) => setForm({ ...form, max_usage_count: parseInt(e.target.value) || 0 })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Optional description" 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input 
                type="date" 
                value={form.valid_from} 
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input 
                type="date" 
                value={form.valid_until} 
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })} 
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleSubmit} 
                disabled={createDiscountMutation.isLoading || updateDiscountMutation.isLoading}
                className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 w-full justify-center disabled:opacity-50"
              >
                {(createDiscountMutation.isLoading || updateDiscountMutation.isLoading) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {editingId ? "Update Code" : "Create Code"}
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
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search codes..." 
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none w-full sm:w-auto"
          >
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
            const status = getDiscountStatus(d);
            const isExpanded = expandedDiscount === d.id;
            return (
              <div key={d.id} className="border border-border rounded-md overflow-hidden">
                <button onClick={() => setExpandedDiscount(isExpanded ? null : d.id)} className="w-full p-3 text-left flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Tag className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="font-mono font-medium text-sm">{d.code}</span>
                      <span className={statusStyles[status]}>{status}</span>
                    </div>
                    <p className="text-sm font-bold">
                      {d.discount_type === "percentage" ? `${d.discount_value}% off` : `C$${d.discount_value} off`}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-1.5 bg-secondary/30">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Min. Order</span><span>C${d.min_purchase_amount || 0}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Uses</span><span>{d.current_usage_count} / {d.max_usage_count || "∞"}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Period</span><span>{d.valid_from.split('T')[0]} → {d.valid_until.split('T')[0]}</span></div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => copyToClipboard(d.code)} className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
                      <button onClick={() => handleEdit(d)} className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1"><Edit className="h-3 w-3" /> Edit</button>
                      <button onClick={() => handleDelete(d.id)} disabled={deleteDiscountMutation.isLoading} className="px-3 py-1.5 border border-destructive rounded-sm text-destructive text-xs hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="h-3 w-3" /></button>
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
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => {
                const status = getDiscountStatus(d);
                return (
                  <tr key={d.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-accent" />
                        <span className="font-mono font-medium">{d.code}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <span className="flex items-center gap-1">
                        {d.discount_type === "percentage" ? <><Percent className="h-3 w-3" />{d.discount_value}%</> : <><DollarSign className="h-3 w-3" />C${d.discount_value}</>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">C${d.min_purchase_amount || 0}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={d.max_usage_count && d.current_usage_count >= d.max_usage_count ? "text-destructive" : ""}>{d.current_usage_count}</span>
                      <span className="text-muted-foreground"> / {d.max_usage_count || "∞"}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.valid_from.split('T')[0]}</div>
                      <div className="text-muted-foreground/60">→ {d.valid_until.split('T')[0]}</div>
                    </td>
                    <td className="px-3 py-3"><span className={statusStyles[status]}>{status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copyToClipboard(d.code)} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Copy Code"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => handleEdit(d)} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Edit"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleToggleStatus(d)} disabled={updateDiscountMutation.isLoading} className="p-1.5 hover:bg-secondary rounded-sm transition-colors disabled:opacity-50" title={d.is_active ? "Disable" : "Enable"}>{d.is_active ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</button>
                        <button onClick={() => handleDelete(d.id)} disabled={deleteDiscountMutation.isLoading} className="p-1.5 hover:bg-secondary rounded-sm transition-colors text-destructive disabled:opacity-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No discount codes found.</div>}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

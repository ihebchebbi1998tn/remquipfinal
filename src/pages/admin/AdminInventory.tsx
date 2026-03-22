import React, { useState } from "react";
import { AlertTriangle, ArrowUpDown, ArrowLeftRight, Search, ChevronDown, ChevronUp, Loader2, AlertCircle, Plus, Minus } from "lucide-react";
import { useProducts, useLowStockProducts, useInventoryLogs, useAdjustInventory } from "@/hooks/useApi";
import { Product, InventoryLog, unwrapApiList, unwrapPagination } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

export default function AdminInventory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const queryClient = useQueryClient();

  // Fetch products from API
  const { data: productsResponse, isLoading, isError, error } = useProducts(page, 100);

  // Fetch low stock products
  const { data: lowStockResponse } = useLowStockProducts();

  // Fetch inventory logs
  const { data: logsResponse } = useInventoryLogs(1, 20);

  // Mutation for adjusting inventory
  const adjustInventoryMutation = useAdjustInventory();

  const products: Product[] = unwrapApiList<Product>(productsResponse, []);
  const lowStockProducts: Product[] = unwrapApiList<Product>(lowStockResponse as any, []);
  const inventoryLogs: InventoryLog[] = unwrapApiList<InventoryLog>(logsResponse as any, []);
  const pagination = unwrapPagination(productsResponse);

  // Filter and sort products
  const filtered = products
    .filter((p) => 
      !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  // Calculate stats
  const totalUnits = products.reduce((s, p) => s + p.stock_quantity, 0);
  const lowStockCount = lowStockProducts.length || products.filter((p) => p.stock_quantity < 50 && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  const handleAdjustInventory = (productId: string) => {
    if (!adjustQuantity || !adjustReason) return;
    
    adjustInventoryMutation.mutate(
      { productId, quantity: adjustQuantity, reason: adjustReason },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          setAdjustingProduct(null);
          setAdjustQuantity(0);
          setAdjustReason("");
        },
      }
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[min(420px,72vh)] flex items-center justify-center">
        <RemquipLoadingScreen variant="embedded" message="Loading inventory" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Failed to load inventory</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {error instanceof Error ? error.message : "An error occurred while fetching inventory."}
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
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
          <h2 className="font-display font-bold text-lg md:text-xl">Inventory Management</h2>
          {pagination && <p className="text-sm text-muted-foreground">{pagination.total} products tracked</p>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-xl md:text-2xl font-bold font-display">{products.length}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Total Units</p>
          <p className="text-xl md:text-2xl font-bold font-display">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Low Stock</p>
          <p className="text-xl md:text-2xl font-bold font-display text-warning">{lowStockCount}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Out of Stock</p>
          <p className="text-xl md:text-2xl font-bold font-display text-destructive">{outOfStockCount}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="dashboard-card border-warning/50 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-display font-bold text-sm">Low Stock Alert</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(lowStockProducts.length > 0 ? lowStockProducts : products.filter(p => p.stock_quantity < 50 && p.stock_quantity > 0))
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="p-2 bg-background rounded-sm border border-border">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  <p className="text-sm font-bold text-warning">{p.stock_quantity} units</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {inventoryLogs.length > 0 && (
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Recent Inventory Activity</h3>
          <div className="space-y-2">
            {inventoryLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{log.product_name || log.product_id}</p>
                  <p className="text-xs text-muted-foreground">{log.notes || log.transaction_type}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className={`text-sm font-medium ${log.quantity_change > 0 ? "text-success" : "text-destructive"}`}>
                    {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product or SKU..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map((p) => {
            const isExpanded = expandedProduct === p.id;
            const isAdjusting = adjustingProduct === p.id;
            return (
              <div key={p.id} className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                  className="w-full p-3 text-left flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-sm font-bold ${p.stock_quantity < 50 ? "text-warning" : ""}`}>
                      {p.stock_quantity < 50 && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}{p.stock_quantity}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 bg-secondary/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Category</span>
                      <span>{p.category || "Uncategorized"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className={p.stock_quantity > 20 ? "badge-success" : p.stock_quantity > 0 ? "badge-warning" : "badge-destructive"}>
                        {p.stock_quantity > 20 ? "In Stock" : p.stock_quantity > 0 ? "Low" : "Out"}
                      </span>
                    </div>
                    {isAdjusting ? (
                      <div className="pt-2 border-t border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setAdjustQuantity(q => q - 1)} className="p-1 border border-border rounded hover:bg-secondary"><Minus className="h-4 w-4" /></button>
                          <input 
                            type="number" 
                            value={adjustQuantity} 
                            onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-border rounded text-sm bg-background"
                          />
                          <button onClick={() => setAdjustQuantity(q => q + 1)} className="p-1 border border-border rounded hover:bg-secondary"><Plus className="h-4 w-4" /></button>
                        </div>
                        <input 
                          type="text" 
                          value={adjustReason} 
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Reason for adjustment"
                          className="w-full px-2 py-1 border border-border rounded text-sm bg-background"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAdjustInventory(p.id)}
                            disabled={adjustInventoryMutation.isLoading}
                            className="flex-1 btn-accent px-3 py-1.5 rounded text-xs disabled:opacity-50"
                          >
                            {adjustInventoryMutation.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </button>
                          <button onClick={() => { setAdjustingProduct(null); setAdjustQuantity(0); setAdjustReason(""); }} className="flex-1 px-3 py-1.5 border border-border rounded text-xs hover:bg-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setAdjustingProduct(p.id)}
                        className="w-full text-xs py-1.5 btn-accent rounded-sm mt-2"
                      >
                        Adjust Stock
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">SKU</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-right px-3 py-2 cursor-pointer">
                  <span className="flex items-center justify-end gap-1">Stock <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const isAdjusting = adjustingProduct === p.id;
                return (
                  <tr key={p.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{p.sku}</td>
                    <td className="px-3 py-3">{p.category || "Uncategorized"}</td>
                    <td className={`px-3 py-3 text-right font-medium ${p.stock_quantity < 50 ? "text-warning" : ""}`}>
                      {p.stock_quantity < 50 && <AlertTriangle className="h-3 w-3 inline mr-1" />}{p.stock_quantity}
                    </td>
                    <td className="px-3 py-3">
                      <span className={p.stock_quantity > 20 ? "badge-success" : p.stock_quantity > 0 ? "badge-warning" : "badge-destructive"}>
                        {p.stock_quantity > 20 ? "In Stock" : p.stock_quantity > 0 ? "Low" : "Out"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isAdjusting ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input 
                            type="number" 
                            value={adjustQuantity} 
                            onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center border border-border rounded text-xs bg-background"
                            placeholder="+/-"
                          />
                          <input 
                            type="text" 
                            value={adjustReason} 
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Reason"
                            className="w-24 px-2 py-1 border border-border rounded text-xs bg-background"
                          />
                          <button 
                            onClick={() => handleAdjustInventory(p.id)}
                            disabled={adjustInventoryMutation.isLoading}
                            className="px-2 py-1 btn-accent rounded text-xs disabled:opacity-50"
                          >
                            {adjustInventoryMutation.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </button>
                          <button onClick={() => { setAdjustingProduct(null); setAdjustQuantity(0); setAdjustReason(""); }} className="px-2 py-1 border border-border rounded text-xs hover:bg-secondary">Cancel</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAdjustingProduct(p.id)}
                          className="px-3 py-1.5 border border-border rounded-sm text-xs hover:bg-secondary transition-colors"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No products found.</div>}

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

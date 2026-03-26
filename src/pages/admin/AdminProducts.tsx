import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Trash2, Copy, Eye, X, ChevronDown, ChevronUp, ClipboardList, Download, Loader2, AlertCircle } from "lucide-react";
import { useProducts, useCategories, useApiMutation } from "@/hooks/useApi";
import { api, unwrapApiList, unwrapPagination, Product, ProductCategory, resolveUploadImageUrl } from "@/lib/api";

function productListThumb(product: any): string | null {
  const images = product.images || [];
  const primary = images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url;
  const raw = primary || product.image || product.image_url;
  if (!raw) return null;
  return resolveUploadImageUrl(String(raw));
}
import { useQueryClient } from "@tanstack/react-query";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

const statusStyles: Record<string, string> = {
  active: "badge-success",
  draft: "badge-warning",
  archived: "badge-destructive",
};

export default function AdminProducts() {
  // Backend sometimes returns numeric fields as strings.
  // Convert safely so `.toFixed()` never crashes.
  function toNumber(v: unknown): number {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Fetch products and categories from API
  const { data: productsResponse, isLoading, isError, error } = useProducts(page, 50);
  const { data: categoriesResponse } = useCategories();

  // Mutations
  const deleteProductMutation = useApiMutation(
    (id: string) => api.deleteProduct(id),
    {
      onSuccess: () => {
        showSuccessToast("Products", "Product deleted");
        queryClient.invalidateQueries({ queryKey: ['products'] });
        setSelectedProducts(new Set());
      },
      onError: (e: unknown) => {
        showErrorToast("Products", e instanceof Error ? e.message : "Delete failed");
      },
    }
  );

  const updateProductMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    {
      onSuccess: () => {
        showSuccessToast("Products", "Product updated");
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      onError: (e: unknown) => {
        showErrorToast("Products", e instanceof Error ? e.message : "Update failed");
      },
    }
  );

  // Get data from responses (paginated API returns { items, pagination })
  const products = unwrapApiList<Product>(productsResponse, []);
  const categories: ProductCategory[] = unwrapApiList<ProductCategory>(categoriesResponse, []);
  const pagination = unwrapPagination(productsResponse);

  // Filter products locally
  const filtered = products.filter((p: Product) => {
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !categoryFilter || p.category_id === categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  function toggleSelect(id: string) {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map((p: Product) => p.id)));
    }
  }

  function handleBulkStatusChange(status: string) {
    selectedProducts.forEach(id => {
      updateProductMutation.mutate({ id, data: { status } });
    });
    setSelectedProducts(new Set());
  }

  function handleBulkDelete() {
    if (confirm(`Are you sure you want to delete ${selectedProducts.size} products?`)) {
      selectedProducts.forEach(id => {
        deleteProductMutation.mutate(id);
      });
    }
  }

  function handleDeleteProduct(id: string) {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  }

  function exportCSV() {
    const rows = filtered.map((p: Product) => 
      `${p.sku},"${p.name}",${p.category || ""},${p.price},${p.wholesale_price || ""},${p.stock_quantity},${p.status}`
    );
    const csv = `SKU,Name,Category,Price,Wholesale,Stock,Status\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // Loading state
  if (isLoading) {
    return <AdminPageLoading message="Loading products" />;
  }

  // Error state
  if (isError) {
    return (
      <AdminPageError
        message={error instanceof Error ? error.message : "An error occurred while fetching products."}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader
          title="Products"
          subtitle={pagination ? `${pagination.total} total products` : undefined}
        />
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="admin-btn--secondary text-xs hidden sm:flex">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link to="/admin/products/new" className="admin-btn--primary text-xs md:text-sm">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedProducts.size > 0 && (
        <div className="dashboard-card flex flex-wrap items-center gap-3 bg-accent/5 border-accent/30">
          <span className="text-sm font-semibold">{selectedProducts.size} selected</span>
          <button 
            onClick={() => handleBulkStatusChange("active")}
            disabled={updateProductMutation.isPending}
            className="admin-btn--secondary text-xs py-1.5"
          >
            Set Active
          </button>
          <button 
            onClick={() => handleBulkStatusChange("draft")}
            disabled={updateProductMutation.isPending}
            className="admin-btn--secondary text-xs py-1.5"
          >
            Set Draft
          </button>
          <button 
            onClick={handleBulkDelete}
            disabled={deleteProductMutation.isPending}
            className="admin-btn--danger text-xs py-1.5"
          >
            Delete
          </button>
          <button onClick={exportCSV} className="admin-btn--secondary text-xs py-1.5">
            <Download className="h-3 w-3" /> Export
          </button>
          <button onClick={() => setSelectedProducts(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
        </div>
      )}

      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <div className="relative flex-1 w-full min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="admin-input pl-10" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="admin-input flex-1 sm:flex-none">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input flex-1 sm:flex-none">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {(search || categoryFilter || statusFilter) && (
            <button onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter(""); }} className="text-xs text-accent hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {filtered.map((product: Product) => {
            const isExpanded = expandedProduct === product.id;
            const thumb = productListThumb(product);
            const isLowStock = product.stock_quantity <= (product.minimum_stock || 0);
            return (
              <div key={product.id} className={`border border-border rounded-xl overflow-hidden ${isLowStock ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                <button onClick={() => setExpandedProduct(isExpanded ? null : product.id)} className="w-full p-3 text-left flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover bg-secondary flex-shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0 border border-border" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                      <span className={statusStyles[product.status]}>{product.status}</span>
                    </div>
                    <p className="text-sm font-bold mt-0.5">C${toNumber(product.price).toFixed(2)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 bg-muted/10 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Category</span><span className="font-medium">{product.category || "Uncategorized"}</span></div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Wholesale</span>
                      <span className="font-medium">C${toNumber(product.wholesale_price ?? product.price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stock</span>
                      <span className={`font-medium ${isLowStock ? "text-red-600 dark:text-red-400 font-bold" : ""}`}>
                        {product.stock_quantity}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link to={`/admin/products/${product.id}/view`} className="admin-btn--secondary flex-1 text-xs py-1.5"><Eye className="h-3 w-3" /> View</Link>
                      <Link to={`/admin/products/${product.id}/logs`} className="admin-btn--secondary flex-1 text-xs py-1.5"><ClipboardList className="h-3 w-3" /> Logs</Link>
                      <Link to={`/admin/products/${product.id}`} className="admin-btn--primary flex-1 text-xs py-1.5"><Edit className="h-3 w-3" /> Edit</Link>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deleteProductMutation.isPending}
                        className="admin-btn--danger px-3 py-1.5 text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
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
                <th className="text-left px-3 py-2.5 w-8">
                  <input type="checkbox" checked={selectedProducts.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded-sm border-border accent-accent" />
                </th>
                <th className="text-left px-3 py-2.5">Product</th>
                <th className="text-left px-3 py-2.5">SKU</th>
                <th className="text-left px-3 py-2.5">Category</th>
                <th className="text-right px-3 py-2.5">Price</th>
                <th className="text-right px-3 py-2.5">Wholesale</th>
                <th className="text-right px-3 py-2.5">Stock</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product: Product) => {
                const thumb = productListThumb(product);
                const isLowStock = product.stock_quantity <= (product.minimum_stock || 0);
                const rowBg = selectedProducts.has(product.id) 
                  ? "bg-accent/5" 
                  : isLowStock ? "bg-red-50/70 dark:bg-red-950/30" : "";
                  
                return (
                  <tr key={product.id} className={`hover:bg-muted/30 transition-colors ${rowBg}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded-sm border-border accent-accent" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary border border-border" aria-hidden />
                        )}
                        <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                    <td className="px-3 py-3 text-sm">{product.category || "Uncategorized"}</td>
                    <td className="px-3 py-3 text-right font-semibold">C${toNumber(product.price).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">C${toNumber(product.wholesale_price ?? product.price).toFixed(2)}</td>
                    <td className={`px-3 py-3 text-right ${isLowStock ? "text-red-600 dark:text-red-400 font-bold" : "font-semibold"}`}>{product.stock_quantity}</td>
                    <td className="px-3 py-3"><span className={statusStyles[product.status]}>{product.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/products/${product.id}/view`} className="admin-btn--ghost p-1.5" title="View"><Eye className="h-4 w-4" /></Link>
                        <Link to={`/admin/products/${product.id}/logs`} className="admin-btn--ghost p-1.5" title="Stock Logs"><ClipboardList className="h-4 w-4" /></Link>
                        <Link to={`/admin/products/${product.id}`} className="admin-btn--ghost p-1.5" title="Edit"><Edit className="h-4 w-4" /></Link>
                        <button className="admin-btn--ghost p-1.5" title="Duplicate"><Copy className="h-4 w-4" /></button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deleteProductMutation.isPending}
                          className="admin-btn--danger p-1.5 border-0" 
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No products found.</div>}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <span className="text-xs font-medium">Showing {filtered.length} of {Number(pagination?.total ?? products.length)} products</span>
          {pagination && Number(pagination.pages ?? 0) > 1 && (
            <div className="flex gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-btn--secondary text-xs px-3 py-1"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-accent text-accent-foreground rounded-lg text-xs font-semibold">{page}</span>
              <button 
                onClick={() => setPage(p => Math.min(Number(pagination.pages), p + 1))}
                disabled={page === Number(pagination.pages)}
                className="admin-btn--secondary text-xs px-3 py-1"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

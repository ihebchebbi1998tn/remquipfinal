import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Trash2, Copy, Eye, X, ChevronDown, ChevronUp, ClipboardList, Download } from "lucide-react";
import { products, categories } from "@/config/products";

const statusStyles: Record<string, string> = {
  active: "badge-success",
  draft: "badge-warning",
  archived: "badge-destructive",
};

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !categoryFilter || p.categorySlug === categoryFilter;
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
      setSelectedProducts(new Set(filtered.map(p => p.id)));
    }
  }

  function exportCSV() {
    const rows = filtered.map(p => `${p.sku},"${p.name}",${p.category},${p.price},${p.wholesalePrice},${p.stock},${p.status}`);
    const csv = `SKU,Name,Category,Price,Wholesale,Stock,Status\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg md:text-xl">Product Management</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5 hidden sm:flex">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link to="/admin/products/new" className="btn-accent px-3 md:px-4 py-2 rounded-sm text-xs md:text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedProducts.size > 0 && (
        <div className="dashboard-card flex flex-wrap items-center gap-3 bg-accent/5 border-accent/30">
          <span className="text-sm font-medium">{selectedProducts.size} selected</span>
          <button className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary">Set Active</button>
          <button className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary">Set Draft</button>
          <button className="px-3 py-1.5 border border-destructive text-destructive rounded-sm text-xs font-medium hover:bg-destructive/10">Delete</button>
          <button onClick={exportCSV} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary flex items-center gap-1"><Download className="h-3 w-3" /> Export</button>
          <button onClick={() => setSelectedProducts(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 sm:flex-none border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 sm:flex-none border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none">
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
        <div className="md:hidden space-y-2">
          {filtered.map((product) => {
            const isExpanded = expandedProduct === product.id;
            return (
              <div key={product.id} className="border border-border rounded-md overflow-hidden">
                <button onClick={() => setExpandedProduct(isExpanded ? null : product.id)} className="w-full p-3 text-left flex items-center gap-3">
                  <img src={product.image} alt="" className="w-12 h-12 rounded-sm object-cover bg-secondary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                      <span className={statusStyles[product.status]}>{product.status}</span>
                    </div>
                    <p className="text-sm font-bold mt-0.5">C${product.price.toFixed(2)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 bg-secondary/30 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Category</span><span>{product.category}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Wholesale</span><span>C${product.wholesalePrice.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Stock</span><span className={product.stock < 50 ? "text-warning font-medium" : ""}>{product.stock}</span></div>
                    <div className="flex gap-2 pt-2">
                      <Link to={`/product/${product.slug}`} className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1"><Eye className="h-3 w-3" /> View</Link>
                      <Link to={`/admin/products/${product.id}/logs`} className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1"><ClipboardList className="h-3 w-3" /> Logs</Link>
                      <Link to={`/admin/products/${product.id}`} className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1"><Edit className="h-3 w-3" /> Edit</Link>
                      <button className="px-3 py-1.5 border border-destructive rounded-sm text-destructive text-xs hover:bg-destructive/10 transition-colors"><Trash2 className="h-3 w-3" /></button>
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
                <th className="text-left px-3 py-2 w-8">
                  <input type="checkbox" checked={selectedProducts.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded-sm border-border accent-accent" />
                </th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">SKU</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-right px-3 py-2">Wholesale</th>
                <th className="text-right px-3 py-2">Stock</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product) => (
                <tr key={product.id} className={`hover:bg-secondary/50 transition-colors ${selectedProducts.has(product.id) ? "bg-accent/5" : ""}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded-sm border-border accent-accent" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt="" className="w-10 h-10 rounded-sm object-cover bg-secondary" />
                      <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                  <td className="px-3 py-3">{product.category}</td>
                  <td className="px-3 py-3 text-right font-medium">C${product.price.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">C${product.wholesalePrice.toFixed(2)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${product.stock < 50 ? "text-warning" : ""}`}>{product.stock}</td>
                  <td className="px-3 py-3"><span className={statusStyles[product.status]}>{product.status}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/product/${product.slug}`} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="View"><Eye className="h-4 w-4" /></Link>
                      <Link to={`/admin/products/${product.id}/logs`} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Stock Logs"><ClipboardList className="h-4 w-4" /></Link>
                      <Link to={`/admin/products/${product.id}`} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Edit"><Edit className="h-4 w-4" /></Link>
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="Duplicate"><Copy className="h-4 w-4" /></button>
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No products found.</div>}

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Showing {filtered.length} of {products.length} products</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-border rounded-sm hover:bg-secondary text-xs">Prev</button>
            <button className="px-3 py-1 bg-accent text-accent-foreground rounded-sm text-xs">1</button>
            <button className="px-3 py-1 border border-border rounded-sm hover:bg-secondary text-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

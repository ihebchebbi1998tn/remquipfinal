import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus, GripVertical, Eye } from "lucide-react";
import { products, categories, type Product } from "@/config/products";

const emptyProduct = (): Omit<Product, "id" | "images"> & { id?: string } => ({
  name: "",
  sku: "",
  slug: "",
  category: categories[0]?.name || "",
  categorySlug: categories[0]?.slug || "",
  description: "",
  specifications: {},
  image: "",
  price: 0,
  wholesalePrice: 0,
  stock: 0,
  status: "draft" as const,
  weightLbs: 0,
  compatibility: [],
});

export default function AdminProductEdit() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isNew = !productId || productId === "new";

  const existing = !isNew ? products.find((p) => p.id === productId) : null;

  const [form, setForm] = useState(() => existing ? { ...existing } : emptyProduct());
  const [specsJson, setSpecsJson] = useState(() =>
    JSON.stringify(form.specifications || {}, null, 2)
  );
  const [specsError, setSpecsError] = useState("");
  const [compatText, setCompatText] = useState(() =>
    (form.compatibility || []).join(", ")
  );

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoryChange(slug: string) {
    const cat = categories.find((c) => c.slug === slug);
    if (cat) {
      setForm((prev) => ({ ...prev, category: cat.name, categorySlug: cat.slug }));
    }
  }

  function handleSpecsChange(value: string) {
    setSpecsJson(value);
    try {
      const parsed = JSON.parse(value);
      setForm((prev) => ({ ...prev, specifications: parsed }));
      setSpecsError("");
    } catch {
      setSpecsError("Invalid JSON");
    }
  }

  function handleCompatChange(value: string) {
    setCompatText(value);
    setForm((prev) => ({ ...prev, compatibility: value.split(",").map(s => s.trim()).filter(Boolean) }));
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function handleSave() {
    alert(`Product "${form.name}" saved (demo mode)`);
    navigate("/admin/products");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/products" className="p-1.5 hover:bg-secondary rounded-sm transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="font-display font-bold text-lg md:text-xl">
            {isNew ? "Create Product" : `Edit: ${form.name}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Link to={`/product/${form.slug}`} className="px-3 py-2 rounded-sm text-xs font-medium border border-border hover:bg-secondary transition-colors flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </Link>
              <Link to={`/admin/products/${productId}/logs`} className="px-3 py-2 rounded-sm text-xs font-medium border border-border hover:bg-secondary transition-colors">
                Logs
              </Link>
              <button className="px-3 py-2 rounded-sm text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
          <button onClick={handleSave} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                value={form.name}
                onChange={(e) => { updateField("name", e.target.value); if (isNew) updateField("slug", generateSlug(e.target.value)); }}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Air Spring W01-358 9781"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input value={form.sku} onChange={(e) => updateField("sku", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. 1T15ZR-6" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input value={form.slug} onChange={(e) => updateField("slug", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" placeholder="air-spring-w01-358-9781" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-y"
                placeholder="Product description..." />
            </div>
          </div>

          {/* Compatibility */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Vehicle Compatibility</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Compatible Vehicles (comma-separated)</label>
              <textarea
                value={compatText}
                onChange={(e) => handleCompatChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-y"
                placeholder="e.g. Freightliner Cascadia, Kenworth T680, Volvo VNL"
              />
            </div>
            {(form.compatibility || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.compatibility || []).map((v, i) => (
                  <span key={i} className="badge-info text-xs">{v}</span>
                ))}
              </div>
            )}
          </div>

          {/* Specifications JSON */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Specifications (JSON)</h3>
            <textarea
              value={specsJson}
              onChange={(e) => handleSpecsChange(e.target.value)}
              rows={8}
              className={`w-full px-3 py-2 border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono ${specsError ? "border-destructive" : "border-border"}`}
            />
            {specsError && <p className="text-xs text-destructive">{specsError}</p>}
          </div>

          {/* Images */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Product Images</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(existing?.images || []).map((img, i) => (
                <div key={img.id} className="aspect-square bg-secondary rounded-sm overflow-hidden relative group">
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center gap-1">
                    <button className="opacity-0 group-hover:opacity-100 p-1 bg-background rounded-sm" title="Reorder">
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 p-1 bg-background rounded-sm text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-sm font-medium">Primary</span>}
                </div>
              ))}
              <button className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                <Plus className="h-6 w-6" />
                <span className="text-xs mt-1">Add</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Drag to reorder. First image is the primary product image.</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Status</h3>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Category */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Category</h3>
            <select
              value={form.categorySlug}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Pricing</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Retail Price (CAD)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wholesale Price (CAD)</label>
              <input type="number" step="0.01" value={form.wholesalePrice} onChange={(e) => updateField("wholesalePrice", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            {form.price > 0 && form.wholesalePrice > 0 && (
              <p className="text-xs text-muted-foreground">Margin: {Math.round(((form.price - form.wholesalePrice) / form.price) * 100)}%</p>
            )}
          </div>

          {/* Inventory */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Inventory</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <input type="number" value={form.stock} onChange={(e) => updateField("stock", parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (lbs)</label>
              <input type="number" step="0.1" value={form.weightLbs || 0} onChange={(e) => updateField("weightLbs", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          {/* SEO */}
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">SEO</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Meta Title</label>
              <input
                defaultValue={form.name}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="Page title for search engines"
              />
              <p className="text-xs text-muted-foreground mt-1">{(form.name || "").length}/60 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea
                defaultValue={form.description?.slice(0, 160)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Description for search results"
              />
              <p className="text-xs text-muted-foreground mt-1">{(form.description || "").slice(0, 160).length}/160 characters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save bar for mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 flex gap-2">
        <button onClick={handleSave} className="flex-1 btn-accent py-3 rounded-sm text-sm font-semibold flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> Save Product
        </button>
      </div>
      <div className="sm:hidden h-16" /> {/* spacer for fixed bar */}
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, Plus, GripVertical, Eye, Loader2, AlertCircle } from "lucide-react";
import { useProduct, useCategories } from "@/hooks/useApi";
import { api, unwrapApiList, resolveUploadImageUrl, type ProductCategory } from "@/lib/api";
import { productDetailHref } from "@/lib/storefront-product";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type ProductStatus = "active" | "draft" | "archived";

type ProductEditForm = {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  specifications: Record<string, unknown>;
  price: number;
  wholesalePrice: number;
  stock: number;
  status: ProductStatus;
  weightLbs: number;
  compatibility: string[];
};

type ApiImageRow = {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary?: number | boolean;
};

function emptyForm(categories: ProductCategory[]): ProductEditForm {
  const first = categories[0];
  return {
    name: "",
    sku: "",
    slug: "",
    categoryId: first?.id ?? "",
    categoryName: first?.name ?? "",
    categorySlug: first?.slug ?? "",
    description: "",
    specifications: {},
    price: 0,
    wholesalePrice: 0,
    stock: 0,
    status: "draft",
    weightLbs: 0,
    compatibility: [],
  };
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mapApiToForm(p: Record<string, unknown>, categories: ProductCategory[]): ProductEditForm {
  const details =
    p.details && typeof p.details === "object" && !Array.isArray(p.details)
      ? (p.details as Record<string, unknown>)
      : {};
  const specs =
    details.specifications && typeof details.specifications === "object" && !Array.isArray(details.specifications)
      ? (details.specifications as Record<string, unknown>)
      : {};
  const compat = Array.isArray(details.compatibility) ? details.compatibility.map(String) : [];
  const cid = String(p.category_id ?? "");
  const cat = categories.find((c) => c.id === cid);
  const isActive = p.is_active === 1 || p.is_active === true;
  const slugFromDetails = details.slug != null ? String(details.slug) : "";
  const adminStatus = details.adminStatus;
  let status: ProductStatus =
    adminStatus === "active" || adminStatus === "draft" || adminStatus === "archived"
      ? (adminStatus as ProductStatus)
      : isActive
        ? "active"
        : "draft";

  return {
    id: String(p.id ?? ""),
    name: String(p.name ?? ""),
    sku: String(p.sku ?? ""),
    slug: slugFromDetails || generateSlug(String(p.name ?? "")),
    categoryId: cid,
    categoryName: cat?.name ?? String(p.category ?? ""),
    categorySlug: cat?.slug ?? String(p.categorySlug ?? ""),
    description: String(p.description ?? ""),
    specifications: specs,
    price: Number(p.base_price ?? p.price ?? 0),
    wholesalePrice: Number(p.cost_price ?? p.wholesale_price ?? 0),
    stock: Math.max(0, Number(p.stock ?? p.stock_quantity ?? 0)),
    status,
    weightLbs: Number(details.weightLbs ?? 0),
    compatibility: compat,
  };
}

export default function AdminProductEdit() {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNew = !productId || productId === "new";
  const effectiveId = isNew ? "" : productId!;

  const { data: productResponse, isLoading: productLoading, isError: productError } = useProduct(effectiveId);
  const { data: categoriesResponse } = useCategories();

  const categories = unwrapApiList<ProductCategory>(categoriesResponse, []);
  const raw = productResponse?.data as Record<string, unknown> | undefined;

  const [form, setForm] = useState<ProductEditForm>(() => emptyForm([]));
  const [specsJson, setSpecsJson] = useState("{}");
  const [specsError, setSpecsError] = useState("");
  const [compatText, setCompatText] = useState("");
  const initRef = useRef(false);

  useEffect(() => {
    initRef.current = false;
  }, [effectiveId]);

  useEffect(() => {
    if (!isNew || categories.length === 0) return;
    setForm((prev) => {
      if (prev.categoryId) return prev;
      const first = categories[0];
      return { ...prev, categoryId: first.id, categoryName: first.name, categorySlug: first.slug };
    });
  }, [isNew, categories]);

  useEffect(() => {
    if (isNew || !raw || initRef.current) return;
    const next = mapApiToForm(raw, categories);
    setForm(next);
    setSpecsJson(JSON.stringify(next.specifications || {}, null, 2));
    setCompatText((next.compatibility || []).join(", "));
    initRef.current = true;
  }, [isNew, raw, categories]);

  function updateField<K extends keyof ProductEditForm>(field: K, value: ProductEditForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoryChange(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setForm((prev) => ({
        ...prev,
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
      }));
    }
  }

  function handleSpecsChange(value: string) {
    setSpecsJson(value);
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        setForm((prev) => ({ ...prev, specifications: parsed as Record<string, unknown> }));
        setSpecsError("");
      } else {
        setSpecsError("Specifications must be a JSON object");
      }
    } catch {
      setSpecsError("Invalid JSON");
    }
  }

  function handleCompatChange(value: string) {
    setCompatText(value);
    setForm((prev) => ({
      ...prev,
      compatibility: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  const detailsPayload = () => ({
    specifications: form.specifications,
    compatibility: form.compatibility,
    slug: form.slug.trim() || generateSlug(form.name),
    weightLbs: form.weightLbs,
    adminStatus: form.status,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (specsError) throw new Error("Fix specifications JSON before saving.");
      if (!form.sku.trim()) throw new Error("SKU is required.");
      if (!form.name.trim()) throw new Error("Product name is required.");
      if (!form.categoryId) throw new Error("Category is required.");

      const base = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        categoryId: form.categoryId,
        basePrice: form.price,
        costPrice: form.wholesalePrice,
        description: form.description,
        details: detailsPayload(),
        status: form.status,
        stock: form.stock,
        stock_quantity: form.stock,
        initialStock: form.stock,
      };

      if (isNew) {
        return api.createProduct(base);
      }
      return api.updateProduct(effectiveId, base);
    },
    onSuccess: (res) => {
      showSuccessToast(isNew ? "Product created" : "Product saved");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (isNew && res?.data && typeof res.data === "object" && res.data !== null && "id" in res.data) {
        const newId = String((res.data as { id: string }).id);
        navigate(`/admin/products/${newId}`);
        queryClient.invalidateQueries({ queryKey: ["product", newId] });
      } else if (!isNew && effectiveId) {
        queryClient.invalidateQueries({ queryKey: ["product", effectiveId] });
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Save failed";
      showErrorToast(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProduct(effectiveId),
    onSuccess: () => {
      showSuccessToast("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/admin/products");
    },
    onError: (e: unknown) => {
      showErrorToast(e instanceof Error ? e.message : "Delete failed");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadProductImage(effectiveId, file),
    onSuccess: () => {
      showSuccessToast("Image uploaded");
      queryClient.invalidateQueries({ queryKey: ["product", effectiveId] });
    },
    onError: (e: unknown) => {
      showErrorToast(e instanceof Error ? e.message : "Upload failed");
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteProductImage(effectiveId, imageId),
    onSuccess: () => {
      showSuccessToast("Image removed");
      queryClient.invalidateQueries({ queryKey: ["product", effectiveId] });
    },
    onError: (e: unknown) => {
      showErrorToast(e instanceof Error ? e.message : "Could not remove image");
    },
  });

  function handleSave() {
    saveMutation.mutate();
  }

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isNew) return;
    uploadMutation.mutate(file);
  }

  function handleDeleteProduct() {
    if (!confirm("Delete this product? It will be removed from the catalog.")) return;
    deleteMutation.mutate();
  }

  function handleDeleteImage(imageId: string) {
    if (!confirm("Remove this image?")) return;
    deleteImageMutation.mutate(imageId);
  }

  const images: ApiImageRow[] = Array.isArray(raw?.images)
    ? (raw!.images as ApiImageRow[]).filter((img) => img?.id && img?.image_url)
    : [];

  if (!isNew && productLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        Loading product…
      </div>
    );
  }

  if (!isNew && productError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-destructive">
        <AlertCircle className="h-10 w-10" />
        <p>Could not load this product.</p>
        <Link to="/admin/products" className="text-accent hover:underline text-sm">
          Back to products
        </Link>
      </div>
    );
  }

  const busy =
    saveMutation.isPending || deleteMutation.isPending || uploadMutation.isPending || deleteImageMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/products" className="p-1.5 hover:bg-secondary rounded-sm transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="font-display font-bold text-lg md:text-xl">
            {isNew ? "Create Product" : `Edit: ${form.name || "Product"}`}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <>
              <Link
                to={productDetailHref(effectiveId, form.slug.trim() || undefined)}
                className="px-3 py-2 rounded-sm text-xs font-medium border border-border hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </Link>
              <Link
                to={`/admin/products/${effectiveId}/logs`}
                className="px-3 py-2 rounded-sm text-xs font-medium border border-border hover:bg-secondary transition-colors"
              >
                Logs
              </Link>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={busy}
                className="px-3 py-2 rounded-sm text-xs font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !!specsError}
            className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                value={form.name}
                onChange={(e) => {
                  updateField("name", e.target.value);
                  if (isNew) updateField("slug", generateSlug(e.target.value));
                }}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Air Spring W01-358 9781"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g. 1T15ZR-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  placeholder="air-spring-w01-358-9781"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-y"
                placeholder="Product description..."
              />
            </div>
          </div>

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
                  <span key={i} className="badge-info text-xs">
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Specifications (JSON)</h3>
            <textarea
              value={specsJson}
              onChange={(e) => handleSpecsChange(e.target.value)}
              rows={8}
              className={`w-full px-3 py-2 border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono ${
                specsError ? "border-destructive" : "border-border"
              }`}
            />
            {specsError && <p className="text-xs text-destructive">{specsError}</p>}
          </div>

          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Product Images</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="aspect-square bg-secondary rounded-sm overflow-hidden relative group">
                  <img
                    src={resolveUploadImageUrl(img.image_url)}
                    alt={img.alt_text || form.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center gap-1">
                    <span className="opacity-0 group-hover:opacity-100 p-1 bg-background rounded-sm" title="Reorder">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={busy}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-background rounded-sm text-destructive disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {(img.is_primary === 1 || img.is_primary === true) && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-sm font-medium">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handlePickImage}
                disabled={isNew || busy}
                className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-6 w-6" />
                <span className="text-xs mt-1">Add</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Save the product first, then you can upload images." : "Upload images (JPG, PNG, WebP). First primary flag is set by the catalog."}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Status</h3>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value as ProductStatus)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Category</h3>
            <select
              value={form.categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
            >
              {categories.length === 0 && <option value="">Loading categories…</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Pricing</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Retail Price (CAD)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wholesale Price (CAD)</label>
              <input
                type="number"
                step="0.01"
                value={form.wholesalePrice}
                onChange={(e) => updateField("wholesalePrice", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {form.price > 0 && form.wholesalePrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Margin: {Math.round(((form.price - form.wholesalePrice) / form.price) * 100)}%
              </p>
            )}
          </div>

          <div className="dashboard-card space-y-4">
            <h3 className="font-display font-bold text-sm uppercase text-muted-foreground">Inventory</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => updateField("stock", parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                value={form.weightLbs || 0}
                onChange={(e) => updateField("weightLbs", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

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

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !!specsError}
          className="flex-1 btn-accent py-3 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Product
        </button>
      </div>
      <div className="sm:hidden h-16" />
    </div>
  );
}

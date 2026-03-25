import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  ImageIcon,
  Languages,
} from "lucide-react";
import { localeLabel } from "@/contexts/LanguageContext";
import { useAdminCategoriesList, useApiMutation, useStorefrontRates } from "@/hooks/useApi";
import { api, unwrapApiList, unwrapPagination, resolveBackendUploadUrl, type ProductCategory } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { categories as defaultCatalogCategories } from "@/config/products";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";

type LocForm = { name: string; description: string };

const emptyLoc: LocForm = { name: "", description: "" };

export default function AdminCategories() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [langTab, setLangTab] = useState<string>("en");

  const { data: storefront } = useStorefrontRates();
  const supportedLocales = (storefront as { data?: { supported_locales?: string[] } } | undefined)?.data?.supported_locales ?? ["en", "fr"];

  const [form, setForm] = useState<{
    slug: string;
    imageUrl: string;
    displayOrder: number;
    isActive: boolean;
    [key: string]: string | number | boolean | LocForm;
  }>({
    slug: "",
    imageUrl: "",
    displayOrder: 0,
    isActive: true,
    en: { ...emptyLoc },
    fr: { ...emptyLoc },
  });

  const queryClient = useQueryClient();
  const { data: catRes, isLoading, isError, error } = useAdminCategoriesList();

  const defaultImageBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    defaultCatalogCategories.forEach((c) => {
      map[c.slug] = c.image;
    });
    return map;
  }, []);

  const createMutation = useApiMutation((payload: Record<string, unknown>) => api.createCategory(payload as any), {
    onSuccess: () => {
      showSuccessToast("Categories", "Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeForm();
    },
    onError: (e: unknown) => {
      showErrorToast("Categories", e instanceof Error ? e.message : "Failed to create category");
    },
  });

  const updateMutation = useApiMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateCategory(id, payload as any),
    {
      onSuccess: () => {
        showSuccessToast("Categories", "Category updated successfully");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        closeForm();
      },
      onError: (e: unknown) => {
        showErrorToast("Categories", e instanceof Error ? e.message : "Failed to update category");
      },
    }
  );

  const deleteMutation = useApiMutation((id: string) => api.deleteCategory(id), {
    onSuccess: () => {
      showSuccessToast("Categories", "Category deleted");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: unknown) => {
      showErrorToast("Categories", e instanceof Error ? e.message : "Delete failed");
    },
  });

  const rows = unwrapApiList<ProductCategory>(catRes, []);
  const pagination = unwrapPagination(catRes);
  const rowsWithDefaultImages = useMemo(() => {
    return rows.map((c) => {
      const img = String(c.image_url ?? "").trim();
      if (img) return c;
      const fallback = defaultImageBySlug[c.slug] ?? "";
      return { ...c, image_url: fallback };
    });
  }, [rows, defaultImageBySlug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rowsWithDefaultImages;
    return rowsWithDefaultImages.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [rowsWithDefaultImages, search]);

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setLangTab(supportedLocales[0] ?? "en");
    const base: Record<string, unknown> = { slug: "", imageUrl: "", displayOrder: 0, isActive: true };
    supportedLocales.forEach((loc) => {
      base[loc] = { ...emptyLoc };
    });
    setForm(base as typeof form);
  }

  async function openEdit(c: ProductCategory) {
    setEditingId(c.id);
    setShowForm(true);
    setLangTab(supportedLocales[0] ?? "en");
    const locData: Record<string, LocForm> = {};
    supportedLocales.forEach((loc) => {
      locData[loc] = { name: loc === (supportedLocales[0] ?? "en") ? c.name : "", description: loc === (supportedLocales[0] ?? "en") ? (c.description || "") : "" };
    });
    try {
      const tr = await api.getCategoryTranslations(c.id);
      const pack = (tr as { data?: { translations?: Record<string, { name: string; description?: string } | null> } })
        .data?.translations;
      if (pack) {
        supportedLocales.forEach((loc) => {
          const p = pack[loc];
          if (p?.name) {
            locData[loc] = { name: p.name, description: p.description || "" };
          }
        });
      }
    } catch {
      /* use base */
    }
    setForm({
      slug: c.slug,
      imageUrl: String(c.image_url ?? "").trim() ? (c.image_url as string) : defaultImageBySlug[c.slug] ?? "",
      displayOrder: c.display_order ?? 0,
      isActive: c.is_active !== false && (c as any).is_active !== 0,
      ...locData,
    });
  }

  async function handleSubmit() {
    const defaultLoc = supportedLocales[0] ?? "en";
    const defaultForm = form[defaultLoc] as LocForm | undefined;
    const defaultName = defaultForm?.name?.trim();
    if (!defaultName) return;
    const slug =
      String(form.slug || "").trim() ||
      defaultName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const translations: Record<string, { name: string; description: string }> = {};
    supportedLocales.forEach((loc) => {
      const f = form[loc] as LocForm | undefined;
      if (f?.name?.trim()) {
        translations[loc] = { name: f.name.trim(), description: f.description || "" };
      }
    });
    if (!translations[defaultLoc]) {
      translations[defaultLoc] = { name: defaultName, description: (defaultForm?.description || "") as string };
    }

    if (!editingId) {
      await createMutation.mutateAsync({
        name: defaultName,
        slug,
        description: (defaultForm?.description || "") as string,
        imageUrl: form.imageUrl,
        displayOrder: form.displayOrder,
        translations,
      });
      return;
    }

    await updateMutation.mutateAsync({
      id: editingId,
      payload: {
        name: defaultName,
        slug,
        description: (defaultForm?.description || "") as string,
        imageUrl: form.imageUrl,
        displayOrder: form.displayOrder,
        is_active: form.isActive,
        translations,
      },
    });
  }

  if (isLoading) {
    return <AdminPageLoading message="Loading categories" />;
  }

  if (isError) {
    return (
      <AdminPageError
        message={error instanceof Error ? error.message : "Failed to load"}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["categories"] })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <AdminPageHeader
          title="Product categories"
          subtitle="English is the default catalog language; add French for the storefront language switcher."
          icon={Layers}
          actions={
            <button
              type="button"
              onClick={() => {
                closeForm();
                setShowForm(true);
                setEditingId(null);
              }}
              className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 self-start"
            >
              <Plus className="h-4 w-4" />
              New category
            </button>
          }
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or slug…"
            className="w-full pl-10 pr-3 py-2 border border-border rounded-sm text-sm bg-background"
          />
        </div>
      </div>

      {showForm && (
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Languages className="h-4 w-4 text-accent" />
            {editingId ? "Edit category" : "Create category"}
          </div>

          <div className="flex gap-2 border-b border-border pb-2">
            {supportedLocales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLangTab(loc)}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wide ${
                  langTab === loc ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                {localeLabel(loc)}
              </button>
            ))}
          </div>

          {langTab === (supportedLocales[0] ?? "en") && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name ({localeLabel(supportedLocales[0] ?? "en")}) *</label>
                <input
                  value={((form[supportedLocales[0] ?? "en"]) as LocForm)?.name ?? ""}
                  onChange={(e) => {
                    const loc = supportedLocales[0] ?? "en";
                    setForm({ ...form, [loc]: { ...((form[loc] as LocForm) ?? emptyLoc), name: e.target.value } });
                  }}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">URL slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  placeholder="auto from name if empty"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Description ({localeLabel(supportedLocales[0] ?? "en")})</label>
                <textarea
                  value={((form[supportedLocales[0] ?? "en"]) as LocForm)?.description ?? ""}
                  onChange={(e) => {
                    const loc = supportedLocales[0] ?? "en";
                    setForm({ ...form, [loc]: { ...((form[loc] as LocForm) ?? emptyLoc), description: e.target.value } });
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm"
                />
              </div>
            </div>
          )}

          {langTab !== (supportedLocales[0] ?? "en") && supportedLocales.includes(langTab) && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name ({localeLabel(langTab)})</label>
                <input
                  value={((form[langTab]) as LocForm)?.name ?? ""}
                  onChange={(e) => setForm({ ...form, [langTab]: { ...((form[langTab] as LocForm) ?? emptyLoc), name: e.target.value } })}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description ({localeLabel(langTab)})</label>
                <textarea
                  value={((form[langTab]) as LocForm)?.description ?? ""}
                  onChange={(e) => setForm({ ...form, [langTab]: { ...((form[langTab] as LocForm) ?? emptyLoc), description: e.target.value } })}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Image URL
              </label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://… or /Backend/uploads/…"
                className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono text-xs"
              />
              {form.imageUrl.trim() ? (
                <img
                  src={resolveBackendUploadUrl(form.imageUrl.trim())}
                  alt="Category preview"
                  className="mt-2 h-20 w-full object-cover rounded-sm border border-border bg-muted/20"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Display order</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm"
              />
            </div>
            {editingId && (
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <label htmlFor="cat-active" className="text-sm">
                  Active (visible on storefront)
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-accent px-6 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editingId ? "Save" : "Create"}
            </button>
            <button type="button" onClick={closeForm} className="px-6 py-2 border border-border rounded-sm text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3 hidden md:table-cell">Image</th>
              <th className="text-left p-3">Active</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                <td className="p-3 text-muted-foreground">{c.display_order ?? 0}</td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 font-mono text-xs">{c.slug}</td>
                <td className="p-3 hidden md:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                  {c.image_url ? (
                    <img
                      src={resolveBackendUploadUrl(String(c.image_url))}
                      alt={c.name}
                      className="h-10 w-16 object-cover rounded-sm border border-border bg-muted/20"
                      loading="lazy"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">{c.is_active === false || (c as any).is_active === 0 ? "No" : "Yes"}</td>
                <td className="p-3 text-right space-x-1">
                  <button
                    type="button"
                    onClick={() => void openEdit(c)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs bg-secondary hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Soft-delete this category?")) deleteMutation.mutate(c.id);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

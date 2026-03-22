import React, { useState } from "react";
import { Edit, Eye, Plus, Search, FileText, Globe, Loader2, AlertCircle, Trash2, X } from "lucide-react";
import { useCMSPages, useApiMutation, useStorefrontRates } from "@/hooks/useApi";
import { localeLabel } from "@/contexts/LanguageContext";
import { api, unwrapApiList, unwrapPagination } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  content?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCMS() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    status: "draft" as "published" | "draft",
    meta_title: "",
    meta_description: "",
  });
  type LocForm = { title: string; excerpt: string; content: string };
  const emptyLocForm: LocForm = { title: "", excerpt: "", content: "" };
  const [translationsForm, setTranslationsForm] = useState<Record<string, LocForm>>({});

  const { data: storefront } = useStorefrontRates();
  const supportedLocales = (storefront as { data?: { supported_locales?: string[] } } | undefined)?.data?.supported_locales ?? ["en", "fr"];
  const defaultLocale = supportedLocales[0] ?? "en";
  const otherLocales = supportedLocales.filter((l) => l !== defaultLocale);

  const queryClient = useQueryClient();

  // Fetch CMS pages from API
  const { data: pagesResponse, isLoading, isError, error } = useCMSPages(page, 50);

  // Mutations
  const createPageMutation = useApiMutation(
    (data: any) => api.createCMSPage(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cms'] });
        setShowForm(false);
        resetForm();
      },
    }
  );

  const updatePageMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => api.updateCMSPage(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cms'] });
        setShowForm(false);
        setEditingId(null);
        resetForm();
      },
    }
  );

  const deletePageMutation = useApiMutation(
    (id: string) => api.deleteCMSPage(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cms'] });
      },
    }
  );

  function resetForm() {
    setForm({
      title: "",
      slug: "",
      content: "",
      status: "draft",
      meta_title: "",
      meta_description: "",
    });
    setTranslationsForm({});
  }

  const rawPages = unwrapApiList<Record<string, unknown>>(pagesResponse, []);
  const cmsPages: CMSPage[] = rawPages.map((p) => ({
    id: String(p.id ?? ""),
    title: String(p.title ?? ""),
    slug: String(p.slug ?? ""),
    status: (p.is_published === 1 || p.is_published === true ? "published" : "draft") as CMSPage["status"],
    content: p.content != null ? String(p.content) : undefined,
    meta_title: p.meta_title != null ? String(p.meta_title) : undefined,
    meta_description: p.meta_description != null ? String(p.meta_description) : undefined,
    created_at: String(p.created_at ?? ""),
    updated_at: String(p.updated_at ?? ""),
  }));
  const pagination = unwrapPagination(pagesResponse);

  // Filter pages locally
  const filtered = cmsPages.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  const publishedCount = cmsPages.filter(p => p.status === "published").length;
  const draftCount = cmsPages.filter(p => p.status === "draft").length;

  const handleSubmit = async () => {
    if (!form.title || !form.slug) return;

    const data = {
      title: form.title,
      slug: form.slug.startsWith("/") ? form.slug : `/${form.slug}`,
      content: form.content,
      status: form.status,
      meta_title: form.meta_title || form.title,
      meta_description: form.meta_description,
    };

    const translationsPayload: Record<string, { title: string; excerpt: string; content: string }> = {};
    otherLocales.forEach((loc) => {
      const f = translationsForm[loc];
      if (f?.title?.trim()) {
        translationsPayload[loc] = { title: f.title.trim(), excerpt: f.excerpt ?? "", content: f.content ?? "" };
      }
    });

    if (editingId) {
      await updatePageMutation.mutateAsync({ id: editingId, data });
      if (Object.keys(translationsPayload).length > 0) {
        await api.putCMSPageTranslations(editingId, translationsPayload);
      }
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    } else {
      const res = await createPageMutation.mutateAsync(data);
      const newId = (res?.data as { id?: string } | undefined)?.id;
      if (newId && Object.keys(translationsPayload).length > 0) {
        await api.putCMSPageTranslations(newId, translationsPayload);
      }
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    }
  };

  const handleEdit = async (page: CMSPage) => {
    setForm({
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      status: page.status,
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
    });
    setTranslationsForm({});
    setEditingId(page.id);
    setShowForm(true);
    try {
      const tr = await api.getCMSPageTranslations(page.id);
      const inner = (tr as { data?: { translations?: Record<string, { title?: string; excerpt?: string; content?: string } | null> } })
        .data;
      const trans = inner?.translations ?? {};
      const next: Record<string, LocForm> = {};
      otherLocales.forEach((loc) => {
        const t = trans[loc];
        if (t?.title) {
          next[loc] = { title: t.title, excerpt: t.excerpt ?? "", content: t.content ?? "" };
        } else {
          next[loc] = { ...emptyLocForm };
        }
      });
      setTranslationsForm(next);
    } catch {
      /* optional */
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this page?")) {
      deletePageMutation.mutate(id);
    }
  };

  const handleToggleStatus = (page: CMSPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    updatePageMutation.mutate({
      id: page.id,
      data: { status: newStatus }
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <span className="ml-2 text-muted-foreground">Loading CMS pages...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Failed to load CMS pages</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {error instanceof Error ? error.message : "An error occurred while fetching CMS pages."}
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['cms'] })}
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
          <h2 className="font-display font-bold text-lg md:text-xl">CMS Page Editor</h2>
          {pagination && <p className="text-sm text-muted-foreground">{pagination.total} total pages</p>}
        </div>
        <button 
          onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
          className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 self-start"
        >
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Page</>}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Total Pages</p>
          <p className="text-xl md:text-2xl font-bold font-display">{cmsPages.length}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-success" />
            <p className="text-xs md:text-sm text-muted-foreground">Published</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display text-success">{publishedCount}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs md:text-sm text-muted-foreground">Drafts</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display text-warning">{draftCount}</p>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">
            {editingId ? "Edit Page" : "Create New Page"}
          </h3>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Page Title"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="/page-slug"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Page content (HTML or Markdown)"
                rows={6}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "published" | "draft" })}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meta Title</label>
                <input
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                  placeholder="SEO Title"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meta Description</label>
                <input
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                  placeholder="SEO Description"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            {otherLocales.length > 0 && (
              <div className="rounded-sm border border-border bg-muted/30 p-4 space-y-4 mt-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Translations
                </p>
                <p className="text-xs text-muted-foreground">
                  Shown when visitors use another language. Fields above are the default ({localeLabel(defaultLocale)}) page.
                </p>
                {otherLocales.map((loc) => (
                  <div key={loc} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <p className="text-xs font-medium text-foreground mb-2">{localeLabel(loc)}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Title ({loc})</label>
                        <input
                          value={translationsForm[loc]?.title ?? ""}
                          onChange={(e) =>
                            setTranslationsForm((prev) => ({
                              ...prev,
                              [loc]: { ...(prev[loc] ?? emptyLocForm), title: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Excerpt ({loc})</label>
                        <input
                          value={translationsForm[loc]?.excerpt ?? ""}
                          onChange={(e) =>
                            setTranslationsForm((prev) => ({
                              ...prev,
                              [loc]: { ...(prev[loc] ?? emptyLocForm), excerpt: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Content ({loc})</label>
                        <textarea
                          value={translationsForm[loc]?.content ?? ""}
                          onChange={(e) =>
                            setTranslationsForm((prev) => ({
                              ...prev,
                              [loc]: { ...(prev[loc] ?? emptyLocForm), content: e.target.value },
                            }))
                          }
                          placeholder="Same JSON structure as default, or translated body"
                          rows={4}
                          className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={createPageMutation.isLoading || updatePageMutation.isLoading}
                className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {(createPageMutation.isLoading || updatePageMutation.isLoading) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingId ? "Update Page" : "Create Page"}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                className="px-6 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {filtered.map((page) => (
            <div key={page.id} className="border border-border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{page.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{page.slug}</p>
                </div>
                <span className={page.status === "published" ? "badge-success" : "badge-warning"}>{page.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <a 
                  href={page.slug} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="h-3 w-3" /> Preview
                </a>
                <button 
                  onClick={() => handleEdit(page)}
                  className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1"
                >
                  <Edit className="h-3 w-3" /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(page.id)}
                  disabled={deletePageMutation.isLoading}
                  className="px-3 py-1.5 border border-destructive rounded-sm text-destructive text-xs hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2">Page</th>
                <th className="text-left px-3 py-2">Slug</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Last Modified</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((page) => (
                <tr key={page.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-3 py-3 font-medium">{page.title}</td>
                  <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{page.slug}</td>
                  <td className="px-3 py-3">
                    <button 
                      onClick={() => handleToggleStatus(page)}
                      disabled={updatePageMutation.isLoading}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      <span className={page.status === "published" ? "badge-success" : "badge-warning"}>{page.status}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(page.updated_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a 
                        href={page.slug} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-secondary rounded-sm transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button 
                        onClick={() => handleEdit(page)}
                        className="p-1.5 hover:bg-secondary rounded-sm transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(page.id)}
                        disabled={deletePageMutation.isLoading}
                        className="p-1.5 hover:bg-secondary rounded-sm transition-colors text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No pages found.</div>}

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

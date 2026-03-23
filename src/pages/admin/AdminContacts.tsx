import React, { useMemo, useState } from "react";
import {
  Phone,
  Mail,
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useAdminContactsListAll, useCreateAdminContact, useDeleteAdminContact, useUpdateAdminContact } from "@/hooks/useApi";
import { unwrapApiList, unwrapPagination } from "@/lib/api";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";

type AdminContactRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  specialization?: string | null;
  is_available: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  is_available: boolean;
  display_order: number;
};

const emptyForm: ContactForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  specialization: "",
  is_available: true,
  display_order: 0,
};

export default function AdminContacts() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>({ ...emptyForm });

  const { data: res, isLoading, isError, error } = useAdminContactsListAll();
  const contacts = unwrapApiList<AdminContactRow>(res, []);
  const pagination = unwrapPagination(res);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        String(c.department ?? "").toLowerCase().includes(q) ||
        String(c.specialization ?? "").toLowerCase().includes(q) ||
        String(c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  const createMutation = useCreateAdminContact();
  const updateMutation = useUpdateAdminContact();
  const deleteMutation = useDeleteAdminContact();

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: 0 });
    setShowForm(true);
  };

  const openEdit = (c: AdminContactRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      email: String(c.email ?? ""),
      phone: String(c.phone ?? ""),
      department: String(c.department ?? ""),
      specialization: String(c.specialization ?? ""),
      is_available: Boolean(c.is_available),
      display_order: Number(c.display_order ?? 0),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      department: form.department.trim() || null,
      specialization: form.specialization.trim() || null,
      is_available: form.is_available ? 1 : 0,
      display_order: Number.isFinite(form.display_order) ? form.display_order : 0,
    };

    if (!payload.name) return;

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => closeForm(),
        }
      );
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => closeForm(),
      });
    }
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  if (isLoading) {
    return <AdminPageLoading message="Loading admin contacts" />;
  }

  if (isError) {
    return (
      <AdminPageError
        message={error instanceof Error ? error.message : "Failed to load"}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin contacts"
        subtitle="Manage the internal contact directory used by the admin UI and customer portal."
        icon={UserRound}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 self-start"
          >
            <Plus className="h-4 w-4" /> New contact
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, department, specialization, email..."
            className="w-full pl-3 pr-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {showForm && (
        <div className="dashboard-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers className="h-4 w-4 text-accent" /> {editingId ? "Edit contact" : "Create contact"}
            </div>
            <button type="button" onClick={closeForm} className="p-1.5 rounded-sm hover:bg-muted transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Marc Dupont"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="+1-555-0100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Sales"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Specialization</label>
              <input
                value={form.specialization}
                onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Air Suspension"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Display order</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
                className="h-4 w-4"
                id="is-available"
              />
              <label htmlFor="is-available" className="text-sm text-muted-foreground cursor-pointer select-none">
                Available in portal
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isMutating || !form.name.trim()}
              className="btn-accent px-6 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? (updateMutation.isLoading ? "Saving..." : "Save changes") : createMutation.isLoading ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={closeForm} className="px-6 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Department / specialization</th>
              <th className="text-left p-3">Available</th>
              <th className="text-right p-3">Order</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                <td className="p-3">
                  <div className="font-medium">{c.name}</div>
                  {(c.email || c.phone) && (
                    <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1">
                      {c.email ? (
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </span>
                      ) : null}
                      {c.phone ? (
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    {c.department ? c.department : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {c.specialization ? c.specialization : "No specialization"}
                  </div>
                </td>
                <td className="p-3">{c.is_available ? "Yes" : "No"}</td>
                <td className="p-3 text-right font-mono">{c.display_order ?? 0}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs bg-secondary hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isLoading}
                      onClick={() => {
                        if (!confirm("Delete this admin contact?")) return;
                        deleteMutation.mutate(c.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


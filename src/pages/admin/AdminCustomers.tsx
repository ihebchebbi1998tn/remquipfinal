import React, { useMemo, useState, useRef } from "react";
import {
  Eye,
  Search,
  X,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ShoppingBag,
  FileText,
  Edit,
  Ban,
  CheckCircle,
  Plus,
  Loader2,
  AlertCircle,
  Upload,
  Trash2,
  ExternalLink,
  MessageSquareText,
  CalendarClock,
  UserRound,
  Clock,
  ListTodo,
  CheckCircle2,
  XCircle,
  FolderOpen,
} from "lucide-react";
import {
  useCustomers,
  useCustomer,
  useCustomerOrders,
  useCustomerDocuments,
  useCustomerTasks,
  useCreateCustomerTask,
  useUpdateCustomerTask,
  useDeleteCustomerTask,
  useAvailableAdminContacts,
  useApiMutation,
} from "@/hooks/useApi";
import {
  api,
  Customer,
  CustomerNote,
  CustomerTask,
  Order,
  unwrapApiList,
  unwrapPagination,
  resolveBackendUploadUrl,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";

type CustomerDocumentRow = {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  completed: "badge-success",
  delivered: "badge-success",
  active: "badge-success",
  inactive: "badge-warning",
  suspended: "badge-warning",
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailTab, setDetailTab] = useState<"activity" | "notes" | "tasks">("activity");
  const [newCustomer, setNewCustomer] = useState({
    company_name: "",
    full_name: "",
    email: "",
    phone: "",
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Fetch customers from API
  const { data: customersResponse, isLoading, isError, error } = useCustomers(page, 50);

  // Fetch single customer details when selected
  const { data: customerDetailResponse } = useCustomer(selectedCustomerId || "");

  // Fetch customer orders when selected
  const { data: customerOrdersResponse } = useCustomerOrders(selectedCustomerId || "");

  const { data: customerDocumentsResponse, isLoading: documentsLoading } = useCustomerDocuments(
    selectedCustomerId || ""
  );

  const { data: tasksResponse, isLoading: tasksLoading } = useCustomerTasks(selectedCustomerId || "");
  const { data: availableContactsResponse, isLoading: contactsLoading } = useAvailableAdminContacts();

  // Mutations
  const createCustomerMutation = useApiMutation(
    (data: any) => api.createCustomer(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setShowCreateModal(false);
        setNewCustomer({ company_name: "", full_name: "", email: "", phone: "" });
      },
    }
  );

  const updateCustomerMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => api.updateCustomer(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customer'] });
      },
    }
  );

  const deleteCustomerMutation = useApiMutation(
    (id: string) => api.deleteCustomer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setSelectedCustomerId(null);
      },
    }
  );

  const uploadDocumentMutation = useApiMutation(
    ({ file, customerId }: { file: File; customerId: string }) =>
      api.uploadContractFile(file, { customerId, documentType: "contract" }),
    {
      onSuccess: (res, { customerId }) => {
        queryClient.invalidateQueries({ queryKey: ["customer", customerId, "documents"] });
        showSuccessToast(res.message || "Document uploaded.");
      },
      onError: (e: unknown) => {
        showErrorToast(e instanceof Error ? e.message : "Upload failed");
      },
    }
  );

  const deleteDocumentMutation = useApiMutation(
    ({ documentId, customerId }: { documentId: string; customerId: string }) =>
      api.deleteCustomerDocument(documentId),
    {
      onSuccess: (res, { customerId }) => {
        queryClient.invalidateQueries({ queryKey: ["customer", customerId, "documents"] });
        showSuccessToast(res.message || "Document removed.");
      },
      onError: (e: unknown) => {
        showErrorToast(e instanceof Error ? e.message : "Delete failed");
      },
    }
  );

  const importCustomersMutation = useApiMutation((file: File) => api.importCustomersFile(file), {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      const d = res.data as { imported?: number; errors?: string[] } | undefined;
      const n = d?.imported ?? 0;
      const errs = d?.errors?.length ?? 0;
      showSuccessToast(res.message || `Imported ${n} customer(s).`);
      if (errs > 0) {
        showErrorToast(`${errs} row(s) skipped (duplicate email or missing fields).`);
        if (d?.errors?.length) console.warn('Customer import row errors:', d.errors);
      }
    },
    onError: (e: unknown) => {
      showErrorToast(e instanceof Error ? e.message : 'Import failed');
    },
  });

  const addCustomerNoteMutation = useApiMutation(
    (vars: { customerId: string; note: string; isInternal: boolean }) =>
      api.addCustomerNote(vars.customerId, { note: vars.note, isInternal: vars.isInternal }),
    {
      onSuccess: (_res, vars) => {
        queryClient.invalidateQueries({ queryKey: ['customer', vars.customerId] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setNoteDraft("");
        setNoteIsInternal(true);
        showSuccessToast("Note added");
      },
      onError: (e: unknown) => {
        showErrorToast(e instanceof Error ? e.message : "Failed to add note");
      },
    }
  );

  const createTaskMutation = useCreateCustomerTask();
  const updateTaskMutation = useUpdateCustomerTask();
  const deleteTaskMutation = useDeleteCustomerTask();

  const customers = unwrapApiList<Customer>(customersResponse, []);
  const pagination = unwrapPagination(customersResponse);
  const selectedCustomer = customerDetailResponse?.data;
  const customerOrders: Order[] = unwrapApiList<Order>(customerOrdersResponse as any, []);
  const customerDocuments: CustomerDocumentRow[] = unwrapApiList<CustomerDocumentRow>(
    customerDocumentsResponse,
    []
  );
  const customerNotes: CustomerNote[] = (selectedCustomer?.notes ?? []) as CustomerNote[];
  const tasks: CustomerTask[] = unwrapApiList<CustomerTask>(tasksResponse as any, []);

  const adminContacts = useMemo(() => {
    return unwrapApiList<Record<string, unknown>>(availableContactsResponse as any, []).map((c) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? "Contact"),
      department: c.department != null ? String(c.department) : "",
      specialization: c.specialization != null ? String(c.specialization) : "",
      email: c.email != null ? String(c.email) : "",
    }));
  }, [availableContactsResponse]);

  const [taskOwnerFilter, setTaskOwnerFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteIsInternal, setNoteIsInternal] = useState(true);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    dueAtLocal: "",
    assignedTo: "",
    notes: "",
  });

  const filteredTasks = useMemo(() => {
    const now = Date.now();
    return tasks
      .filter((t) => t.status === "open" || t.status === "done" || t.status === "cancelled")
      .filter((t) => {
        if (taskOwnerFilter === "all") return true;
        return t.assigned_to === taskOwnerFilter;
      })
      .filter((t) => {
        if (!overdueOnly) return true;
        if (t.status !== "open") return false;
        if (!t.due_at) return false;
        const due = new Date(t.due_at).getTime();
        return Number.isFinite(due) && due < now;
      });
  }, [tasks, taskOwnerFilter, overdueOnly]);

  const nextFollowUp = useMemo(() => {
    const now = Date.now();
    const open = tasks.filter((t) => {
      if (t.status !== "open") return false;
      if (taskOwnerFilter !== "all" && t.assigned_to !== taskOwnerFilter) return false;
      if (overdueOnly) {
        if (!t.due_at) return false;
        const due = new Date(t.due_at).getTime();
        if (!Number.isFinite(due) || due >= now) return false;
      }
      return true;
    });
    const sorted = [...open].sort((a, b) => {
      const ad = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return sorted[0] ?? null;
  }, [tasks, taskOwnerFilter, overdueOnly]);

  // Filter customers locally
  const filtered = customers.filter((c: Customer) => {
    const matchesSearch = !search || 
      c.company_name?.toLowerCase().includes(search.toLowerCase()) || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      c.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.email || !newCustomer.full_name) return;
    createCustomerMutation.mutate(newCustomer);
  };

  const handleToggleStatus = (customer: Customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    updateCustomerMutation.mutate({
      id: customer.id,
      data: { status: newStatus }
    });
  };

  const handleImportCustomersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    importCustomersMutation.mutate(file);
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedCustomerId) return;
    uploadDocumentMutation.mutate({ file, customerId: selectedCustomerId });
  };

  // Loading state
  if (isLoading) {
    return <AdminPageLoading message="Loading customers" />;
  }

  // Error state
  if (isError) {
    return (
      <AdminPageError
        message={error instanceof Error ? error.message : "An error occurred while fetching customers."}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["customers"] })}
      />
    );
  }

  // ── Customer Detail ──
  if (selectedCustomerId && selectedCustomer) {
    const c = selectedCustomer;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCustomerId(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg md:text-xl">{c.company_name || c.full_name}</h2>
              <span className={statusStyles[c.status]}>{c.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.full_name} · Member since {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={c.assigned_contact_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  updateCustomerMutation.mutate({ id: c.id, data: { assignedContactId: v } });
                }}
                disabled={contactsLoading || updateCustomerMutation.isLoading}
                className="text-xs bg-background outline-none"
              >
                <option value="">Unassigned</option>
                {adminContacts.map((ac) => (
                  <option key={ac.id} value={ac.id}>
                    {ac.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <a href={`mailto:${c.email}`} className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
            <button 
              onClick={() => handleToggleStatus(c)}
              disabled={updateCustomerMutation.isLoading}
              className="px-3 py-2 border border-destructive text-destructive rounded-sm text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {c.status === "active" ? <><Ban className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle className="h-3.5 w-3.5" /> Activate</>}
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this customer? Their record will be archived (soft delete).")) {
                  deleteCustomerMutation.mutate(c.id);
                }
              }}
              disabled={deleteCustomerMutation.isLoading}
              className="px-3 py-2 border border-border text-destructive rounded-sm text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {deleteCustomerMutation.isLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-xl font-bold font-display">{c.total_orders || customerOrders.length}</p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold font-display">C${(c.total_spent || 0).toLocaleString()}</p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Avg. Order Value</p>
            <p className="text-xl font-bold font-display">
              C${(c.total_orders && c.total_orders > 0 ? Math.round((c.total_spent || 0) / c.total_orders) : 0).toLocaleString()}
            </p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Last Order</p>
            <p className="text-xl font-bold font-display">
              {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Order History */}
          <div className="lg:col-span-2 dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Order History
            </h3>
            {customerOrders.length > 0 ? (
              <div className="space-y-2">
                {customerOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()} · {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={statusStyles[order.status]}>{order.status}</span>
                      <span className="text-sm font-medium">C${toNumber(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No orders found.</p>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3">Contact</h3>
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-accent hover:underline mb-2">
                <Mail className="h-3.5 w-3.5" /> {c.email}
              </a>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </a>
              )}
            </div>

            <div className="dashboard-card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display font-bold text-sm uppercase flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documents
                </h3>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleDocumentFileChange}
                />
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={uploadDocumentMutation.isLoading}
                  className="text-xs px-2.5 py-1.5 border border-border rounded-sm font-medium hover:bg-secondary transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {uploadDocumentMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Upload
                </button>
              </div>
              {documentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : customerDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents yet. PDF, Word, or Excel up to the server limit.</p>
              ) : (
                <ul className="space-y-2">
                  {customerDocuments.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-start justify-between gap-2 text-sm border border-border rounded-sm px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={resolveBackendUploadUrl(doc.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1 font-medium"
                        >
                          <span className="truncate">{doc.file_name || doc.file_url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {doc.document_type}
                          {doc.uploaded_by ? ` · ${doc.uploaded_by}` : ""}
                          {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Remove document"
                        disabled={deleteDocumentMutation.isLoading}
                        onClick={() => {
                          if (!confirm("Remove this document from the customer record?")) return;
                          deleteDocumentMutation.mutate({ documentId: doc.id, customerId: c.id });
                        }}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* CRM Detail Tabs */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDetailTab("activity")}
                className={`px-3 py-1.5 border rounded-sm text-xs font-medium transition-colors ${
                  detailTab === "activity" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"
                }`}
              >
                <FolderOpen className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Activity
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("notes")}
                className={`px-3 py-1.5 border rounded-sm text-xs font-medium transition-colors ${
                  detailTab === "notes" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"
                }`}
              >
                <MessageSquareText className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Notes
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("tasks")}
                className={`px-3 py-1.5 border rounded-sm text-xs font-medium transition-colors ${
                  detailTab === "tasks" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"
                }`}
              >
                <CalendarClock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Tasks
              </button>
            </div>

            {detailTab !== "notes" && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5" />
                  Owner
                </div>
                <select
                  value={taskOwnerFilter}
                  onChange={(e) => setTaskOwnerFilter(e.target.value)}
                  className="text-xs border border-border rounded-sm bg-background px-2 py-1"
                  disabled={contactsLoading}
                >
                  <option value="all">All</option>
                  {adminContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          {detailTab === "notes" && (
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-2 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-accent" /> Customer Notes
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedCustomerId) return;
                  const v = noteDraft.trim();
                  if (!v) return;
                  addCustomerNoteMutation.mutate({ customerId: selectedCustomerId, note: v, isInternal: noteIsInternal });
                }}
                className="space-y-3 mb-6"
              >
                <div>
                  <label className="block text-xs font-medium mb-1">Add a note</label>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Write a note for this customer..."
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input type="checkbox" checked={noteIsInternal} onChange={(e) => setNoteIsInternal(e.target.checked)} />
                    Mark as internal
                  </label>
                  <button
                    type="submit"
                    disabled={addCustomerNoteMutation.isLoading || !noteDraft.trim()}
                    className="btn-accent px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> {addCustomerNoteMutation.isLoading ? "Adding..." : "Add note"}
                  </button>
                </div>
              </form>

              {customerNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...customerNotes]
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((n) => (
                      <div key={n.id} className="border border-border rounded-sm p-3 bg-muted/20">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-xs text-muted-foreground">
                            {n.is_internal ? "Internal" : "Public"}
                            {n.user ? ` · ${n.user}` : ""}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          {detailTab === "activity" && (
            <div className="dashboard-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display font-bold text-sm uppercase mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" /> Activity Timeline
                  </h3>
                  <p className="text-xs text-muted-foreground">Merged view: notes, documents, orders, and tasks.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                  Overdue tasks only
                </label>
              </div>

              {tasksLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline...
                </div>
              ) : (
                (() => {
                  type TimelineEvent = { id: string; at: string; title: string; subtitle?: string; body?: string };
                  const now = Date.now();
                  const events: TimelineEvent[] = [];

                  for (const n of customerNotes) {
                    events.push({
                      id: `note:${n.id}`,
                      at: n.created_at,
                      title: n.is_internal ? "Internal note" : "Public note",
                      subtitle: n.user ? n.user : undefined,
                      body: n.note,
                    });
                  }

                  for (const d of customerDocuments) {
                    events.push({
                      id: `doc:${d.id}`,
                      at: d.created_at,
                      title: d.document_type,
                      subtitle: d.file_name || d.file_url,
                    });
                  }

                  for (const o of customerOrders) {
                    if (o.order_date) {
                      events.push({
                        id: `order:${o.id}:created`,
                        at: o.order_date,
                        title: `Order ${o.order_number}`,
                        subtitle: `Created · ${o.status}`,
                      });
                    }
                    if (o.updated_at && o.updated_at !== o.order_date) {
                      events.push({
                        id: `order:${o.id}:updated`,
                        at: o.updated_at,
                        title: `Order ${o.order_number}`,
                        subtitle: `Updated · ${o.status}`,
                      });
                    }
                  }

                  for (const t of tasks) {
                    if (taskOwnerFilter !== "all" && t.assigned_to !== taskOwnerFilter) continue;
                    if (overdueOnly) {
                      if (t.status !== "open") continue;
                      if (!t.due_at) continue;
                      if (new Date(t.due_at).getTime() >= now) continue;
                    }

                    events.push({
                      id: `task:${t.id}:created`,
                      at: t.created_at,
                      title: `Task: ${t.title}`,
                      subtitle: `${t.assigned_contact_name ? `Owner: ${t.assigned_contact_name}` : "Owner: Unassigned"} · Status: ${t.status}`,
                      body: t.notes ?? undefined,
                    });

                    if (t.status !== "open" && t.updated_at && t.updated_at !== t.created_at) {
                      events.push({
                        id: `task:${t.id}:updated`,
                        at: t.updated_at,
                        title: `Task updated`,
                        subtitle: `Task: ${t.title} · Now: ${t.status}`,
                      });
                    }
                  }

                  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
                  if (events.length === 0) {
                    return <p className="text-sm text-muted-foreground py-6">No activity yet.</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {events.slice(0, 60).map((ev) => (
                        <div key={ev.id} className="border border-border rounded-sm p-3 bg-muted/15">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{ev.title}</div>
                              {ev.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{ev.subtitle}</div>}
                              {ev.body && <div className="text-sm whitespace-pre-wrap mt-2">{ev.body}</div>}
                            </div>
                            <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {ev.at ? new Date(ev.at).toLocaleString() : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Tasks */}
          {detailTab === "tasks" && (
            <div className="dashboard-card">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-sm uppercase mb-1 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-accent" /> Follow-up Tasks
                  </h3>
                  <p className="text-xs text-muted-foreground">Create and track due dates for each customer.</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                  Overdue only
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <div className="dashboard-card">
                  <p className="text-xs text-muted-foreground">Next follow-up</p>
                  {nextFollowUp ? (
                    <>
                      <p className="text-sm font-semibold mt-2">{nextFollowUp.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nextFollowUp.due_at ? `Due: ${new Date(nextFollowUp.due_at).toLocaleString()}` : "No due date"} ·{" "}
                        {nextFollowUp.assigned_contact_name ? `Owner: ${nextFollowUp.assigned_contact_name}` : "Owner: Unassigned"}
                      </p>
                      <div className="mt-3">
                        <span className="badge badge-warning">{nextFollowUp.status}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">No open tasks.</p>
                  )}
                </div>

                <div className="dashboard-card">
                  <p className="text-xs text-muted-foreground">Create task</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!selectedCustomerId) return;
                      const title = taskDraft.title.trim();
                      if (!title) return;
                      const dueIso = taskDraft.dueAtLocal ? new Date(taskDraft.dueAtLocal).toISOString() : null;
                      const assignedTo = taskDraft.assignedTo ? taskDraft.assignedTo : null;
                      const notes = taskDraft.notes.trim() ? taskDraft.notes.trim() : null;

                      createTaskMutation.mutate(
                        {
                          customerId: selectedCustomerId,
                          payload: {
                            title,
                            due_at: dueIso,
                            status: "open",
                            assigned_to: assignedTo,
                            notes,
                          },
                        },
                        {
                          onSuccess: () => {
                            setTaskDraft({ title: "", dueAtLocal: "", assignedTo: "", notes: "" });
                            showSuccessToast("Task created");
                          },
                          onError: (err: unknown) => {
                            showErrorToast(err instanceof Error ? err.message : "Failed to create task");
                          },
                        }
                      );
                    }}
                    className="space-y-3 mt-3"
                  >
                    <div>
                      <label className="block text-xs font-medium mb-1">Title</label>
                      <input
                        value={taskDraft.title}
                        onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm outline-none focus:ring-2 focus:ring-accent"
                        placeholder="e.g. Follow up quote"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Due date (optional)</label>
                      <input
                        type="datetime-local"
                        value={taskDraft.dueAtLocal}
                        onChange={(e) => setTaskDraft((d) => ({ ...d, dueAtLocal: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Assign to</label>
                      <select
                        value={taskDraft.assignedTo}
                        onChange={(e) => setTaskDraft((d) => ({ ...d, assignedTo: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Unassigned</option>
                        {adminContacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Notes (optional)</label>
                      <textarea
                        value={taskDraft.notes}
                        onChange={(e) => setTaskDraft((d) => ({ ...d, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Add details for follow-up..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={createTaskMutation.isLoading || !taskDraft.title.trim()}
                      className="btn-accent px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> {createTaskMutation.isLoading ? "Creating..." : "Create task"}
                    </button>
                  </form>
                </div>
              </div>

              {tasksLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No tasks match your filters.</p>
              ) : (
                <div className="space-y-3">
                  {filteredTasks
                    .slice()
                    .sort((a, b) => {
                      const ad = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
                      const bd = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
                      return ad - bd;
                    })
                    .map((t) => {
                      const due = t.due_at ? new Date(t.due_at) : null;
                      const isOverdue = t.status === "open" && due ? due.getTime() < Date.now() : false;
                      return (
                        <div key={t.id} className="border border-border rounded-sm p-3 bg-muted/15">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold truncate">{t.title}</p>
                                <span
                                  className={`badge ${
                                    t.status === "open"
                                      ? isOverdue
                                        ? "badge-destructive"
                                        : "badge-warning"
                                      : t.status === "done"
                                      ? "badge-success"
                                      : "badge-muted"
                                  }`}
                                >
                                  {t.status}
                                </span>
                                {isOverdue && <span className="badge badge-destructive">Overdue</span>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t.due_at ? `Due: ${due?.toLocaleString()}` : "No due date"} ·{" "}
                                {t.assigned_contact_name ? `Owner: ${t.assigned_contact_name}` : "Owner: Unassigned"}
                              </div>
                              {t.notes && <div className="text-sm whitespace-pre-wrap mt-2">{t.notes}</div>}
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {t.status !== "done" ? (
                                <button
                                  type="button"
                                  disabled={updateTaskMutation.isLoading}
                                  onClick={() => updateTaskMutation.mutate({ taskId: t.id, payload: { status: "done" } as any })}
                                  className="px-2.5 py-1.5 border border-success text-success rounded-sm text-xs font-medium hover:bg-success/10 transition-colors"
                                >
                                  <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Done
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={updateTaskMutation.isLoading}
                                  onClick={() => updateTaskMutation.mutate({ taskId: t.id, payload: { status: "open" } as any })}
                                  className="px-2.5 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-muted/40 transition-colors"
                                >
                                  <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Reopen
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={deleteTaskMutation.isLoading}
                                onClick={() => {
                                  if (!confirm("Delete this task?")) return;
                                  deleteTaskMutation.mutate(t.id);
                                }}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-sm disabled:opacity-50 transition-colors"
                                title="Delete task"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    );
  }

  // ── Create Modal ──
  if (showCreateModal) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowCreateModal(false)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>

        <div className="dashboard-card max-w-2xl">
          <h2 className="font-display font-bold text-lg md:text-xl mb-6">Create New Customer</h2>

          <form onSubmit={handleCreateCustomer} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  placeholder="e.g., Acme Transport"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.full_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="e.g., john@acme.com"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="e.g., +1 (555) 000-0000"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button 
                type="submit" 
                disabled={createCustomerMutation.isLoading}
                className="btn-accent px-6 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {createCustomerMutation.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Customer
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="px-6 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Customer List ──
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <AdminPageHeader
            title="Customers"
            subtitle={pagination ? `${pagination.total} total customers` : undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2 self-start">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.json,application/json,text/csv"
                  className="hidden"
                  onChange={handleImportCustomersChange}
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={importCustomersMutation.isLoading}
                  className="px-4 py-2 border border-border rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {importCustomersMutation.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import file
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Customer
                </button>
              </div>
            }
          />
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Bulk import: CSV or JSON (max 5MB). Rows need{" "}
            <code className="text-[10px] bg-secondary px-1 rounded">company_name</code> and{" "}
            <code className="text-[10px] bg-secondary px-1 rounded">email</code> (see API).
          </p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, or email..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-accent hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map((customer: Customer) => {
            const isExpanded = expandedCustomer === customer.id;
            return (
              <div key={customer.id} className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                  className="w-full p-3 text-left flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{customer.company_name || customer.full_name}</p>
                      <span className={statusStyles[customer.status]}>{customer.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 bg-secondary/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Orders</span>
                      <span>{customer.total_orders || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Spent</span>
                      <span>C${(customer.total_spent || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> View
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
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-right px-3 py-2">Orders</th>
                <th className="text-right px-3 py-2">Total Spent</th>
                <th className="text-left px-3 py-2">Last Order</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer: Customer) => (
                <tr key={customer.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium">{customer.company_name || customer.full_name}</p>
                      {customer.company_name && <p className="text-xs text-muted-foreground">{customer.full_name}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <a href={`mailto:${customer.email}`} className="text-accent hover:underline text-sm">{customer.email}</a>
                    {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{customer.total_orders || 0}</td>
                  <td className="px-3 py-3 text-right font-medium">C${(customer.total_spent || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-3 py-3"><span className={statusStyles[customer.status]}>{customer.status}</span></td>
                  <td className="px-3 py-3">
                    <button 
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="p-1.5 hover:bg-secondary rounded-sm transition-colors" 
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No customers found.</div>}

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

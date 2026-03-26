import React, { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Copy,
  Check,
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
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId || null);

  // Sync state if URL changes
  useEffect(() => {
    if (customerId) {
      setSelectedCustomerId(customerId);
    }
  }, [customerId]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [detailTab, setDetailTab] = useState<"activity" | "notes" | "tasks" | "documents">("activity");
  const [linkCopied, setLinkCopied] = useState(false);
  
  const copyFormLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const [newCustomer, setNewCustomer] = useState({
    company_name: "",
    neq: "",
    tax_id: "",
    full_name: "",
    email: "",
    phone: "",
    addresses: "",
    fleet_details: "",
    brands_serviced: "",
    primary_contact_name: "",
    primary_contact_phone: "",
    primary_contact_email: "",
    ap_contact_name: "",
    ap_contact_email: "",
    ap_phone: "",
    payment_method: "",
    create_account: true,
  });

  const [editForm, setEditForm] = useState({
    company_name: "",
    full_name: "",
    email: "",
    phone: "",
    status: "active" as Customer["status"],
  });

  const importInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: customersResponse, isLoading, isError, error } = useCustomers(page, 50);
  const { data: customerDetailResponse } = useCustomer(selectedCustomerId || "");
  const { data: customerOrdersResponse } = useCustomerOrders(selectedCustomerId || "");
  const { data: customerDocumentsResponse, isLoading: documentsLoading } = useCustomerDocuments(selectedCustomerId || "");
  const { data: tasksResponse, isLoading: tasksLoading } = useCustomerTasks(selectedCustomerId || "");
  const { data: availableContactsResponse, isLoading: contactsLoading } = useAvailableAdminContacts();

  // Mutations
  const createCustomerMutation = useApiMutation(
    (data: any) => api.createCustomer(data),
    {
      onSuccess: (res: any) => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setShowCreateModal(false);
        setNewCustomer({
          company_name: "",
          neq: "",
          tax_id: "",
          full_name: "",
          email: "",
          phone: "",
          addresses: "",
          fleet_details: "",
          brands_serviced: "",
          primary_contact_name: "",
          primary_contact_phone: "",
          primary_contact_email: "",
          ap_contact_name: "",
          ap_contact_email: "",
          ap_phone: "",
          payment_method: "",
          create_account: true,
        });
        showSuccessToast("Customers", "Customer created successfully.");
      },
      onError: (e: unknown) => {
        showErrorToast("Customers", e instanceof Error ? e.message : "Failed to create customer");
      },
    }
  );

  const updateCustomerMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => api.updateCustomer(id, data),
    {
      onSuccess: () => {
        showSuccessToast("Customers", "Customer updated successfully");
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customer'] });
        setShowEditModal(false);
      },
      onError: (e: unknown) => {
        showErrorToast("Customers", e instanceof Error ? e.message : "Failed to update customer");
      },
    }
  );

  const deleteCustomerMutation = useApiMutation(
    (id: string) => api.deleteCustomer(id),
    {
      onSuccess: () => {
        showSuccessToast("Customers", "Customer deleted");
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setSelectedCustomerId(null);
      },
      onError: (e: unknown) => {
        showErrorToast("Customers", e instanceof Error ? e.message : "Delete failed");
      },
    }
  );

  const uploadDocumentMutation = useApiMutation(
    ({ file, customerId }: { file: File; customerId: string }) =>
      api.uploadContractFile(file, { customerId, documentType: "contract" }),
    {
      onSuccess: (res, { customerId }) => {
        queryClient.invalidateQueries({ queryKey: ["customer", customerId, "documents"] });
        showSuccessToast("Documents", res.message || "Document uploaded.");
      },
      onError: (e: unknown) => {
        showErrorToast("Documents", e instanceof Error ? e.message : "Upload failed");
      },
    }
  );

  const deleteDocumentMutation = useApiMutation(
    ({ documentId, customerId }: { documentId: string; customerId: string }) =>
      api.deleteCustomerDocument(documentId),
    {
      onSuccess: (res, { customerId }) => {
        queryClient.invalidateQueries({ queryKey: ["customer", customerId, "documents"] });
        showSuccessToast("Documents", res.message || "Document removed.");
      },
      onError: (e: unknown) => {
        showErrorToast("Documents", e instanceof Error ? e.message : "Delete failed");
      },
    }
  );

  const importCustomersMutation = useApiMutation((file: File) => api.importCustomersFile(file), {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showSuccessToast("Import", res.message || "Import completed.");
    },
    onError: (e: unknown) => {
      showErrorToast("Import", e instanceof Error ? e.message : 'Import failed');
    },
  });

  const addCustomerNoteMutation = useApiMutation(
    (vars: { customerId: string; note: string; isInternal: boolean }) =>
      api.addCustomerNote(vars.customerId, { note: vars.note, isInternal: vars.isInternal }),
    {
      onSuccess: (_res, vars) => {
        queryClient.invalidateQueries({ queryKey: ['customer', vars.customerId] });
        setNoteDraft("");
        showSuccessToast("Notes", "Note added");
      },
      onError: (e: unknown) => {
        showErrorToast("Notes", e instanceof Error ? e.message : "Failed to add note");
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
  const customerDocuments: CustomerDocumentRow[] = unwrapApiList<CustomerDocumentRow>(customerDocumentsResponse, []);
  const customerNotes: CustomerNote[] = (selectedCustomer?.notes ?? []) as CustomerNote[];
  const tasks: CustomerTask[] = unwrapApiList<CustomerTask>(tasksResponse as any, []);

  const adminContacts = useMemo(() => {
    return unwrapApiList<Record<string, unknown>>(availableContactsResponse as any, []).map((ac) => ({
      id: String(ac.id ?? ""),
      name: String(ac.name ?? "Contact"),
    }));
  }, [availableContactsResponse]);

  const [taskOwnerFilter, setTaskOwnerFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteIsInternal, setNoteIsInternal] = useState(true);
  const [taskDraft, setTaskDraft] = useState({ title: "", dueAtLocal: "", assignedTo: "", notes: "" });

  const filteredTasks = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (taskOwnerFilter !== "all" && t.assigned_to !== taskOwnerFilter) return false;
      if (overdueOnly) {
        if (t.status !== "open") return false;
        if (!t.due_at) return false;
        return new Date(t.due_at).getTime() < now;
      }
      return true;
    });
  }, [tasks, taskOwnerFilter, overdueOnly]);

  const filtered = customers.filter((c: Customer) => {
    const s = search.toLowerCase();
    return !search || c.company_name?.toLowerCase().includes(s) || c.full_name?.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
  });

  const handleToggleStatus = (customer: Customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    updateCustomerMutation.mutate({ id: customer.id, data: { status: newStatus } });
  };

  const openEditModal = (c: Customer) => {
    setEditForm({ company_name: c.company_name || "", full_name: c.full_name || "", email: c.email || "", phone: c.phone || "", status: c.status });
    setShowEditModal(true);
  };

  const handleEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    updateCustomerMutation.mutate({ id: selectedCustomerId, data: editForm });
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate(newCustomer);
  };

  const handleImportCustomersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importCustomersMutation.mutate(file);
    e.target.value = "";
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCustomerId) uploadDocumentMutation.mutate({ file, customerId: selectedCustomerId });
    e.target.value = "";
  };

  if (isLoading) return <AdminPageLoading message="Loading customers" />;
  if (isError) return <AdminPageError message={error instanceof Error ? error.message : "Error loading customers"} onRetry={() => queryClient.invalidateQueries({ queryKey: ["customers"] })} />;

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
            <p className="text-sm text-muted-foreground">{c.full_name} · Since {new Date(c.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openEditModal(c)} className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button 
              onClick={() => handleToggleStatus(c)}
              className="px-3 py-2 border border-destructive text-destructive rounded-sm text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
            >
              {c.status === "active" ? <><Ban className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle className="h-3.5 w-3.5" /> Activate</>}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDetailTab("activity")} className={`px-4 py-2 border rounded-sm text-xs font-medium transition-colors ${detailTab === "activity" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"}`}>
                <Clock className="inline h-3.5 w-3.5 mr-1" /> Activity
              </button>
              <button onClick={() => setDetailTab("notes")} className={`px-4 py-2 border rounded-sm text-xs font-medium transition-colors ${detailTab === "notes" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"}`}>
                <MessageSquareText className="inline h-3.5 w-3.5 mr-1" /> Notes
              </button>
              <button onClick={() => setDetailTab("tasks")} className={`px-4 py-2 border rounded-sm text-xs font-medium transition-colors ${detailTab === "tasks" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"}`}>
                <ListTodo className="inline h-3.5 w-3.5 mr-1" /> Tasks
              </button>
              <button onClick={() => setDetailTab("documents")} className={`px-4 py-2 border rounded-sm text-xs font-medium transition-colors ${detailTab === "documents" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:bg-muted/40"}`}>
                <FileText className="inline h-3.5 w-3.5 mr-1" /> Documents
              </button>
            </div>

            {detailTab === "activity" && (
              <div className="dashboard-card">
                 <h3 className="font-display font-bold text-sm uppercase mb-4">Activity Timeline</h3>
                 <p className="text-sm text-muted-foreground">Recent notes, orders and document uploads.</p>
                 {/* Logic for simple timeline here if needed, or reuse events logic */}
              </div>
            )}

            {detailTab === "notes" && (
              <div className="dashboard-card">
                <h3 className="font-display font-bold text-sm uppercase mb-4">Customer Notes</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (noteDraft.trim()) addCustomerNoteMutation.mutate({ customerId: c.id, note: noteDraft, isInternal: noteIsInternal });
                }} className="space-y-4 mb-6">
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} className="w-full p-3 border border-border rounded-sm bg-background text-sm" placeholder="Add a note..." />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={noteIsInternal} onChange={(e) => setNoteIsInternal(e.target.checked)} /> Internal only</label>
                    <button type="submit" className="btn-accent px-4 py-2 rounded-sm text-sm font-medium">Add Note</button>
                  </div>
                </form>
                <div className="space-y-3">
                  {customerNotes.map(n => (
                    <div key={n.id} className="p-3 border border-border rounded-sm bg-muted/20">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{n.user || "System"} · {n.is_internal ? "Internal" : "Public"}</span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "tasks" && (
              <div className="dashboard-card">
                <h3 className="font-display font-bold text-sm uppercase mb-4">Tasks</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (taskDraft.title.trim()) {
                    createTaskMutation.mutate({
                      customerId: c.id,
                      payload: { title: taskDraft.title, due_at: taskDraft.dueAtLocal ? new Date(taskDraft.dueAtLocal).toISOString() : null, status: "open", assigned_to: taskDraft.assignedTo || null, notes: taskDraft.notes || null }
                    }, { onSuccess: () => setTaskDraft({ title: "", dueAtLocal: "", assignedTo: "", notes: "" }) });
                  }
                }} className="grid gap-3 mb-6 border-b border-border pb-6">
                  <input value={taskDraft.title} onChange={(e) => setTaskDraft(d => ({ ...d, title: e.target.value }))} className="p-2 border border-border rounded-sm text-sm" placeholder="Task title..." />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="datetime-local" value={taskDraft.dueAtLocal} onChange={(e) => setTaskDraft(d => ({ ...d, dueAtLocal: e.target.value }))} className="p-2 border border-border rounded-sm text-sm" />
                    <select value={taskDraft.assignedTo} onChange={(e) => setTaskDraft(d => ({ ...d, assignedTo: e.target.value }))} className="p-2 border border-border rounded-sm text-sm">
                      <option value="">Unassigned</option>
                      {adminContacts.map(ac => <option key={ac.id} value={ac.id}>{ac.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-accent py-2 rounded-sm text-sm">Create Task</button>
                </form>
                <div className="space-y-2">
                  {filteredTasks.map(t => (
                    <div key={t.id} className="p-3 border border-border rounded-sm flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.due_at ? new Date(t.due_at).toLocaleString() : "No deadline"}</p>
                      </div>
                      <button onClick={() => updateTaskMutation.mutate({ taskId: t.id, payload: { status: t.status === "done" ? "open" : "done" } as any })} className={`px-2 py-1 rounded-sm text-[11px] border ${t.status === "done" ? "border-success text-success" : "border-border text-muted-foreground"}`}>{t.status === "done" ? "Completed" : "Mark Done"}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "documents" && (
              <div className="dashboard-card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-sm uppercase">Documents</h3>
                  <button onClick={() => documentInputRef.current?.click()} className="btn-accent px-4 py-2 rounded-sm text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Upload
                  </button>
                  <input ref={documentInputRef} type="file" className="hidden" onChange={handleDocumentFileChange} />
                </div>
                {customerDocuments.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-sm">
                    <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No documents yet.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {customerDocuments.map(doc => {
                      const isAppForm = doc.document_type === 'application_form';
                      return (
                        <div key={doc.id} className={`p-3 border rounded-sm flex items-start gap-3 ${isAppForm ? 'border-accent/30 bg-accent/5' : 'border-border'}`}>
                          <div className={`p-2 rounded-sm ${isAppForm ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}><FileText className="h-4 w-4" /></div>
                          <div className="flex-1 min-w-0">
                            <a href={resolveBackendUploadUrl(doc.file_url)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold truncate block hover:text-accent">{doc.file_name || "Document"}</a>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{doc.document_type.replace('_', ' ')} · {new Date(doc.created_at).toLocaleDateString()}</p>
                            <a href={resolveBackendUploadUrl(doc.file_url)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent font-medium mt-2 inline-block">Download</a>
                          </div>
                          <button onClick={() => confirm("Delete document?") && deleteDocumentMutation.mutate({ documentId: doc.id, customerId: c.id })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-xs uppercase mb-4 text-muted-foreground">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {c.email}</div>
                {c.phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {c.phone}</div>}
              </div>
            </div>

            <div className="dashboard-card">
              <h3 className="font-display font-bold text-xs uppercase mb-4 text-muted-foreground">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-muted-foreground uppercase">Orders</p><p className="text-lg font-bold">{c.total_orders || 0}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Spent</p><p className="text-lg font-bold">C${(c.total_spent || 0).toLocaleString()}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Modals ──
  if (showCreateModal) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setShowCreateModal(false)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="dashboard-card">
          <h2 className="font-display font-bold text-xl mb-6">Create Customer</h2>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Company *</label><input required value={newCustomer.company_name} onChange={e => setNewCustomer({...newCustomer, company_name: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Name *</label><input required value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
            </div>
            <button type="submit" className="btn-accent w-full py-2.5 rounded-sm font-medium">Create Customer</button>
          </form>
        </div>
      </div>
    )
  }

  if (showEditModal && selectedCustomerId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setShowEditModal(false)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="dashboard-card">
          <h2 className="font-display font-bold text-xl mb-6">Edit Customer</h2>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Company</label><input value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Name *</label><input required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2 border border-border rounded-sm bg-background text-sm" /></div>
            </div>
            <button type="submit" className="btn-accent w-full py-2.5 rounded-sm font-medium">Save Changes</button>
          </form>
        </div>
      </div>
    )
  }

  // ── Customer List ──
  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Customers" 
        subtitle={`${pagination?.total || 0} total`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => importInputRef.current?.click()} className="px-4 py-2 border border-border rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-secondary">
              <Upload className="h-4 w-4" /> Import
            </button>
            <input ref={importInputRef} type="file" className="hidden" onChange={handleImportCustomersChange} />
            <button onClick={() => setShowCreateModal(true)} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        }
      />

      <div className="dashboard-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="text-left py-3 px-4">Company / Name</th>
                <th className="text-left py-3 px-4">Email / Phone</th>
                <th className="text-right py-3 px-4">Orders</th>
                <th className="text-right py-3 px-4">Spent</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-semibold">{c.company_name || c.full_name}</p>
                    {c.company_name && <p className="text-xs text-muted-foreground">{c.full_name}</p>}
                  </td>
                  <td className="py-4 px-4">
                    <p>{c.email}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">{c.total_orders || 0}</td>
                  <td className="py-4 px-4 text-right font-medium">C${(c.total_spent || 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-center"><span className={statusStyles[c.status]}>{c.status}</span></td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelectedCustomerId(c.id)} className="p-1.5 hover:bg-secondary rounded-sm" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { if(confirm("Delete customer?")) deleteCustomerMutation.mutate(c.id) }} className="p-1.5 hover:bg-secondary rounded-sm text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No customers found.</div>}
        </div>
      </div>
    </div>
  );
}

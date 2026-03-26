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
  Building2,
  MapPin,
  CreditCard,
  Truck,
  Hash,
  Globe,
  User,
  Briefcase,
  DollarSign,
  Package,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  lead: "bg-blue-100 text-blue-700 border-blue-200",
  customer: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/* ── Info Row helper ── */
function InfoRow({ icon: Icon, label, value, showEmpty = true }: { icon: React.ElementType; label: string; value?: string | number | null; showEmpty?: boolean }) {
  const display = value != null && String(value).trim() !== "" ? String(value) : "—";
  if (!showEmpty && display === "—") return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-sm break-words ${display === "—" ? "text-muted-foreground/50" : "text-foreground"}`}>{display}</p>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminCustomers() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId || null);

  useEffect(() => {
    if (customerId) setSelectedCustomerId(customerId);
  }, [customerId]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyFormLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const [newCustomer, setNewCustomer] = useState({
    company_name: "", neq: "", tax_id: "", full_name: "", email: "", phone: "",
    addresses: "", fleet_details: "", brands_serviced: "",
    primary_contact_name: "", primary_contact_phone: "", primary_contact_email: "",
    ap_contact_name: "", ap_contact_email: "", ap_phone: "",
    payment_method: "", category: "lead" as Customer["category"], create_account: true,
  });

  const [editForm, setEditForm] = useState({
    company_name: "", full_name: "", email: "", phone: "",
    status: "active" as Customer["status"], category: "lead" as Customer["category"],
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        setShowCreateModal(false);
        setNewCustomer({
          company_name: "", neq: "", tax_id: "", full_name: "", email: "", phone: "",
          addresses: "", fleet_details: "", brands_serviced: "",
          primary_contact_name: "", primary_contact_phone: "", primary_contact_email: "",
          ap_contact_name: "", ap_contact_email: "", ap_phone: "",
          payment_method: "", category: "lead" as Customer["category"], create_account: true,
        });
        showSuccessToast("Customers", "Customer created successfully.");
      },
      onError: (e: unknown) => showErrorToast("Customers", e instanceof Error ? e.message : "Failed to create customer"),
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
      onError: (e: unknown) => showErrorToast("Customers", e instanceof Error ? e.message : "Failed to update customer"),
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
      onError: (e: unknown) => showErrorToast("Customers", e instanceof Error ? e.message : "Delete failed"),
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
      onError: (e: unknown) => showErrorToast("Documents", e instanceof Error ? e.message : "Upload failed"),
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
      onError: (e: unknown) => showErrorToast("Documents", e instanceof Error ? e.message : "Delete failed"),
    }
  );

  const importCustomersMutation = useApiMutation((file: File) => api.importCustomersFile(file), {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showSuccessToast("Import", res.message || "Import completed.");
    },
    onError: (e: unknown) => showErrorToast("Import", e instanceof Error ? e.message : 'Import failed'),
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
      onError: (e: unknown) => showErrorToast("Notes", e instanceof Error ? e.message : "Failed to add note"),
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
    const matchesSearch = !search || c.company_name?.toLowerCase().includes(s) || c.full_name?.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleStatus = (customer: Customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    updateCustomerMutation.mutate({ id: customer.id, data: { status: newStatus } });
  };

  const openEditModal = (c: Customer) => {
    setEditForm({
      company_name: c.company_name || "", full_name: c.full_name || "",
      email: c.email || "", phone: c.phone || "",
      status: c.status, category: c.category || "lead"
    });
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

  // ══════════════════════════════════════════════════════════
  // ── CUSTOMER DETAIL VIEW (with tabs)
  // ══════════════════════════════════════════════════════════
  if (selectedCustomerId && selectedCustomer) {
    const c = selectedCustomer;
    const openTasks = tasks.filter(t => t.status === "open").length;
    const completedTasks = tasks.filter(t => t.status === "done").length;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => { setSelectedCustomerId(null); navigate("/admin/customers"); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>

        {/* ── Header card ── */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-xl">{c.company_name || c.full_name}</h2>
                    <Badge variant="outline" className={statusStyles[c.status]}>{c.status}</Badge>
                    <Badge variant="outline" className={statusStyles[c.category || "lead"]}>{c.category || "lead"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {c.full_name}{c.company_name ? ` · ${c.company_name}` : ""} · Customer since {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openEditModal(c)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(c)}
                  className="px-4 py-2 border border-destructive/50 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                >
                  {c.status === "active" ? <><Ban className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle className="h-3.5 w-3.5" /> Activate</>}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ShoppingBag} label="Total Orders" value={c.total_orders || 0} accent="text-blue-500" />
          <StatCard icon={DollarSign} label="Total Spent" value={`C$${(c.total_spent || 0).toLocaleString()}`} accent="text-emerald-500" />
          <StatCard icon={ListTodo} label="Open Tasks" value={openTasks} accent="text-amber-500" />
          <StatCard icon={FileText} label="Documents" value={customerDocuments.length} accent="text-violet-500" />
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-1.5"><UserRound className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Orders ({customerOrders.length})</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><MessageSquareText className="h-3.5 w-3.5" /> Notes ({customerNotes.length})</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="h-3.5 w-3.5" /> Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documents ({customerDocuments.length})</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow icon={User} label="Full Name" value={c.full_name} />
                  <InfoRow icon={User} label="Contact Person" value={(c as any).contact_person} />
                  <InfoRow icon={Briefcase} label="Title" value={(c as any).contact_title} />
                  <InfoRow icon={Mail} label="Email" value={c.email} />
                  <InfoRow icon={Phone} label="Phone" value={c.phone} />
                  <InfoRow icon={User} label="Primary Contact" value={(c as any).primary_contact_name} />
                  <InfoRow icon={Phone} label="Primary Contact Phone" value={(c as any).primary_contact_phone} />
                  <InfoRow icon={Mail} label="Primary Contact Email" value={(c as any).primary_contact_email} />
                  <InfoRow icon={UserRound} label="Sales Representative" value={(c as any).sales_representative} />
                </CardContent>
              </Card>

              {/* Company Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Company Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow icon={Building2} label="Company Name" value={c.company_name} />
                  <InfoRow icon={Briefcase} label="Customer Type" value={(c as any).customer_type} />
                  <InfoRow icon={Briefcase} label="Distributor Type" value={(c as any).distributor_type} />
                  <InfoRow icon={Hash} label="NEQ / TVA" value={(c as any).neq_tva} />
                  <InfoRow icon={Hash} label="Tax Number" value={(c as any).tax_number} />
                  <InfoRow icon={Truck} label="Number of Trucks" value={(c as any).num_trucks} />
                  <InfoRow icon={Truck} label="Number of Trailers" value={(c as any).num_trailers} />
                  <InfoRow icon={Package} label="Parts Needed" value={(c as any).parts_needed} />
                  <InfoRow icon={FileText} label="Special Requests" value={(c as any).special_requests} />
                  <InfoRow icon={Globe} label="Website" value={(c as any).website} />
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Addresses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow icon={MapPin} label="Address" value={(c as any).address} />
                  <InfoRow icon={MapPin} label="Shipping Address" value={(c as any).shipping_address} />
                  <InfoRow icon={MapPin} label="Billing Address" value={(c as any).billing_address} />
                  <InfoRow icon={MapPin} label="City" value={(c as any).city} />
                  <InfoRow icon={MapPin} label="Province / State" value={(c as any).province} />
                  <InfoRow icon={MapPin} label="Postal Code" value={(c as any).postal_code} />
                  <InfoRow icon={Globe} label="Country" value={(c as any).country} />
                </CardContent>
              </Card>

              {/* Payment & Accounting */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Payment & Accounting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow icon={CreditCard} label="Payment Method" value={(c as any).payment_method} />
                  <InfoRow icon={Briefcase} label="Payment Terms" value={(c as any).payment_terms} />
                  <InfoRow icon={DollarSign} label="Credit Limit" value={(c as any).credit_limit ? `C$${Number((c as any).credit_limit).toLocaleString()}` : null} />
                  <InfoRow icon={Building2} label="Bank Reference" value={(c as any).bank_reference} />
                  <InfoRow icon={User} label="Accounting Contact" value={(c as any).accounting_contact} />
                  <InfoRow icon={Phone} label="Accounting Phone" value={(c as any).accounting_phone} />
                  <InfoRow icon={Mail} label="Billing Email" value={(c as any).billing_email} />
                </CardContent>
              </Card>

              {/* References */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Supplier References
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow icon={Building2} label="Supplier Reference 1" value={(c as any).supplier_ref_1} />
                  <InfoRow icon={Building2} label="Supplier Reference 2" value={(c as any).supplier_ref_2} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ORDERS TAB ── */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Order History</CardTitle>
                <CardDescription>{customerOrders.length} orders found</CardDescription>
              </CardHeader>
              <CardContent>
                {customerOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No orders yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-3 px-4 font-semibold text-muted-foreground">Order #</th>
                          <th className="py-3 px-4 font-semibold text-muted-foreground">Date</th>
                          <th className="py-3 px-4 font-semibold text-muted-foreground">Status</th>
                          <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customerOrders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                            <td className="py-3 px-4 font-medium">#{o.order_number || o.id?.slice(0, 8)}</td>
                            <td className="py-3 px-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4"><Badge variant="outline" className={statusStyles[o.status] || ""}>{o.status}</Badge></td>
                            <td className="py-3 px-4 text-right font-semibold">C${toNumber(o.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTES TAB ── */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (noteDraft.trim()) addCustomerNoteMutation.mutate({ customerId: c.id, note: noteDraft, isInternal: noteIsInternal });
                }} className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Write a note..." />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={noteIsInternal} onChange={(e) => setNoteIsInternal(e.target.checked)} className="rounded" /> Internal only
                    </label>
                    <button type="submit" disabled={!noteDraft.trim()} className="btn-accent px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Add Note</button>
                  </div>
                </form>

                {customerNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquareText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No notes yet. Add the first one above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerNotes.map(n => (
                      <div key={n.id} className="p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-2">
                          <span className="font-medium">{n.user || "System"} · <Badge variant="outline" className="text-[10px] px-1.5 py-0">{n.is_internal ? "Internal" : "Public"}</Badge></span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TASKS TAB ── */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wide">CRM Tasks</CardTitle>
                <CardDescription>{openTasks} open · {completedTasks} completed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create task form */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (taskDraft.title.trim()) {
                    createTaskMutation.mutate({
                      customerId: c.id,
                      payload: { title: taskDraft.title, due_at: taskDraft.dueAtLocal ? new Date(taskDraft.dueAtLocal).toISOString() : null, status: "open", assigned_to: taskDraft.assignedTo || null, notes: taskDraft.notes || null }
                    }, { onSuccess: () => setTaskDraft({ title: "", dueAtLocal: "", assignedTo: "", notes: "" }) });
                  }
                }} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  <input value={taskDraft.title} onChange={(e) => setTaskDraft(d => ({ ...d, title: e.target.value }))} className="w-full p-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20" placeholder="Task title..." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="datetime-local" value={taskDraft.dueAtLocal} onChange={(e) => setTaskDraft(d => ({ ...d, dueAtLocal: e.target.value }))} className="p-2.5 border border-border rounded-lg text-sm bg-background" />
                    <select value={taskDraft.assignedTo} onChange={(e) => setTaskDraft(d => ({ ...d, assignedTo: e.target.value }))} className="p-2.5 border border-border rounded-lg text-sm bg-background">
                      <option value="">Unassigned</option>
                      {adminContacts.map(ac => <option key={ac.id} value={ac.id}>{ac.name}</option>)}
                    </select>
                  </div>
                  <textarea value={taskDraft.notes} onChange={(e) => setTaskDraft(d => ({ ...d, notes: e.target.value }))} rows={2} className="w-full p-2.5 border border-border rounded-lg text-sm bg-background resize-none" placeholder="Notes (optional)..." />
                  <button type="submit" disabled={!taskDraft.title.trim()} className="btn-accent py-2.5 px-5 rounded-lg text-sm font-medium disabled:opacity-50">Create Task</button>
                </form>

                {/* Filter row */}
                <div className="flex items-center gap-3">
                  <select value={taskOwnerFilter} onChange={(e) => setTaskOwnerFilter(e.target.value)} className="p-2 border border-border rounded-lg text-sm bg-background">
                    <option value="all">All Owners</option>
                    {adminContacts.map(ac => <option key={ac.id} value={ac.id}>{ac.name}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded" /> Overdue only
                  </label>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No tasks match your filter.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map(t => {
                      const isOverdue = t.status === "open" && t.due_at && new Date(t.due_at).getTime() < Date.now();
                      return (
                        <div key={t.id} className={`p-4 border rounded-lg flex items-center justify-between gap-3 transition-all hover:shadow-sm ${t.status === "done" ? "border-border bg-muted/20 opacity-70" : isOverdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {t.due_at && (
                                <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-semibold" : ""}`}>
                                  <CalendarClock className="h-3 w-3" /> {new Date(t.due_at).toLocaleString()}
                                </span>
                              )}
                              {t.notes && <span className="truncate max-w-[200px]">{t.notes}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => updateTaskMutation.mutate({ taskId: t.id, payload: { status: t.status === "done" ? "open" : "done" } as any })}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${t.status === "done" ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-border text-muted-foreground hover:bg-secondary"}`}
                            >
                              {t.status === "done" ? <><CheckCircle2 className="inline h-3 w-3 mr-1" />Done</> : "Mark Done"}
                            </button>
                            <button onClick={() => deleteTaskMutation.mutate({ taskId: t.id })} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCUMENTS TAB ── */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide">Documents</CardTitle>
                  <CardDescription>{customerDocuments.length} files</CardDescription>
                </div>
                <button onClick={() => documentInputRef.current?.click()} className="btn-accent px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </button>
                <input ref={documentInputRef} type="file" className="hidden" onChange={handleDocumentFileChange} />
              </CardHeader>
              <CardContent>
                {customerDocuments.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                    <button onClick={() => documentInputRef.current?.click()} className="mt-3 text-xs text-primary hover:underline font-medium">Upload your first document</button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {customerDocuments.map(doc => {
                      const isAppForm = doc.document_type === 'application_form';
                      return (
                        <div key={doc.id} className={`p-4 border rounded-lg flex items-start gap-4 transition-all hover:shadow-md ${isAppForm ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                          <div className={`p-3 rounded-lg flex items-center justify-center ${isAppForm ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground truncate">{doc.file_name || (isAppForm ? "Account Application" : "Document")}</span>
                              {isAppForm && <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold">Official</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                              {isAppForm ? "Generated PDF" : doc.document_type.replace('_', ' ')} · {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            <a
                              href={resolveBackendUploadUrl(doc.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold flex items-center gap-1 mt-2 text-primary hover:text-primary/80 transition-colors"
                            >
                              Download <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <button
                            onClick={() => confirm("Delete this document permanently?") && deleteDocumentMutation.mutate({ documentId: doc.id, customerId: c.id })}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // ── CREATE MODAL
  // ══════════════════════════════════════════════════════════
  if (showCreateModal) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setShowCreateModal(false)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <Card>
          <CardHeader><CardTitle>Create Customer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Company *</label><input required value={newCustomer.company_name} onChange={e => setNewCustomer({...newCustomer, company_name: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Contact Name *</label><input required value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
              </div>
              <button type="submit" className="btn-accent w-full py-2.5 rounded-lg font-medium">Create Customer</button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── EDIT MODAL ──
  if (showEditModal && selectedCustomerId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setShowEditModal(false)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <Card>
          <CardHeader><CardTitle>Edit Customer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Company</label><input value={editForm.company_name} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Contact Name *</label><input required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2 border border-border rounded-lg bg-background text-sm" /></div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as any})} className="w-full p-2 border border-border rounded-lg bg-background text-sm">
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-accent w-full py-2.5 rounded-lg font-medium">Save Changes</button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // ── CUSTOMER LIST
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        subtitle={`${pagination?.total || 0} total`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => importInputRef.current?.click()} className="px-4 py-2 border border-border rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors">
              <Upload className="h-4 w-4" /> Import
            </button>
            <input ref={importInputRef} type="file" className="hidden" onChange={handleImportCustomersChange} />
            <button onClick={() => setShowCreateModal(true)} className="btn-accent px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-background" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border border-border rounded-lg text-sm bg-background">
              <option value="all">All Categories</option>
              <option value="lead">Leads</option>
              <option value="customer">Customers</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Company / Name</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Email / Phone</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Category</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Orders</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Spent</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(c.id)}>
                    <td className="py-4 px-4">
                      <p className="font-semibold">{c.company_name || c.full_name}</p>
                      {c.company_name && <p className="text-xs text-muted-foreground">{c.full_name}</p>}
                    </td>
                    <td className="py-4 px-4">
                      <p>{c.email}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase ${statusStyles[c.category || "lead"]}`}>{c.category || "lead"}</Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-medium">{c.total_orders || 0}</td>
                    <td className="py-4 px-4 text-right font-medium">C${(c.total_spent || 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-center"><Badge variant="outline" className={statusStyles[c.status]}>{c.status}</Badge></td>
                    <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedCustomerId(c.id)} className="p-1.5 hover:bg-secondary rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => { if(confirm("Delete customer?")) deleteCustomerMutation.mutate(c.id) }} className="p-1.5 hover:bg-secondary rounded-lg text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No customers found.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

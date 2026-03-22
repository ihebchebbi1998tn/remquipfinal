import React, { useState, useRef } from "react";
import { Eye, Search, X, Mail, Phone, ChevronDown, ChevronUp, ArrowLeft, ShoppingBag, FileText, Edit, Ban, CheckCircle, Plus, Loader2, AlertCircle, Upload, Trash2, ExternalLink } from "lucide-react";
import { useCustomers, useCustomer, useCustomerOrders, useCustomerDocuments, useApiMutation } from "@/hooks/useApi";
import { api, Customer, Order, unwrapApiList, unwrapPagination, resolveBackendUploadUrl } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

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
};

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const customers = unwrapApiList<Customer>(customersResponse, []);
  const pagination = unwrapPagination(customersResponse);
  const selectedCustomer = customerDetailResponse?.data;
  const customerOrders: Order[] = unwrapApiList<Order>(customerOrdersResponse as any, []);
  const customerDocuments: CustomerDocumentRow[] = unwrapApiList<CustomerDocumentRow>(
    customerDocumentsResponse,
    []
  );

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <span className="ml-2 text-muted-foreground">Loading customers...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-display font-bold text-lg mb-2">Failed to load customers</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {error instanceof Error ? error.message : "An error occurred while fetching customers."}
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
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
                      <span className="text-sm font-medium">C${order.total_amount.toFixed(2)}</span>
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
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl">Customer Management</h2>
          {pagination && <p className="text-sm text-muted-foreground">{pagination.total} total customers</p>}
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Bulk import: CSV or JSON (max 5MB). Rows need <code className="text-[10px] bg-secondary px-1 rounded">company_name</code> and <code className="text-[10px] bg-secondary px-1 rounded">email</code> (see API).
          </p>
        </div>
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

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Plus, FileText, CheckCircle, XCircle, Clock, Upload, X, MapPin, Download, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { useOffers, useOffer, useCreateOffer, useUpdateOffer, useUpdateOfferStatus, useConvertOfferToOrder, useDeleteOffer, useOfferDocuments, useUploadOfferDocument, useDeleteOfferDocument, useSearchProducts, useCustomers } from "@/hooks/useApi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

const statusStyles: Record<string, string> = {
  draft: "badge-secondary",
  sent: "badge-info",
  accepted: "badge-success",
  rejected: "badge-destructive",
  expired: "badge-warning",
  converted: "badge-success",
};

const statusFlow = ["draft", "sent", "accepted", "converted"];

export default function AdminOffers() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: offersData, isLoading, isError, refetch } = useOffers(
    page,
    limit,
    activeTab !== "all" ? activeTab : undefined,
    searchQuery
  );

  const offers = Array.isArray(offersData?.data) ? offersData.data : (offersData?.data as any)?.items || [];
  const totalItems = (offersData?.data as any)?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  if (offerId) {
    return <AdminOfferDetail offerId={offerId} onBack={() => navigate("/admin/offers")} />;
  }

  // Handle Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sales Offers"
        description="Create and manage quotes, proposals, and convert them to orders."
        icon={FileText}
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-accent flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Offer</span>
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto custom-scrollbar">
          {["all", "draft", "sent", "accepted", "rejected", "expired", "converted"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-600 hover:text-emerald-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {isLoading ? (
        <AdminPageLoading message="Loading offers..." />
      ) : isError ? (
        <AdminPageError message="Failed to load offers" onRetry={() => refetch()} />
      ) : offers.length === 0 ? (
        <div className="dashboard-card py-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No offers found</h3>
          <p className="text-slate-500 mt-1">
            {searchQuery
              ? "We couldn't find any offers matching your search."
              : "You haven't created any offers yet."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 btn-accent inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Offer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-4 font-semibold text-sm text-slate-600">Offer #</th>
                  <th className="p-4 font-semibold text-sm text-slate-600">Customer</th>
                  <th className="p-4 font-semibold text-sm text-slate-600">Date</th>
                  <th className="p-4 font-semibold text-sm text-slate-600 text-right">Total</th>
                  <th className="p-4 font-semibold text-sm text-slate-600">Status</th>
                  <th className="p-4 font-semibold text-sm text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.map((offer: any) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{offer.offer_number}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{offer.item_count || 0} items</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{offer.customer_name || "Unknown"}</div>
                      <div className="text-sm text-slate-500">{offer.customer_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-900">{new Date(offer.created_at).toLocaleDateString()}</div>
                      {offer.valid_until && (
                        <div className="text-xs text-orange-600 mt-0.5 whitespace-nowrap">
                          Valid til {new Date(offer.valid_until).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-slate-900">
                        ${Number(offer.total || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${statusStyles[offer.status || "draft"]}`}>
                        {(offer.status || "draft").toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/offers/${offer.id}`)}
                        className="text-emerald-600 hover:text-emerald-800 text-sm font-medium mr-3"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-slate-50 text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-slate-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateOfferModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// OFFER DETAIL COMPONENT
// ==========================================

function AdminOfferDetail({ offerId, onBack }: { offerId: string; onBack: () => void }) {
  const { data, isLoading, isError, refetch } = useOffer(offerId);
  const statusMutation = useUpdateOfferStatus(offerId);
  const convertMutation = useConvertOfferToOrder();
  const deleteMutation = useDeleteOffer(offerId);
  const navigate = useNavigate();

  const offer = data?.data;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await statusMutation.mutateAsync(newStatus);
      showSuccessToast("Success", `Offer status updated to ${newStatus}`);
      refetch();
    } catch (e) {
      showErrorToast("Error", "Failed to update status");
    }
  };

  const handleConvert = async () => {
    try {
      const res = await convertMutation.mutateAsync(offerId);
      showSuccessToast("Success", "Offer successfully converted to order!");
      // Redirect to the new order
      if (res.data?.id) {
        navigate(`/admin/orders/${res.data.id}`);
      } else {
        refetch();
      }
    } catch (e) {
      showErrorToast("Error", "Failed to convert offer");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this offer? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync();
      showSuccessToast("Success", "Offer deleted successfully");
      onBack();
    } catch (e) {
      showErrorToast("Error", "Failed to delete offer");
    }
  };

  if (isLoading) return <AdminPageLoading message="Loading offer details..." />;
  if (isError || !offer) return <AdminPageError message="Failed to load offer details" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <Search className="w-5 h-5 rotate-180" /> {/* Arrow left icon shortcut */}
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-b-0 m-0">Offer {offer.offer_number}</h1>
          <p className="text-slate-500">
            Created on {new Date(offer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`badge ${statusStyles[offer.status || "draft"]}`}>
            {(offer.status || "draft").toUpperCase()}
          </span>
          {offer.status === "accepted" && (
            <button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="btn-accent flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Convert to Order</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="dashboard-card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-sm font-medium text-slate-500">Product</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 text-right">Qty</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 text-right">Price</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offer.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        {(item.sku || item.product_sku_live) && (
                          <div className="text-xs text-slate-500">SKU: {item.sku || item.product_sku_live}</div>
                        )}
                        {item.notes && <div className="text-xs text-slate-500 mt-1 italic">{item.notes}</div>}
                      </td>
                      <td className="py-4 text-right text-slate-900">{item.quantity}</td>
                      <td className="py-4 text-right text-slate-900">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-4 text-right font-medium text-slate-900">${Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!offer.items?.length && (
                    <tr><td colSpan={4} className="py-4 text-center text-slate-500">No items found</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t">
                  <tr>
                    <td colSpan={3} className="py-3 text-right text-slate-500 text-sm">Subtotal:</td>
                    <td className="py-3 text-right font-medium text-slate-900">${Number(offer.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-slate-500 text-sm">Discount:</td>
                    <td className="py-2 text-right text-red-600">-${Number(offer.discount || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-slate-500 text-sm">Shipping:</td>
                    <td className="py-2 text-right text-slate-900">${Number(offer.shipping || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-slate-500 text-sm">Tax:</td>
                    <td className="py-2 text-right text-slate-900">${Number(offer.tax || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-4 text-right font-bold text-slate-900">Total:</td>
                    <td className="py-4 text-right font-bold text-lg text-emerald-700">${Number(offer.total || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {offer.notes && (
              <div className="mt-6 p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <h4 className="text-sm font-medium text-yellow-800 mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Notes / Terms
                </h4>
                <p className="text-sm text-yellow-900 whitespace-pre-wrap">{offer.notes}</p>
              </div>
            )}
          </div>

          <OfferDocuments offer={offer} />
        </div>

        <div className="space-y-6">
          <div className="dashboard-card p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Customer Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Company / Name</p>
                <p className="font-medium text-slate-900">{(offer as any).company_name || offer.customer_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Contact Person</p>
                <p className="font-medium text-slate-900">{(offer as any).contact_person || offer.customer_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <a href={`mailto:${offer.customer_email}`} className="text-emerald-600 hover:underline">
                  {offer.customer_email}
                </a>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="text-slate-900">{offer.customer_phone || "Not provided"}</p>
              </div>
              <div className="pt-4 mt-4 border-t">
                <button
                  onClick={() => navigate(`/admin/customers/${offer.customer_id}`)}
                  className="text-sm text-slate-600 hover:text-emerald-700 font-medium flex items-center justify-between w-full group"
                >
                  View full customer profile <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-card p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Offer Actions</h2>
            
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700">Update Status</label>
              <select
                value={offer.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={offer.status === "converted"}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent to Customer</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="converted" disabled>Converted to Order</option>
              </select>
            </div>

            <div className="space-y-3 pt-4 border-t border-red-100">
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Offer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DOCUMENTS COMPONENT
// ==========================================

function OfferDocuments({ offer }: { offer: any }) {
  const { data: docsData, refetch } = useOfferDocuments(offer.id);
  const uploadMutation = useUploadOfferDocument();
  const deleteMutation = useDeleteOfferDocument();
  const [isUploading, setIsUploading] = useState(false);

  const documents = docsData?.data || offer.documents || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showErrorToast("Error", "File is too large (max 10MB)");
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, offerId: offer.id, documentType: "attachment" });
      showSuccessToast("Success", "Document uploaded successfully");
      refetch();
    } catch (err) {
      showErrorToast("Error", "Failed to upload document");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteMutation.mutateAsync({ offerId: offer.id, documentId: docId });
      showSuccessToast("Success", "Document removed");
      refetch();
    } catch (err) {
      showErrorToast("Error", "Failed to remove document");
    }
  };

  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Attachments & Documents</h2>
        <div>
          <label className={`btn-primary px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2 ${isUploading ? "opacity-70 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4" /> {isUploading ? "Uploading..." : "Upload File"}
            <input type="file" onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {documents.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline line-clamp-1">
                  {doc.file_name}
                </a>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{new Date(doc.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span>{doc.uploaded_by || 'Admin'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={doc.file_url} download className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                <Download className="w-4 h-4" />
              </a>
              <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50/50">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No documents attached to this offer yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CREATE MODAL COMPONENT
// ==========================================

function CreateOfferModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const createMutation = useCreateOffer();
  
  // State
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);

  // Search Lookups
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: custData } = useCustomers(1, 50);
  const customers = Array.isArray(custData?.data) ? custData.data : (custData?.data as any)?.items || [];
  
  const { data: prodData } = useSearchProducts(productSearch, 10);
  const productResults = Array.isArray(prodData?.data) ? prodData.data : (prodData?.data as any)?.items || [];

  const handleAddProduct = (product: any) => {
    setItems([
      ...items,
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.price || 0,
        notes: ""
      }
    ]);
    setProductSearch("");
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return showErrorToast("Error", "Please select a customer");
    if (items.length === 0) return showErrorToast("Error", "Please add at least one product");

    try {
      await createMutation.mutateAsync({
        customer_id: customerId,
        valid_until: validUntil || null,
        notes,
        discount,
        shipping,
        items: items.map(i => ({
          product_id: i.product_id,
          name: i.name,
          sku: i.sku,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          notes: i.notes
        }))
      });
      showSuccessToast("Success", "Offer created successfully");
      onSuccess();
    } catch (err) {
      showErrorToast("Error", "Failed to create offer");
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = subtotal - Number(discount) + Number(shipping);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Create New Offer</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <form id="offer-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Section */}
            <div className="bg-white p-5 rounded-lg border shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">1. Select Customer</h3>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Products Section */}
            <div className="bg-white p-5 rounded-lg border shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">2. Add Products</h3>
              
              <div className="relative max-w-md mb-6">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                
                {productSearch && productResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {productResults.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.sku}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-emerald-700">${Number(p.price).toFixed(2)}</span>
                          <Plus className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-sm font-medium text-slate-600">Product</th>
                        <th className="p-3 text-sm font-medium text-slate-600 w-24">Qty</th>
                        <th className="p-3 text-sm font-medium text-slate-600 w-32">Unit Price</th>
                        <th className="p-3 text-sm font-medium text-slate-600 text-right">Total</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-3">
                            <div className="font-medium text-sm text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500 mb-1">SKU: {item.sku}</div>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateItem(idx, "notes", e.target.value)}
                              placeholder="Line note (optional)"
                              className="w-full text-xs px-2 py-1 border rounded bg-slate-50"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          </td>
                          <td className="p-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-500">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                                className="w-full pl-5 pr-2 py-1 border rounded"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-sm">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals & Details Section */}
            <div className="bg-white p-5 rounded-lg border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">3. Terms & Notes</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes to Customer</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter terms, conditions, or special notes..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">4. Summary</h3>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Discount</span>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1 text-slate-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-5 pr-2 py-1 border rounded bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200">
                    <span className="text-slate-600">Shipping Estimate</span>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1 text-slate-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={shipping}
                        onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                        className="w-full pl-5 pr-2 py-1 border rounded bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span className="text-slate-900">Total</span>
                    <span className="text-emerald-700">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-white flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border rounded-lg font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="offer-form"
            disabled={createMutation.isPending}
            className="btn-primary px-6 py-2.5 flex items-center gap-2"
          >
            {createMutation.isPending ? "Creating..." : "Create Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Eye, Search, X, ChevronDown, ChevronUp, Package, Truck, CheckCircle, Clock, Printer, Download, Mail, ArrowLeft, MapPin, CreditCard, FileText, Loader2, AlertCircle } from "lucide-react";
import { useOrders, useOrder, useApiMutation } from "@/hooks/useApi";
import { api, Order, unwrapApiList, unwrapPagination } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  delivered: "badge-success",
  completed: "badge-success",
  cancelled: "badge-destructive",
  refunded: "badge-destructive",
};

const statusFlow = ["pending", "processing", "shipped", "delivered"];
const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
};

const carriers = ["Purolator", "Canada Post", "UPS", "FedEx", "Day & Ross"];

export default function AdminOrders() {
  // Backend sometimes returns numeric fields as strings.
  // Convert safely so `.toFixed()` never crashes.
  function toNumber(v: unknown): number {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return ch;
      }
    });
  }

  function buildReceiptHtml(order: Order): string {
    const items = (order.items ?? []).map((it: any) => {
      const productName = it.product_name ?? it.name ?? it.productName ?? 'Item';
      const productId = it.product_id ?? it.productId ?? it.sku ?? '';
      const qty = toNumber(it.quantity);
      const unitPrice = toNumber(it.unit_price ?? it.unitPrice);
      const lineSubtotal = toNumber(it.subtotal ?? it.line_total ?? (qty * unitPrice));
      const displayName = escapeHtml(productName);
      const displayId = productId ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${escapeHtml(productId)}</div>` : '';
      return {
        displayName,
        displayId,
        qty,
        unitPrice,
        lineSubtotal,
      };
    });

    const subtotal = toNumber((order as any).subtotal ?? (order as any).subtotal_amount);
    const taxAmount = toNumber((order as any).tax_amount ?? (order as any).tax);
    const shippingAmount = toNumber((order as any).shipping_amount ?? (order as any).shipping);
    const discountAmount = toNumber((order as any).discount_amount ?? (order as any).discount);
    const totalAmount = toNumber((order as any).total_amount ?? (order as any).total);
    const notes = (order as any).notes ? escapeHtml((order as any).notes) : '';

    const rowsHtml =
      items.length === 0
        ? `<tr><td colspan="4" style="padding:12px 8px;color:#6b7280;">No items</td></tr>`
        : items
            .map((i) => {
              return `
                <tr>
                  <td style="padding:10px 8px;">
                    <div style="font-weight:600;">${i.displayName}</div>
                    ${i.displayId}
                  </td>
                  <td style="padding:10px 8px;text-align:right;">${i.qty}</td>
                  <td style="padding:10px 8px;text-align:right;">${i.unitPrice.toFixed(2)}</td>
                  <td style="padding:10px 8px;text-align:right;">${i.lineSubtotal.toFixed(2)}</td>
                </tr>
              `;
            })
            .join('');

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order Receipt</title>
          <style>
            body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#0f172a; padding:24px; }
            .muted { color:#6b7280; }
            h1 { margin:0; font-size:20px; }
            .box { border:1px solid #e5e7eb; border-radius:10px; padding:14px; margin-top:16px; }
            table { width:100%; border-collapse:collapse; margin-top:12px; }
            th { text-align:left; font-size:12px; color:#6b7280; border-bottom:1px solid #e5e7eb; padding:8px; }
            td { border-bottom:1px solid #eef2f7; }
            .totals { margin-top:14px; width:320px; margin-left:auto; }
            .row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; }
            @media print { body { padding:0.5in; } }
          </style>
        </head>
        <body>
          <h1>Remquip — Order Receipt</h1>
          <div class="muted" style="margin-top:6px;">Order: <strong>${escapeHtml(order.order_number)}</strong></div>
          <div class="muted" style="margin-top:4px;">Date: <strong>${escapeHtml((order as any).order_date ?? '')}</strong></div>
          <div class="muted" style="margin-top:4px;">Status: <strong>${escapeHtml((order as any).status ?? '')}</strong></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Unit</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="row"><span class="muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div class="row"><span class="muted">Tax</span><span>${taxAmount.toFixed(2)}</span></div>
            <div class="row"><span class="muted">Shipping</span><span>${shippingAmount.toFixed(2)}</span></div>
            <div class="row"><span class="muted">Discount</span><span>${discountAmount > 0 ? '-' : ''}${discountAmount.toFixed(2)}</span></div>
            <div class="row" style="font-weight:700;"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
          </div>

          ${notes ? `<div class="box"><div style="font-weight:700;">Notes</div><div style="margin-top:6px; white-space:pre-wrap;" class="muted">${notes}</div></div>` : ''}
        </body>
      </html>`;
  }

  function printSelectedReceipt() {
    if (!selectedOrder) return;
    const html = buildReceiptHtml(selectedOrder);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showShipment, setShowShipment] = useState<string | null>(null);
  const [shipmentCarrier, setShipmentCarrier] = useState("Purolator");
  const [shipmentTracking, setShipmentTracking] = useState("");

  const queryClient = useQueryClient();

  // Fetch orders from API
  const { data: ordersResponse, isLoading, isError, error } = useOrders(page, 50);

  // Fetch single order details when selected
  const { data: orderDetailResponse } = useOrder(selectedOrderId || "");

  // Mutations
  const updateOrderStatusMutation = useApiMutation(
    ({ id, status }: { id: string; status: string }) => api.updateOrderStatus(id, status as Order['status']),
    {
      onSuccess: () => {
        showSuccessToast("Orders", "Order status updated");
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order'] });
      },
      onError: (e: unknown) => {
        showErrorToast("Orders", e instanceof Error ? e.message : "Failed to update status");
      },
    }
  );

  const addOrderNoteMutation = useApiMutation(
    ({ orderId, note }: { orderId: string; note: string }) => api.addOrderNote(orderId, note),
    {
      onSuccess: () => {
        showSuccessToast("Orders", "Note added to order");
        queryClient.invalidateQueries({ queryKey: ['order'] });
        setNewNote("");
      },
      onError: (e: unknown) => {
        showErrorToast("Orders", e instanceof Error ? e.message : "Failed to add note");
      },
    }
  );

  const orders = unwrapApiList<Order>(ordersResponse as any, []);
  const pagination = unwrapPagination(ordersResponse as any);
  const selectedOrder = orderDetailResponse?.data;

  // Filter orders locally
  const filtered = orders.filter((o: Order) => {
    const matchesSearch = !search || 
      o.order_number?.toLowerCase().includes(search.toLowerCase()) || 
      o.customer_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status counts
  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o: Order) => o.status === "pending").length,
    processing: orders.filter((o: Order) => o.status === "processing").length,
    shipped: orders.filter((o: Order) => o.status === "shipped").length,
    delivered: orders.filter((o: Order) => o.status === "delivered").length,
  };

  function handleStatusChange(orderId: string, newStatus: string) {
    updateOrderStatusMutation.mutate({ id: orderId, status: newStatus });
  }

  function toggleSelect(id: string) {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedOrders.size === filtered.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filtered.map((o: Order) => o.id)));
    }
  }

  function handleBulkStatusChange(status: string) {
    selectedOrders.forEach(id => {
      updateOrderStatusMutation.mutate({ id, status });
    });
    setSelectedOrders(new Set());
  }

  function exportCSV() {
    const rows = filtered.map((o: Order) => 
      `${o.order_number},${o.customer_email},${o.total_amount},${o.status},${o.order_date}`
    );
    const csv = `Order,Customer,Total,Status,Date\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleShipOrder(orderId: string) {
    handleStatusChange(orderId, "shipped");
    setShowShipment(null);
    setShipmentTracking("");
  }

  function handleAddNote() {
    if (selectedOrderId && newNote.trim()) {
      addOrderNoteMutation.mutate({ orderId: selectedOrderId, note: newNote });
    }
  }

  // Loading state
  if (isLoading) {
    return <AdminPageLoading message="Loading orders" />;
  }

  // Error state
  if (isError) {
    return (
      <AdminPageError
        message={error instanceof Error ? error.message : "An error occurred while fetching orders."}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
      />
    );
  }

  // ── Order Detail View ──
  if (selectedOrderId && selectedOrder) {
    const currentIdx = statusFlow.indexOf(selectedOrder.status);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedOrderId(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl">{selectedOrder.order_number}</h2>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(selectedOrder.order_date).toLocaleDateString()} · {selectedOrder.payment_method || "Invoice"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={printSelectedReceipt}
              className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print Invoice
            </button>
            <button
              onClick={printSelectedReceipt}
              className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email Customer
            </button>
            {selectedOrder.status === "processing" && (
              <button onClick={() => setShowShipment(selectedOrder.id)} className="px-3 py-2 btn-accent rounded-sm text-xs font-medium flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Ship Order
              </button>
            )}
          </div>
        </div>

        {/* Shipment dialog */}
        {showShipment === selectedOrder.id && (
          <div className="dashboard-card border-accent">
            <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5"><Truck className="h-4 w-4 text-accent" /> Assign Shipping</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Carrier</label>
                <select value={shipmentCarrier} onChange={(e) => setShipmentCarrier(e.target.value)} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none">
                  {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tracking Number</label>
                <input value={shipmentTracking} onChange={(e) => setShipmentTracking(e.target.value)} placeholder="e.g. 1Z999AA1..." className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono" />
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={() => handleShipOrder(selectedOrder.id)} 
                  disabled={updateOrderStatusMutation.isPending}
                  className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex-1 disabled:opacity-50"
                >
                  {updateOrderStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Shipped"}
                </button>
                <button onClick={() => setShowShipment(null)} className="px-3 py-2 border border-border rounded-sm text-sm hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Order Status</h3>
          <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto pb-2">
            {statusFlow.map((s, i) => {
              const Icon = statusIcons[s];
              const isActive = i <= currentIdx;
              const isCurrent = s === selectedOrder.status;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`h-0.5 flex-1 min-w-4 ${i <= currentIdx ? "bg-accent" : "bg-border"}`} />}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, s)}
                    disabled={updateOrderStatusMutation.isPending}
                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
                      isCurrent ? "bg-accent text-accent-foreground" : isActive ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline capitalize">{s}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-4">Items</h3>
            <div className="space-y-3">
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.product_id}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium">C${toNumber(item.subtotal).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × C${toNumber(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>C${toNumber(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>C${toNumber(selectedOrder.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {toNumber(selectedOrder.shipping_amount) === 0
                    ? "Free"
                    : `C$${toNumber(selectedOrder.shipping_amount).toFixed(2)}`}
                </span>
              </div>
              {toNumber(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-C${toNumber(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Total</span>
                <span>C${toNumber(selectedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3">Customer</h3>
              <p className="text-sm font-medium">{selectedOrder.customer_email}</p>
            </div>
            <div className="dashboard-card flex flex-col gap-2">
              <h3 className="font-display font-bold text-sm uppercase mb-1 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Payment
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground w-24">Method:</span>
                <p className="text-sm font-medium uppercase tracking-wider">{selectedOrder.payment_method || "N/A"}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground w-24">Status:</span>
                <span className={statusStyles[selectedOrder.payment_status]}>{selectedOrder.payment_status}</span>
              </div>
              
              {selectedOrder.stripe_payment_intent_id && (
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Stripe ID:</span>
                  <a href={`https://dashboard.stripe.com/test/payments/${selectedOrder.stripe_payment_intent_id}`}
                     target="_blank" rel="noopener noreferrer" 
                     className="text-[10px] text-accent hover:underline font-mono truncate max-w-[150px]"
                     title={selectedOrder.stripe_payment_intent_id}>
                    {selectedOrder.stripe_payment_intent_id}
                  </a>
                </div>
              )}
              
              {selectedOrder.paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Paid At:</span>
                  <span className="text-xs font-medium">{new Date(selectedOrder.paid_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Activity & Notes</h3>
          {selectedOrder.notes && (
            <div className="mb-4 p-3 bg-secondary rounded-sm">
              <p className="text-sm">{selectedOrder.notes}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              value={newNote} 
              onChange={(e) => setNewNote(e.target.value)} 
              placeholder="Add a note..." 
              className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
            />
            <button 
              onClick={handleAddNote} 
              disabled={addOrderNoteMutation.isPending || !newNote.trim()}
              className="btn-accent px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50"
            >
              {addOrderNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Order List View ──
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        subtitle={pagination ? `${pagination.total} total orders` : undefined}
        actions={
          <button
            onClick={exportCSV}
            className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        {[
          { key: "", label: "All", count: statusCounts.all },
          { key: "pending", label: "Pending", count: statusCounts.pending },
          { key: "processing", label: "Processing", count: statusCounts.processing },
          { key: "shipped", label: "Shipped", count: statusCounts.shipped },
          { key: "delivered", label: "Delivered", count: statusCounts.delivered },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`dashboard-card text-center text-xs md:text-sm font-medium transition-colors ${statusFilter === tab.key ? "border-accent text-accent" : "hover:border-muted-foreground"}`}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-lg md:text-xl font-bold font-display mt-0.5">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedOrders.size > 0 && (
        <div className="dashboard-card flex flex-wrap items-center gap-3 bg-accent/5 border-accent/30">
          <span className="text-sm font-medium">{selectedOrders.size} selected</span>
          <button 
            onClick={() => handleBulkStatusChange("processing")} 
            disabled={updateOrderStatusMutation.isPending}
            className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            → Processing
          </button>
          <button 
            onClick={() => handleBulkStatusChange("shipped")} 
            disabled={updateOrderStatusMutation.isPending}
            className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            → Shipped
          </button>
          <button 
            onClick={() => handleBulkStatusChange("delivered")} 
            disabled={updateOrderStatusMutation.isPending}
            className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            → Delivered
          </button>
          <button onClick={exportCSV} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary flex items-center gap-1">
            <Download className="h-3 w-3" /> Export
          </button>
          <button onClick={() => setSelectedOrders(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by order # or email..." 
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" 
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-accent hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Orders table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2 w-8">
                  <input type="checkbox" checked={selectedOrders.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded-sm border-border accent-accent" />
                </th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order: Order) => (
                <tr key={order.id} className={`hover:bg-secondary/50 transition-colors ${selectedOrders.has(order.id) ? "bg-accent/5" : ""}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded-sm border-border accent-accent" />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-medium">{order.order_number}</td>
                  <td className="px-3 py-3">{order.customer_email}</td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-right font-medium">C${toNumber(order.total_amount).toFixed(2)}</td>
                  <td className="px-3 py-3"><span className={statusStyles[order.payment_status]}>{order.payment_status}</span></td>
                  <td className="px-3 py-3"><span className={statusStyles[order.status]}>{order.status}</span></td>
                  <td className="px-3 py-3">
                    <button 
                      onClick={() => setSelectedOrderId(order.id)} 
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

        {/* Mobile view */}
        <div className="md:hidden space-y-2">
          {filtered.map((order: Order) => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrderId(order.id)}
              className="border border-border rounded-md p-3 cursor-pointer hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium">{order.order_number}</span>
                <span className={statusStyles[order.status]}>{order.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">{new Date(order.order_date).toLocaleDateString()}</span>
                <span className="font-medium">C${toNumber(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No orders found.</div>}

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

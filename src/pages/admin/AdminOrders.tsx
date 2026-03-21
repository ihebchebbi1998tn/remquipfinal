import React, { useState } from "react";
import { Eye, Search, X, ChevronDown, ChevronUp, Package, Truck, CheckCircle, Clock, Printer, Download, Mail, ArrowLeft, MapPin, CreditCard, FileText } from "lucide-react";

const allOrders = [
  { id: "RMQ-001234", customer: "Groupe Transport Lévis", email: "info@gtl.ca", phone: "+1 418 555 0101", items: 4, total: 2450.00, subtotal: 2142.00, tax: 308.00, shipping: 0, status: "processing", date: "2026-03-10", payment: "Invoice", trackingNumber: "", carrier: "",
    address: { street: "456 Route de la Traverse", city: "Lévis", province: "QC", postal: "G6V 6N2", country: "Canada" },
    products: [{ name: "Air Spring W01-358 9781", sku: "1T15ZR-6", qty: 2, unitPrice: 89.99, total: 179.98 }, { name: "30/30 Long Stroke Brake Chamber", sku: "SC3030LS", qty: 2, unitPrice: 134.50, total: 269.00 }],
    notes: [{ date: "2026-03-10 09:15", user: "System", text: "Order placed" }, { date: "2026-03-10 10:30", user: "Marc Dupont", text: "Payment confirmed via invoice" }] },
  { id: "RMQ-001233", customer: "Fleet Services Ontario", email: "orders@fso.com", phone: "+1 416 555 0202", items: 2, total: 1890.50, subtotal: 1652.19, tax: 238.31, shipping: 0, status: "shipped", date: "2026-03-09", payment: "Credit Card", trackingNumber: "1Z999AA10123456784", carrier: "Purolator",
    address: { street: "789 Industrial Pkwy", city: "Toronto", province: "ON", postal: "M3J 2P1", country: "Canada" },
    products: [{ name: "ADB22X Air Disc Brake Pad Kit", sku: "ADB22X-PAD", qty: 2, unitPrice: 156.00, total: 312.00 }],
    notes: [{ date: "2026-03-09 08:00", user: "System", text: "Order placed" }, { date: "2026-03-09 14:00", user: "Julie Martin", text: "Shipped via Purolator" }] },
  { id: "RMQ-001232", customer: "Québec Truck Parts Inc.", email: "buy@qtp.ca", phone: "+1 418 555 0303", items: 8, total: 3200.00, subtotal: 2798.25, tax: 401.75, shipping: 0, status: "completed", date: "2026-03-08", payment: "Bank Transfer", trackingNumber: "1Z999AA10123456785", carrier: "Purolator",
    address: { street: "123 Rue du Commerce", city: "Québec", province: "QC", postal: "G1K 7P4", country: "Canada" },
    products: [{ name: "4707Q Brake Shoe Kit", sku: "4707Q-KIT", qty: 8, unitPrice: 74.99, total: 599.92 }],
    notes: [{ date: "2026-03-08 07:30", user: "System", text: "Order placed" }] },
  { id: "RMQ-001231", customer: "Maritime Heavy Hauling", email: "fleet@mhh.ca", phone: "+1 506 555 0404", items: 1, total: 675.00, subtotal: 590.09, tax: 84.91, shipping: 25.00, status: "pending", date: "2026-03-08", payment: "Invoice", trackingNumber: "", carrier: "",
    address: { street: "321 Harbour Rd", city: "Saint John", province: "NB", postal: "E2L 4Z6", country: "Canada" },
    products: [{ name: "Brake Drum - Gunite 3600A", sku: "3600AX", qty: 1, unitPrice: 198.00, total: 198.00 }],
    notes: [{ date: "2026-03-08 11:00", user: "System", text: "Order placed" }, { date: "2026-03-08 11:05", user: "System", text: "Awaiting payment confirmation" }] },
  { id: "RMQ-001230", customer: "Prairie Fleet Maintenance", email: "parts@pfm.ca", phone: "+1 306 555 0505", items: 3, total: 1120.00, subtotal: 979.82, tax: 140.18, shipping: 0, status: "completed", date: "2026-03-07", payment: "Credit Card", trackingNumber: "1Z999AA10123456786", carrier: "Canada Post",
    address: { street: "555 Main St W", city: "Saskatoon", province: "SK", postal: "S7M 0W6", country: "Canada" },
    products: [{ name: "4515Q Brake Shoe Assembly Kit", sku: "4515Q-ASM", qty: 3, unitPrice: 89.99, total: 269.97 }],
    notes: [{ date: "2026-03-07 09:00", user: "System", text: "Order placed" }, { date: "2026-03-08 16:00", user: "System", text: "Delivered" }] },
  { id: "RMQ-001229", customer: "BC Trucking Solutions", email: "ops@bcts.ca", phone: "+1 604 555 0606", items: 6, total: 4150.00, subtotal: 3631.58, tax: 518.42, shipping: 0, status: "processing", date: "2026-03-06", payment: "Invoice", trackingNumber: "", carrier: "",
    address: { street: "888 Terminal Ave", city: "Vancouver", province: "BC", postal: "V6A 4G2", country: "Canada" },
    products: [{ name: "Air Spring W01-358 9781", sku: "1T15ZR-6", qty: 6, unitPrice: 89.99, total: 539.94 }],
    notes: [{ date: "2026-03-06 15:00", user: "System", text: "Order placed" }] },
];

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  completed: "badge-success",
  cancelled: "badge-destructive",
  refunded: "badge-destructive",
};

const statusFlow = ["pending", "processing", "shipped", "completed"];
const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  completed: CheckCircle,
};

const carriers = ["Purolator", "Canada Post", "UPS", "FedEx", "Day & Ross"];

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<typeof allOrders[0] | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showShipment, setShowShipment] = useState<string | null>(null);
  const [shipmentCarrier, setShipmentCarrier] = useState("Purolator");
  const [shipmentTracking, setShipmentTracking] = useState("");

  const getStatus = (orderId: string, originalStatus: string) => orderStatuses[orderId] || originalStatus;

  const filtered = allOrders.filter((o) => {
    const status = getStatus(o.id, o.status);
    const matchesSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: allOrders.length,
    pending: allOrders.filter(o => getStatus(o.id, o.status) === "pending").length,
    processing: allOrders.filter(o => getStatus(o.id, o.status) === "processing").length,
    shipped: allOrders.filter(o => getStatus(o.id, o.status) === "shipped").length,
    completed: allOrders.filter(o => getStatus(o.id, o.status) === "completed").length,
  };

  function handleStatusChange(orderId: string, newStatus: string) {
    setOrderStatuses(prev => ({ ...prev, [orderId]: newStatus }));
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
      setSelectedOrders(new Set(filtered.map(o => o.id)));
    }
  }

  function handleBulkStatusChange(status: string) {
    const updates: Record<string, string> = {};
    selectedOrders.forEach(id => { updates[id] = status; });
    setOrderStatuses(prev => ({ ...prev, ...updates }));
    setSelectedOrders(new Set());
  }

  function exportCSV() {
    const rows = filtered.map(o => `${o.id},${o.customer},${o.email},${o.total},${getStatus(o.id, o.status)},${o.date}`);
    const csv = `Order,Customer,Email,Total,Status,Date\n${rows.join("\n")}`;
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

  // ── Order Detail View ──
  if (selectedOrder) {
    const status = getStatus(selectedOrder.id, selectedOrder.status);
    const currentIdx = statusFlow.indexOf(status);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedOrder(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl">{selectedOrder.id}</h2>
            <p className="text-sm text-muted-foreground">Placed on {selectedOrder.date} · {selectedOrder.payment}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print Invoice
            </button>
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email Customer
            </button>
            {status === "processing" && (
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
                <button onClick={() => handleShipOrder(selectedOrder.id)} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex-1">Mark Shipped</button>
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
              const isCurrent = s === status;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`h-0.5 flex-1 min-w-4 ${i <= currentIdx ? "bg-accent" : "bg-border"}`} />}
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, s)}
                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap transition-colors ${
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
          {status === "shipped" && (
            <div className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded-sm">
              <Truck className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">Tracking:</span>
              <span className="font-mono text-xs">{selectedOrder.trackingNumber || "Not yet assigned"}</span>
              {selectedOrder.carrier && <span className="text-xs text-muted-foreground">({selectedOrder.carrier})</span>}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-4">Items</h3>
            <div className="space-y-3">
              {selectedOrder.products.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium">C${p.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} × C${p.unitPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>C${selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>C${selectedOrder.tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{selectedOrder.shipping === 0 ? "Free" : `C$${selectedOrder.shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span>C${selectedOrder.total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3">Customer</h3>
              <p className="text-sm font-medium">{selectedOrder.customer}</p>
              <a href={`mailto:${selectedOrder.email}`} className="text-xs text-accent hover:underline block mt-1">{selectedOrder.email}</a>
              <a href={`tel:${selectedOrder.phone}`} className="text-xs text-muted-foreground block mt-0.5">{selectedOrder.phone}</a>
            </div>
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Shipping Address</h3>
              <p className="text-sm">{selectedOrder.address.street}</p>
              <p className="text-sm">{selectedOrder.address.city}, {selectedOrder.address.province} {selectedOrder.address.postal}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder.address.country}</p>
            </div>
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payment</h3>
              <p className="text-sm">{selectedOrder.payment}</p>
              <span className={statusStyles[status]}>{status}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Activity & Notes</h3>
          <div className="space-y-3 mb-4">
            {selectedOrder.notes.map((note, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{note.date} · {note.user}</p>
                  <p className="text-sm">{note.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            <button onClick={() => setNewNote("")} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium">Add</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Order List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg md:text-xl">Order Management</h2>
        <button onClick={exportCSV} className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        {[
          { key: "", label: "All", count: statusCounts.all },
          { key: "pending", label: "Pending", count: statusCounts.pending },
          { key: "processing", label: "Processing", count: statusCounts.processing },
          { key: "shipped", label: "Shipped", count: statusCounts.shipped },
          { key: "completed", label: "Completed", count: statusCounts.completed },
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
          <button onClick={() => handleBulkStatusChange("processing")} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary">→ Processing</button>
          <button onClick={() => handleBulkStatusChange("shipped")} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary">→ Shipped</button>
          <button onClick={() => handleBulkStatusChange("completed")} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary">→ Completed</button>
          <button onClick={exportCSV} className="px-3 py-1.5 border border-border rounded-sm text-xs font-medium hover:bg-secondary flex items-center gap-1"><Download className="h-3 w-3" /> Export</button>
          <button onClick={() => setSelectedOrders(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          )}
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {filtered.map((o) => {
            const status = getStatus(o.id, o.status);
            const isExpanded = expandedOrder === o.id;
            return (
              <div key={o.id} className="border border-border rounded-md overflow-hidden">
                <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className="w-full p-3 text-left flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{o.id}</span>
                      <span className={statusStyles[status]}>{status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{o.customer}</p>
                    <p className="text-sm font-bold mt-0.5">C${o.total.toFixed(2)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 bg-secondary/30">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Email</span><span>{o.email}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Payment</span><span>{o.payment}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date</span><span>{o.date}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Items</span><span>{o.items}</span></div>
                    {o.trackingNumber && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tracking</span><span className="font-mono">{o.trackingNumber}</span></div>}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setSelectedOrder(o)} className="flex-1 btn-accent text-xs py-2 rounded-sm font-medium">View Details</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2 w-8">
                  <input type="checkbox" checked={selectedOrders.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded-sm border-border accent-accent" />
                </th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => {
                const status = getStatus(order.id, order.status);
                return (
                  <tr key={order.id} className={`hover:bg-secondary/50 transition-colors ${selectedOrders.has(order.id) ? "bg-accent/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded-sm border-border accent-accent" />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-sm">{order.id}</td>
                    <td className="px-3 py-2.5 text-sm truncate max-w-[200px]">{order.customer}</td>
                    <td className="px-3 py-2.5 font-medium text-sm">C${order.total.toFixed(2)}</td>
                    <td className="px-3 py-2.5"><span className={statusStyles[status]}>{status}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{order.date}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {status === "processing" && (
                          <button onClick={() => setShowShipment(order.id)} className="p-1.5 hover:bg-secondary rounded-sm transition-colors text-accent" title="Ship"><Truck className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => setSelectedOrder(order)} className="p-1.5 hover:bg-secondary rounded-sm transition-colors" title="View"><Eye className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline shipment form */}
        {showShipment && !selectedOrder && (
          <div className="mt-4 p-4 border border-accent/30 rounded-sm bg-accent/5">
            <h4 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-1.5"><Truck className="h-4 w-4 text-accent" /> Ship Order {showShipment}</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <select value={shipmentCarrier} onChange={(e) => setShipmentCarrier(e.target.value)} className="px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none">
                {carriers.map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={shipmentTracking} onChange={(e) => setShipmentTracking(e.target.value)} placeholder="Tracking number..." className="px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono" />
              <div className="flex gap-2">
                <button onClick={() => handleShipOrder(showShipment)} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex-1">Ship</button>
                <button onClick={() => setShowShipment(null)} className="px-3 py-2 border border-border rounded-sm text-sm hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No orders found.</div>}
      </div>
    </div>
  );
}

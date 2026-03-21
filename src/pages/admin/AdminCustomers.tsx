import React, { useState } from "react";
import { Eye, Search, X, Mail, Phone, ChevronDown, ChevronUp, ArrowLeft, ShoppingBag, MapPin, FileText, Tag, Edit, Ban, CheckCircle, Plus } from "lucide-react";

const customers = [
  { id: "cust-1", company: "Groupe Transport Lévis", name: "Jean-Pierre Lavoie", email: "jp@gtl.ca", phone: "+1 418 555 0101", orders: 12, totalSpent: 28400, lastOrder: "2026-03-10", type: "Wholesale", status: "active", joined: "2025-06-15",
    address: { street: "456 Route de la Traverse", city: "Lévis", province: "QC", postal: "G6V 6N2" },
    taxId: "QC-12345678",
    recentOrders: [
      { id: "RMQ-001234", date: "2026-03-10", total: 2450.00, status: "processing", items: 4 },
      { id: "RMQ-001220", date: "2026-02-28", total: 1890.00, status: "completed", items: 3 },
      { id: "RMQ-001198", date: "2026-02-15", total: 3200.00, status: "completed", items: 6 },
    ],
    notes: [{ date: "2026-03-01", user: "Marc Dupont", text: "Approved for 30-day net payment terms" }, { date: "2025-06-15", user: "System", text: "Account created" }] },
  { id: "cust-2", company: "Fleet Services Ontario", name: "Sarah Mitchell", email: "sarah@fso.com", phone: "+1 416 555 0202", orders: 8, totalSpent: 15200, lastOrder: "2026-03-09", type: "Wholesale", status: "active", joined: "2025-08-20",
    address: { street: "789 Industrial Pkwy", city: "Toronto", province: "ON", postal: "M3J 2P1" },
    taxId: "ON-87654321",
    recentOrders: [
      { id: "RMQ-001233", date: "2026-03-09", total: 1890.50, status: "shipped", items: 2 },
      { id: "RMQ-001210", date: "2026-02-22", total: 2100.00, status: "completed", items: 5 },
    ],
    notes: [{ date: "2025-08-20", user: "System", text: "Account created" }] },
  { id: "cust-3", company: "Québec Truck Parts Inc.", name: "Marc Tremblay", email: "marc@qtp.ca", phone: "+1 418 555 0303", orders: 22, totalSpent: 54800, lastOrder: "2026-03-08", type: "Distributor", status: "active", joined: "2025-04-10",
    address: { street: "123 Rue du Commerce", city: "Québec", province: "QC", postal: "G1K 7P4" },
    taxId: "QC-99887766",
    recentOrders: [
      { id: "RMQ-001232", date: "2026-03-08", total: 3200.00, status: "completed", items: 8 },
      { id: "RMQ-001215", date: "2026-02-25", total: 4500.00, status: "completed", items: 12 },
    ],
    notes: [{ date: "2026-01-15", user: "Julie Martin", text: "Upgraded to Distributor tier" }, { date: "2025-04-10", user: "System", text: "Account created" }] },
  { id: "cust-4", company: "Maritime Heavy Hauling", name: "David Fraser", email: "david@mhh.ca", phone: "+1 506 555 0404", orders: 5, totalSpent: 8900, lastOrder: "2026-03-08", type: "Fleet", status: "active", joined: "2025-10-01",
    address: { street: "321 Harbour Rd", city: "Saint John", province: "NB", postal: "E2L 4Z6" },
    taxId: "",
    recentOrders: [
      { id: "RMQ-001231", date: "2026-03-08", total: 675.00, status: "pending", items: 1 },
    ],
    notes: [{ date: "2025-10-01", user: "System", text: "Account created" }] },
  { id: "cust-5", company: "Prairie Fleet Maintenance", name: "Lisa Chen", email: "lisa@pfm.ca", phone: "+1 306 555 0505", orders: 15, totalSpent: 32100, lastOrder: "2026-03-07", type: "Fleet", status: "active", joined: "2025-05-20",
    address: { street: "555 Main St W", city: "Saskatoon", province: "SK", postal: "S7M 0W6" },
    taxId: "SK-11223344",
    recentOrders: [
      { id: "RMQ-001230", date: "2026-03-07", total: 1120.00, status: "completed", items: 3 },
      { id: "RMQ-001205", date: "2026-02-18", total: 2890.00, status: "completed", items: 7 },
    ],
    notes: [{ date: "2026-02-01", user: "Marc Dupont", text: "Loyal customer - consider tier upgrade" }, { date: "2025-05-20", user: "System", text: "Account created" }] },
  { id: "cust-6", company: "Atlantic Parts & Service", name: "Robert Murphy", email: "rob@aps.ca", phone: "+1 902 555 0707", orders: 2, totalSpent: 1450, lastOrder: "2026-01-20", type: "Fleet", status: "inactive", joined: "2025-11-15",
    address: { street: "99 Harbour Dr", city: "Halifax", province: "NS", postal: "B3H 2Y8" },
    taxId: "",
    recentOrders: [
      { id: "RMQ-001150", date: "2026-01-20", total: 850.00, status: "completed", items: 2 },
    ],
    notes: [{ date: "2026-02-20", user: "System", text: "Marked inactive - no activity 30+ days" }] },
];

const statusStyles: Record<string, string> = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-info",
  completed: "badge-success",
  active: "badge-success",
  inactive: "badge-warning",
};

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [newNote, setNewNote] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    type: "Fleet",
    street: "",
    city: "",
    province: "QC",
    postal: "",
    taxId: "",
  });

  const filtered = customers.filter((c) => {
    const matchesSearch = !search || c.company.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeCounts = {
    Wholesale: customers.filter(c => c.type === "Wholesale").length,
    Distributor: customers.filter(c => c.type === "Distributor").length,
    Fleet: customers.filter(c => c.type === "Fleet").length,
  };

  // ── Customer Detail ──
  if (selectedCustomer) {
    const c = selectedCustomer;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCustomer(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg md:text-xl">{c.company}</h2>
              <span className={statusStyles[c.status]}>{c.status}</span>
              <span className="badge-info">{c.type}</span>
            </div>
            <p className="text-sm text-muted-foreground">{c.name} · Member since {c.joined}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button className="px-3 py-2 border border-border rounded-sm text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button className="px-3 py-2 border border-destructive text-destructive rounded-sm text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" /> Deactivate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-xl font-bold font-display">{c.orders}</p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold font-display">C${c.totalSpent.toLocaleString()}</p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Avg. Order Value</p>
            <p className="text-xl font-bold font-display">C${c.orders > 0 ? Math.round(c.totalSpent / c.orders).toLocaleString() : 0}</p>
          </div>
          <div className="dashboard-card">
            <p className="text-xs text-muted-foreground">Last Order</p>
            <p className="text-xl font-bold font-display">{c.lastOrder}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Order History */}
          <div className="lg:col-span-2 dashboard-card">
            <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Order History</h3>
            <div className="space-y-2">
              {c.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.date} · {order.items} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusStyles[order.status]}>{order.status}</span>
                    <span className="text-sm font-medium">C${order.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3">Contact</h3>
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-accent hover:underline mb-2"><Mail className="h-3.5 w-3.5" /> {c.email}</a>
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</a>
            </div>

            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address</h3>
              <p className="text-sm">{c.address.street}</p>
              <p className="text-sm">{c.address.city}, {c.address.province} {c.address.postal}</p>
            </div>

            {c.taxId && (
              <div className="dashboard-card">
                <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tax ID</h3>
                <p className="text-sm font-mono">{c.taxId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Notes</h3>
          <div className="space-y-3 mb-4">
            {c.notes.map((note, i) => (
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
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
            <button onClick={() => setNewNote("")} className="btn-accent px-4 py-2 rounded-sm text-sm font-medium">Add</button>
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

          <form onSubmit={(e) => {
            e.preventDefault();
            // Handle form submission - will connect to backend
            console.log("[v0] Create customer:", newCustomer);
            setNewCustomer({ company: "", name: "", email: "", phone: "", type: "Fleet", street: "", city: "", province: "QC", postal: "", taxId: "" });
            setShowCreateModal(false);
          }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                  placeholder="e.g., Acme Transport"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium mb-1.5">Customer Type *</label>
                <select
                  value={newCustomer.type}
                  onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="Fleet">Fleet</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Distributor">Distributor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Tax ID</label>
                <input
                  type="text"
                  value={newCustomer.taxId}
                  onChange={(e) => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
                  placeholder="e.g., QC-12345678"
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Address</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Street Address</label>
                  <input
                    type="text"
                    value={newCustomer.street}
                    onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })}
                    placeholder="e.g., 123 Industrial Way"
                    className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">City</label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="e.g., Toronto"
                    className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Province</label>
                  <select
                    value={newCustomer.province}
                    onChange={(e) => setNewCustomer({ ...newCustomer, province: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="ON">Ontario (ON)</option>
                    <option value="QC">Quebec (QC)</option>
                    <option value="BC">British Columbia (BC)</option>
                    <option value="AB">Alberta (AB)</option>
                    <option value="MB">Manitoba (MB)</option>
                    <option value="SK">Saskatchewan (SK)</option>
                    <option value="NS">Nova Scotia (NS)</option>
                    <option value="NB">New Brunswick (NB)</option>
                    <option value="PE">Prince Edward Island (PE)</option>
                    <option value="NL">Newfoundland (NL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Postal Code</label>
                  <input
                    type="text"
                    value={newCustomer.postal}
                    onChange={(e) => setNewCustomer({ ...newCustomer, postal: e.target.value })}
                    placeholder="e.g., M3J 2P1"
                    className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn-accent px-6 py-2 rounded-sm text-sm font-medium">Create Customer</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg md:text-xl">Customer CRM</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> New Customer
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Total Customers</p>
          <p className="text-xl md:text-2xl font-bold font-display">{customers.length}</p>
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
            className={`dashboard-card text-left transition-colors ${typeFilter === type ? "border-accent" : "hover:border-muted-foreground"}`}
          >
            <p className="text-xs md:text-sm text-muted-foreground">{type}</p>
            <p className="text-xl md:text-2xl font-bold font-display">{count}</p>
          </button>
        ))}
      </div>

      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {(search || typeFilter) && (
            <button onClick={() => { setSearch(""); setTypeFilter(""); }} className="text-xs text-accent hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {filtered.map((c) => {
            const isExpanded = expandedCustomer === c.id;
            return (
              <div key={c.id} className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedCustomer(isExpanded ? null : c.id)}
                  className="w-full p-3 text-left flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{c.company}</span>
                      <span className="badge-info flex-shrink-0">{c.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.name}</p>
                    <p className="text-sm font-bold mt-1">C${c.totalSpent.toLocaleString()}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-2 bg-secondary/30">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-accent"><Mail className="h-3 w-3" /> {c.email}</a>
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-accent"><Phone className="h-3 w-3" /> {c.phone}</a>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-medium">{c.orders}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Last Order</span>
                      <span>{c.lastOrder}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className={statusStyles[c.status]}>{c.status}</span>
                    </div>
                    <button onClick={() => setSelectedCustomer(c)} className="w-full btn-accent text-xs py-2 rounded-sm font-medium mt-2">View Profile</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2">Company</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Orders</th>
                <th className="text-right px-3 py-2">Total Spent</th>
                <th className="text-left px-3 py-2">Last Order</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-3 py-3 font-medium">{c.company}</td>
                  <td className="px-3 py-3">
                    <div>{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-3 py-3"><span className="badge-info">{c.type}</span></td>
                  <td className="px-3 py-3"><span className={statusStyles[c.status]}>{c.status}</span></td>
                  <td className="px-3 py-3 text-right">{c.orders}</td>
                  <td className="px-3 py-3 text-right font-medium">C${c.totalSpent.toLocaleString()}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.lastOrder}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => setSelectedCustomer(c)} className="p-1.5 hover:bg-secondary rounded-sm transition-colors"><Eye className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No customers found.</div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Package, Search, Filter, Calendar, ChevronDown, ChevronUp, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { products } from "@/config/products";
import { AdminPageError } from "@/components/admin/AdminPageState";

type LogType = "in" | "out" | "transfer" | "adjustment" | "return";

interface StockLog {
  id: string;
  date: string;
  type: LogType;
  quantity: number;
  reference: string;
  warehouse: string;
  note: string;
  user: string;
  balanceAfter: number;
}

const logTypeConfig: Record<LogType, { label: string; icon: React.ElementType; className: string }> = {
  in: { label: "Stock In", icon: ArrowDownToLine, className: "text-green-600 bg-green-500/10" },
  out: { label: "Stock Out", icon: ArrowUpFromLine, className: "text-red-500 bg-red-500/10" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, className: "text-blue-500 bg-blue-500/10" },
  adjustment: { label: "Adjustment", icon: RotateCcw, className: "text-amber-500 bg-amber-500/10" },
  return: { label: "Return", icon: RotateCcw, className: "text-purple-500 bg-purple-500/10" },
};

function generateLogs(productId: string, currentStock: number): StockLog[] {
  const refs = [
    { type: "in" as LogType, ref: "PO-2024-0891", note: "Supplier shipment received", user: "Marc Dupont" },
    { type: "out" as LogType, ref: "ORD-7823", note: "Customer order fulfilled", user: "System" },
    { type: "out" as LogType, ref: "ORD-7801", note: "Customer order fulfilled", user: "System" },
    { type: "in" as LogType, ref: "PO-2024-0876", note: "Restocking from manufacturer", user: "Marc Dupont" },
    { type: "transfer" as LogType, ref: "TRF-0234", note: "Transfer QC-01 → ON-01", user: "Julie Martin" },
    { type: "out" as LogType, ref: "ORD-7756", note: "Wholesale order shipped", user: "System" },
    { type: "adjustment" as LogType, ref: "ADJ-0112", note: "Physical count correction", user: "Marc Dupont" },
    { type: "return" as LogType, ref: "RET-0089", note: "Customer return - defective", user: "Julie Martin" },
    { type: "in" as LogType, ref: "PO-2024-0845", note: "Bulk supplier delivery", user: "Marc Dupont" },
    { type: "out" as LogType, ref: "ORD-7702", note: "Customer order fulfilled", user: "System" },
    { type: "out" as LogType, ref: "ORD-7688", note: "B2B order dispatched", user: "System" },
    { type: "transfer" as LogType, ref: "TRF-0221", note: "Transfer QC-02 → QC-01", user: "Julie Martin" },
    { type: "in" as LogType, ref: "PO-2024-0812", note: "Scheduled restock", user: "Marc Dupont" },
    { type: "out" as LogType, ref: "ORD-7654", note: "Customer order fulfilled", user: "System" },
    { type: "adjustment" as LogType, ref: "ADJ-0098", note: "Damaged goods write-off", user: "Marc Dupont" },
  ];

  let balance = currentStock;
  const logs: StockLog[] = [];
  const warehouses = ["QC-01", "QC-02", "ON-01"];
  const baseDate = new Date(2025, 2, 15);

  for (let i = 0; i < refs.length; i++) {
    const entry = refs[i];
    const qty = entry.type === "adjustment" ? (i % 2 === 0 ? -3 : 5) :
      entry.type === "return" ? Math.floor(Math.random() * 5) + 1 :
      Math.floor(Math.random() * 30) + 5;

    const d = new Date(baseDate);
    d.setDate(d.getDate() - i * 2 - Math.floor(Math.random() * 3));

    logs.push({
      id: `log-${productId}-${i}`,
      date: d.toISOString(),
      type: entry.type,
      quantity: entry.type === "out" ? -qty : qty,
      reference: entry.ref,
      warehouse: warehouses[i % 3],
      note: entry.note,
      user: entry.user,
      balanceAfter: balance,
    });

    balance -= (entry.type === "out" ? -qty : qty);
  }

  return logs;
}

export default function AdminProductLogs() {
  const { productId } = useParams();
  const product = products.find((p) => p.id === productId);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const logs = useMemo(() => product ? generateLogs(product.id, product.stock) : [], [product]);

  const filtered = useMemo(() =>
    logs.filter((l) => {
      const matchSearch = !search || l.reference.toLowerCase().includes(search.toLowerCase()) || l.note.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || l.type === typeFilter;
      return matchSearch && matchType;
    }), [logs, search, typeFilter]);

  const totalIn = logs.filter((l) => l.quantity > 0).reduce((s, l) => s + l.quantity, 0);
  const totalOut = logs.filter((l) => l.quantity < 0).reduce((s, l) => s + Math.abs(l.quantity), 0);

  if (!product) {
    return (
      <AdminPageError
        message="Product not found."
        extra={
          <Link to="/admin/products" className="text-accent hover:underline text-sm">
            ← Back to Products
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link to="/admin/products" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 self-start">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <img src={product.image} alt="" className="w-12 h-12 rounded-sm object-cover bg-secondary flex-shrink-0" />
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl">{product.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{product.sku} · Current Stock: <span className="font-bold text-foreground">{product.stock}</span></p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Total Movements</p>
          <p className="text-xl font-bold font-display">{logs.length}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-muted-foreground">Total In</p>
          </div>
          <p className="text-xl font-bold font-display text-green-600">+{totalIn}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground">Total Out</p>
          </div>
          <p className="text-xl font-bold font-display text-red-500">-{totalOut}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-xs text-muted-foreground">Net Change</p>
          <p className={`text-xl font-bold font-display ${totalIn - totalOut >= 0 ? "text-green-600" : "text-red-500"}`}>
            {totalIn - totalOut >= 0 ? "+" : ""}{totalIn - totalOut}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or note..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none w-full sm:w-auto"
          >
            <option value="all">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="transfer">Transfer</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
          </select>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">No logs found.</p>
          )}
          {filtered.map((log) => {
            const config = logTypeConfig[log.type];
            const Icon = config.icon;
            const isExpanded = expandedLog === log.id;
            return (
              <div key={log.id} className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full p-3 text-left flex items-center gap-3"
                >
                  <div className={`p-2 rounded-sm flex-shrink-0 ${config.className}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className={`text-sm font-bold ${log.quantity > 0 ? "text-green-600" : "text-red-500"}`}>
                        {log.quantity > 0 ? "+" : ""}{log.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.reference} · {new Date(log.date).toLocaleDateString()}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 bg-secondary/30 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Warehouse</span>
                      <span>{log.warehouse}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Balance After</span>
                      <span className="font-medium">{log.balanceAfter}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">User</span>
                      <span>{log.user}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span>{new Date(log.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="pt-1.5 border-t border-border mt-1.5">
                      <p className="text-xs text-muted-foreground">{log.note}</p>
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
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Reference</th>
                <th className="text-right px-3 py-2">Quantity</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="text-left px-3 py-2">Warehouse</th>
                <th className="text-left px-3 py-2">Note</th>
                <th className="text-left px-3 py-2">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => {
                const config = logTypeConfig[log.type];
                const Icon = config.icon;
                return (
                  <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(log.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium ${config.className}`}>
                        <Icon className="h-3 w-3" /> {config.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{log.reference}</td>
                    <td className={`px-3 py-3 text-right font-bold ${log.quantity > 0 ? "text-green-600" : "text-red-500"}`}>
                      {log.quantity > 0 ? "+" : ""}{log.quantity}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{log.balanceAfter}</td>
                    <td className="px-3 py-3">{log.warehouse}</td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[200px] truncate">{log.note}</td>
                    <td className="px-3 py-3 text-muted-foreground">{log.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">No logs found.</p>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Showing {filtered.length} of {logs.length} entries
        </div>
      </div>
    </div>
  );
}
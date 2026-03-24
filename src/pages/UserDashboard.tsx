import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, unwrapApiList, type Order } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Navigate } from 'react-router-dom';
import {
  Package, TrendingUp, MapPin, Clock, Phone, Mail, LogOut,
  Settings, User, ShoppingBag, Download, Printer, AlertCircle, CheckCircle, MessageSquareText,
  Loader, ChevronRight, Archive, Box, Truck, ShieldCheck, X
} from 'lucide-react';

interface UserOrder {
  id: string;
  order_number: string;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  created_at: string;
  items_count: number;
  tracking_number?: string;
  estimated_delivery_date?: string;
}

interface AdminContact {
  id: string;
  name: string;
  user_id: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  specialization?: string;
  available: boolean;
}

interface CustomerNoteRow {
  id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
}

export default function UserDashboard() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [adminContacts, setAdminContacts] = useState<AdminContact[]>([]);
  const [notes, setNotes] = useState<CustomerNoteRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'contacts' | 'notes' | 'settings'>('orders');

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const shouldRedirect = !isAuthenticated || !user;

  // Load user orders
  useEffect(() => {
    if (shouldRedirect) return;
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        const response = await api.getUserOrders(1, 50);
        const rows = unwrapApiList<Record<string, unknown>>(response as any, []);
        setOrders(
          rows.map((o) => ({
            id: String(o.id ?? ''),
            order_number: String(o.order_number ?? ''),
            total: Number(o.total ?? 0),
            status: (o.status as UserOrder['status']) || 'pending',
            created_at: String(o.created_at ?? ''),
            items_count: Number(o.items_count ?? 0),
            tracking_number: o.tracking_number != null ? String(o.tracking_number) : undefined,
            estimated_delivery_date:
              o.estimated_delivery_date != null ? String(o.estimated_delivery_date) : undefined,
          }))
        );
      } catch {
        // Failed to load orders
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [shouldRedirect]);

  // Load admin contacts
  useEffect(() => {
    if (shouldRedirect) return;
    const fetchContacts = async () => {
      try {
        setContactsLoading(true);
        const response = await api.getAdminContacts();
        const items = unwrapApiList<Record<string, unknown>>(response as any, []);
        setAdminContacts(
          items.map((c) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? 'Support'),
            user_id: '',
            position: String(c.specialization ?? c.department ?? ''),
            department: String(c.department ?? ''),
            phone: String(c.phone ?? ''),
            email: String(c.email ?? ''),
            specialization: c.specialization != null ? String(c.specialization) : undefined,
            available: Boolean(c.is_available ?? true),
          }))
        );
      } catch {
        // Failed to load admin contacts
      } finally {
        setContactsLoading(false);
      }
    };

    fetchContacts();
  }, [shouldRedirect]);

  // Load portal-visible notes
  useEffect(() => {
    if (shouldRedirect) return;
    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const response = await api.getUserNotes(1, 50);
        const items = unwrapApiList<CustomerNoteRow>(response as any, []);
        setNotes(items.map((n) => ({
          id: String(n.id ?? ''),
          note: String(n.note ?? ''),
          is_internal: Boolean(n.is_internal ?? false),
          created_at: String(n.created_at ?? ''),
        })));
      } catch {
        // Failed to load notes
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
  }, [shouldRedirect]);

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'confirmed':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  function toNumber(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });
  }

  async function openReceipt(orderId: string) {
    setReceiptOpen(true);
    setReceiptLoading(true);
    setReceiptError(null);
    setReceipt(null);
    try {
      const res = await api.getUserOrderReceipt(orderId);
      setReceipt(res.data as Order);
    } catch (e) {
      setReceiptError(e instanceof Error ? e.message : 'Failed to load receipt');
    } finally {
      setReceiptLoading(false);
    }
  }

  function buildReceiptHtml(order: Order): string {
    const items = (order.items ?? []).map((it: any) => {
      const productName = it.product_name ?? it.productName ?? it.name ?? 'Item';
      const displaySku = it.product_sku ?? it.sku ?? '';
      const qty = toNumber(it.quantity);
      const unitPrice = toNumber(it.unit_price ?? it.unitPrice);
      const lineSubtotal = toNumber(it.subtotal ?? it.line_total ?? (qty * unitPrice));
      return {
        productName: escapeHtml(productName),
        displaySku: escapeHtml(displaySku),
        qty,
        unitPrice,
        lineSubtotal,
      };
    });

    const subtotal = toNumber((order as any).subtotal);
    const taxAmount = toNumber((order as any).tax_amount);
    const shippingAmount = toNumber((order as any).shipping_amount);
    const discountAmount = toNumber((order as any).discount_amount);
    const totalAmount = toNumber((order as any).total_amount);

    const notes = (order as any).notes ? escapeHtml((order as any).notes) : '';
    const shippingAddress = (order as any).shipping_address ? escapeHtml((order as any).shipping_address) : '';
    const paymentStatus = (order as any).payment_status ?? '';

    const rowsHtml = items
      .map((i) => {
        const skuLine = i.displaySku ? `<div style="font-size:12px;color:#6b7280;">${i.displaySku}</div>` : '';
        return `
          <tr>
            <td style="padding:16px 8px; border-bottom:1px solid #eef2f7;">
              <div style="font-weight:700; text-transform:uppercase; font-size:13px; letter-spacing:-0.01em;">${i.productName}</div>
              ${skuLine}
            </td>
            <td style="padding:16px 8px; border-bottom:1px solid #eef2f7; text-align:right; font-weight:600;">${i.qty}</td>
            <td style="padding:16px 8px; border-bottom:1px solid #eef2f7; text-align:right;">${i.unitPrice.toFixed(2)}</td>
            <td style="padding:16px 8px; border-bottom:1px solid #eef2f7; text-align:right; font-weight:700;">${i.lineSubtotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Procurement Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; color:#0c0c0c; padding:40px; background:#fff; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; border-bottom:4px solid #000; padding-bottom:20px; }
            .badge { background:#000; color:#fff; padding:4px 8px; font-size:10px; font-weight:800; border-radius:4px; text-transform:uppercase; letter-spacing:0.1em; }
            h1 { margin:0; font-size:24px; font-weight:800; text-transform:uppercase; letter-spacing:-0.03em; }
            .meta { font-size:12px; color:#666; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px; }
            table { width:100%; border-collapse:collapse; margin:20px 0; }
            th { text-align:left; font-size:11px; color:#000; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; border-bottom:2px solid #000; padding:12px 8px; }
            .totals-container { margin-top:30px; display:flex; justify-content:flex-end; }
            .totals-box { width:300px; background:#f9f9f9; padding:20px; border-radius:12px; border:1px solid #eee; }
            .row { display:flex; justify-content:space-between; padding:8px 0; font-size:13px; font-weight:600; }
            .row.grand { border-top:2px solid #000; margin-top:10px; padding-top:15px; font-size:18px; font-weight:800; }
            .box { margin-top:20px; padding:20px; border:1px solid #eee; border-radius:12px; background:#fefefe; }
            .box-title { font-size:11px; font-weight:800; text-transform:uppercase; color:#000; margin-bottom:10px; letter-spacing:0.1em; }
            @media print { body { padding:0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="badge">Authorization Confirmed</div>
              <h1>Remquip Procurement</h1>
              <div class="meta">ID: ${escapeHtml(order.order_number)}</div>
              <div class="meta">Sequence: ${escapeHtml((order as any).order_date ?? '')}</div>
            </div>
            <div style="text-align:right;">
               <div class="meta">Status: <span style="color:#000;">${escapeHtml((order as any).status ?? '').toUpperCase()}</span></div>
               <div class="meta">Payment: <span style="color:#000;">${escapeHtml(paymentStatus).toUpperCase()}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Manifest Item</th>
                <th style="text-align:right;">Units</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Line Net</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="4" style="padding:24px; text-align:center; color:#999;">No data</td></tr>`}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="totals-box">
              <div class="row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div class="row"><span>Logistics (Tax)</span><span>${taxAmount.toFixed(2)}</span></div>
              <div class="row"><span>Transit (Ship)</span><span>${shippingAmount.toFixed(2)}</span></div>
              <div class="row"><span>Adjustments</span><span>${discountAmount > 0 ? '-' : ''}${discountAmount.toFixed(2)}</span></div>
              <div class="row grand"><span>TOTAL CAD</span><span>${totalAmount.toFixed(2)}</span></div>
            </div>
          </div>

          ${shippingAddress ? `<div class="box"><div class="box-title">Shipping Protocol</div><div style="font-size:13px; line-height:1.6; color:#444; white-space:pre-wrap;">${shippingAddress}</div></div>` : ''}
          ${notes ? `<div class="box"><div class="box-title">Operational Notes</div><div style="font-size:13px; line-height:1.6; color:#444; white-space:pre-wrap;">${notes}</div></div>` : ''}
        </body>
      </html>`;
  }

  function printReceipt() {
    if (!receipt) return;
    const html = buildReceiptHtml(receipt);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader className="h-10 w-10 text-accent animate-spin mx-auto mb-6" />
          <p className="text-foreground text-xs font-display font-black uppercase tracking-[0.2em]">Authenticating Portal...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground lowercase-buttons">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--accent)/0.03),transparent_40%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 relative z-10">
        
        {/* Modern Portal Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-12 mb-16 border-b border-border pb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-accent/60" />
              <span className="font-display font-black uppercase tracking-[0.3em] text-[10px] text-accent"> Equipment Logistics Portal </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4">
              {t('nav.welcome')} — {(user.full_name || '').split(/\s+/)[0]}
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent/60" /> Verified Authorized Access: <span className="text-foreground">{user.email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="group flex items-center gap-4 px-8 py-4 rounded-2xl bg-muted/40 hover:bg-destructive hover:text-white transition-all text-sm font-display font-black uppercase tracking-widest border border-border/80 hover:border-destructive shadow-sm"
          >
            <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            {t('auth.logout') || 'Terminate Session'}
          </button>
        </header>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-2">
                {[
                    { id: 'orders', label: 'Order Pipeline', icon: Box },
                    { id: 'contacts', label: 'Fleet Support', icon: Phone },
                    { id: 'notes', label: 'Operational Notes', icon: MessageSquareText },
                    { id: 'settings', label: 'Personnel Profiles', icon: Settings }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl font-display font-black uppercase tracking-widest text-[11px] transition-all group ${
                            activeTab === tab.id 
                            ? 'bg-foreground text-background shadow-2xl translate-x-1' 
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <tab.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-accent' : 'text-muted-foreground/60'}`} />
                        {tab.label}
                    </button>
                ))}
            </aside>

            {/* Main Content Area */}
            <main className="lg:col-span-9 space-y-12">
                
                {activeTab === 'orders' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                { label: 'Active Manifests', value: orders.length, icon: Package, color: 'text-accent' },
                                { label: 'In Transit', value: orders.filter(o => o.status === 'shipped').length, icon: Truck, color: 'text-blue-500' },
                                { label: 'Inventory Settled', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle, color: 'text-success' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-card border border-border rounded-3xl p-8 shadow-sm group hover:border-accent/40 transition-colors">
                                    <div className="flex items-center justify-between mb-6">
                                        <stat.icon className={`h-6 w-6 ${stat.color} group-hover:scale-110 transition-transform`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                                    </div>
                                    <p className="text-4xl font-display font-black text-foreground">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Order List */}
                        <div className="space-y-6">
                            <h2 className="font-display font-black text-xl uppercase tracking-widest text-foreground/80 flex items-center gap-4">
                                <Box className="h-5 w-5 text-accent" /> Logistics Manifests
                                <div className="h-px flex-1 bg-border/60" />
                            </h2>

                            {ordersLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center bg-card border border-border/60 rounded-[2.5rem] border-dashed">
                                    <Loader className="h-10 w-10 text-accent animate-spin mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Indexing Sequence...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center bg-card border border-border/80 rounded-[2.5rem] text-center border-dashed">
                                    <Archive className="h-16 w-16 text-muted-foreground/30 mb-6" />
                                    <h3 className="font-display font-black text-lg uppercase tracking-widest mb-2">No Manifests Detected</h3>
                                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto mb-8">Initiate equipment procurement via the marketplace.</p>
                                    <Navigate to="/products" className="bg-foreground text-background px-8 py-4 rounded-xl font-display font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent transition-colors">Browse Stock</Navigate>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div key={order.id} className="group bg-card border border-border/60 rounded-3xl p-6 sm:p-8 hover:border-accent hover:shadow-2xl transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-2 py-1 rounded border border-accent/10">MANIFEST ID</span>
                                                        <p className="font-display font-black text-xl text-foreground tracking-tight">{order.order_number}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                        <span className="flex items-center gap-1.5"><Box className="h-3 w-3" /> {order.items_count} Product Units</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="text-left sm:text-right space-y-3">
                                                    <p className="text-2xl font-display font-black text-foreground tracking-tighter">{formatPrice(order.total)}</p>
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${getStatusBadgeStyles(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-8 flex flex-wrap gap-3 items-center pt-8 border-t border-border/40 relative z-10">
                                                {order.tracking_number && (
                                                    <div className="flex items-center gap-3 bg-muted/40 px-4 py-3 rounded-xl border border-border group/track">
                                                        <Truck className="h-4 w-4 text-accent/60 group-hover/track:scale-110 transition-transform" />
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Transit Code</p>
                                                            <p className="font-mono text-[10px] font-bold text-foreground">{order.tracking_number}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => openReceipt(order.id)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-foreground text-background hover:bg-accent transition-all text-[10px] font-display font-black uppercase tracking-widest shadow-lg"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    Internal Receipt
                                                </button>
                                                <button className="p-3.5 rounded-xl border border-border/80 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                                    <TrendingUp className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground mb-2">Fleet Operational Log</h2>
                            <p className="text-muted-foreground font-medium">Critical documentation and sequence logs for your equipment batches.</p>
                        </header>

                        {notesLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-card border border-border/60 rounded-[2.5rem] border-dashed">
                                <Loader className="h-10 w-10 text-accent animate-spin mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Retrieving Secure Logs...</p>
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="py-24 bg-muted/20 border border-border rounded-[2.5rem] border-dashed text-center">
                                <MessageSquareText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No log entries found for this personnel ID.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notes.map((n) => (
                                    <div key={n.id} className="bg-card border border-border/60 rounded-3xl p-8 hover:border-accent transition-colors shadow-sm">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Authorized Briefing</span>
                                                <p className="text-xs font-bold text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap pl-14">
                                            {n.note}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground mb-2">Support Liaison Network</h2>
                            <p className="text-muted-foreground font-medium">Direct communication channels to assigned logistics specialists.</p>
                        </header>

                        {contactsLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader className="h-10 w-10 text-accent animate-spin" />
                            </div>
                        ) : adminContacts.length === 0 ? (
                            <div className="py-24 bg-card border border-border rounded-[2.5rem] text-center border-dashed">
                                <Phone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Support network unavailable. Please use global contact terminal.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {adminContacts.map((contact) => (
                                    <div key={contact.id} className="group bg-card border border-border/60 rounded-3xl p-8 hover:border-accent hover:shadow-xl transition-all relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-muted border border-border p-1">
                                                    <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center relative">
                                                        <User className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
                                                        {contact.available && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-success border-4 border-card rounded-full shadow-lg pulse-green" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-display font-black text-lg uppercase tracking-tight text-foreground">{contact.name}</h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-1">{contact.department}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-6 border-t border-border/40">
                                            {contact.position && (
                                                <div className="flex items-center gap-3 text-xs font-bold text-foreground/80">
                                                    <ShieldCheck className="h-4 w-4 text-accent/60" />
                                                    {contact.position}
                                                </div>
                                            )}
                                            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl border border-transparent hover:border-accent hover:bg-card transition-all group/call">
                                                <Phone className="h-4 w-4 text-muted-foreground group-hover/call:text-accent transition-colors" />
                                                <span className="text-sm font-black tracking-tight">{contact.phone}</span>
                                            </a>
                                            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl border border-transparent hover:border-accent hover:bg-card transition-all group/mail">
                                                <Mail className="h-4 w-4 text-muted-foreground group-hover/mail:text-accent transition-colors" />
                                                <span className="text-sm font-black tracking-tight truncate">{contact.email}</span>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground mb-2">Personnel Profile Configuration</h2>
                            <p className="text-muted-foreground font-medium">Manage verified credentials and operational protocols.</p>
                        </header>

                        <div className="grid gap-8">
                            <div className="bg-card border border-border/60 rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-display font-black text-lg uppercase tracking-widest">Digital Identity</h3>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="group relative">
                                        <label className="absolute -top-3 left-4 bg-card px-2 text-[10px] font-display font-black uppercase tracking-widest text-muted-foreground transition-colors z-10">Electronic Mail</label>
                                        <input type="email" value={user.email} disabled className="w-full bg-muted/20 border-2 border-border/60 rounded-xl px-4 py-4 text-sm font-bold text-foreground opacity-60 cursor-not-allowed" />
                                    </div>
                                    <div className="group relative">
                                        <label className="absolute -top-3 left-4 bg-card px-2 text-[10px] font-display font-black uppercase tracking-widest text-muted-foreground transition-colors z-10">Full Legal Name</label>
                                        <input type="text" value={user.full_name || ''} disabled className="w-full bg-muted/20 border-2 border-border/60 rounded-xl px-4 py-4 text-sm font-bold text-foreground opacity-60 cursor-not-allowed" />
                                    </div>
                                    <div className="group relative">
                                        <label className="absolute -top-3 left-4 bg-card px-2 text-[10px] font-display font-black uppercase tracking-widest text-muted-foreground transition-colors z-10">First Name Identifier</label>
                                        <input type="text" value={user.first_name || ''} disabled className="w-full bg-muted/20 border-2 border-border/60 rounded-xl px-4 py-4 text-sm font-bold text-foreground opacity-60 cursor-not-allowed" />
                                    </div>
                                    <div className="group relative">
                                        <label className="absolute -top-3 left-4 bg-card px-2 text-[10px] font-display font-black uppercase tracking-widest text-muted-foreground transition-colors z-10">Last Name Identifier</label>
                                        <input type="text" value={user.last_name || ''} disabled className="w-full bg-muted/20 border-2 border-border/60 rounded-xl px-4 py-4 text-sm font-bold text-foreground opacity-60 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border/60 rounded-[2.5rem] p-8 sm:p-12 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="space-y-2">
                                    <h3 className="font-display font-black text-lg uppercase tracking-widest flex items-center gap-4">
                                        <MapPin className="h-5 w-5 text-accent" /> Logistics Nodes
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium">Configure primary delivery coordinates for fleet dispatch.</p>
                                </div>
                                <button className="bg-foreground text-background px-8 py-4 rounded-xl font-display font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent transition-colors shadow-lg active:scale-[0.98]">
                                    Modify Nodes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
      </div>

      {/* Receipt Modal - Modern Overlay */}
      {receiptOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-background border border-border/80 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col scale-in-center">
            
            {/* Modal Header */}
            <header className="flex items-center justify-between p-8 border-b border-border bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white">
                    <Box className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-display font-black text-xl uppercase tracking-tighter">Manifest Receipt</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-1">
                      {receipt?.order_number ? `#${receipt.order_number}` : 'Analyzing Manifest...'}
                    </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptOpen(false)}
                className="w-12 h-12 rounded-2xl bg-muted/50 hover:bg-destructive hover:text-white transition-all flex items-center justify-center group"
              >
                <X className="h-6 w-6 group-hover:rotate-90 transition-transform" />
              </button>
            </header>

            {/* Modal Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 scrollbar-thin scrollbar-thumb-accent">
              {receiptLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader className="h-12 w-12 text-accent animate-spin mb-6" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Interpolating Data Layers...</p>
                </div>
              ) : receiptError ? (
                <div className="text-center py-20 px-4">
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
                  <h4 className="font-display font-black text-xl mb-3">Protocol Interrupted</h4>
                  <p className="text-muted-foreground font-medium mb-8 max-w-xs mx-auto">{receiptError}</p>
                  <button
                    onClick={() => receipt?.id && openReceipt(receipt.id)}
                    className="bg-foreground text-background px-10 py-4 rounded-xl font-display font-black uppercase tracking-widest text-[10px] hover:bg-accent transition-colors"
                  >
                    Retry Handshake
                  </button>
                </div>
              ) : receipt ? (
                <div className="space-y-12">
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div className="bg-muted/30 p-8 rounded-3xl border border-border/80">
                         <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-4 block">Manifest Temporal Data</span>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground uppercase tracking-widest">Launch Date</span>
                                <span className="font-black">{receipt.order_date ? new Date(receipt.order_date).toLocaleDateString() : '—'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground uppercase tracking-widest">Protocol Status</span>
                                <span className={`font-black uppercase tracking-widest px-3 py-1 rounded bg-accent/10 border border-accent/20 text-accent`}>{receipt.status}</span>
                            </div>
                         </div>
                    </div>
                    <div className="bg-muted/30 p-8 rounded-3xl border border-border/80">
                         <span className="text-[9px] font-black uppercase tracking-widest text-accent mb-4 block">Financial Layer</span>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground uppercase tracking-widest">Settlement Code</span>
                                <span className="font-black uppercase tracking-widest">{(receipt as any).payment_status ?? 'PENDING'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground uppercase tracking-widest">Gateway</span>
                                <span className="font-black uppercase tracking-widest">STRIPE CONCIERGE</span>
                            </div>
                         </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-display font-black text-lg uppercase tracking-widest flex items-center gap-4">
                        <Box className="h-5 w-5 text-accent" /> Units Manifest
                        <div className="h-px flex-1 bg-border/60" />
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-foreground">
                            <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest">Equipment Unit</th>
                            <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest">Qty</th>
                            <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest">Unit Rate</th>
                            <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest">Extended Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {(receipt.items ?? []).map((it: any) => {
                            const productName = it.product_name ?? it.productName ?? it.name ?? 'Item';
                            const productSku = it.product_sku ?? it.sku ?? '';
                            const qty = toNumber(it.quantity);
                            const unitPrice = toNumber(it.unit_price ?? it.unitPrice);
                            const lineSubtotal = toNumber(it.subtotal ?? it.line_total ?? (qty * unitPrice));
                            return (
                              <tr key={it.id ?? `${productName}-${qty}-${unitPrice}`} className="group/row hover:bg-accent/5 transition-colors">
                                <td className="py-6 pr-4">
                                  <div className="font-display font-black text-sm uppercase tracking-tight group-hover/row:text-accent transition-colors">{productName}</div>
                                  {productSku && <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-60 uppercase">{productSku}</div>}
                                </td>
                                <td className="py-6 px-4 text-right font-black">{qty}</td>
                                <td className="py-6 px-4 text-right font-medium text-muted-foreground">{formatPrice(unitPrice)}</td>
                                <td className="py-6 pl-4 text-right font-black text-foreground">{formatPrice(lineSubtotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-8 border-t-2 border-foreground">
                    <div className="w-full sm:w-72 space-y-4">
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                           <span>Sub-Total</span>
                           <span className="text-foreground">{formatPrice(toNumber((receipt as any).subtotal))}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                           <span>Logistics (Tax)</span>
                           <span className="text-foreground">{formatPrice(toNumber((receipt as any).tax_amount))}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                           <span>Transit (Ship)</span>
                           <span className="text-foreground">{formatPrice(toNumber((receipt as any).shipping_amount))}</span>
                       </div>
                       <div className="flex justify-between pt-6 border-t border-border">
                           <span className="font-display font-black uppercase tracking-tighter text-2xl">Total CAD</span>
                           <span className="font-display font-black uppercase tracking-tighter text-2xl text-accent">{formatPrice(toNumber((receipt as any).total_amount))}</span>
                       </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <footer className="p-8 border-t border-border flex items-center justify-end gap-4 bg-muted/20">
              <button
                onClick={printReceipt}
                disabled={!receipt}
                className="group flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-foreground text-background font-display font-black uppercase tracking-widest text-[10px] hover:bg-accent hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" />
                Hard Copy Print
              </button>
              <button
                 onClick={printReceipt}
                 disabled={!receipt}
                 className="group flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-xl border border-border hover:bg-muted font-display font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
              >
                <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                Save Manifest PDF
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

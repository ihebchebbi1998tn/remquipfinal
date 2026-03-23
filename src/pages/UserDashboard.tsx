import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, unwrapApiList, type Order } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Navigate } from 'react-router-dom';
import {
  Package, TrendingUp, MapPin, Clock, Phone, Mail, LogOut,
  Settings, User, ShoppingBag, Download, Printer, AlertCircle, CheckCircle, MessageSquareText,
  Loader, ChevronRight, Archive
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

  // Load portal-visible notes (is_internal = 0)
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            <td style="padding:10px 8px;">
              <div style="font-weight:600;">${i.productName}</div>
              ${skuLine}
            </td>
            <td style="padding:10px 8px; text-align:right;">${i.qty}</td>
            <td style="padding:10px 8px; text-align:right;">${i.unitPrice.toFixed(2)}</td>
            <td style="padding:10px 8px; text-align:right;">${i.lineSubtotal.toFixed(2)}</td>
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
            .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
            .muted { color:#6b7280; }
            h1 { margin:0; font-size:20px; }
            .box { border:1px solid #e5e7eb; border-radius:10px; padding:14px; }
            table { width:100%; border-collapse:collapse; margin-top:12px; }
            th { text-align:left; font-size:12px; color:#6b7280; font-weight:700; border-bottom:1px solid #e5e7eb; padding:8px; }
            td { border-bottom:1px solid #eef2f7; }
            .totals { margin-top:14px; display:flex; justify-content:flex-end; }
            .totals .inner { width:320px; }
            .row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; }
            .row strong { font-size:15px; }
            @media print { body { padding:0.5in; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Remquip — Order Receipt</h1>
              <div class="muted" style="margin-top:6px;">Order: <strong>${escapeHtml(order.order_number)}</strong></div>
              <div class="muted" style="margin-top:4px;">Date: <strong>${escapeHtml((order as any).order_date ?? '')}</strong></div>
              <div class="muted" style="margin-top:4px;">Status: <strong>${escapeHtml((order as any).status ?? '')}</strong></div>
              <div class="muted" style="margin-top:4px;">Payment: <strong>${escapeHtml(paymentStatus)}</strong></div>
            </div>
            <div class="box">
              <div style="font-weight:700; font-size:13px;">Totals</div>
              <div class="muted" style="margin-top:6px; font-size:12px;">All amounts shown in CAD</div>
            </div>
          </div>

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
              ${rowsHtml || `<tr><td colspan="4" style="padding:12px 8px;" class="muted">No items</td></tr>`}
            </tbody>
          </table>

          <div class="totals">
            <div class="inner">
              <div class="row"><span class="muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div class="row"><span class="muted">Tax</span><span>${taxAmount.toFixed(2)}</span></div>
              <div class="row"><span class="muted">Shipping</span><span>${shippingAmount.toFixed(2)}</span></div>
              <div class="row"><span class="muted">Discount</span><span>${discountAmount > 0 ? '-' : ''}${discountAmount.toFixed(2)}</span></div>
              <div class="row"><strong>Total</strong><strong>${totalAmount.toFixed(2)}</strong></div>
            </div>
          </div>

          ${shippingAddress ? `<div style="margin-top:16px;" class="box"><div style="font-weight:700; font-size:13px;">Shipping address</div><div style="margin-top:6px; font-size:13px; white-space:pre-wrap;" class="muted">${shippingAddress}</div></div>` : ''}
          ${notes ? `<div style="margin-top:14px;" class="box"><div style="font-weight:700; font-size:13px;">Order notes</div><div style="margin-top:6px; font-size:13px; white-space:pre-wrap;" class="muted">${notes}</div></div>` : ''}
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <Loader className="h-12 w-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (after hooks)
  if (shouldRedirect) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Welcome, {(user.full_name || '').split(/\s+/)[0] || user.email.split('@')[0]}
            </h1>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-foreground hover:bg-surface-container-high transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('auth.logout') || 'Logout'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {['orders', 'contacts', 'notes', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'orders' && <ShoppingBag className="inline mr-2 h-4 w-4" />}
              {tab === 'contacts' && <Phone className="inline mr-2 h-4 w-4" />}
              {tab === 'notes' && <MessageSquareText className="inline mr-2 h-4 w-4" />}
              {tab === 'settings' && <Settings className="inline mr-2 h-4 w-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-surface-container rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Total Orders</span>
                  <ShoppingBag className="h-5 w-5 text-accent" />
                </div>
                <p className="text-3xl font-bold text-foreground">{orders.length}</p>
              </div>
              <div className="bg-surface-container rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">In Transit</span>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {orders.filter(o => o.status === 'shipped').length}
                </p>
              </div>
              <div className="bg-surface-container rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Delivered</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
              </div>
            </div>

            {ordersLoading ? (
              <div className="text-center py-8">
                <Loader className="h-8 w-8 text-accent animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-surface-container rounded-lg p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Start shopping to see your orders here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-surface-container rounded-lg p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-display font-semibold text-foreground">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.items_count} item(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatPrice(order.total)}</p>
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mt-2 ${getStatusBadgeColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {order.tracking_number && (
                      <div className="bg-surface-container-lowest rounded p-3 mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                        <p className="font-mono font-semibold text-foreground">{order.tracking_number}</p>
                      </div>
                    )}

                    {order.estimated_delivery_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="h-4 w-4" />
                        Estimated Delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container transition-colors text-sm font-medium"
                        onClick={() => openReceipt(order.id)}
                      >
                        <Download className="h-4 w-4" />
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="dashboard-card">
              <h3 className="font-display font-bold text-sm uppercase mb-3 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-accent" /> Notes
              </h3>

              {notesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader className="h-8 w-8 animate-spin" /> Loading...
                </div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="border border-border rounded-lg p-4 bg-surface-container-lowest">
                      <div className="text-xs text-muted-foreground mb-2">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">Get in touch with our support team for any questions or assistance.</p>

            {contactsLoading ? (
              <div className="text-center py-8">
                <Loader className="h-8 w-8 text-accent animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Loading admin contacts...</p>
              </div>
            ) : adminContacts.length === 0 ? (
              <div className="bg-surface-container rounded-lg p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Contacts Available</h3>
                <p className="text-muted-foreground text-sm">Please try again later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminContacts.map((contact) => (
                  <div key={contact.id} className="bg-surface-container rounded-lg p-6 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground">{contact.department}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${contact.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>

                    <div className="space-y-3 text-sm">
                      {contact.position && (
                        <p className="text-foreground">{contact.position}</p>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-surface-container rounded-lg p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-surface-container-lowest text-foreground border border-border opacity-75"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">First Name</label>
                    <input
                      type="text"
                      value={user.first_name || ''}
                      disabled
                      className="w-full px-4 py-2 rounded-lg bg-surface-container-lowest text-foreground border border-border opacity-75"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Last Name</label>
                    <input
                      type="text"
                      value={user.last_name || ''}
                      disabled
                      className="w-full px-4 py-2 rounded-lg bg-surface-container-lowest text-foreground border border-border opacity-75"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Addresses
              </h3>
              <p className="text-muted-foreground text-sm">Manage your addresses for faster checkout.</p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-all">
                <Archive className="h-4 w-4" />
                Manage Addresses
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-[90vh]">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
              <div>
                <h3 className="font-display font-bold text-lg">Order Receipt</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {receipt?.order_number ? `#${receipt.order_number}` : receiptLoading ? 'Loading...' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOpen(false)}
                className="p-1.5 rounded-sm hover:bg-secondary transition-colors"
                aria-label="Close receipt"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-4 overflow-auto">
              {receiptLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader className="h-8 w-8 text-accent animate-spin mr-3" />
                  <p className="text-sm text-muted-foreground">Loading receipt...</p>
                </div>
              ) : receiptError ? (
                <div className="dashboard-card text-center py-10">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <h4 className="font-display font-bold text-lg mb-2">Failed to load receipt</h4>
                  <p className="text-muted-foreground text-sm mb-4 px-4">{receiptError}</p>
                  <button
                    type="button"
                    onClick={() => receipt?.id && openReceipt(receipt.id)}
                    disabled={!receipt?.id}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              ) : receipt ? (
                <div className="space-y-5">
                  <div className="dashboard-card">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Order date</p>
                        <p className="font-medium mt-1">
                          {receipt.order_date ? new Date(receipt.order_date).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusBadgeColor(receipt.status)}`}>
                          {receipt.status}
                        </span>
                        <div className="text-xs text-muted-foreground mt-2">
                          Payment: {(receipt as any).payment_status ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h4 className="font-display font-bold text-sm uppercase text-muted-foreground mb-3">Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-2">Item</th>
                            <th className="text-right py-2 px-2">Qty</th>
                            <th className="text-right py-2 px-2">Unit</th>
                            <th className="text-right py-2 pl-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(receipt.items ?? []).map((it: any) => {
                            const productName = it.product_name ?? it.productName ?? it.name ?? 'Item';
                            const productSku = it.product_sku ?? it.sku ?? '';
                            const qty = toNumber(it.quantity);
                            const unitPrice = toNumber(it.unit_price ?? it.unitPrice);
                            const lineSubtotal = toNumber(it.subtotal ?? it.line_total ?? (qty * unitPrice));
                            return (
                              <tr key={it.id ?? `${productName}-${qty}-${unitPrice}`}>
                                <td className="py-2 pr-2">
                                  <div className="font-medium">{productName}</div>
                                  {productSku ? <div className="text-xs text-muted-foreground mt-0.5 font-mono">{productSku}</div> : null}
                                </td>
                                <td className="py-2 px-2 text-right">{qty}</td>
                                <td className="py-2 px-2 text-right">{formatPrice(unitPrice)}</td>
                                <td className="py-2 pl-2 text-right">{formatPrice(lineSubtotal)}</td>
                              </tr>
                            );
                          })}
                          {(receipt.items ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground">No items found</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h4 className="font-display font-bold text-sm uppercase text-muted-foreground mb-3">Totals</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatPrice(toNumber((receipt as any).subtotal))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">{formatPrice(toNumber((receipt as any).tax_amount))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">{formatPrice(toNumber((receipt as any).shipping_amount))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium">
                          {toNumber((receipt as any).discount_amount) > 0
                            ? `-${formatPrice(toNumber((receipt as any).discount_amount))}`
                            : formatPrice(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="font-display font-bold">Total</span>
                        <span className="font-display font-bold text-accent">{formatPrice(toNumber((receipt as any).total_amount))}</span>
                      </div>
                    </div>

                    {(receipt as any).shipping_address ? (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground">Shipping address</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{(receipt as any).shipping_address}</p>
                      </div>
                    ) : null}

                    {(receipt as any).notes ? (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{(receipt as any).notes}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">No receipt loaded.</div>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={printReceipt}
                disabled={!receipt}
                className="btn-accent px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={printReceipt}
                disabled={!receipt}
                className="px-4 py-2 border border-border rounded-sm text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

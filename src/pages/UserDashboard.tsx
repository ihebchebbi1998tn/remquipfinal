import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, unwrapApiList } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Navigate } from 'react-router-dom';
import {
  Package, TrendingUp, MapPin, Clock, Phone, Mail, LogOut,
  Settings, User, ShoppingBag, Download, AlertCircle, CheckCircle, MessageSquareText,
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

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Load user orders
  useEffect(() => {
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
  }, []);

  // Load admin contacts
  useEffect(() => {
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
  }, []);

  // Load portal-visible notes (is_internal = 0)
  useEffect(() => {
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
  }, []);

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
                      <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container transition-colors text-sm font-medium">
                        <Download className="h-4 w-4" />
                        View Details
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
    </div>
  );
}

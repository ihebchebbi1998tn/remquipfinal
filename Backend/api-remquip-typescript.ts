/**
 * REMQUIP API SERVICE
 * Frontend integration with remquip_ prefixed backend APIs
 * 
 * This service provides TypeScript interfaces and API calls for all endpoints
 * Updated to match the new database table naming convention with remquip_ prefix
 */

// ==================== API BASE URL ====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ==================== INTERFACES ====================

// Auth
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Products
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  wholesale_price?: number;
  distributor_price?: number;
  category_id: string;
  category?: string;
  categorySlug?: string;
  stock_quantity: number;
  stock?: number;
  is_featured: boolean;
  status: 'active' | 'draft' | 'archived';
  images?: ProductImage[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
  uploaded_at: string;
  created_by?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  variant_sku?: string;
  variant_price?: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_category_id?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Customers
export interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  customer_type: 'Fleet' | 'Wholesale' | 'Distributor';
  tax_id?: string;
  street_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Orders
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  payment_method?: 'credit_card' | 'invoice' | 'bank_transfer' | 'cash';
  payment_status: 'pending' | 'paid' | 'failed';
  shipping_address_street?: string;
  shipping_address_city?: string;
  shipping_address_province?: string;
  shipping_address_postal?: string;
  shipping_address_country?: string;
  tracking_number?: string;
  carrier?: string;
  shipped_date?: string;
  delivered_date?: string;
  notes?: string;
  order_date: string;
  created_by?: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

// Inventory
export interface InventoryLog {
  id: string;
  product_id: string;
  variant_id?: string;
  action: 'stock_in' | 'stock_out' | 'adjustment' | 'return' | 'damage' | 'exchange';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

// Discounts
export interface Discount {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_uses?: number;
  current_uses: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pages & Access Control
export interface Page {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserPageAccess {
  id: string;
  user_id: string;
  page_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    pages: number;
    hasMore: boolean;
  };
  timestamp: string;
}

// ==================== HELPER FUNCTIONS ====================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API Error');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ==================== AUTH ENDPOINTS ====================

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return fetchAPI('/auth/logout', { method: 'POST' });
  },
};

// ==================== USERS ENDPOINTS ====================

export const usersApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedResponse<User>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);

    return fetchAPI(`/users?${queryParams.toString()}`);
  },

  get: async (id: string): Promise<ApiResponse<User>> => {
    return fetchAPI(`/users/${id}`);
  },

  create: async (data: Partial<User> & { password: string }): Promise<ApiResponse<User>> => {
    return fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    return fetchAPI(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchAPI(`/users/${id}`, { method: 'DELETE' });
  },

  updatePassword: async (id: string, currentPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
    return fetchAPI(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  updateRole: async (id: string, role: string): Promise<ApiResponse<User>> => {
    return fetchAPI(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};

// ==================== PRODUCTS ENDPOINTS ====================

export const productsApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);

    return fetchAPI(`/products?${queryParams.toString()}`);
  },

  get: async (id: string): Promise<ApiResponse<Product>> => {
    return fetchAPI(`/products/${id}`);
  },

  create: async (data: Partial<Product>): Promise<ApiResponse<Product>> => {
    return fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Product>): Promise<ApiResponse<Product>> => {
    return fetchAPI(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchAPI(`/products/${id}`, { method: 'DELETE' });
  },

  uploadImage: async (productId: string, file: File): Promise<ApiResponse<ProductImage>> => {
    const formData = new FormData();
    formData.append('image', file);

    return fetch(`${API_BASE_URL}/products/${productId}/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: formData,
    }).then((r) => r.json());
  },
};

// ==================== CUSTOMERS ENDPOINTS ====================

export const customersApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    type?: string;
    status?: string;
  }): Promise<PaginatedResponse<Customer>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);

    return fetchAPI(`/customers?${queryParams.toString()}`);
  },

  get: async (id: string): Promise<ApiResponse<Customer>> => {
    return fetchAPI(`/customers/${id}`);
  },

  create: async (data: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    return fetchAPI('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    return fetchAPI(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchAPI(`/customers/${id}`, { method: 'DELETE' });
  },
};

// ==================== ORDERS ENDPOINTS ====================

export const ordersApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Order>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return fetchAPI(`/orders?${queryParams.toString()}`);
  },

  get: async (id: string): Promise<ApiResponse<Order>> => {
    return fetchAPI(`/orders/${id}`);
  },

  create: async (data: Partial<Order>): Promise<ApiResponse<Order>> => {
    return fetchAPI('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Order>): Promise<ApiResponse<Order>> => {
    return fetchAPI(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<Order>> => {
    return fetchAPI(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchAPI(`/orders/${id}`, { method: 'DELETE' });
  },
};

export default {
  auth: authApi,
  users: usersApi,
  products: productsApi,
  customers: customersApi,
  orders: ordersApi,
};

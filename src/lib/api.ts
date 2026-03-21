/**
 * API Service Layer
 * Handles all API requests to the remquip backend
 * Backend URL: http://luccibyey.com.tn/remquip/backend
 * Includes comprehensive error handling and logging
 */

import { API_BASE_URL } from '@/config/constants';
import { ApiError, handleError, logError, getDetailedErrorMessage } from './error-handler';
import { showErrorToast, showSuccessToast } from './toast';

// ==================== CONSTANTS ====================

const TOKEN_CONFIG = {
  LOCAL_STORAGE_KEY: 'remquip_auth_token',
  HEADER_NAME: 'Authorization',
  HEADER_PREFIX: 'Bearer',
  EXPIRY_TIME: 24 * 60 * 60 * 1000,
} as const;

const REQUEST_TIMEOUT = 30000;

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

const API_ERRORS = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Invalid input. Please check your data.',
  INTERNAL_ERROR: 'Internal server error. Please try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
} as const;

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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

// User
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
  stock_quantity: number;
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
}

// Customers
export interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  last_order_date?: string;
  total_orders?: number;
  total_spent?: number;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  address_type: 'billing' | 'shipping';
  created_at: string;
}

// Orders
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_email?: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount?: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

// Discounts
export interface Discount {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount?: number;
  max_usage_count?: number;
  current_usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Inventory
export interface InventoryLog {
  id: string;
  product_id: string;
  product_name?: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ==================== TOKEN MANAGEMENT ====================

class TokenManager {
  static setToken(token: string): void {
    localStorage.setItem(TOKEN_CONFIG.LOCAL_STORAGE_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(TOKEN_CONFIG.LOCAL_STORAGE_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(TOKEN_CONFIG.LOCAL_STORAGE_KEY);
  }

  static isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    // In a real app, decode JWT to check expiry
    return false;
  }

  static getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (!token) return {};
    return {
      [TOKEN_CONFIG.HEADER_NAME]: `${TOKEN_CONFIG.HEADER_PREFIX} ${token}`,
    };
  }
}

// ==================== API SERVICE ====================

class APIService {
  private baseUrl: string = API_BASE_URL;
  private timeout: number = REQUEST_TIMEOUT;

  constructor() {
    console.log('[API Service] Initialized with base URL:', this.baseUrl);
  }

  /**
   * Make HTTP request with comprehensive error handling
   */
  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...TokenManager.getAuthHeader(),
      ...(options?.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`[API] ${method} ${endpoint}`, { requestId, body });

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}` };
        }

        const apiError = new ApiError(
          `HTTP_${response.status}`,
          errorData.message || `HTTP ${response.status} Error`,
          errorData.userMessage || this.getUserMessage(response.status),
          response.status,
          errorData.details || { endpoint, method },
          requestId
        );

        logError(apiError);

        // Special handling for 401
        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          TokenManager.removeToken();
          window.location.href = '/login';
        }

        throw apiError;
      }

      const data = await response.json();
      console.log(`[API] Success:`, { endpoint, method, requestId, dataSize: JSON.stringify(data).length });
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      let apiError: ApiError;

      if (error instanceof ApiError) {
        apiError = error;
      } else if (error instanceof TypeError) {
        // Network errors
        apiError = new ApiError(
          'NETWORK_ERROR',
          error.message,
          API_ERRORS.NETWORK_ERROR,
          0,
          { endpoint, method, originalError: error.message },
          requestId
        );
      } else if (error instanceof SyntaxError) {
        // JSON parse errors
        apiError = new ApiError(
          'PARSE_ERROR',
          error.message,
          'Failed to process server response',
          0,
          { endpoint, method, originalError: error.message },
          requestId
        );
      } else if (error instanceof Error && error.name === 'AbortError') {
        // Timeout
        apiError = new ApiError(
          'TIMEOUT_ERROR',
          'Request timeout',
          API_ERRORS.TIMEOUT_ERROR,
          408,
          { endpoint, method, timeout: this.timeout },
          requestId
        );
      } else {
        // Unknown errors
        apiError = new ApiError(
          'UNKNOWN_ERROR',
          String(error),
          API_ERRORS.UNKNOWN_ERROR,
          500,
          { endpoint, method, originalError: error },
          requestId
        );
      }

      logError(apiError);
      throw apiError;
    }
  }

  /**
   * Get user-friendly error message based on HTTP status
   */
  private getUserMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Your request contains invalid data. Please check and try again.',
      401: 'Your session has expired. Please log in again.',
      403: 'You do not have permission to access this resource.',
      404: 'The requested resource was not found.',
      409: 'This resource already exists or there is a conflict.',
      500: 'The server encountered an error. Please try again later.',
      502: 'The server is temporarily unavailable. Please try again.',
      503: 'The service is temporarily unavailable. Please try again later.',
      504: 'The request took too long. Please try again.',
    };
    return messages[status] || 'An error occurred. Please try again.';
  }

  // ==================== AUTH METHODS ====================

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<any>(
      'POST',
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    );

    if (response.data?.token) {
      TokenManager.setToken(response.data.token);
    }

    return response as AuthResponse;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('POST', API_ENDPOINTS.AUTH.LOGOUT);
    TokenManager.removeToken();
    return response;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<any>(
      'POST',
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    if (response.data?.token) {
      TokenManager.setToken(response.data.token);
    }

    return response as AuthResponse;
  }

  // ==================== USER METHODS ====================

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request('GET', API_ENDPOINTS.USERS.PROFILE);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request('GET', API_ENDPOINTS.USERS.GET.replace(':id', id));
  }

  async getUsers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<User>> {
    return this.request('GET', `${API_ENDPOINTS.USERS.LIST}?page=${page}&limit=${limit}`);
  }

  async createUser(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('POST', API_ENDPOINTS.USERS.CREATE, data);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('PUT', API_ENDPOINTS.USERS.UPDATE.replace(':id', id), data);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.USERS.DELETE.replace(':id', id));
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('PUT', API_ENDPOINTS.USERS.UPDATE_PASSWORD.replace(':id', id), {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // ==================== PRODUCT METHODS ====================

  async getProducts(page: number = 1, limit: number = 12): Promise<PaginatedResponse<Product>> {
    return this.request('GET', `${API_ENDPOINTS.PRODUCTS.LIST}?page=${page}&limit=${limit}`);
  }

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.request('GET', API_ENDPOINTS.PRODUCTS.GET.replace(':id', id));
  }

  async createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.request('POST', API_ENDPOINTS.PRODUCTS.CREATE, data);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.request('PUT', API_ENDPOINTS.PRODUCTS.UPDATE.replace(':id', id), data);
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.PRODUCTS.DELETE.replace(':id', id));
  }

  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    return this.request('GET', `${API_ENDPOINTS.PRODUCTS.SEARCH}?q=${encodeURIComponent(query)}`);
  }

  async getProductsByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    return this.request('GET', API_ENDPOINTS.PRODUCTS.BY_CATEGORY.replace(':categoryId', categoryId));
  }

  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    return this.request('GET', API_ENDPOINTS.PRODUCTS.FEATURED);
  }

  async uploadProductImage(productId: string, file: File): Promise<ApiResponse<ProductImage>> {
    const formData = new FormData();
    formData.append('image', file);

    return this.request(
      'POST',
      API_ENDPOINTS.PRODUCT_IMAGES.UPLOAD.replace(':id', productId),
      formData,
      { headers: {} }
    );
  }

  async deleteProductImage(productId: string, imageId: string): Promise<ApiResponse> {
    return this.request(
      'DELETE',
      API_ENDPOINTS.PRODUCT_IMAGES.DELETE.replace(':id', productId).replace(':imageId', imageId)
    );
  }

  // ==================== CATEGORY METHODS ====================

  async getCategories(): Promise<ApiResponse<ProductCategory[]>> {
    return this.request('GET', API_ENDPOINTS.CATEGORIES.LIST);
  }

  async getCategory(id: string): Promise<ApiResponse<ProductCategory>> {
    return this.request('GET', API_ENDPOINTS.CATEGORIES.GET.replace(':id', id));
  }

  async createCategory(data: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> {
    return this.request('POST', API_ENDPOINTS.CATEGORIES.CREATE, data);
  }

  async updateCategory(id: string, data: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> {
    return this.request('PUT', API_ENDPOINTS.CATEGORIES.UPDATE.replace(':id', id), data);
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.CATEGORIES.DELETE.replace(':id', id));
  }

  // ==================== CUSTOMER METHODS ====================

  async getCustomers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Customer>> {
    return this.request('GET', `${API_ENDPOINTS.CUSTOMERS.LIST}?page=${page}&limit=${limit}`);
  }

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.request('GET', API_ENDPOINTS.CUSTOMERS.GET.replace(':id', id));
  }

  async createCustomer(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.request('POST', API_ENDPOINTS.CUSTOMERS.CREATE, data);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.request('PUT', API_ENDPOINTS.CUSTOMERS.UPDATE.replace(':id', id), data);
  }

  async deleteCustomer(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.CUSTOMERS.DELETE.replace(':id', id));
  }

  async searchCustomers(query: string): Promise<ApiResponse<Customer[]>> {
    return this.request('GET', `${API_ENDPOINTS.CUSTOMERS.SEARCH}?q=${encodeURIComponent(query)}`);
  }

  async getCustomerOrders(customerId: string): Promise<ApiResponse<Order[]>> {
    return this.request('GET', API_ENDPOINTS.CUSTOMERS.ORDERS.replace(':id', customerId));
  }

  async getCustomerAddresses(customerId: string): Promise<ApiResponse<CustomerAddress[]>> {
    return this.request('GET', API_ENDPOINTS.CUSTOMERS.ADDRESSES.replace(':id', customerId));
  }

  // ==================== ORDER METHODS ====================

  async getOrders(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Order>> {
    return this.request('GET', `${API_ENDPOINTS.ORDERS.LIST}?page=${page}&limit=${limit}`);
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request('GET', API_ENDPOINTS.ORDERS.GET.replace(':id', id));
  }

  async createOrder(data: Partial<Order>): Promise<ApiResponse<Order>> {
    return this.request('POST', API_ENDPOINTS.ORDERS.CREATE, data);
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>> {
    return this.request('PUT', API_ENDPOINTS.ORDERS.UPDATE.replace(':id', id), data);
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<ApiResponse> {
    return this.request('PATCH', API_ENDPOINTS.ORDERS.STATUS.replace(':id', id), { status });
  }

  async deleteOrder(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.ORDERS.DELETE.replace(':id', id));
  }

  async searchOrders(query: string): Promise<ApiResponse<Order[]>> {
    return this.request('GET', `${API_ENDPOINTS.ORDERS.SEARCH}?q=${encodeURIComponent(query)}`);
  }

  async addOrderNote(orderId: string, note: string): Promise<ApiResponse> {
    return this.request('POST', API_ENDPOINTS.ORDERS.ADD_NOTE.replace(':id', orderId), { note });
  }

  // ==================== DISCOUNT METHODS ====================

  async getDiscounts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Discount>> {
    return this.request('GET', `${API_ENDPOINTS.DISCOUNTS.LIST}?page=${page}&limit=${limit}`);
  }

  async getDiscount(id: string): Promise<ApiResponse<Discount>> {
    return this.request('GET', API_ENDPOINTS.DISCOUNTS.GET.replace(':id', id));
  }

  async createDiscount(data: Partial<Discount>): Promise<ApiResponse<Discount>> {
    return this.request('POST', API_ENDPOINTS.DISCOUNTS.CREATE, data);
  }

  async updateDiscount(id: string, data: Partial<Discount>): Promise<ApiResponse<Discount>> {
    return this.request('PUT', API_ENDPOINTS.DISCOUNTS.UPDATE.replace(':id', id), data);
  }

  async deleteDiscount(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.DISCOUNTS.DELETE.replace(':id', id));
  }

  async validateDiscount(code: string): Promise<ApiResponse<Discount>> {
    return this.request('GET', API_ENDPOINTS.DISCOUNTS.VALIDATE.replace(':code', code));
  }

  // ==================== INVENTORY METHODS ====================

  async getInventoryLogs(page: number = 1, limit: number = 20): Promise<PaginatedResponse<InventoryLog>> {
    return this.request('GET', `${API_ENDPOINTS.INVENTORY.LOGS}?page=${page}&limit=${limit}`);
  }

  async adjustInventory(productId: string, quantity: number, reason: string): Promise<ApiResponse> {
    return this.request('POST', API_ENDPOINTS.INVENTORY.ADJUST, {
      product_id: productId,
      quantity_change: quantity,
      notes: reason,
    });
  }

  async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    return this.request('GET', API_ENDPOINTS.INVENTORY.LOW_STOCK);
  }

  async getProductHistory(productId: string): Promise<ApiResponse<InventoryLog[]>> {
    return this.request('GET', API_ENDPOINTS.INVENTORY.HISTORY.replace(':productId', productId));
  }

  // ==================== ANALYTICS METHODS ====================

  async getAnalyticsDashboard(): Promise<ApiResponse> {
    return this.request('GET', API_ENDPOINTS.ANALYTICS.DASHBOARD);
  }

  async getAnalyticsMetrics(startDate: string, endDate: string): Promise<ApiResponse> {
    return this.request(
      'GET',
      `${API_ENDPOINTS.ANALYTICS.DAILY_METRICS}?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getRevenueStats(startDate: string, endDate: string): Promise<ApiResponse> {
    return this.request(
      'GET',
      `${API_ENDPOINTS.ANALYTICS.REVENUE}?start_date=${startDate}&end_date=${endDate}`
    );
  }

  // ==================== CMS METHODS ====================

  async getCMSPages(page: number = 1, limit: number = 10): Promise<PaginatedResponse> {
    return this.request('GET', `${API_ENDPOINTS.CMS.PAGES}?page=${page}&limit=${limit}`);
  }

  async getCMSPage(slug: string): Promise<ApiResponse> {
    return this.request('GET', API_ENDPOINTS.CMS.GET_PAGE.replace(':slug', slug));
  }

  async getCMSPageContent(pageName: string): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/cms/pages/${encodeURIComponent(pageName)}/content`);
  }

  async getCMSSectionContent(pageName: string, sectionKey: string): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/cms/pages/${encodeURIComponent(pageName)}/sections/${encodeURIComponent(sectionKey)}`);
  }

  async createCMSPage(data: any): Promise<ApiResponse> {
    return this.request('POST', API_ENDPOINTS.CMS.CREATE_PAGE, data);
  }

  async createCMSContent(data: any): Promise<ApiResponse<any>> {
    return this.request('POST', `/api/cms/content`, data);
  }

  async updateCMSPage(id: string, data: any): Promise<ApiResponse> {
    return this.request('PUT', API_ENDPOINTS.CMS.UPDATE_PAGE.replace(':id', id), data);
  }

  async updateCMSContent(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request('PUT', `/api/cms/content/${id}`, data);
  }

  async deleteCMSPage(id: string): Promise<ApiResponse> {
    return this.request('DELETE', API_ENDPOINTS.CMS.DELETE_PAGE.replace(':id', id));
  }

  async deleteCMSContent(id: string): Promise<ApiResponse> {
    return this.request('DELETE', `/api/cms/content/${id}`);
  }

  async uploadCMSImage(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.request('POST', '/api/cms/images/upload', formData);
  }

  // ==================== AUDIT METHODS ====================

  async getAuditLogs(page: number = 1, limit: number = 20): Promise<PaginatedResponse> {
    return this.request('GET', `${API_ENDPOINTS.AUDIT.LOGS}?page=${page}&limit=${limit}`);
  }

  async getUserAuditLogs(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse> {
    return this.request(
      'GET',
      `${API_ENDPOINTS.AUDIT.USER_LOGS.replace(':userId', userId)}?page=${page}&limit=${limit}`
    );
  }

  // ==================== STATIC METHODS ====================

  static getInstance(): APIService {
    if (!apiService) {
      apiService = new APIService();
    }
    return apiService;
  }
}

let apiService: APIService | null = null;

// Export singleton instance
export const api = APIService.getInstance();

// Export class for testing/custom instances
export default APIService;

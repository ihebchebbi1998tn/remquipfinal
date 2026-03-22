/**
 * Admin API Integration Layer
 * 
 * @deprecated This file is deprecated. Use the main api.ts instead which has
 * comprehensive admin functionality including:
 * - User management (getUsers, createUser, updateUser, deleteUser)
 * - Permissions (getUserPermissions, updateUserPermissions)
 * - CMS (getCMSPages, createCMSPage, updateCMSPage, deleteCMSPage)
 * - Access Control (via admin permissions endpoints)
 * 
 * Import from: import { api } from '@/lib/api';
 * 
 * This file is kept for backwards compatibility but should not be used
 * for new implementations.
 */

import { AdminUser, AdminPage, AccessRecord, BulkAccessRequest } from "@/types/admin";
import { API_BASE_URL } from "@/config/constants";

// Use the same token key as main API for consistency
const TOKEN_STORAGE_KEY = "remquip_auth_token";

export const apiAdmin = {
  // ==================== USERS ====================
  
  async getUsers(search?: string, role?: string): Promise<AdminUser[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (role) params.append("role", role);
    
    const response = await fetch(`${API_BASE_URL}/users?${params}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
    return response.json();
  },

  async getUser(userId: string): Promise<AdminUser> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);
    return response.json();
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<AdminUser> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(`Failed to create user: ${response.status}`);
    return response.json();
  },

  async updateUser(userId: string, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(`Failed to update user: ${response.status}`);
    return response.json();
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to delete user: ${response.status}`);
  },

  // ==================== PAGES ====================

  async getPages(search?: string): Promise<AdminPage[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    
    const response = await fetch(`${API_BASE_URL}/pages?${params}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch pages: ${response.status}`);
    return response.json();
  },

  async getPage(pageId: string): Promise<AdminPage> {
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
    return response.json();
  },

  async createPage(data: Omit<AdminPage, "id">): Promise<AdminPage> {
    const response = await fetch(`${API_BASE_URL}/pages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(`Failed to create page: ${response.status}`);
    return response.json();
  },

  async updatePage(pageId: string, data: Partial<AdminPage>): Promise<AdminPage> {
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(`Failed to update page: ${response.status}`);
    return response.json();
  },

  async deletePage(pageId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to delete page: ${response.status}`);
  },

  // ==================== ACCESS CONTROL ====================

  async getAccess(filters?: {
    userId?: string;
    pageId?: string;
  }): Promise<AccessRecord[]> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.pageId) params.append("pageId", filters.pageId);
    
    const response = await fetch(`${API_BASE_URL}/access?${params}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch access records: ${response.status}`);
    return response.json();
  },

  async setAccess(userId: string, pageId: string, permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }): Promise<AccessRecord> {
    const response = await fetch(`${API_BASE_URL}/access`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, pageId, ...permissions }),
    });
    
    if (!response.ok) throw new Error(`Failed to set access: ${response.status}`);
    return response.json();
  },

  async updateAccess(userId: string, pageId: string, permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }): Promise<AccessRecord> {
    const response = await fetch(`${API_BASE_URL}/access/${userId}/${pageId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(permissions),
    });
    
    if (!response.ok) throw new Error(`Failed to update access: ${response.status}`);
    return response.json();
  },

  async revokeAccess(userId: string, pageId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/access/${userId}/${pageId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to revoke access: ${response.status}`);
  },

  // ==================== BULK OPERATIONS ====================

  async bulkAssignAccess(request: BulkAccessRequest): Promise<AccessRecord[]> {
    const response = await fetch(`${API_BASE_URL}/access/bulk-assign`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) throw new Error(`Failed to bulk assign access: ${response.status}`);
    return response.json();
  },

  async bulkRevokeAccess(userIds: string[], pageIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/access/bulk-revoke`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds, pageIds }),
    });
    
    if (!response.ok) throw new Error(`Failed to bulk revoke access: ${response.status}`);
  },
};

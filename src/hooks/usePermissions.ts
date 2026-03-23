import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery } from './useApi';
import { ADMIN_NO_AUTH } from '@/config/constants';

/**
 * Admin Permissions Interface
 * Defines what actions an admin user can perform
 */
export interface AdminPermissions {
  canViewDashboard: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageCustomers: boolean;
  canManageInventory: boolean;
  canManageDiscounts: boolean;
  canManageUsers: boolean;
  canManageAnalytics: boolean;
  canManageCMS: boolean;
  canViewAuditLogs: boolean;
  canDeleteData: boolean;
  canEditSettings: boolean;
}

/**
 * Default permissions for different roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, AdminPermissions> = {
  super_admin: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageCustomers: true,
    canManageInventory: true,
    canManageDiscounts: true,
    canManageUsers: true,
    canManageAnalytics: true,
    canManageCMS: true,
    canViewAuditLogs: true,
    canDeleteData: true,
    canEditSettings: true,
  },
  admin: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageCustomers: true,
    canManageInventory: true,
    canManageDiscounts: true,
    canManageUsers: false,
    canManageAnalytics: true,
    canManageCMS: true,
    canViewAuditLogs: false,
    canDeleteData: false,
    canEditSettings: true,
  },
  manager: {
    canViewDashboard: true,
    canManageProducts: false,
    canManageOrders: true,
    canManageCustomers: true,
    canManageInventory: true,
    canManageDiscounts: true,
    canManageUsers: false,
    canManageAnalytics: false,
    canManageCMS: false,
    canViewAuditLogs: false,
    canDeleteData: false,
    canEditSettings: false,
  },
  user: {
    canViewDashboard: false,
    canManageProducts: false,
    canManageOrders: false,
    canManageCustomers: false,
    canManageInventory: false,
    canManageDiscounts: false,
    canManageUsers: false,
    canManageAnalytics: false,
    canManageCMS: false,
    canViewAuditLogs: false,
    canDeleteData: false,
    canEditSettings: false,
  },
};

/**
 * Hook to get user permissions
 * Currently uses role-based defaults, but will query API for custom permissions
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  if (ADMIN_NO_AUTH) {
    const permissions = DEFAULT_ROLE_PERMISSIONS.admin;
    return {
      permissions,
      canAccess: (_permission: keyof AdminPermissions) => true,
      hasAnyPermission: (_permissionList: (keyof AdminPermissions)[]) => true,
      hasAllPermissions: (_permissionList: (keyof AdminPermissions)[]) => true,
      isLoading: false,
    };
  }

  // TODO: When backend is ready, uncomment this to fetch custom permissions
  // const { data, isLoading } = useApiQuery(
  //   ['permissions', user?.id],
  //   () => api.request('GET', `/api/users/${user?.id}/permissions`),
  //   { enabled: !!user?.id }
  // );

  // Get default permissions based on role
  const permissions = user
    ? DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.user
    : DEFAULT_ROLE_PERMISSIONS.user;

  const canAccess = (permission: keyof AdminPermissions): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionList: (keyof AdminPermissions)[]): boolean => {
    return permissionList.some(canAccess);
  };

  const hasAllPermissions = (permissionList: (keyof AdminPermissions)[]): boolean => {
    return permissionList.every(canAccess);
  };

  return {
    permissions,
    canAccess,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: false,
    // isLoading: data?.isLoading || false, // Uncomment when API is ready
  };
}

/**
 * Utility to check specific permission
 */
export function checkPermission(
  userRole?: string,
  permission?: keyof AdminPermissions
): boolean {
  if (!userRole || !permission) return false;
  
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  return rolePermissions[permission] === true;
}

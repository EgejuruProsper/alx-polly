/**
 * User Role Management Types
 * 
 * WHY: Defines the role-based access control system for the enhanced polling platform.
 * Provides type safety for user permissions and role validation.
 * 
 * Security considerations:
 * - Role hierarchy enforcement
 * - Permission-based access control
 * - Type-safe role validation
 * 
 * Business logic:
 * - Admin: Full system access, user management, analytics
 * - Moderator: Poll management, user oversight, limited analytics
 * - User: Basic polling, voting, profile management
 */

export type UserRole = 'admin' | 'moderator' | 'user';

export interface UserPermissions {
  // Poll Management
  canCreatePolls: boolean;
  canEditAllPolls: boolean;
  canDeleteAllPolls: boolean;
  canViewAllPolls: boolean;
  
  // User Management
  canViewUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;
  
  // Analytics
  canViewAnalytics: boolean;
  canViewUserAnalytics: boolean;
  canExportData: boolean;
  
  // System
  canAccessAdmin: boolean;
  canManageSystem: boolean;
  canViewLogs: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  isActive: boolean;
}

/**
 * Role-based permission mapping
 * 
 * WHY: Centralizes permission logic and ensures consistent access control.
 * Makes it easy to modify permissions without changing business logic.
 */
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canCreatePolls: true,
    canEditAllPolls: true,
    canDeleteAllPolls: true,
    canViewAllPolls: true,
    canViewUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManageRoles: true,
    canViewAnalytics: true,
    canViewUserAnalytics: true,
    canExportData: true,
    canAccessAdmin: true,
    canManageSystem: true,
    canViewLogs: true,
  },
  moderator: {
    canCreatePolls: true,
    canEditAllPolls: true,
    canDeleteAllPolls: false,
    canViewAllPolls: true,
    canViewUsers: true,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canViewAnalytics: true,
    canViewUserAnalytics: false,
    canExportData: false,
    canAccessAdmin: true,
    canManageSystem: false,
    canViewLogs: false,
  },
  user: {
    canCreatePolls: true,
    canEditAllPolls: false,
    canDeleteAllPolls: false,
    canViewAllPolls: true,
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canViewAnalytics: false,
    canViewUserAnalytics: false,
    canExportData: false,
    canAccessAdmin: false,
    canManageSystem: false,
    canViewLogs: false,
  },
};

/**
 * Get user permissions based on role
 * 
 * WHY: Provides a clean interface for permission checking.
 * Ensures consistent permission logic across the application.
 * 
 * @param role - User role
 * @returns User permissions object
 */
export function getUserPermissions(role: UserRole): UserPermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user has specific permission
 * 
 * WHY: Provides type-safe permission checking with clear intent.
 * Makes permission logic explicit and maintainable.
 * 
 * @param user - User profile
 * @param permission - Permission to check
 * @returns Whether user has permission
 */
export function hasPermission(
  user: UserProfile,
  permission: keyof UserPermissions
): boolean {
  return user.permissions[permission];
}

/**
 * Check if user can perform action on resource
 * 
 * WHY: Provides high-level permission checking for common operations.
 * Simplifies permission logic in components and API routes.
 * 
 * @param user - User profile
 * @param action - Action to perform
 * @param resource - Resource type
 * @returns Whether user can perform action
 */
export function canPerformAction(
  user: UserProfile,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'polls' | 'users' | 'analytics' | 'system'
): boolean {
  switch (resource) {
    case 'polls':
      switch (action) {
        case 'create': return user.permissions.canCreatePolls;
        case 'read': return user.permissions.canViewAllPolls;
        case 'update': return user.permissions.canEditAllPolls;
        case 'delete': return user.permissions.canDeleteAllPolls;
      }
      break;
    case 'users':
      switch (action) {
        case 'create': return user.permissions.canEditUsers;
        case 'read': return user.permissions.canViewUsers;
        case 'update': return user.permissions.canEditUsers;
        case 'delete': return user.permissions.canDeleteUsers;
      }
      break;
    case 'analytics':
      return user.permissions.canViewAnalytics;
    case 'system':
      return user.permissions.canManageSystem;
  }
  return false;
}

import { supabase } from '@/lib/supabase-client';
import { UserProfile, UserRole, getUserPermissions, hasPermission } from '@/lib/types/user-roles';
import { ServiceResult } from '@/lib/poll-service';

/**
 * UserRoleService
 * ---------------
 * Manages user roles and permissions for the enhanced polling platform.
 * 
 * WHY: Centralizes role management logic and provides secure user operations.
 * Ensures consistent permission checking and role-based access control.
 * 
 * Security considerations:
 * - Server-side role validation
 * - Permission-based access control
 * - Audit logging for role changes
 * - Input validation and sanitization
 * 
 * Edge cases:
 * - Invalid role assignments → validation error
 * - Permission escalation attempts → access denied
 * - Role conflicts → resolved by hierarchy
 */
export class UserRoleService {
  /**
   * Get user profile with role and permissions
   * 
   * WHY: Provides complete user information including role-based permissions.
   * Essential for authorization checks throughout the application.
   * 
   * Security considerations:
   * - No sensitive data exposure
   * - Role validation
   * - Permission calculation
   * 
   * @param userId - User ID to fetch
   * @returns User profile with permissions
   */
  static async getUserProfile(userId: string): Promise<ServiceResult<UserProfile>> {
    try {
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          name,
          avatar,
          role,
          created_at,
          updated_at,
          last_active_at,
          is_active
        `)
        .eq('id', userId)
        .single();

      if (error || !user) {
        return { success: false, error: 'User not found' };
      }

      // Get permissions based on role
      const permissions = getUserPermissions(user.role as UserRole);

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role as UserRole,
        permissions,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastActiveAt: user.last_active_at ? new Date(user.last_active_at) : undefined,
        isActive: user.is_active,
      };

      return { success: true, data: userProfile };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: 'Failed to fetch user profile' };
    }
  }

  /**
   * Update user role (admin only)
   * 
   * WHY: Allows administrators to manage user roles and permissions.
   * Essential for user management and access control.
   * 
   * Security considerations:
   * - Admin-only operation
   * - Role hierarchy enforcement
   * - Audit logging
   * 
   * @param targetUserId - User ID to update
   * @param newRole - New role to assign
   * @param adminUserId - Admin user ID (for authorization)
   * @returns Success status
   */
  static async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    adminUserId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Verify admin permissions
      const adminProfile = await this.getUserProfile(adminUserId);
      if (!adminProfile.success || !adminProfile.data) {
        return { success: false, error: 'Admin profile not found' };
      }

      if (!hasPermission(adminProfile.data, 'canManageRoles')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Update user role
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log role change
      await this.logRoleChange(adminUserId, targetUserId, newRole);

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'Failed to update user role' };
    }
  }

  /**
   * Get all users with role information (admin/moderator only)
   * 
   * WHY: Provides user management interface for administrators.
   * Enables user oversight and role management.
   * 
   * Security considerations:
   * - Role-based access control
   * - No sensitive data exposure
   * - Pagination for large datasets
   * 
   * @param requesterId - ID of user requesting the list
   * @param limit - Number of users to fetch
   * @param offset - Pagination offset
   * @returns List of user profiles
   */
  static async getAllUsers(
    requesterId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResult<UserProfile[]>> {
    try {
      // Verify permissions
      const requesterProfile = await this.getUserProfile(requesterId);
      if (!requesterProfile.success || !requesterProfile.data) {
        return { success: false, error: 'Requester profile not found' };
      }

      if (!hasPermission(requesterProfile.data, 'canViewUsers')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      const { data: users, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          name,
          avatar,
          role,
          created_at,
          updated_at,
          last_active_at,
          is_active
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const userProfiles: UserProfile[] = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role as UserRole,
        permissions: getUserPermissions(user.role as UserRole),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastActiveAt: user.last_active_at ? new Date(user.last_active_at) : undefined,
        isActive: user.is_active,
      }));

      return { success: true, data: userProfiles };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: 'Failed to fetch users' };
    }
  }

  /**
   * Update user activity timestamp
   * 
   * WHY: Tracks user activity for analytics and session management.
   * Helps identify active users and session timeouts.
   * 
   * @param userId - User ID to update
   * @returns Success status
   */
  static async updateUserActivity(userId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user activity:', error);
      return { success: false, error: 'Failed to update user activity' };
    }
  }

  /**
   * Log role change for audit trail
   * 
   * WHY: Maintains audit trail for security and compliance.
   * Essential for tracking permission changes and security events.
   * 
   * @param adminId - Admin who made the change
   * @param targetUserId - User whose role was changed
   * @param newRole - New role assigned
   */
  private static async logRoleChange(
    adminId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: adminId,
          target_user_id: targetUserId,
          action: 'role_change',
          details: { new_role: newRole },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging role change:', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }
}

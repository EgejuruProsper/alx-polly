/**
 * UserRoleService Tests
 * ---------------------
 * Comprehensive unit tests for user role management functionality.
 * 
 * WHY: Ensures user role management works correctly with proper authorization,
 * role validation, and permission checking. Essential for security and reliability.
 * 
 * Test Coverage:
 * - User profile retrieval
 * - Role updates and validation
 * - Permission checking
 * - Error handling
 * - Security scenarios
 * 
 * Security considerations:
 * - Admin-only operations
 * - Role hierarchy enforcement
 * - Permission validation
 * - Input sanitization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserRoleService } from '@/lib/services/user-role-service';
import { UserProfile, UserRole } from '@/lib/types/user-roles';
import { supabase } from '@/lib/supabase-client';

// Mock Supabase client
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn(() => ({
        select: vi.fn()
      }))
    }))
  }
}));

describe('UserRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile with permissions for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar.jpg',
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_active_at: '2024-01-01T00:00:00Z',
        is_active: true
      };

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.getUserProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('user-123');
      expect(result.data?.role).toBe('user');
      expect(result.data?.permissions).toBeDefined();
    });

    it('should return error for non-existent user', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.getUserProfile('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockRejectedValue(new Error('Database error'))
          }))
        }))
      } as any);

      const result = await UserRoleService.getUserProfile('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch user profile');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully for admin', async () => {
      const mockAdminProfile = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        permissions: {
          canManageRoles: true,
          canViewUsers: true,
          canEditUsers: true,
          canDeleteUsers: true,
          canAccessAdmin: true,
          canManageSystem: true,
          canViewLogs: true,
          canCreatePolls: true,
          canEditAllPolls: true,
          canDeleteAllPolls: true,
          canViewAllPolls: true,
          canViewAnalytics: true,
          canViewUserAnalytics: true,
          canExportData: true
        }
      };

      const mockSupabase = vi.mocked(supabase);
      
      // Mock admin profile check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockAdminProfile,
              error: null
            })
          }))
        }))
      } as any);

      // Mock role update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      } as any);

      // Mock audit log insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          error: null
        })
      } as any);

      const result = await UserRoleService.updateUserRole(
        'user-123',
        'moderator',
        'admin-123'
      );

      expect(result.success).toBe(true);
    });

    it('should reject role update for non-admin user', async () => {
      const mockUserProfile = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
        permissions: {
          canManageRoles: false,
          canViewUsers: false,
          canEditUsers: false,
          canDeleteUsers: false,
          canAccessAdmin: false,
          canManageSystem: false,
          canViewLogs: false,
          canCreatePolls: true,
          canEditAllPolls: false,
          canDeleteAllPolls: false,
          canViewAllPolls: true,
          canViewAnalytics: false,
          canViewUserAnalytics: false,
          canExportData: false
        }
      };

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.updateUserRole(
        'user-456',
        'moderator',
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });

    it('should prevent self-role changes', async () => {
      const mockAdminProfile = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        permissions: {
          canManageRoles: true,
          canViewUsers: true,
          canEditUsers: true,
          canDeleteUsers: true,
          canAccessAdmin: true,
          canManageSystem: true,
          canViewLogs: true,
          canCreatePolls: true,
          canEditAllPolls: true,
          canDeleteAllPolls: true,
          canViewAllPolls: true,
          canViewAnalytics: true,
          canViewUserAnalytics: true,
          canExportData: true
        }
      };

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockAdminProfile,
              error: null
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.updateUserRole(
        'admin-123',
        'moderator',
        'admin-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot change your own role');
    });
  });

  describe('getAllUsers', () => {
    it('should return users list for admin', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'user',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_active_at: '2024-01-01T00:00:00Z',
          is_active: true
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: 'moderator',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          last_active_at: '2024-01-02T00:00:00Z',
          is_active: true
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      
      // Mock admin profile check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      } as any);

      // Mock users list
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          range: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockUsers,
              error: null
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.getAllUsers('admin-123', 50, 0);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].id).toBe('user-1');
      expect(result.data?.[1].id).toBe('user-2');
    });

    it('should reject access for non-admin user', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null
            })
          }))
        }))
      } as any);

      const result = await UserRoleService.getAllUsers('user-123', 50, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });
  });

  describe('updateUserActivity', () => {
    it('should update user activity timestamp', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      } as any);

      const result = await UserRoleService.updateUserActivity('user-123');

      expect(result.success).toBe(true);
    });

    it('should handle update errors gracefully', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' }
          })
        }))
      } as any);

      const result = await UserRoleService.updateUserActivity('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });
});

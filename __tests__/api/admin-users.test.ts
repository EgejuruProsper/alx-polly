/**
 * Admin Users API Tests
 * ---------------------
 * Integration tests for admin user management API endpoints.
 * 
 * WHY: Ensures API endpoints work correctly with proper authentication,
 * authorization, and data validation. Essential for secure user management.
 * 
 * Test Coverage:
 * - GET /api/admin/users
 * - PATCH /api/admin/users
 * - Authentication and authorization
 * - Input validation
 * - Error handling
 * - Rate limiting
 * 
 * Security considerations:
 * - Admin-only access
 * - Input sanitization
 * - Rate limiting
 * - Error message security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/admin/users/route';
import { UserRoleService } from '@/lib/services/user-role-service';

// Mock dependencies
vi.mock('@/lib/services/user-role-service');
vi.mock('@/lib/api-utils', () => ({
  getAuthenticatedUser: vi.fn(),
  handleApiError: vi.fn(),
  ApiResponse: {
    success: (data: any) => ({ success: true, data }),
    error: (message: string, status: number = 400) => ({ success: false, error: message, status }),
    unauthorized: (message: string) => ({ success: false, error: message, status: 401 })
  }
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimit: vi.fn(() => ({ allowed: true }))
}));

describe('Admin Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return users list for admin', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'user',
          permissions: {
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
            canViewLogs: false
          },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          lastActiveAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: {
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
            canCreatePolls: true,
            canEditAllPolls: true,
            canDeleteAllPolls: true,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      vi.mocked(UserRoleService.getAllUsers).mockResolvedValue({
        success: true,
        data: mockUsers
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].id).toBe('user-1');
    });

    it('should return 401 for unauthenticated request', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: null,
        error: 'Not authenticated'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 403 for non-admin user', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'User',
          role: 'user',
          permissions: {
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
            canCreatePolls: true,
            canEditAllPolls: false,
            canDeleteAllPolls: false,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should handle rate limiting', async () => {
      const { rateLimit } = await import('@/lib/rate-limiter');
      vi.mocked(rateLimit).mockReturnValue({ allowed: false });

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Too many requests');
    });
  });

  describe('PATCH /api/admin/users', () => {
    it('should update user role successfully', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: {
            canManageRoles: true,
            canViewUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAnalytics: true,
            canViewUserAnalytics: true,
            canExportData: true,
            canAccessAdmin: true,
            canManageSystem: true,
            canViewLogs: true,
            canCreatePolls: true,
            canEditAllPolls: true,
            canDeleteAllPolls: true,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      vi.mocked(UserRoleService.updateUserRole).mockResolvedValue({
        success: true
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'user-123',
          role: 'moderator'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('User role updated successfully');
    });

    it('should return 400 for invalid request data', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: {
            canManageRoles: true,
            canViewUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAnalytics: true,
            canViewUserAnalytics: true,
            canExportData: true,
            canAccessAdmin: true,
            canManageSystem: true,
            canViewLogs: true,
            canCreatePolls: true,
            canEditAllPolls: true,
            canDeleteAllPolls: true,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'invalid-uuid',
          role: 'invalid-role'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request data');
    });

    it('should prevent self-role changes', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: {
            canManageRoles: true,
            canViewUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAnalytics: true,
            canViewUserAnalytics: true,
            canExportData: true,
            canAccessAdmin: true,
            canManageSystem: true,
            canViewLogs: true,
            canCreatePolls: true,
            canEditAllPolls: true,
            canDeleteAllPolls: true,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'admin-123',
          role: 'moderator'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot change your own role');
    });

    it('should handle database errors gracefully', async () => {
      const { getAuthenticatedUser } = await import('@/lib/api-utils');
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null
      });

      vi.mocked(UserRoleService.getUserProfile).mockResolvedValue({
        success: true,
        data: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: {
            canManageRoles: true,
            canViewUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAnalytics: true,
            canViewUserAnalytics: true,
            canExportData: true,
            canAccessAdmin: true,
            canManageSystem: true,
            canViewLogs: true,
            canCreatePolls: true,
            canEditAllPolls: true,
            canDeleteAllPolls: true,
            canViewAllPolls: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
      });

      vi.mocked(UserRoleService.updateUserRole).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'user-123',
          role: 'moderator'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});

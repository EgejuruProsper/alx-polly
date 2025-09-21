import { NextRequest } from 'next/server';
import { UserRoleService } from '@/lib/services/user-role-service';
import { ApiResponse, getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limiter';

/**
 * Admin Users API Route
 * ---------------------
 * Handles user management operations for administrators.
 * 
 * WHY: Provides secure API endpoints for user management with proper authorization.
 * Ensures only authorized administrators can perform user operations.
 * 
 * Security considerations:
 * - Admin-only access
 * - Rate limiting
 * - Input validation
 * - Audit logging
 * 
 * Edge cases:
 * - Unauthorized access → 401
 * - Insufficient permissions → 403
 * - Invalid data → 400
 * - Rate limiting → 429
 */

// Rate limiting for admin operations
const adminLimiter = rateLimit({ windowMs: 60000, maxRequests: 30 }); // 30 requests per minute

// Input validation schemas
const updateRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'moderator', 'user'], {
    errorMap: () => ({ message: 'Role must be admin, moderator, or user' })
  })
});

const getUsersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(10000).default(0),
  role: z.enum(['admin', 'moderator', 'user']).optional(),
  search: z.string().max(100).optional()
});

/**
 * GET /api/admin/users
 * --------------------
 * Get all users with pagination and filtering.
 * 
 * WHY: Provides user management interface for administrators.
 * Enables user oversight and role management with proper pagination.
 * 
 * Security considerations:
 * - Admin-only access
 * - Rate limiting
 * - No sensitive data exposure
 * - Proper pagination
 * 
 * @param request - NextRequest with query parameters
 * @returns User list with pagination metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = adminLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    // Require authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    // Get user profile to check permissions
    const userProfile = await UserRoleService.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return ApiResponse.error('User profile not found', 404);
    }

    // Check admin permissions
    if (!userProfile.data.permissions.canViewUsers) {
      return ApiResponse.error('Insufficient permissions', 403);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined
    };

    const validationResult = getUsersSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return ApiResponse.error('Invalid query parameters', 400);
    }

    // Get users
    const result = await UserRoleService.getAllUsers(
      user.id,
      validationResult.data.limit,
      validationResult.data.offset
    );

    if (result.success && result.data) {
      return ApiResponse.success({
        users: result.data,
        pagination: {
          limit: validationResult.data.limit,
          offset: validationResult.data.offset,
          hasMore: result.data.length === validationResult.data.limit
        }
      });
    } else {
      return ApiResponse.error(result.error || 'Failed to fetch users');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch users');
  }
}

/**
 * PATCH /api/admin/users
 * ----------------------
 * Update user role (admin only).
 * 
 * WHY: Allows administrators to change user roles and permissions.
 * Implements secure role management with proper validation.
 * 
 * Security considerations:
 * - Admin-only operation
 * - Role hierarchy enforcement
 * - Audit logging
 * - Input validation
 * 
 * @param request - NextRequest with role update data
 * @returns Success status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = adminLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    // Require authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    // Get user profile to check permissions
    const userProfile = await UserRoleService.getUserProfile(user.id);
    if (!userProfile.success || !userProfile.data) {
      return ApiResponse.error('User profile not found', 404);
    }

    // Check admin permissions
    if (!userProfile.data.permissions.canManageRoles) {
      return ApiResponse.error('Insufficient permissions', 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);
    
    if (!validationResult.success) {
      return ApiResponse.error(
        'Invalid request data: ' + validationResult.error.errors.map(e => e.message).join(', '),
        400
      );
    }

    const { userId, role } = validationResult.data;

    // Prevent self-role changes
    if (userId === user.id) {
      return ApiResponse.error('Cannot change your own role', 400);
    }

    // Update user role
    const result = await UserRoleService.updateUserRole(userId, role, user.id);

    if (result.success) {
      return ApiResponse.success({
        message: 'User role updated successfully',
        userId,
        newRole: role
      });
    } else {
      return ApiResponse.error(result.error || 'Failed to update user role');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to update user role');
  }
}

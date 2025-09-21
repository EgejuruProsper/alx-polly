import { NextRequest } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { ApiResponse, getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limiter';

/**
 * Analytics API Route
 * ------------------
 * Handles analytics data requests for polls and system-wide metrics.
 * 
 * WHY: Provides secure API endpoints for analytics with proper authorization.
 * Ensures only authorized users can access analytics data.
 * 
 * Security considerations:
 * - Role-based access control
 * - Rate limiting
 * - Input validation
 * - Data privacy protection
 * 
 * Edge cases:
 * - Unauthorized access → 401
 * - Insufficient permissions → 403
 * - Invalid data → 400
 * - Rate limiting → 429
 */

// Rate limiting for analytics requests
const analyticsLimiter = rateLimit({ windowMs: 60000, maxRequests: 20 }); // 20 requests per minute

// Input validation schemas
const pollAnalyticsSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID')
});

const systemAnalyticsSchema = z.object({
  type: z.enum(['system'], {
    errorMap: () => ({ message: 'Type must be system' })
  })
});

/**
 * GET /api/analytics
 * ------------------
 * Get analytics data for polls or system-wide metrics.
 * 
 * WHY: Provides analytics data with proper authorization and rate limiting.
 * Supports both individual poll analytics and system-wide metrics.
 * 
 * Security considerations:
 * - Role-based access control
 * - Rate limiting
 * - Input validation
 * - Data privacy protection
 * 
 * @param request - NextRequest with query parameters
 * @returns Analytics data
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = analyticsLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    // Require authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return ApiResponse.unauthorized(authError);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const type = searchParams.get('type');

    // Handle poll analytics request
    if (pollId) {
      const validationResult = pollAnalyticsSchema.safeParse({ pollId });
      if (!validationResult.success) {
        return ApiResponse.error('Invalid poll ID', 400);
      }

      const result = await AnalyticsService.getPollAnalytics(pollId, user.id);
      
      if (result.success && result.data) {
        return ApiResponse.success(result.data);
      } else {
        return ApiResponse.error(result.error || 'Failed to fetch poll analytics');
      }
    }

    // Handle system analytics request
    if (type === 'system') {
      const validationResult = systemAnalyticsSchema.safeParse({ type });
      if (!validationResult.success) {
        return ApiResponse.error('Invalid request type', 400);
      }

      const result = await AnalyticsService.getSystemAnalytics(user.id);
      
      if (result.success && result.data) {
        return ApiResponse.success(result.data);
      } else {
        return ApiResponse.error(result.error || 'Failed to fetch system analytics');
      }
    }

    return ApiResponse.error('Missing required parameters', 400);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch analytics');
  }
}

/**
 * POST /api/analytics/track
 * -------------------------
 * Track analytics events for polls.
 * 
 * WHY: Records user interactions for analytics and engagement tracking.
 * Essential for understanding user behavior and platform usage.
 * 
 * Security considerations:
 * - Input validation
 * - Rate limiting
 * - Data sanitization
 * - Privacy compliance
 * 
 * @param request - NextRequest with tracking data
 * @returns Success status
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = analyticsLimiter(request);
    if (!rateLimitResult.allowed) {
      return ApiResponse.error('Too many requests', 429);
    }

    // Parse request body
    const body = await request.json();
    const { pollId, actionType, metadata = {} } = body;

    // Validate input
    if (!pollId || !actionType) {
      return ApiResponse.error('Missing required fields', 400);
    }

    if (!['view', 'vote', 'share', 'comment'].includes(actionType)) {
      return ApiResponse.error('Invalid action type', 400);
    }

    // Get user ID (optional for anonymous tracking)
    const { user } = await getAuthenticatedUser(request);
    const userId = user?.id || null;

    // Track the event
    await AnalyticsService.trackPollEvent(pollId, userId, actionType, metadata);

    return ApiResponse.success({ message: 'Event tracked successfully' });
  } catch (error) {
    return handleApiError(error, 'Failed to track event');
  }
}

import { supabase } from '@/lib/supabase-client';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ServiceResult } from './poll-service';

/**
 * AuthUser interface
 * 
 * WHY: Standardizes user data structure across the application.
 * Provides consistent user representation with essential fields.
 * 
 * Security considerations:
 * - No sensitive data (passwords, tokens) stored in this interface
 * - Dates are properly typed for validation
 * - Optional fields allow for gradual profile completion
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SignInCredentials interface
 * 
 * WHY: Type-safe credential validation for login operations.
 * Prevents credential injection and ensures proper data structure.
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * SignUpData interface
 * 
 * WHY: Validates user registration data with required fields.
 * Ensures all necessary information is collected during signup.
 */
export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

/**
 * UpdateProfileData interface
 * 
 * WHY: Allows partial profile updates without requiring all fields.
 * Enables flexible profile management with optional field updates.
 */
export interface UpdateProfileData {
  name?: string;
  email?: string;
  avatar?: string;
}

/**
 * AuthService
 * -----------
 * Centralized authentication service with secure session management.
 * 
 * WHY: Encapsulates all authentication logic in one place, ensuring consistent
 * security practices and preventing authentication code duplication.
 * 
 * Security considerations:
 * - Server-side session validation for protected operations
 * - No sensitive data exposed to client
 * - Proper error handling without information disclosure
 * - Session tokens managed by Supabase (httpOnly cookies)
 * 
 * Edge cases:
 * - Network failures → graceful error handling
 * - Invalid credentials → generic error messages
 * - Session expiration → automatic cleanup
 */
export class AuthService {
  /**
   * Get appropriate Supabase client based on context
   * 
   * WHY: Ensures correct client configuration for server vs client operations.
   * Server operations need different authentication context than client operations.
   * 
   * @param isServer - Whether this is a server-side operation
   * @returns Configured Supabase client
   */
  private static getSupabaseClient(isServer: boolean = false) {
    if (isServer) {
      return createServerSupabaseClient();
    }
    return supabase;
  }

  /**
   * Sign in user with email and password
   * 
   * WHY: Provides secure authentication with proper session management.
   * Uses Supabase's built-in authentication with server-side session handling.
   * 
   * Security considerations:
   * - Credentials validated by Supabase
   * - Session tokens stored in httpOnly cookies
   * - No sensitive data returned to client
   * 
   * Edge cases:
   * - Invalid credentials → generic error message
   * - Network errors → handled gracefully
   * - Account locked → handled by Supabase
   * 
   * @param credentials - User login credentials
   * @returns ServiceResult with user data or error
   */
  static async signIn(credentials: SignInCredentials): Promise<ServiceResult<AuthUser>> {
    try {
      // Use Supabase's secure authentication method
      const { data, error } = await this.getSupabaseClient()
        .auth
        .signInWithPassword({
          email: credentials.email,
          password: credentials.password
        });

      if (error) {
        // Return generic error to prevent information disclosure
        return { success: false, error: 'Invalid credentials' };
      }

      if (!data.user) {
        return { success: false, error: 'Authentication failed' };
      }

      // Transform user data to our interface
      const user = this.transformUser(data.user);
      return { success: true, data: user };
    } catch (error) {
      // Log error for monitoring but don't expose details
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: 'Authentication failed' 
      };
    }
  }

  /**
   * Register new user account
   * 
   * WHY: Creates new user accounts with proper validation and metadata.
   * Uses Supabase's secure registration with email verification.
   * 
   * Security considerations:
   * - Password strength validated by Supabase
   * - Email verification required (configurable)
   * - User metadata stored securely
   * 
   * Edge cases:
   * - Email already exists → handled by Supabase
   * - Weak password → validation error
   * - Network errors → graceful handling
   * 
   * @param userData - User registration information
   * @returns ServiceResult with user data or error
   */
  static async signUp(userData: SignUpData): Promise<ServiceResult<AuthUser>> {
    try {
      const { data, error } = await this.getSupabaseClient()
        .auth
        .signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name
            }
          }
        });

      if (error) {
        // Sanitize error messages to prevent information disclosure
        return { success: false, error: 'Registration failed' };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed' };
      }

      const user = this.transformUser(data.user);
      return { success: true, data: user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        success: false, 
        error: 'Registration failed' 
      };
    }
  }

  static async signOut(): Promise<ServiceResult<null>> {
    try {
      const { error } = await this.getSupabaseClient().auth.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: null };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to sign out' 
      };
    }
  }

  static async getCurrentUser(): Promise<ServiceResult<AuthUser | null>> {
    try {
      const { data: { user }, error } = await this.getSupabaseClient().auth.getUser();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!user) {
        return { success: true, data: null };
      }

      const transformedUser = this.transformUser(user);
      return { success: true, data: transformedUser };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to get current user' 
      };
    }
  }

  static async updateProfile(updates: UpdateProfileData): Promise<ServiceResult<AuthUser>> {
    try {
      const { data, error } = await this.getSupabaseClient()
        .auth
        .updateUser({
          email: updates.email,
          data: {
            name: updates.name,
            avatar: updates.avatar
          }
        });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user data returned' };
      }

      const user = this.transformUser(data.user);
      return { success: true, data: user };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to update profile' 
      };
    }
  }

  static async resetPassword(email: string): Promise<ServiceResult<null>> {
    try {
      const { error } = await this.getSupabaseClient()
        .auth
        .resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: null };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to reset password' 
      };
    }
  }

  static async updatePassword(newPassword: string): Promise<ServiceResult<null>> {
    try {
      const { error } = await this.getSupabaseClient()
        .auth
        .updateUser({
          password: newPassword
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: null };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to update password' 
      };
    }
  }

  static async refreshSession(): Promise<ServiceResult<AuthUser | null>> {
    try {
      const { data, error } = await this.getSupabaseClient()
        .auth
        .refreshSession();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: true, data: null };
      }

      const user = this.transformUser(data.user);
      return { success: true, data: user };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message || 'Failed to refresh session' 
      };
    }
  }

  /**
   * Transform Supabase user to AuthUser interface
   * 
   * WHY: Standardizes user data format and handles Supabase's metadata structure.
   * Ensures consistent user representation across the application.
   * 
   * Security considerations:
   * - No sensitive data exposed
   * - Proper date handling
   * - Fallback values for missing data
   * 
   * Edge cases:
   * - Missing metadata → fallback to empty string
   * - Invalid dates → handled by Date constructor
   * - Missing updated_at → fallback to created_at
   * 
   * @param user - Raw Supabase user object
   * @returns Standardized AuthUser object
   */
  static transformUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      // Handle both old and new metadata formats
      name: user.user_metadata?.name || user.raw_user_meta_data?.name || '',
      avatar: user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at)
    };
  }

  /**
   * Get authenticated user on server-side
   * 
   * WHY: Provides server-side authentication for API routes and server components.
   * Uses server-side Supabase client with proper session handling.
   * 
   * Security considerations:
   * - Server-side session validation
   * - No client-side token exposure
   * - Proper error handling without information disclosure
   * 
   * Edge cases:
   * - No session → returns null (not error)
   * - Invalid session → handled gracefully
   * - Network errors → generic error message
   * 
   * @param request - NextRequest object (for future use)
   * @returns ServiceResult with user data or null if not authenticated
   */
  static async getServerUser(request: Request): Promise<ServiceResult<AuthUser | null>> {
    try {
      // Use server-side Supabase client for authentication
      const supabase = createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        // Log error for monitoring but don't expose details
        console.error('Server auth error:', error);
        return { success: false, error: 'Authentication failed' };
      }

      if (!user) {
        // No user is not an error - just means not authenticated
        return { success: true, data: null };
      }

      const transformedUser = this.transformUser(user);
      return { success: true, data: transformedUser };
    } catch (error) {
      console.error('Server user fetch error:', error);
      return { 
        success: false, 
        error: 'Authentication failed' 
      };
    }
  }
}

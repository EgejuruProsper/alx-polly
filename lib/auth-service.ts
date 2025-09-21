import { supabase, createServerSupabaseClient } from '@/app/lib/supabase';
import { ServiceResult } from './poll-service';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  avatar?: string;
}

export class AuthService {
  private static getSupabaseClient(isServer: boolean = false) {
    if (isServer) {
      return createServerSupabaseClient();
    }
    return supabase;
  }

  static async signIn(credentials: SignInCredentials): Promise<ServiceResult<AuthUser>> {
    try {
      const { data, error } = await this.getSupabaseClient()
        .auth
        .signInWithPassword({
          email: credentials.email,
          password: credentials.password
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
        error: (error as Error).message || 'Failed to sign in' 
      };
    }
  }

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
        error: (error as Error).message || 'Failed to sign up' 
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

  static transformUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.raw_user_meta_data?.name || '',
      avatar: user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at)
    };
  }

  // Server-side authentication helpers
  static async getServerUser(request: Request): Promise<ServiceResult<AuthUser | null>> {
    try {
      const supabase = createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();

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
        error: (error as Error).message || 'Failed to get server user' 
      };
    }
  }
}

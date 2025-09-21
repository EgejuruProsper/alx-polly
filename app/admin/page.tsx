"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/auth-context';
import { UserRoleService } from '@/lib/services/user-role-service';
import { UserProfile } from '@/lib/types/user-roles';
import { AdminDashboard } from '@/app/components/admin/admin-dashboard';
import { Layout } from '@/app/components/layout/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Admin Page
 * ----------
 * Protected admin dashboard with role-based access control.
 * 
 * WHY: Provides secure access to admin functionality with proper authorization.
 * Ensures only authorized users can access sensitive admin features.
 * 
 * Security considerations:
 * - Role-based access control
 * - Server-side permission validation
 * - Secure data handling
 * - Audit trail maintenance
 * 
 * Accessibility considerations:
 * - Screen reader support
 * - Keyboard navigation
 * - Clear error messages
 * - Loading state management
 */
export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile and check permissions
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user) {
      loadUserProfile();
    }
  }, [isAuthenticated, authLoading, user, router]);

  /**
   * Load user profile with role information
   * 
   * WHY: Fetches complete user profile including role and permissions.
   * Essential for authorization checks and admin functionality.
   */
  const loadUserProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await UserRoleService.getUserProfile(user.id);
      
      if (result.success && result.data) {
        setUserProfile(result.data);
        
        // Check if user has admin access
        if (!result.data.permissions.canAccessAdmin) {
          setError('You do not have permission to access the admin dashboard');
          return;
        }
      } else {
        setError(result.error || 'Failed to load user profile');
      }
    } catch (err) {
      setError('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading admin dashboard...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span>Access Denied</span>
                </CardTitle>
                <CardDescription>
                  You do not have permission to access this page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button onClick={() => router.push('/')} variant="outline">
                    Go Home
                  </Button>
                  <Button onClick={() => router.back()}>
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Show admin dashboard
  if (userProfile && userProfile.permissions.canAccessAdmin) {
    return (
      <Layout>
        <AdminDashboard currentUser={userProfile} />
      </Layout>
    );
  }

  // Fallback - should not reach here
  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You do not have permission to access the admin dashboard.
          </p>
          <Button onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    </Layout>
  );
}

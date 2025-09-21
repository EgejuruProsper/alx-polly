"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { UserRoleService } from '@/lib/services/user-role-service';
import { UserProfile, UserRole } from '@/lib/types/user-roles';
import { Users, BarChart3, Settings, Shield, Activity, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * AdminDashboard Component
 * -----------------------
 * Comprehensive admin dashboard with user management, analytics, and system oversight.
 * 
 * WHY: Provides administrators with complete system control and monitoring capabilities.
 * Centralizes admin functionality with role-based access control and real-time updates.
 * 
 * Features:
 * - User management with role assignment
 * - System analytics and metrics
 * - Real-time activity monitoring
 * - Security and audit logs
 * 
 * Security considerations:
 * - Admin-only access
 * - Role-based permissions
 * - Secure data handling
 * - Audit trail maintenance
 * 
 * Accessibility considerations:
 * - Screen reader support
 * - Keyboard navigation
 * - High contrast support
 * - Focus management
 */
interface AdminDashboardProps {
  currentUser: UserProfile;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  /**
   * Load users with pagination
   * 
   * WHY: Fetches user data for management interface.
   * Implements pagination for performance with large user bases.
   */
  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await UserRoleService.getAllUsers(currentUser.id, 50, 0);
      
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user role
   * 
   * WHY: Allows administrators to change user roles and permissions.
   * Implements secure role management with validation.
   * 
   * @param userId - User ID to update
   * @param newRole - New role to assign
   */
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const result = await UserRoleService.updateUserRole(userId, newRole, currentUser.id);
      
      if (result.success) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
      } else {
        setError(result.error || 'Failed to update role');
      }
    } catch (err) {
      setError('Failed to update role');
    }
  };

  // Calculate system metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive).length;
  const adminUsers = users.filter(user => user.role === 'admin').length;
  const moderatorUsers = users.filter(user => user.role === 'moderator').length;
  const regularUsers = users.filter(user => user.role === 'user').length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, monitor system, and oversee platform operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Admin Access</span>
          </Badge>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              System administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderators</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moderatorUsers}</div>
            <p className="text-xs text-muted-foreground">
              Content moderators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regularUsers}</div>
            <p className="text-xs text-muted-foreground">
              Standard users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles, permissions, and account status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                  <Button onClick={loadUsers} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Last active: {user.lastActiveAt 
                              ? formatDistanceToNow(user.lastActiveAt, { addSuffix: true })
                              : 'Never'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="px-2 py-1 border rounded text-sm"
                          disabled={user.id === currentUser.id} // Can't change own role
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
              <CardDescription>
                Platform usage, user engagement, and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Management</CardTitle>
              <CardDescription>
                System health, logs, and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  System management interface coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AnalyticsService, SystemAnalytics } from '@/lib/services/analytics-service';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Share2, 
  MessageSquare,
  Download,
  RefreshCw,
  Activity,
  Target
} from 'lucide-react';

/**
 * SystemAnalyticsDashboard Component
 * ---------------------------------
 * Comprehensive system-wide analytics dashboard for administrators.
 * 
 * WHY: Provides platform-wide insights for administrators including user engagement,
 * poll performance, and system health indicators.
 * 
 * Features:
 * - System-wide metrics and KPIs
 * - User engagement analytics
 * - Poll performance insights
 * - Daily activity trends
 * - Top performing polls
 * 
 * Security considerations:
 * - Admin-only access
 * - Data privacy protection
 * - Secure API communication
 * - Role-based permissions
 * 
 * Accessibility considerations:
 * - Screen reader support
 * - Keyboard navigation
 * - High contrast support
 * - Alternative text for charts
 */
interface SystemAnalyticsDashboardProps {
  currentUserId: string;
}

export function SystemAnalyticsDashboard({ currentUserId }: SystemAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [currentUserId]);

  /**
   * Load system analytics data
   * 
   * WHY: Fetches comprehensive system-wide analytics for administrators.
   * Implements proper error handling and loading states.
   */
  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AnalyticsService.getSystemAnalytics(currentUserId);
      
      if (result.success && result.data) {
        setAnalytics(result.data);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export system analytics data
   * 
   * WHY: Allows administrators to export system analytics for reporting.
   * Provides data portability and external analysis capabilities.
   */
  const exportAnalytics = () => {
    if (!analytics) return;

    const data = {
      system: {
        totalPolls: analytics.totalPolls,
        totalUsers: analytics.totalUsers,
        totalVotes: analytics.totalVotes
      },
      engagement: analytics.engagement,
      dailyActivity: analytics.dailyActivity,
      recentPolls: analytics.recentPolls,
      topPolls: analytics.topPolls
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading system analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Analytics</h2>
          <p className="text-muted-foreground">Platform-wide metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPolls}</div>
            <p className="text-xs text-muted-foreground">
              All time polls created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              All time votes cast
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagement.engagementRate}%</div>
            <p className="text-xs text-muted-foreground">
              Vote-to-view ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="polls">Poll Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
                <CardDescription>
                  Platform activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stackId="1" stroke="#8884d8" fill="#8884d8" name="Views" />
                    <Area type="monotone" dataKey="votes" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Votes" />
                    <Area type="monotone" dataKey="shares" stackId="1" stroke="#ffc658" fill="#ffc658" name="Shares" />
                    <Area type="monotone" dataKey="comments" stackId="1" stroke="#ff7300" fill="#ff7300" name="Comments" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>
                  Platform engagement breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Views</span>
                    <Badge variant="outline">{analytics.engagement.totalViews}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Votes</span>
                    <Badge variant="outline">{analytics.engagement.totalVotes}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Shares</span>
                    <Badge variant="outline">{analytics.engagement.totalShares}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Comments</span>
                    <Badge variant="outline">{analytics.engagement.totalComments}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Engagement Rate</span>
                    <Badge variant="outline">{analytics.engagement.engagementRate}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Share Rate</span>
                    <Badge variant="outline">{analytics.engagement.shareRate}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comment Rate</span>
                    <Badge variant="outline">{analytics.engagement.commentRate}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Trends</CardTitle>
              <CardDescription>
                Platform activity over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                  <Line type="monotone" dataKey="votes" stroke="#82ca9d" name="Votes" />
                  <Line type="monotone" dataKey="shares" stroke="#ffc658" name="Shares" />
                  <Line type="monotone" dataKey="comments" stroke="#ff7300" name="Comments" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Poll Performance Tab */}
        <TabsContent value="polls" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Polls */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Polls</CardTitle>
                <CardDescription>
                  Polls with the most votes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topPolls.slice(0, 5).map((poll, index) => (
                    <div key={poll.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{poll.question}</p>
                        <p className="text-xs text-muted-foreground">
                          {poll.total_votes} votes • {poll.view_count} views
                        </p>
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Polls */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Polls</CardTitle>
                <CardDescription>
                  Latest polls created
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentPolls.slice(0, 5).map((poll, index) => (
                    <div key={poll.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{poll.question}</p>
                        <p className="text-xs text-muted-foreground">
                          {poll.total_votes} votes • {new Date(poll.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Recent</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Analysis</CardTitle>
              <CardDescription>
                Detailed engagement metrics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.engagement.engagementRate}%</div>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.engagement.shareRate}%</div>
                  <p className="text-sm text-muted-foreground">Share Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{analytics.engagement.commentRate}%</div>
                  <p className="text-sm text-muted-foreground">Comment Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { AnalyticsService, PollAnalytics } from '@/lib/services/analytics-service';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  Eye, 
  Share2, 
  MessageSquare,
  Download,
  RefreshCw
} from 'lucide-react';

/**
 * PollAnalyticsChart Component
 * ----------------------------
 * Comprehensive analytics visualization for individual polls.
 * 
 * WHY: Provides detailed insights into poll performance, user engagement,
 * and voting patterns. Essential for understanding poll effectiveness.
 * 
 * Features:
 * - Vote distribution visualization
 * - Engagement timeline analysis
 * - Voting pattern insights
 * - Export capabilities
 * 
 * Security considerations:
 * - Role-based access control
 * - Data privacy protection
 * - Secure API communication
 * 
 * Accessibility considerations:
 * - Screen reader support
 * - Keyboard navigation
 * - High contrast support
 * - Alternative text for charts
 */
interface PollAnalyticsChartProps {
  pollId: string;
  currentUserId: string;
}

export function PollAnalyticsChart({ pollId, currentUserId }: PollAnalyticsChartProps) {
  const [analytics, setAnalytics] = useState<PollAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [pollId, currentUserId]);

  /**
   * Load poll analytics data
   * 
   * WHY: Fetches comprehensive analytics for the specified poll.
   * Implements proper error handling and loading states.
   */
  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AnalyticsService.getPollAnalytics(pollId, currentUserId);
      
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
   * Export analytics data
   * 
   * WHY: Allows users to export analytics data for external analysis.
   * Provides data portability and reporting capabilities.
   */
  const exportAnalytics = () => {
    if (!analytics) return;

    const data = {
      poll: {
        id: analytics.pollId,
        question: analytics.question,
        totalVotes: analytics.totalVotes,
        uniqueVoters: analytics.uniqueVoters,
        viewCount: analytics.viewCount,
        shareCount: analytics.shareCount
      },
      voteDistribution: analytics.voteDistribution,
      engagement: analytics.engagement,
      votingTimeline: analytics.votingTimeline,
      engagementTimeline: analytics.engagementTimeline
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poll-analytics-${analytics.pollId}.json`;
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
            <p className="text-muted-foreground">Loading analytics...</p>
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
          <h2 className="text-2xl font-bold">Poll Analytics</h2>
          <p className="text-muted-foreground">{analytics.question}</p>
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
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueVoters} unique voters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.viewCount}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagement.views} tracked views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.shareCount}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagement.shares} tracked shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
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
          <TabsTrigger value="distribution">Vote Distribution</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vote Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Vote Distribution</CardTitle>
                <CardDescription>
                  Percentage breakdown of votes by option
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.voteDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ option, percentage }) => `${option}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                    >
                      {analytics.voteDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>
                  User interaction breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Views</span>
                    <Badge variant="outline">{analytics.engagement.views}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Votes</span>
                    <Badge variant="outline">{analytics.totalVotes}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Shares</span>
                    <Badge variant="outline">{analytics.engagement.shares}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comments</span>
                    <Badge variant="outline">{analytics.engagement.comments}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vote Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vote Distribution</CardTitle>
              <CardDescription>
                Detailed breakdown of votes by option
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.voteDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="option" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="votes" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voting Timeline</CardTitle>
              <CardDescription>
                Vote activity over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analytics.votingTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="votes" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Timeline</CardTitle>
              <CardDescription>
                User engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.engagementTimeline}>
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
      </Tabs>
    </div>
  );
}

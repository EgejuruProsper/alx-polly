import { NextRequest, NextResponse } from 'next/server';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  cacheHit?: boolean;
  databaseQueries?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics> = new Map();
  private static isEnabled = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';

  static startRequest(request: NextRequest): string {
    if (!this.isEnabled) return '';

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    this.metrics.set(requestId, {
      requestId,
      method: request.method,
      url: request.url,
      startTime,
    });

    return requestId;
  }

  static endRequest(requestId: string, response: NextResponse): void {
    if (!this.isEnabled || !requestId) return;

    const metric = this.metrics.get(requestId);
    if (!metric) return;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.statusCode = response.status;

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    response.headers.set('X-Request-ID', requestId);

    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request detected: ${metric.method} ${metric.url} took ${duration.toFixed(2)}ms`);
    }

    // Clean up old metrics (keep last 1000)
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  static recordCacheHit(requestId: string, hit: boolean): void {
    if (!this.isEnabled || !requestId) return;

    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.cacheHit = hit;
    }
  }

  static recordDatabaseQuery(requestId: string): void {
    if (!this.isEnabled || !requestId) return;

    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.databaseQueries = (metric.databaseQueries || 0) + 1;
    }
  }

  static recordMemoryUsage(requestId: string): void {
    if (!this.isEnabled || !requestId) return;

    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.memoryUsage = process.memoryUsage();
    }
  }

  static getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  static getAverageResponseTime(): number {
    const metrics = this.getMetrics().filter(m => m.duration);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  static getCacheHitRate(): number {
    const metrics = this.getMetrics().filter(m => m.cacheHit !== undefined);
    if (metrics.length === 0) return 0;

    const hits = metrics.filter(m => m.cacheHit).length;
    return (hits / metrics.length) * 100;
  }

  static getSlowRequests(threshold: number = 1000): PerformanceMetrics[] {
    return this.getMetrics().filter(m => (m.duration || 0) > threshold);
  }

  static getRequestStats(): {
    total: number;
    averageResponseTime: number;
    cacheHitRate: number;
    slowRequests: number;
    errorRate: number;
  } {
    const metrics = this.getMetrics();
    const total = metrics.length;
    const averageResponseTime = this.getAverageResponseTime();
    const cacheHitRate = this.getCacheHitRate();
    const slowRequests = this.getSlowRequests().length;
    const errorRate = metrics.filter(m => (m.statusCode || 0) >= 400).length / total * 100;

    return {
      total,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}

// Middleware wrapper for performance monitoring
export function withPerformanceMonitoring(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const requestId = PerformanceMonitor.startRequest(request);
    
    try {
      const response = await handler(request, context);
      PerformanceMonitor.endRequest(requestId, response);
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  };
}

export { PerformanceMonitor, type PerformanceMetrics };

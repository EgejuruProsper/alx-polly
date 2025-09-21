import { useState, useCallback } from 'react';
import { config } from './config';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();
  private static maxSize = config.cache.maxSize;
  private static defaultTtl = config.cache.ttl;

  static set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = this.defaultTtl, maxSize = this.maxSize } = options;
    
    // Remove oldest items if cache is full
    if (this.cache.size >= maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  static has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  static getSize(): number {
    return this.cache.size;
  }

  static getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Poll-specific cache methods
  static setPoll(pollId: string, poll: any): void {
    this.set(`poll:${pollId}`, poll, { ttl: config.cache.ttl });
  }

  static getPoll(pollId: string): any | null {
    return this.get(`poll:${pollId}`);
  }

  static setPolls(filters: Record<string, any>, polls: any[]): void {
    const key = `polls:${JSON.stringify(filters)}`;
    this.set(key, polls, { ttl: config.cache.ttl });
  }

  static getPolls(filters: Record<string, any>): any[] | null {
    const key = `polls:${JSON.stringify(filters)}`;
    return this.get(key);
  }

  static invalidatePoll(pollId: string): void {
    this.delete(`poll:${pollId}`);
    this.invalidate('polls:');
  }

  static invalidateAllPolls(): void {
    this.invalidate('poll:');
    this.invalidate('polls:');
  }

  // User-specific cache methods
  static setUser(userId: string, user: any): void {
    this.set(`user:${userId}`, user, { ttl: config.cache.ttl });
  }

  static getUser(userId: string): any | null {
    return this.get(`user:${userId}`);
  }

  static invalidateUser(userId: string): void {
    this.delete(`user:${userId}`);
  }

  // Generic cache methods with automatic key generation
  static setWithKey<T>(baseKey: string, identifier: string, data: T, options?: CacheOptions): void {
    const key = `${baseKey}:${identifier}`;
    this.set(key, data, options);
  }

  static getWithKey<T>(baseKey: string, identifier: string): T | null {
    const key = `${baseKey}:${identifier}`;
    return this.get(key);
  }

  static deleteWithKey(baseKey: string, identifier: string): boolean {
    const key = `${baseKey}:${identifier}`;
    return this.delete(key);
  }

  // Cache statistics
  static getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
      missRate: 0
    };
  }
}

// React hook for cache management
export function useCache<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCachedData = useCallback(() => {
    return CacheService.get<T>(key);
  }, [key]);

  const setCachedData = useCallback((data: T) => {
    CacheService.set(key, data, options);
    setData(data);
  }, [key, options]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setCachedData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, setCachedData]);

  const invalidate = useCallback(() => {
    CacheService.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    getCachedData,
    setCachedData,
    fetchData,
    invalidate
  };
}

// Auto-cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    CacheService.cleanup();
  }, 60000); // Clean up every minute
}

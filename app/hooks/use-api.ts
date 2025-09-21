"use client";

import { useState, useCallback } from 'react';
import { config } from '@/lib/config';

interface UseApiOptions<T> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (body?: any) => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
  setCachedData?: (data: T) => void;
}

export function useApi<T = any>({
  endpoint,
  method = 'GET',
  initialData = null as T,
  onSuccess,
  onError,
  retryAttempts = config.api.retryAttempts,
  retryDelay = config.api.retryDelay
}: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  const execute = useCallback(async (body?: any): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const url = `${config.api.baseUrl}${endpoint}`;
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        lastError = err as Error;
        
        // Don't retry on certain errors
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timeout');
          break;
        }

        if (err instanceof Error && err.message.includes('4')) {
          // Don't retry on 4xx errors
          setError(err.message);
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    const errorMessage = lastError?.message || 'An unexpected error occurred';
    setError(errorMessage);
    onError?.(errorMessage);
    return null;
  }, [endpoint, method, retryAttempts, retryDelay, onSuccess, onError]);

  const setCachedData = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
    clearError,
    setCachedData
  };
}

// Specialized hooks for common API patterns
export function useGet<T = any>(endpoint: string, options?: Omit<UseApiOptions<T>, 'endpoint' | 'method'>) {
  return useApi<T>({ ...options, endpoint, method: 'GET' });
}

export function usePost<T = any>(endpoint: string, options?: Omit<UseApiOptions<T>, 'endpoint' | 'method'>) {
  return useApi<T>({ ...options, endpoint, method: 'POST' });
}

export function usePut<T = any>(endpoint: string, options?: Omit<UseApiOptions<T>, 'endpoint' | 'method'>) {
  return useApi<T>({ ...options, endpoint, method: 'PUT' });
}

export function useDelete<T = any>(endpoint: string, options?: Omit<UseApiOptions<T>, 'endpoint' | 'method'>) {
  return useApi<T>({ ...options, endpoint, method: 'DELETE' });
}

// Hook for API calls with automatic retries and caching
export function useApiWithCache<T = any>(
  endpoint: string,
  options?: UseApiOptions<T> & {
    cacheKey?: string;
    staleTime?: number;
  }
) {
  const [cache, setCache] = useState<Map<string, { data: T; timestamp: number }>>(new Map());
  
  const api = useApi<T>({ ...options, endpoint });

  const executeWithCache = useCallback(async (body?: any): Promise<T | null> => {
    const cacheKey = options?.cacheKey || endpoint;
    const now = Date.now();
    const staleTime = options?.staleTime || config.cache.staleTime;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < staleTime) {
      api.setCachedData?.(cached.data);
      return cached.data;
    }

    // Execute API call
    const result = await api.execute(body);
    
    // Cache the result
    if (result) {
      setCache(prev => new Map(prev).set(cacheKey, { data: result, timestamp: now }));
    }

    return result;
  }, [endpoint, options, cache, api]);

  return {
    ...api,
    execute: executeWithCache
  };
}

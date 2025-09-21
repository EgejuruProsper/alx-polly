export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Poll Configuration
  polls: {
    maxOptions: 10,
    minOptions: 2,
    maxTitleLength: 200,
    maxDescriptionLength: 1000,
    maxOptionLength: 100,
    defaultExpirationHours: 24,
    minExpirationHours: 1,
    maxExpirationDays: 30,
  },

  // Cache Configuration
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100, // Maximum number of items in cache
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  },

  // Pagination Configuration
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultOffset: 0,
  },

  // Search Configuration
  search: {
    debounceMs: 300,
    minQueryLength: 2,
    maxQueryLength: 100,
  },

  // UI Configuration
  ui: {
    animationDuration: 200, // milliseconds
    toastDuration: 5000, // 5 seconds
    loadingSpinnerSize: 'md' as const,
    theme: 'light' as const,
  },

  // Authentication Configuration
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Feature Flags
  features: {
    enableRealTimeUpdates: false,
    enableAnalytics: false,
    enablePushNotifications: false,
    enableOfflineMode: false,
    enableAdvancedSearch: true,
    enablePollTemplates: false,
    enablePollSharing: true,
    enablePollEmbedding: false,
  },

  // Environment Configuration
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // External Services
  services: {
    analytics: {
      enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
      trackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID || '',
    },
    monitoring: {
      enabled: process.env.NEXT_PUBLIC_MONITORING_ENABLED === 'true',
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    },
  },

  // Validation Configuration
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    passwordMinLength: 6,
    passwordMaxLength: 100,
    nameMinLength: 2,
    nameMaxLength: 50,
    optionSimilarityThreshold: 0.8, // 80% similarity threshold
  },

  // Error Configuration
  error: {
    maxRetries: 3,
    retryDelay: 1000,
    showStackTrace: process.env.NODE_ENV === 'development',
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  },
} as const;

// Type-safe configuration access
export type Config = typeof config;

// Helper functions for configuration
export const getConfig = () => config;

export const isFeatureEnabled = (feature: keyof typeof config.features): boolean => {
  return config.features[feature];
};

export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

export const getCacheKey = (key: string): string => {
  return `poll-app:${key}`;
};

export const getValidationConfig = () => config.validation;

export const getPollConfig = () => config.polls;

export const getAuthConfig = () => config.auth;

// Environment-specific overrides
if (config.env.isDevelopment) {
  // Development-specific configuration
  (config.cache as any).ttl = 30 * 1000; // 30 seconds in development
  (config.cache as any).staleTime = 10 * 1000; // 10 seconds in development
}

if (config.env.isTest) {
  // Test-specific configuration
  (config.cache as any).ttl = 0; // No caching in tests
  (config.api as any).timeout = 5000; // Shorter timeout for tests
}

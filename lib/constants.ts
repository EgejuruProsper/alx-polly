// App constants
export const APP_NAME = "Alx Polly";
export const APP_DESCRIPTION = "A modern polling application";

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
  },
  POLLS: {
    LIST: "/api/polls",
    CREATE: "/api/polls",
    GET: "/api/polls/[id]",
    UPDATE: "/api/polls/[id]",
    DELETE: "/api/polls/[id]",
    VOTE: "/api/polls/[id]/vote",
  },
} as const;

// Poll settings
export const POLL_SETTINGS = {
  MAX_OPTIONS: 10,
  MIN_OPTIONS: 2,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_OPTION_LENGTH: 100,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  PROFILE: "/profile",
  POLLS: "/polls",
  CREATE_POLL: "/polls/create",
  POLL_DETAILS: "/polls/[id]",
} as const;

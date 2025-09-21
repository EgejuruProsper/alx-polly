// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Poll types - Updated to match Supabase schema from rules
export interface Poll {
  id: string;
  question: string; // Changed from title to question per rules
  options: PollOption[]; // Array of PollOption objects
  votes: number[]; // Array of vote counts per rules
  created_at: string; // ISO string per rules
  created_by: string;
  is_public: boolean;
  is_active: boolean;
  expires_at?: string;
  allow_multiple_votes?: boolean;
  description?: string;
  author?: User; // Optional for display purposes
}

// Legacy interface for backward compatibility
export interface PollOption {
  id: string;
  text: string;
  votes: number;
  pollId: string;
}

// Vote types
export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: Date;
}

// Authentication types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface CreatePollForm {
  title: string;
  description?: string;
  options: string[];
  isPublic: boolean;
  allowMultipleVotes: boolean;
  expiresAt?: Date;
}

export interface UpdatePollForm {
  title?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  allowMultipleVotes?: boolean;
  expiresAt?: Date;
}

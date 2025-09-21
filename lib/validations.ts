import { z } from "zod";

// Helper function to calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Auth validations
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "📧 Please enter your email address")
    .email("📧 Please enter a valid email address"),
  password: z
    .string()
    .min(6, "🔒 Password must be at least 6 characters long"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "👤 Name must be at least 2 characters")
    .max(50, "👤 Name is too long (maximum 50 characters)"),
  email: z
    .string()
    .trim()
    .min(1, "📧 Please enter your email address")
    .email("📧 Please enter a valid email address"),
  password: z
    .string()
    .min(6, "🔒 Password must be at least 6 characters long")
    .max(100, "🔒 Password is too long"),
  confirmPassword: z.string().min(1, "🔒 Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "🔒 Passwords don't match. Please try again.",
  path: ["confirmPassword"],
});

// Poll validations
export const createPollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "✨ Give your poll a catchy title!")
    .max(200, "📝 Title is too long - keep it under 200 characters")
    .refine((val) => val.length > 0, "🎯 Poll title is required"),
  description: z
    .string()
    .trim()
    .max(1000, "📝 Description is too long - keep it under 1000 characters")
    .optional()
    .or(z.literal("")),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "❌ This option is empty - please add some text")
        .max(100, "📝 Option is too long - keep it under 100 characters")
        .refine((val) => val.length > 0, "❌ Poll option cannot be empty")
        .refine(
          (val) => !/^\s*$/.test(val), 
          "❌ Option cannot be just spaces"
        )
    )
    .min(2, "🎯 You need at least 2 options for a poll")
    .max(10, "📊 Maximum 10 options allowed")
    .refine(
      (options) => {
        // Check for empty options after trimming
        const trimmedOptions = options.map(opt => opt.trim());
        return trimmedOptions.every(opt => opt.length > 0);
      },
      {
        message: "❌ All poll options must have content - no empty options allowed",
        path: ["options"],
      }
    )
    .refine(
      (options) => {
        // Check for duplicate options (case-insensitive)
        const trimmedOptions = options.map(opt => opt.trim().toLowerCase());
        const uniqueOptions = new Set(trimmedOptions);
        return uniqueOptions.size === trimmedOptions.length;
      },
      {
        message: "🔄 Duplicate options detected - each option must be unique",
        path: ["options"],
      }
    )
    .refine(
      (options) => {
        // Check for options that are too similar (fuzzy matching)
        const trimmedOptions = options.map(opt => opt.trim().toLowerCase());
        for (let i = 0; i < trimmedOptions.length; i++) {
          for (let j = i + 1; j < trimmedOptions.length; j++) {
            const option1 = trimmedOptions[i];
            const option2 = trimmedOptions[j];
            // Check if options are very similar (80% similarity)
            const similarity = calculateSimilarity(option1, option2);
            if (similarity > 0.8) {
              return false;
            }
          }
        }
        return true;
      },
      {
        message: "🤔 These options look very similar - please make them more distinct",
        path: ["options"],
      }
    ),
  isPublic: z.boolean(),
  allowMultipleVotes: z.boolean(),
  expiresAt: z
    .date()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        return date > oneHourFromNow;
      },
      {
        message: "⏰ Expiration date must be at least 1 hour in the future",
        path: ["expiresAt"],
      }
    ),
});

export const updatePollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "✨ Give your poll a catchy title!")
    .max(200, "📝 Title is too long - keep it under 200 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "📝 Description is too long - keep it under 1000 characters")
    .optional()
    .or(z.literal("")),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "❌ This option is empty - please add some text")
        .max(100, "📝 Option is too long - keep it under 100 characters")
        .refine(
          (val) => !/^\s*$/.test(val), 
          "❌ Option cannot be just spaces"
        )
    )
    .min(2, "🎯 You need at least 2 options for a poll")
    .max(10, "📊 Maximum 10 options allowed")
    .refine(
      (options) => {
        // Check for empty options after trimming
        const trimmedOptions = options.map(opt => opt.trim());
        return trimmedOptions.every(opt => opt.length > 0);
      },
      {
        message: "❌ All poll options must have content - no empty options allowed",
        path: ["options"],
      }
    )
    .refine(
      (options) => {
        // Check for duplicate options (case-insensitive)
        const trimmedOptions = options.map(opt => opt.trim().toLowerCase());
        const uniqueOptions = new Set(trimmedOptions);
        return uniqueOptions.size === trimmedOptions.length;
      },
      {
        message: "🔄 Duplicate options detected - each option must be unique",
        path: ["options"],
      }
    )
    .refine(
      (options) => {
        // Check for options that are too similar (fuzzy matching)
        const trimmedOptions = options.map(opt => opt.trim().toLowerCase());
        for (let i = 0; i < trimmedOptions.length; i++) {
          for (let j = i + 1; j < trimmedOptions.length; j++) {
            const option1 = trimmedOptions[i];
            const option2 = trimmedOptions[j];
            // Check if options are very similar (80% similarity)
            const similarity = calculateSimilarity(option1, option2);
            if (similarity > 0.8) {
              return false;
            }
          }
        }
        return true;
      },
      {
        message: "🤔 These options look very similar - please make them more distinct",
        path: ["options"],
      }
    )
    .optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  allowMultipleVotes: z.boolean().optional(),
  expiresAt: z
    .date()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        return date > oneHourFromNow;
      },
      {
        message: "⏰ Expiration date must be at least 1 hour in the future",
        path: ["expiresAt"],
      }
    ),
});

export const voteSchema = z.object({
  optionId: z
    .string()
    .trim()
    .min(1, "🗳️ Please select an option to vote")
    .uuid("❌ Invalid option ID format"),
});

// Profile validations
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "👤 Name must be at least 2 characters")
    .max(50, "👤 Name is too long (maximum 50 characters)")
    .optional(),
  email: z
    .string()
    .trim()
    .email("📧 Please enter a valid email address")
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreatePollFormData = z.infer<typeof createPollSchema>;
export type UpdatePollFormData = z.infer<typeof updatePollSchema>;
export type VoteFormData = z.infer<typeof voteSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

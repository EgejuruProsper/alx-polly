import { z } from "zod";

// Auth validations
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long (maximum 50 characters)"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password is too long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please try again.",
  path: ["confirmPassword"],
});

// Poll validations
export const createPollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a poll title")
    .max(200, "Title is too long (maximum 200 characters)")
    .refine((val) => val.length > 0, "Poll title cannot be empty"),
  description: z
    .string()
    .trim()
    .max(1000, "Description is too long (maximum 1000 characters)")
    .optional()
    .or(z.literal("")),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Poll option cannot be empty")
        .max(100, "Option is too long (maximum 100 characters)")
        .refine((val) => val.length > 0, "Poll option cannot be empty")
    )
    .min(2, "Please provide at least 2 poll options")
    .max(10, "Maximum 10 options allowed")
    .refine(
      (options) => {
        // Check for empty options after trimming
        const trimmedOptions = options.map(opt => opt.trim());
        return trimmedOptions.every(opt => opt.length > 0);
      },
      {
        message: "All poll options must have content",
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
        message: "Duplicate options are not allowed. Please make each option unique.",
        path: ["options"],
      }
    ),
  isPublic: z.boolean().optional().default(true),
  allowMultipleVotes: z.boolean().optional().default(false),
  expiresAt: z
    .date()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return date > new Date();
      },
      {
        message: "Expiration date must be in the future",
        path: ["expiresAt"],
      }
    ),
});

export const updatePollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a poll title")
    .max(200, "Title is too long (maximum 200 characters)")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Description is too long (maximum 1000 characters)")
    .optional()
    .or(z.literal("")),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Poll option cannot be empty")
        .max(100, "Option is too long (maximum 100 characters)")
    )
    .min(2, "Please provide at least 2 poll options")
    .max(10, "Maximum 10 options allowed")
    .refine(
      (options) => {
        // Check for empty options after trimming
        const trimmedOptions = options.map(opt => opt.trim());
        return trimmedOptions.every(opt => opt.length > 0);
      },
      {
        message: "All poll options must have content",
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
        message: "Duplicate options are not allowed. Please make each option unique.",
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
        return date > new Date();
      },
      {
        message: "Expiration date must be in the future",
        path: ["expiresAt"],
      }
    ),
});

export const voteSchema = z.object({
  optionId: z
    .string()
    .trim()
    .min(1, "Please select an option to vote")
    .uuid("Invalid option ID format"),
});

// Profile validations
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long (maximum 50 characters)")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreatePollFormData = z.infer<typeof createPollSchema>;
export type UpdatePollFormData = z.infer<typeof updatePollSchema>;
export type VoteFormData = z.infer<typeof voteSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

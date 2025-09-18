import { z } from "zod";

// Auth validations
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Poll validations
export const createPollSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  options: z.array(z.string().min(1, "Option cannot be empty").max(100, "Option must be less than 100 characters"))
    .min(2, "At least 2 options are required")
    .max(10, "Maximum 10 options allowed"),
  isPublic: z.boolean().optional().default(true),
  allowMultipleVotes: z.boolean().optional().default(false),
  expiresAt: z.date().optional(),
});

export const updatePollSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  allowMultipleVotes: z.boolean().optional(),
  expiresAt: z.date().optional(),
});

export const voteSchema = z.object({
  optionId: z.string().min(1, "Option ID is required"),
});

// Profile validations
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreatePollFormData = z.infer<typeof createPollSchema>;
export type UpdatePollFormData = z.infer<typeof updatePollSchema>;
export type VoteFormData = z.infer<typeof voteSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

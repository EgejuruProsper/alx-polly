import { createPollSchema, type CreatePollFormData } from './validations';

export interface CreatePollOptions {
  title: string;
  description?: string;
  options: string[];
  isPublic?: boolean;
  allowMultipleVotes?: boolean;
  expiresAt?: Date;
}

export interface CreatePollResult {
  success: boolean;
  poll?: {
    id: string;
    title: string;
    description?: string;
    options: string[];
    votes: number[];
    isPublic: boolean;
    allowMultipleVotes: boolean;
    expiresAt?: Date;
    createdAt: Date;
  };
  error?: string;
}

/**
 * Creates a new poll with validation
 * @param pollData - The poll data to create
 * @returns Promise<CreatePollResult> - The result of the poll creation
 */
export async function createPoll(pollData: CreatePollOptions): Promise<CreatePollResult> {
  try {
    // Validate the input data using Zod schema
    const validatedData = createPollSchema.parse(pollData);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create the poll object
    const poll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: validatedData.title,
      description: validatedData.description,
      options: validatedData.options,
      votes: new Array(validatedData.options.length).fill(0),
      isPublic: validatedData.isPublic ?? true,
      allowMultipleVotes: validatedData.allowMultipleVotes ?? false,
      expiresAt: validatedData.expiresAt,
      createdAt: new Date()
    };

    return {
      success: true,
      poll
    };

  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

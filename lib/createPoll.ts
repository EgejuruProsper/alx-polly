import { createPollSchema, type CreatePollFormData } from './validations';
import { PollService } from './poll-service';

/**
 * Legacy function for backward compatibility
 * @deprecated Use PollService.createPoll() instead
 */
export async function createPoll(pollData: CreatePollFormData, userId: string) {
  return PollService.createPoll(pollData, userId);
}

// Re-export types for backward compatibility
export type { CreatePollFormData as CreatePollOptions };
export type { ServiceResult as CreatePollResult } from './poll-service';

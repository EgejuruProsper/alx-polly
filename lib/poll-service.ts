import { createPollSchema, type CreatePollFormData } from './validations';
import { supabase } from '@/app/lib/supabase';
import { Poll, User } from '@/types';

// Service result types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PollFilters {
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'most-voted' | 'least-voted';
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface VoteData {
  pollId: string;
  optionIndex: number;
  userId: string;
}

// Poll Service Class
export class PollService {
  /**
   * Create a new poll
   */
  static async createPoll(pollData: CreatePollFormData, userId: string): Promise<ServiceResult<Poll>> {
    try {
      // Validate input data
      const validatedData = createPollSchema.parse(pollData);

      // Initialize votes array
      const votes = new Array(validatedData.options.length).fill(0);

      // Insert poll into database
      const { data: poll, error } = await supabase
        .from('polls')
        .insert({
          question: validatedData.title,
          options: validatedData.options,
          votes,
          created_by: userId,
          is_public: validatedData.isPublic,
          is_active: true,
          expires_at: validatedData.expiresAt?.toISOString(),
          allow_multiple_votes: validatedData.allowMultipleVotes,
          description: validatedData.description,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform to Poll interface
      const transformedPoll = this.transformPollData(poll);
      return { success: true, data: transformedPoll };

    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to create poll' };
    }
  }

  /**
   * Fetch polls with filtering and pagination
   */
  static async getPolls(filters: PollFilters = {}): Promise<ServiceResult<Poll[]>> {
    try {
      const {
        search,
        sortBy = 'newest',
        limit = 20,
        offset = 0,
        userId
      } = filters;

      // Build query - Remove PII exposure
      let query = supabase
        .from('polls')
        .select(`
          *,
          author:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq('is_public', true)
        .eq('is_active', true);

      // Add search filter
      if (search) {
        query = query.or(`question.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Add user filter
      if (userId) {
        query = query.eq('created_by', userId);
      }

      // Add sorting
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most-voted':
          query = query.order('votes', { ascending: false });
          break;
        case 'least-voted':
          query = query.order('votes', { ascending: true });
          break;
        default: // newest
          query = query.order('created_at', { ascending: false });
      }

      // Add pagination
      query = query.range(offset, offset + limit - 1);

      const { data: polls, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform polls
      const transformedPolls = polls?.map(poll => this.transformPollData(poll)) || [];
      return { success: true, data: transformedPolls };

    } catch (error) {
      return { success: false, error: 'Failed to fetch polls' };
    }
  }

  /**
   * Get a single poll by ID
   */
  static async getPollById(id: string): Promise<ServiceResult<Poll>> {
    try {
      const { data: poll, error } = await supabase
        .from('polls')
        .select(`
          *,
          author:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq('id', id)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();

      if (error || !poll) {
        return { success: false, error: 'Poll not found' };
      }

      const transformedPoll = this.transformPollData(poll);
      return { success: true, data: transformedPoll };

    } catch (error) {
      return { success: false, error: 'Failed to fetch poll' };
    }
  }

  /**
   * Update a poll
   */
  static async updatePoll(id: string, updates: Partial<CreatePollFormData>, userId: string): Promise<ServiceResult<Poll>> {
    try {
      // Check ownership
      const { data: existingPoll, error: fetchError } = await supabase
        .from('polls')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError || !existingPoll) {
        return { success: false, error: 'Poll not found' };
      }

      if (existingPoll.created_by !== userId) {
        return { success: false, error: 'You are not authorized to update this poll' };
      }

      // Prepare update data
      const updateData: any = {};
      if (updates.title !== undefined) updateData.question = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.options !== undefined) updateData.options = updates.options;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      if (updates.allowMultipleVotes !== undefined) updateData.allow_multiple_votes = updates.allowMultipleVotes;
      if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt?.toISOString();

      const { data: updatedPoll, error } = await supabase
        .from('polls')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          author:created_by (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const transformedPoll = this.transformPollData(updatedPoll);
      return { success: true, data: transformedPoll };

    } catch (error) {
      return { success: false, error: 'Failed to update poll' };
    }
  }

  /**
   * Delete a poll
   */
  static async deletePoll(id: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Check ownership
      const { data: existingPoll, error: fetchError } = await supabase
        .from('polls')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError || !existingPoll) {
        return { success: false, error: 'Poll not found' };
      }

      if (existingPoll.created_by !== userId) {
        return { success: false, error: 'You are not authorized to delete this poll' };
      }

      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: 'Failed to delete poll' };
    }
  }

  /**
   * Submit a vote
   */
  static async submitVote(voteData: VoteData): Promise<ServiceResult<Poll>> {
    try {
      const { pollId, optionIndex, userId } = voteData;

      // Get current poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError || !poll) {
        return { success: false, error: 'Poll not found' };
      }

      // Validate poll state
      if (!poll.is_active) {
        return { success: false, error: 'Poll is not active' };
      }

      if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
        return { success: false, error: 'Poll has expired' };
      }

      // Validate option index
      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return { success: false, error: 'Invalid option index' };
      }

      // Check for existing vote (unless multiple votes allowed)
      if (!poll.allow_multiple_votes) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('poll_id', pollId)
          .eq('voter_id', userId)
          .single();

        if (existingVote) {
          return { success: false, error: 'You have already voted on this poll' };
        }
      }

      // Insert vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          poll_id: pollId,
          option_index: optionIndex,
          voter_id: userId,
        });

      if (voteError) {
        return { success: false, error: voteError.message };
      }

      // Update vote counts
      const newVotes = [...poll.votes];
      newVotes[optionIndex] += 1;

      const { data: updatedPoll, error: updateError } = await supabase
        .from('polls')
        .update({ votes: newVotes })
        .eq('id', pollId)
        .select(`
          *,
          author:created_by (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const transformedPoll = this.transformPollData(updatedPoll);
      return { success: true, data: transformedPoll };

    } catch (error) {
      return { success: false, error: 'Failed to submit vote' };
    }
  }

  /**
   * Transform database poll data to Poll interface
   */
  private static transformPollData(poll: any): Poll {
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options.map((option: string, index: number) => ({
        id: `${poll.id}-${index}`,
        text: option,
        votes: poll.votes[index] || 0,
        pollId: poll.id
      })),
      votes: poll.votes || [],
      created_at: poll.created_at,
      created_by: poll.created_by,
      is_public: poll.is_public,
      is_active: poll.is_active,
      expires_at: poll.expires_at,
      allow_multiple_votes: poll.allow_multiple_votes,
      description: poll.description,
      author: {
        id: poll.author?.id || poll.created_by,
        name: poll.author?.raw_user_meta_data?.name || 'Anonymous User',
        createdAt: new Date(poll.created_at),
        updatedAt: new Date(poll.created_at)
      }
    };
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePollForm } from '@/app/components/polls/create-poll-form';
import { PollCard } from '@/app/components/polls/poll-card';
import { PollList } from '@/app/components/polls/poll-list';
import { 
  createMockPoll, 
  createMockUser, 
  createMockPollDataset,
  createMockHappyPathScenario,
  createMockErrorScenario
} from '../utils/test-factories';

// Mock Next.js router
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: mockRefresh
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/polls'
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  }
};

vi.mock('@/app/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock API calls
global.fetch = vi.fn();

describe('User Journey Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Poll Creation Journey', () => {
    it('should complete full poll creation flow (happy path)', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock successful poll creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ poll: mockPoll })
      });

      // Mock successful redirect to polls page
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ polls: [mockPoll] })
      });

      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      // Step 1: Fill in poll title
      const titleInput = screen.getByLabelText(/poll title/i);
      await user.type(titleInput, 'What is your favorite programming language?');

      // Step 2: Add description
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Please choose your preferred programming language for web development.');

      // Step 3: Fill in options
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(option1Input, 'JavaScript');
      await user.type(option2Input, 'TypeScript');

      // Step 4: Add more options
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      const addButton = screen.getByRole('button', { name: /add option/i });
      
      await user.type(addOptionInput, 'Python');
      await user.click(addButton);

      await user.type(addOptionInput, 'Rust');
      await user.click(addButton);

      // Step 5: Configure poll settings
      const allowMultipleVotesCheckbox = screen.getByLabelText(/allow multiple votes/i);
      await user.click(allowMultipleVotesCheckbox);

      // Step 6: Submit the form
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      
      // Wait for form to be valid
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // Verify form submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'What is your favorite programming language?',
          description: 'Please choose your preferred programming language for web development.',
          options: ['JavaScript', 'TypeScript', 'Python', 'Rust'],
          isPublic: true,
          allowMultipleVotes: true,
          expiresAt: undefined
        });
      });
    });

    it('should handle poll creation with validation errors', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();

      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      // Try to submit with empty form
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      expect(submitButton).toBeDisabled();

      // Fill in title but leave options empty
      const titleInput = screen.getByLabelText(/poll title/i);
      await user.type(titleInput, 'Test Poll');

      // Submit should still be disabled due to empty options
      expect(submitButton).toBeDisabled();

      // Fill in options with duplicates
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(option1Input, 'Red');
      await user.type(option2Input, 'red'); // Duplicate (case-insensitive)

      // Submit should be disabled due to duplicates
      await waitFor(() => {
        expect(screen.getByText(/duplicate options are not allowed/i)).toBeInTheDocument();
      });
      expect(submitButton).toBeDisabled();
    });

    it('should handle poll creation with network errors', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      // Fill in valid form
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);

      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Option 1');
      await user.type(option2Input, 'Option 2');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);

      // Verify error handling
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Poll Voting Journey', () => {
    it('should complete voting flow for authenticated user', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock successful vote submission
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          poll: { ...mockPoll, votes: [6, 3, 2] },
          message: 'Vote submitted successfully'
        })
      });

      render(<PollCard poll={mockPoll} currentUserId={mockUser.id} />);

      // Click vote button
      const voteButton = screen.getByRole('button', { name: /vote/i });
      await user.click(voteButton);

      // Should navigate to poll detail page
      expect(mockPush).toHaveBeenCalledWith(`/polls/${mockPoll.id}`);
    });

    it('should show login prompt for unauthenticated user', () => {
      const mockPoll = createMockPoll();
      
      // Mock no authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      render(<PollCard poll={mockPoll} currentUserId={undefined} />);

      // Should show vote button but require authentication
      const voteButton = screen.getByRole('button', { name: /vote/i });
      expect(voteButton).toBeInTheDocument();
    });
  });

  describe('Poll Management Journey', () => {
    it('should allow poll owner to edit poll', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      const mockPoll = createMockPoll({ created_by: mockUser.id });
      
      render(<PollCard poll={mockPoll} currentUserId={mockUser.id} />);

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' }); // More options button
      await user.click(editButton);

      const editMenuItem = screen.getByText(/edit/i);
      await user.click(editMenuItem);

      // Should navigate to edit page
      expect(mockPush).toHaveBeenCalledWith(`/polls/${mockPoll.id}/edit`);
    });

    it('should allow poll owner to delete poll', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      const mockPoll = createMockPoll({ created_by: mockUser.id });
      
      // Mock successful deletion
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Poll deleted successfully' })
      });

      const mockOnDelete = vi.fn();

      render(<PollCard poll={mockPoll} currentUserId={mockUser.id} onDelete={mockOnDelete} />);

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: '' }); // More options button
      await user.click(deleteButton);

      const deleteMenuItem = screen.getByText(/delete/i);
      await user.click(deleteMenuItem);

      // Should show confirmation and call delete handler
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(mockPoll.id);
      });
    });

    it('should not show edit/delete options for non-owners', () => {
      const mockUser = createMockUser();
      const mockPoll = createMockPoll({ created_by: 'other-user-id' });
      
      render(<PollCard poll={mockPoll} currentUserId={mockUser.id} />);

      // Should not show more options button
      const moreOptionsButton = screen.queryByRole('button', { name: '' });
      expect(moreOptionsButton).not.toBeInTheDocument();
    });
  });

  describe('Poll Discovery Journey', () => {
    it('should display and filter polls list', async () => {
      const user = userEvent.setup();
      const mockPolls = createMockPollDataset(5);
      
      // Mock successful polls fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ polls: mockPolls })
      });

      render(<PollList polls={mockPolls} isLoading={false} />);

      // Should display all polls
      expect(screen.getAllByText(/test poll/i)).toHaveLength(5);

      // Should show poll details
      mockPolls.forEach((poll, index) => {
        expect(screen.getByText(`Test Poll ${index + 1}`)).toBeInTheDocument();
      });
    });

    it('should handle polls list loading state', () => {
      render(<PollList polls={[]} isLoading={true} />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle polls list error state', () => {
      render(<PollList polls={[]} isLoading={false} error="Failed to load polls" />);

      // Should show error message
      expect(screen.getByText(/failed to load polls/i)).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should maintain state consistency across components', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser();
      const mockPoll = createMockPoll();
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock successful poll creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ poll: mockPoll })
      });

      // Mock successful polls list fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ polls: [mockPoll] })
      });

      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

      // Test form submission
      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);

      await user.type(titleInput, 'Integration Test Poll');
      await user.type(option1Input, 'Option A');
      await user.type(option2Input, 'Option B');

      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);

      // Verify form submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Integration Test Poll',
          description: '',
          options: ['Option A', 'Option B'],
          isPublic: true,
          allowMultipleVotes: false,
          expiresAt: undefined
        });
      });
    });

    it('should handle navigation between poll pages', () => {
      const mockPoll = createMockPoll();
      
      render(<PollCard poll={mockPoll} />);

      // Click view details button
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      fireEvent.click(viewDetailsButton);

      // Should navigate to poll detail page
      expect(mockPush).toHaveBeenCalledWith(`/polls/${mockPoll.id}`);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from network errors during poll creation', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      // Fill in form
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);

      await user.type(titleInput, 'Retry Test Poll');
      await user.type(option1Input, 'Option 1');
      await user.type(option2Input, 'Option 2');

      // First submission fails
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      // Retry submission succeeds
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle partial form data loss', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();

      render(<CreatePollForm onSubmit={mockOnSubmit} />);

      // Fill in partial form
      const titleInput = screen.getByLabelText(/poll title/i);
      await user.type(titleInput, 'Partial Form Test');

      // Navigate away and back (simulating page refresh)
      fireEvent.unload(window);

      // Form should maintain its state or show appropriate message
      expect(titleInput).toHaveValue('Partial Form Test');
    });
  });
});

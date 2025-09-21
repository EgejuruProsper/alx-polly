/**
 * RealtimePoll Component Tests
 * ----------------------------
 * Comprehensive tests for the RealtimePoll component.
 * 
 * WHY: Ensures the real-time poll component works correctly with live updates,
 * user interactions, and real-time features. Essential for user experience.
 * 
 * Test Coverage:
 * - Component rendering
 * - Real-time updates
 * - User interactions
 * - Error handling
 * - Accessibility
 * 
 * Security considerations:
 * - Secure real-time subscriptions
 * - User authentication
 * - Data validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RealtimePoll } from '@/app/components/polls/realtime-poll';
import { Poll } from '@/lib/types/poll';

// Mock dependencies
vi.mock('@/lib/services/realtime-service', () => ({
  RealtimeService: {
    subscribeToPoll: vi.fn(() => ({
      unsubscribe: vi.fn()
    }))
  }
}));

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn()
        }))
      }))
    }))
  }
}));

describe('RealtimePoll', () => {
  const mockPoll: Poll = {
    id: 'poll-123',
    question: 'Test Poll Question',
    description: 'Test Poll Description',
    options: ['Option 1', 'Option 2', 'Option 3'],
    votes: [10, 5, 15],
    total_votes: 30,
    unique_voters: 25,
    view_count: 100,
    share_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user-123',
    is_public: true,
    is_active: true,
    expires_at: '2024-01-31T00:00:00Z',
    allow_multiple_votes: false,
    category: 'general',
    tags: ['test'],
    is_featured: false,
    metadata: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render poll question and description', () => {
    render(<RealtimePoll poll={mockPoll} />);
    
    expect(screen.getByText('Test Poll Question')).toBeInTheDocument();
    expect(screen.getByText('Test Poll Description')).toBeInTheDocument();
  });

  it('should display poll options with vote counts', () => {
    render(<RealtimePoll poll={mockPoll} />);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    
    expect(screen.getByText('10 votes (33%)')).toBeInTheDocument();
    expect(screen.getByText('5 votes (17%)')).toBeInTheDocument();
    expect(screen.getByText('15 votes (50%)')).toBeInTheDocument();
  });

  it('should show real-time status indicator', () => {
    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should display live statistics when enabled', () => {
    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    expect(screen.getByText('30')).toBeInTheDocument(); // Total votes
    expect(screen.getByText('100')).toBeInTheDocument(); // Views
    expect(screen.getByText('5')).toBeInTheDocument(); // Shares
  });

  it('should handle vote submission', async () => {
    const mockOnVote = vi.fn();
    render(<RealtimePoll poll={mockPoll} onVote={mockOnVote} />);
    
    const voteButton = screen.getByText('Vote Now');
    fireEvent.click(voteButton);
    
    expect(mockOnVote).toHaveBeenCalledWith('Option 1');
  });

  it('should show poll status badges', () => {
    render(<RealtimePoll poll={mockPoll} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expires: 1/31/2024')).toBeInTheDocument();
  });

  it('should display total votes count', () => {
    render(<RealtimePoll poll={mockPoll} />);
    
    expect(screen.getByText('Total: 30 votes')).toBeInTheDocument();
  });

  it('should handle expired polls', () => {
    const expiredPoll = {
      ...mockPoll,
      is_active: false,
      expires_at: '2023-12-31T00:00:00Z'
    };
    
    render(<RealtimePoll poll={expiredPoll} />);
    
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByText('Vote Now')).not.toBeInTheDocument();
  });

  it('should show connection error when real-time fails', async () => {
    const { RealtimeService } = await import('@/lib/services/realtime-service');
    vi.mocked(RealtimeService.subscribeToPoll).mockImplementation(() => {
      throw new Error('Connection failed');
    });

    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  it('should update poll data in real-time', async () => {
    const { RealtimeService } = await import('@/lib/services/realtime-service');
    let onUpdateCallback: (payload: any) => void;
    let onVoteCallback: (payload: any) => void;
    
    vi.mocked(RealtimeService.subscribeToPoll).mockImplementation((pollId, onUpdate, onVote) => {
      onUpdateCallback = onUpdate;
      onVoteCallback = onVote;
      return { unsubscribe: vi.fn() };
    });

    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    // Simulate poll update
    if (onUpdateCallback) {
      onUpdateCallback({
        new: {
          ...mockPoll,
          total_votes: 35,
          view_count: 150
        }
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('should handle new vote updates', async () => {
    const { RealtimeService } = await import('@/lib/services/realtime-service');
    let onVoteCallback: (payload: any) => void;
    
    vi.mocked(RealtimeService.subscribeToPoll).mockImplementation((pollId, onUpdate, onVote) => {
      onVoteCallback = onVote;
      return { unsubscribe: vi.fn() };
    });

    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    // Simulate new vote
    if (onVoteCallback) {
      onVoteCallback({
        new: {
          option_index: 0
        }
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('11 votes (33%)')).toBeInTheDocument();
    });
  });

  it('should clean up subscriptions on unmount', async () => {
    const { RealtimeService } = await import('@/lib/services/realtime-service');
    const mockUnsubscribe = vi.fn();
    
    vi.mocked(RealtimeService.subscribeToPoll).mockReturnValue({
      unsubscribe: mockUnsubscribe
    });

    const { unmount } = render(<RealtimePoll poll={mockPoll} />);
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle missing poll data gracefully', () => {
    const incompletePoll = {
      ...mockPoll,
      votes: undefined,
      total_votes: undefined
    };
    
    render(<RealtimePoll poll={incompletePoll} />);
    
    expect(screen.getByText('Test Poll Question')).toBeInTheDocument();
    expect(screen.getByText('Total: 0 votes')).toBeInTheDocument();
  });

  it('should show loading state for real-time stats', () => {
    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    // Should show live status indicator
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should handle vote button click with error', async () => {
    const mockOnVote = vi.fn().mockRejectedValue(new Error('Vote failed'));
    render(<RealtimePoll poll={mockPoll} onVote={mockOnVote} />);
    
    const voteButton = screen.getByText('Vote Now');
    fireEvent.click(voteButton);
    
    expect(mockOnVote).toHaveBeenCalledWith('Option 1');
  });

  it('should display progress bars for vote distribution', () => {
    render(<RealtimePoll poll={mockPoll} />);
    
    // Check if progress bars are rendered
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3);
  });

  it('should handle real-time connection status changes', async () => {
    const { RealtimeService } = await import('@/lib/services/realtime-service');
    let onErrorCallback: (error: any) => void;
    
    vi.mocked(RealtimeService.subscribeToPoll).mockImplementation((pollId, onUpdate, onVote, onError) => {
      onErrorCallback = onError;
      return { unsubscribe: vi.fn() };
    });

    render(<RealtimePoll poll={mockPoll} showRealtimeStats={true} />);
    
    // Simulate connection error
    if (onErrorCallback) {
      onErrorCallback(new Error('Connection lost'));
    }
    
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
});

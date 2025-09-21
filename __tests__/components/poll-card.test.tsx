import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PollCard } from '@/app/components/polls/poll-card';
import { Poll } from '@/types';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}));

describe('PollCard', () => {
  const mockPoll: Poll = {
    id: 'poll-1',
    question: 'What is your favorite color?',
    options: [
      { id: 'opt-1', text: 'Red', votes: 5, pollId: 'poll-1' },
      { id: 'opt-2', text: 'Blue', votes: 3, pollId: 'poll-1' },
      { id: 'opt-3', text: 'Green', votes: 2, pollId: 'poll-1' }
    ],
    votes: [5, 3, 2],
    created_at: new Date().toISOString(),
    created_by: 'user-123',
    is_public: true,
    is_active: true,
    expires_at: undefined,
    allow_multiple_votes: false,
    description: 'A simple color preference poll',
    author: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  it('should render poll information correctly', () => {
    render(<PollCard poll={mockPoll} />);

    expect(screen.getByText('What is your favorite color?')).toBeInTheDocument();
    expect(screen.getByText('A simple color preference poll')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('10 votes')).toBeInTheDocument();
  });

  it('should display vote counts for each option', () => {
    render(<PollCard poll={mockPoll} />);

    expect(screen.getByText('5 votes')).toBeInTheDocument(); // Red
    expect(screen.getByText('3 votes')).toBeInTheDocument(); // Blue
    expect(screen.getByText('2 votes')).toBeInTheDocument(); // Green
  });

  it('should show public badge for public polls', () => {
    render(<PollCard poll={mockPoll} />);

    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('should show private badge for private polls', () => {
    const privatePoll = { ...mockPoll, is_public: false };
    render(<PollCard poll={privatePoll} />);

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('should show expired badge for expired polls', () => {
    const expiredPoll = {
      ...mockPoll,
      expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    };
    render(<PollCard poll={expiredPoll} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('should show author information', () => {
    render(<PollCard poll={mockPoll} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('should show owner actions for poll owner', () => {
    const onDelete = vi.fn();
    render(
      <PollCard 
        poll={mockPoll} 
        currentUserId="user-123" 
        onDelete={onDelete} 
      />
    );

    // Should show dropdown menu for owner
    const moreButton = screen.getByRole('button', { name: /more/i });
    expect(moreButton).toBeInTheDocument();

    fireEvent.click(moreButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should not show owner actions for non-owner', () => {
    render(
      <PollCard 
        poll={mockPoll} 
        currentUserId="user-456" 
      />
    );

    // Should not show dropdown menu for non-owner
    const moreButton = screen.queryByRole('button', { name: /more/i });
    expect(moreButton).not.toBeInTheDocument();
  });

  it('should call onDelete when delete is clicked', () => {
    const onDelete = vi.fn();
    render(
      <PollCard 
        poll={mockPoll} 
        currentUserId="user-123" 
        onDelete={onDelete} 
      />
    );

    const moreButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(moreButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('poll-1');
  });

  it('should show vote button when showVoteButton is true', () => {
    render(<PollCard poll={mockPoll} showVoteButton={true} />);

    expect(screen.getByText('Vote')).toBeInTheDocument();
  });

  it('should not show vote button when showVoteButton is false', () => {
    render(<PollCard poll={mockPoll} showVoteButton={false} />);

    expect(screen.queryByText('Vote')).not.toBeInTheDocument();
  });

  it('should handle polls without author gracefully', () => {
    const pollWithoutAuthor = { ...mockPoll, author: undefined };
    render(<PollCard poll={pollWithoutAuthor} />);

    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('should handle polls without description', () => {
    const pollWithoutDescription = { ...mockPoll, description: undefined };
    render(<PollCard poll={pollWithoutDescription} />);

    // Description should not be rendered
    expect(screen.queryByText('A simple color preference poll')).not.toBeInTheDocument();
  });

  it('should calculate total votes correctly', () => {
    const pollWithZeroVotes = {
      ...mockPoll,
      options: [
        { id: 'opt-1', text: 'Red', votes: 0, pollId: 'poll-1' },
        { id: 'opt-2', text: 'Blue', votes: 0, pollId: 'poll-1' }
      ]
    };
    render(<PollCard poll={pollWithZeroVotes} />);

    expect(screen.getByText('0 votes')).toBeInTheDocument();
  });

  it('should handle single option polls', () => {
    const singleOptionPoll = {
      ...mockPoll,
      options: [
        { id: 'opt-1', text: 'Only Option', votes: 1, pollId: 'poll-1' }
      ]
    };
    render(<PollCard poll={singleOptionPoll} />);

    expect(screen.getByText('Only Option')).toBeInTheDocument();
    expect(screen.getByText('1 vote')).toBeInTheDocument();
  });
});

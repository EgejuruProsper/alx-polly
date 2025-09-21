import { render, screen } from '@testing-library/react'
import { PollCard } from '../../../app/components/polls/poll-card'
import { Poll } from '@/types'

// Mock poll data
const mockPoll: Poll = {
  id: '1',
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'TypeScript'],
  votes: [10, 15, 8],
  created_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  is_public: true,
  is_active: true,
  author: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('PollCard', () => {
  it('renders poll question', () => {
    render(<PollCard poll={mockPoll} />)
    expect(screen.getByText('What is your favorite programming language?')).toBeInTheDocument()
  })

  it('renders poll options with vote counts', () => {
    render(<PollCard poll={mockPoll} />)
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('10 votes')).toBeInTheDocument()
    expect(screen.getByText('15 votes')).toBeInTheDocument()
    expect(screen.getByText('8 votes')).toBeInTheDocument()
  })

  it('renders author information', () => {
    render(<PollCard poll={mockPoll} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows public badge for public polls', () => {
    render(<PollCard poll={mockPoll} />)
    expect(screen.getByText('Public')).toBeInTheDocument()
  })

  it('calls onVote when vote button is clicked', () => {
    const mockOnVote = jest.fn()
    render(<PollCard poll={mockPoll} onVote={mockOnVote} />)
    
    const voteButton = screen.getByText('Vote')
    voteButton.click()
    
    expect(mockOnVote).toHaveBeenCalledWith('1', 'JavaScript')
  })
})

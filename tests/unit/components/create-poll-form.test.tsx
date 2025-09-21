import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePollForm } from '../../../app/components/polls/create-poll-form';
import { CreatePollFormData } from '@/lib/validations';

// Mock the form submission
const mockOnSubmit = vi.fn();

// Test data factory
const createMockFormData = (overrides: Partial<CreatePollFormData> = {}): CreatePollFormData => ({
  title: 'Test Poll',
  description: 'Test description',
  options: ['Option 1', 'Option 2'],
  isPublic: true,
  allowMultipleVotes: false,
  ...overrides
});

// Test component wrapper
const TestWrapper = ({ 
  onSubmit = mockOnSubmit, 
  isLoading = false, 
  error = null, 
  success = null,
  defaultValues = undefined 
}: {
  onSubmit?: (data: CreatePollFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  defaultValues?: CreatePollFormData;
}) => (
  <CreatePollForm
    onSubmit={onSubmit}
    isLoading={isLoading}
    error={error}
    success={success}
    defaultValues={defaultValues}
  />
);

describe('CreatePollForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with all required fields', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText(/poll title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/poll options/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create poll/i })).toBeInTheDocument();
    });

    it('should render with default values when provided', () => {
      const defaultValues = createMockFormData({
        title: 'Default Title',
        description: 'Default description'
      });
      
      render(<TestWrapper defaultValues={defaultValues} />);
      
      expect(screen.getByDisplayValue('Default Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Default description')).toBeInTheDocument();
    });

    it('should show edit mode when defaultValues provided', () => {
      const defaultValues = createMockFormData();
      render(<TestWrapper defaultValues={defaultValues} />);
      
      expect(screen.getByText(/edit poll/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update poll/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation - Happy Path', () => {
    it('should submit valid form data', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      
      await user.type(titleInput, 'What is your favorite color?');
      await user.type(option1Input, 'Red');
      await user.type(option2Input, 'Blue');
      
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'What is your favorite color?',
          description: '',
          options: ['Red', 'Blue'],
          isPublic: true,
          allowMultipleVotes: false,
          expiresAt: undefined
        });
      });
    });

    it('should handle form with description', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(descriptionInput, 'This is a test poll');
      await user.type(option1Input, 'Yes');
      await user.type(option2Input, 'No');
      
      await user.click(screen.getByRole('button', { name: /create poll/i }));
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Poll',
            description: 'This is a test poll',
            options: ['Yes', 'No']
          })
        );
      });
    });
  });

  describe('Form Validation - Error Cases', () => {
    it('should show error for empty title', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a poll title/i)).toBeInTheDocument();
      });
    });

    it('should show error for whitespace-only title', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      await user.type(titleInput, '   ');
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/poll title cannot be empty/i)).toBeInTheDocument();
      });
    });

    it('should show error for title that is too long', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const longTitle = 'A'.repeat(201);
      await user.type(titleInput, longTitle);
      
      await waitFor(() => {
        expect(screen.getByText(/title is too long/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty options', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      await user.type(titleInput, 'Test Poll');
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/poll option cannot be empty/i)).toBeInTheDocument();
      });
    });

    it('should show error for whitespace-only options', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, '   ');
      await user.type(option2Input, '   ');
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/poll option cannot be empty/i)).toBeInTheDocument();
      });
    });

    it('should show error for duplicate options', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Red');
      await user.type(option2Input, 'Red');
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/duplicate options are not allowed/i)).toBeInTheDocument();
      });
    });

    it('should show error for case-insensitive duplicate options', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Red');
      await user.type(option2Input, 'red');
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/duplicate options are not allowed/i)).toBeInTheDocument();
      });
    });

    it('should show error for too few options', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Only one option');
      
      // Remove the second option
      const removeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(removeButton);
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please provide at least 2 poll options/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add/Remove Options', () => {
    it('should add new option when valid text is entered', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      const addButton = screen.getByRole('button', { name: /add option/i });
      
      await user.type(addOptionInput, 'New Option');
      await user.click(addButton);
      
      expect(screen.getByDisplayValue('New Option')).toBeInTheDocument();
      expect(addOptionInput).toHaveValue('');
    });

    it('should not add option when input is empty', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const addButton = screen.getByRole('button', { name: /add option/i });
      expect(addButton).toBeDisabled();
    });

    it('should not add option when maximum reached', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      // Add options until we reach the limit
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      const addButton = screen.getByRole('button', { name: /add option/i });
      
      for (let i = 0; i < 8; i++) { // Start with 2, add 8 more to reach 10
        await user.type(addOptionInput, `Option ${i + 3}`);
        await user.click(addButton);
      }
      
      expect(addButton).toBeDisabled();
      expect(screen.getByText(/maximum 10 options reached/i)).toBeInTheDocument();
    });

    it('should remove option when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      // Add a third option first
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      const addButton = screen.getByRole('button', { name: /add option/i });
      
      await user.type(addOptionInput, 'Third Option');
      await user.click(addButton);
      
      // Now remove it
      const removeButtons = screen.getAllByRole('button', { name: '' }); // X buttons
      await user.click(removeButtons[removeButtons.length - 1]);
      
      expect(screen.queryByDisplayValue('Third Option')).not.toBeInTheDocument();
    });

    it('should not remove option when only 2 options remain', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const removeButtons = screen.getAllByRole('button', { name: '' }); // X buttons
      expect(removeButtons).toHaveLength(0); // No remove buttons when only 2 options
    });
  });

  describe('Loading and Success States', () => {
    it('should show loading state when isLoading is true', () => {
      render(<TestWrapper isLoading={true} />);
      
      expect(screen.getByText(/creating poll/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating poll/i })).toBeDisabled();
    });

    it('should show success state when success message is provided', () => {
      render(<TestWrapper success="Poll created successfully!" />);
      
      expect(screen.getByText(/poll created successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /poll created/i })).toBeDisabled();
    });

    it('should show error message when error is provided', () => {
      render(<TestWrapper error="Something went wrong!" />);
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should disable form when loading or success', () => {
      render(<TestWrapper isLoading={true} />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const submitButton = screen.getByRole('button', { name: /creating poll/i });
      
      expect(titleInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form State Management', () => {
    it('should show validation errors in real-time', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      
      // Type and clear to trigger validation
      await user.type(titleInput, 'Test');
      await user.clear(titleInput);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a poll title/i)).toBeInTheDocument();
      });
    });

    it('should show valid state when form is valid', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Option 1');
      await user.type(option2Input, 'Option 2');
      
      await waitFor(() => {
        expect(screen.getByText(/ready to submit/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when form is invalid', async () => {
      render(<TestWrapper />);
      
      const submitButton = screen.getByRole('button', { name: /create poll/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should add option when Enter is pressed in add option input', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      
      await user.type(addOptionInput, 'New Option');
      await user.keyboard('{Enter}');
      
      expect(screen.getByDisplayValue('New Option')).toBeInTheDocument();
    });

    it('should not add option when Enter is pressed with empty input', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      await user.keyboard('{Enter}');
      
      // Should not add any new options
      const optionInputs = screen.getAllByPlaceholderText(/option \d+/i);
      expect(optionInputs).toHaveLength(2); // Only the default 2 options
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle form submission errors gracefully', async () => {
      const errorOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
      const user = userEvent.setup();
      
      render(<TestWrapper onSubmit={errorOnSubmit} />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Option 1');
      await user.type(option2Input, 'Option 2');
      
      await user.click(screen.getByRole('button', { name: /create poll/i }));
      
      await waitFor(() => {
        expect(errorOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle rapid option additions without issues', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const addOptionInput = screen.getByPlaceholderText(/add new option/i);
      const addButton = screen.getByRole('button', { name: /add option/i });
      
      // Rapidly add multiple options
      for (let i = 0; i < 5; i++) {
        await user.type(addOptionInput, `Option ${i + 3}`);
        await user.click(addButton);
      }
      
      expect(screen.getAllByPlaceholderText(/option \d+/i)).toHaveLength(7); // 2 default + 5 added
    });

    it('should maintain form state when switching between valid and invalid', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const titleInput = screen.getByLabelText(/poll title/i);
      const option1Input = screen.getByPlaceholderText(/option 1/i);
      const option2Input = screen.getByPlaceholderText(/option 2/i);
      
      // Start with valid form
      await user.type(titleInput, 'Test Poll');
      await user.type(option1Input, 'Option 1');
      await user.type(option2Input, 'Option 2');
      
      await waitFor(() => {
        expect(screen.getByText(/ready to submit/i)).toBeInTheDocument();
      });
      
      // Make it invalid
      await user.clear(titleInput);
      
      await waitFor(() => {
        expect(screen.getByText(/please fix errors to continue/i)).toBeInTheDocument();
      });
      
      // Make it valid again
      await user.type(titleInput, 'New Title');
      
      await waitFor(() => {
        expect(screen.getByText(/ready to submit/i)).toBeInTheDocument();
      });
    });
  });
});

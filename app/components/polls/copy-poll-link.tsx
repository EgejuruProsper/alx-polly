"use client";

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { copyToClipboard, generatePollUrl } from '@/lib/utils/copy-to-clipboard';
import { cn } from '@/lib/utils';

/**
 * CopyPollLink Component
 * ---------------------
 * Provides a button to copy poll share links to clipboard.
 * 
 * WHY: Enables easy sharing of polls with proper user feedback.
 * Handles clipboard operations with fallback support and accessibility.
 * 
 * Features:
 * - One-click poll link copying
 * - Visual feedback (success/error states)
 * - Accessibility support
 * - Fallback for unsupported browsers
 * 
 * Accessibility considerations:
 * - Screen reader announcements for state changes
 * - Keyboard navigation support
 * - Clear visual feedback
 * - Proper ARIA labels
 * 
 * @param pollId - Poll identifier for URL generation
 * @param className - Optional CSS classes
 * @param variant - Button variant (default: outline)
 * @param size - Button size (default: sm)
 */
interface CopyPollLinkProps {
  pollId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';

export function CopyPollLink({ 
  pollId, 
  className,
  variant = 'outline',
  size = 'sm',
  showText = true
}: CopyPollLinkProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  /**
   * Handle copy to clipboard operation
   * 
   * WHY: Provides user feedback and handles clipboard operations safely.
   * Manages loading states and error handling for better UX.
   */
  const handleCopy = async () => {
    if (copyState === 'copying') return; // Prevent double-clicks

    setCopyState('copying');
    
    try {
      const pollUrl = generatePollUrl(pollId);
      const success = await copyToClipboard(pollUrl);
      
      if (success) {
        setCopyState('success');
        // Reset to idle after 2 seconds
        setTimeout(() => setCopyState('idle'), 2000);
      } else {
        setCopyState('error');
        // Reset to idle after 3 seconds
        setTimeout(() => setCopyState('idle'), 3000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  // Determine button content based on state
  const getButtonContent = () => {
    switch (copyState) {
      case 'copying':
        return {
          icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />,
          text: 'Copying...',
          ariaLabel: 'Copying poll link to clipboard'
        };
      case 'success':
        return {
          icon: <Check className="h-4 w-4" />,
          text: 'Copied!',
          ariaLabel: 'Poll link copied to clipboard'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Failed',
          ariaLabel: 'Failed to copy poll link'
        };
      default:
        return {
          icon: <Copy className="h-4 w-4" />,
          text: 'Copy Link',
          ariaLabel: 'Copy poll link to clipboard'
        };
    }
  };

  const buttonContent = getButtonContent();

  return (
    <Button
      onClick={handleCopy}
      disabled={copyState === 'copying'}
      variant={variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        copyState === 'success' && 'bg-green-600 hover:bg-green-700 text-white',
        copyState === 'error' && 'bg-red-600 hover:bg-red-700 text-white',
        className
      )}
      aria-label={buttonContent.ariaLabel}
      title={buttonContent.text}
    >
      {buttonContent.icon}
      {showText && (
        <span className="ml-2 hidden sm:inline">
          {buttonContent.text}
        </span>
      )}
    </Button>
  );
}

/**
 * CopyPollLinkIcon Component
 * -------------------------
 * Icon-only version of the copy poll link button.
 * 
 * WHY: Provides compact copy functionality for space-constrained layouts.
 * Maintains full accessibility while using minimal space.
 * 
 * @param pollId - Poll identifier
 * @param className - Optional CSS classes
 */
export function CopyPollLinkIcon({ pollId, className }: { pollId: string; className?: string }) {
  return (
    <CopyPollLink
      pollId={pollId}
      size="icon"
      showText={false}
      className={className}
    />
  );
}

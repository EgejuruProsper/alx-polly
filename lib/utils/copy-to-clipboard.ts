/**
 * Copy to clipboard utility with fallback support
 * 
 * WHY: Provides consistent clipboard functionality across browsers.
 * Handles modern Clipboard API with fallback to legacy methods.
 * 
 * Security considerations:
 * - No sensitive data exposure
 * - User-initiated actions only
 * - Proper error handling
 * 
 * Edge cases:
 * - Unsupported browsers → fallback to text selection
 * - Permission denied → graceful error handling
 * - Network errors → user feedback
 * 
 * @param text - Text to copy to clipboard
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern browsers with Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers or non-secure contexts
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Fallback copy method using text selection
 * 
 * WHY: Provides clipboard functionality when modern API is unavailable.
 * Uses document selection as a fallback mechanism.
 * 
 * @param text - Text to copy
 * @returns boolean - Success status
 */
function fallbackCopyToClipboard(text: string): boolean {
  try {
    // Create temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make textarea invisible but selectable
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    // Add to DOM, select, and copy
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
}

/**
 * Generate poll share URL
 * 
 * WHY: Creates consistent poll sharing URLs across the application.
 * Ensures proper URL formatting and domain handling.
 * 
 * @param pollId - Poll identifier
 * @param baseUrl - Optional base URL (defaults to current origin)
 * @returns Complete poll URL
 */
export function generatePollUrl(pollId: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/polls/${pollId}`;
}

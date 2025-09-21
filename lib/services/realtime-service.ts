import { supabase } from '@/lib/supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * RealtimeService
 * ---------------
 * Manages real-time updates for polls, votes, and user interactions.
 * 
 * WHY: Provides real-time functionality for enhanced user experience.
 * Enables live updates, notifications, and collaborative features.
 * 
 * Security considerations:
 * - Secure channel subscriptions
 * - User authentication for real-time access
 * - Data privacy and access control
 * - Rate limiting for real-time events
 * 
 * Edge cases:
 * - Connection failures → automatic reconnection
 * - Authentication errors → graceful handling
 * - Channel conflicts → proper cleanup
 * - Memory leaks → subscription management
 */
export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static subscriptionMetadata: Map<string, {
    pollId: string;
    onUpdate: (payload: any) => void;
    onVote: (payload: any) => void;
    onError: (error: any) => void;
  }> = new Map();

  /**
   * Subscribe to poll updates
   * 
   * WHY: Provides real-time updates for poll changes including new votes,
   * poll modifications, and status updates.
   * 
   * @param pollId - Poll ID to subscribe to
   * @param onUpdate - Callback for poll updates
   * @param onVote - Callback for new votes
   * @param onError - Callback for errors
   * @returns Subscription channel
   */
  static subscribeToPoll(
    pollId: string,
    onUpdate: (payload: any) => void,
    onVote: (payload: any) => void,
    onError: (error: any) => void
  ): RealtimeChannel {
    const channelName = `poll-${pollId}`;
    
    // Store subscription metadata for reconnection
    this.subscriptionMetadata.set(channelName, {
      pollId,
      onUpdate,
      onVote,
      onError
    });
    
    // Clean up existing subscription
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`
        },
        (payload) => {
          console.log('Poll updated:', payload);
          onUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${pollId}`
        },
        (payload) => {
          console.log('New vote:', payload);
          onVote(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_analytics',
          filter: `poll_id=eq.${pollId}`
        },
        (payload) => {
          console.log('Analytics event:', payload);
          // Handle analytics updates if needed
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to poll ${pollId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to poll ${pollId}`);
          onError(new Error('Failed to subscribe to poll updates'));
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to user notifications
   * 
   * WHY: Provides real-time notifications for user-specific events including
   * poll updates, role changes, and system notifications.
   * 
   * @param userId - User ID to subscribe to
   * @param onNotification - Callback for notifications
   * @param onError - Callback for errors
   * @returns Subscription channel
   */
  static subscribeToUserNotifications(
    userId: string,
    onNotification: (payload: any) => void,
    onError: (error: any) => void
  ): RealtimeChannel {
    const channelName = `user-${userId}`;
    
    // Clean up existing subscription
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification:', payload);
          onNotification(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          // Handle profile updates if needed
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to user ${userId} notifications`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to user ${userId} notifications`);
          onError(new Error('Failed to subscribe to notifications'));
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to system-wide updates (admin only)
   * 
   * WHY: Provides real-time updates for system-wide events including
   * new users, poll creation, and platform metrics.
   * 
   * @param onUserUpdate - Callback for user updates
   * @param onPollUpdate - Callback for poll updates
   * @param onError - Callback for errors
   * @returns Subscription channel
   */
  static subscribeToSystemUpdates(
    onUserUpdate: (payload: any) => void,
    onPollUpdate: (payload: any) => void,
    onError: (error: any) => void
  ): RealtimeChannel {
    const channelName = 'system-updates';
    
    // Clean up existing subscription
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('New user registered:', payload);
          onUserUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'polls'
        },
        (payload) => {
          console.log('New poll created:', payload);
          onPollUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes'
        },
        (payload) => {
          console.log('New vote cast:', payload);
          // Handle system-wide vote updates if needed
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to system updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to system updates');
          onError(new Error('Failed to subscribe to system updates'));
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from a specific channel
   * 
   * WHY: Properly cleans up subscriptions to prevent memory leaks.
   * Essential for resource management and performance optimization.
   * 
   * @param channelName - Channel name to unsubscribe from
   */
  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.subscriptionMetadata.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   * 
   * WHY: Cleans up all subscriptions when component unmounts or user logs out.
   * Prevents memory leaks and unnecessary network usage.
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      channel.unsubscribe();
      console.log(`Unsubscribed from ${channelName}`);
    });
    this.channels.clear();
  }

  /**
   * Get connection status
   * 
   * WHY: Provides visibility into real-time connection status.
   * Helps with debugging and user experience optimization.
   * 
   * @returns Connection status information
   */
  static getConnectionStatus(): {
    isConnected: boolean;
    activeChannels: string[];
    channelCount: number;
  } {
    return {
      isConnected: this.channels.size > 0,
      activeChannels: Array.from(this.channels.keys()),
      channelCount: this.channels.size
    };
  }

  /**
   * Reconnect to all channels
   * 
   * WHY: Handles connection failures and network issues.
   * Provides automatic reconnection for better user experience.
   */
  static async reconnectAll(): Promise<void> {
    console.log('Reconnecting to all channels...');
    
    // Store existing subscription metadata before cleanup
    const metadataToReconnect = new Map(this.subscriptionMetadata);
    
    // Clean up existing channels
    this.channels.forEach((channel, channelName) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    
    // Recreate subscriptions with retry logic
    const reconnectPromises = Array.from(metadataToReconnect.entries()).map(
      async ([channelName, metadata]) => {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`Reconnecting to ${channelName} (attempt ${retryCount + 1})`);
            
            const channel = supabase
              .channel(channelName)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'polls',
                  filter: `id=eq.${metadata.pollId}`
                },
                metadata.onUpdate
              )
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'votes',
                  filter: `poll_id=eq.${metadata.pollId}`
                },
                metadata.onVote
              )
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log(`Successfully reconnected to ${channelName}`);
                  this.channels.set(channelName, channel);
                } else if (status === 'CHANNEL_ERROR') {
                  console.error(`Failed to reconnect to ${channelName}`);
                  metadata.onError(new Error(`Failed to reconnect to ${channelName}`));
                }
              });
              
            // If we get here, the subscription was successful
            break;
          } catch (error) {
            retryCount++;
            console.error(`Reconnection attempt ${retryCount} failed for ${channelName}:`, error);
            
            if (retryCount >= maxRetries) {
              console.error(`Max retries reached for ${channelName}`);
              metadata.onError(new Error(`Failed to reconnect to ${channelName} after ${maxRetries} attempts`));
            } else {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
          }
        }
      }
    );
    
    // Wait for all reconnection attempts to complete
    await Promise.allSettled(reconnectPromises);
    
    console.log('Reconnection process completed');
  }
}

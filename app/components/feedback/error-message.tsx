"use client";

import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive';
  showRetry?: boolean;
  showDismiss?: boolean;
}

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  variant = 'destructive',
  showRetry = true,
  showDismiss = true
}: ErrorMessageProps) {
  return (
    <Alert variant={variant} className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </div>
      <div className="flex items-center space-x-2">
        {showRetry && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        {showDismiss && onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

export function ErrorCard({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorPage({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <ErrorCard error={error} onRetry={onRetry} />
      </div>
    </div>
  );
}

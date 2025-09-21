"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Download, 
  Copy, 
  Share2, 
  QrCode, 
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import QRCode from 'qrcode';

/**
 * QRCodeGenerator Component
 * -------------------------
 * Generates QR codes for poll sharing across different devices.
 * 
 * WHY: Provides easy poll sharing across devices and platforms.
 * Essential for mobile-first experience and cross-platform accessibility.
 * 
 * Features:
 * - QR code generation for poll URLs
 * - Multiple device size options
 * - Download and sharing capabilities
 * - Real-time QR code updates
 * - Accessibility support
 * 
 * Security considerations:
 * - URL validation
 * - Content sanitization
 * - Safe QR code generation
 * - Privacy protection
 * 
 * Accessibility considerations:
 * - Screen reader support
 * - Keyboard navigation
 * - High contrast support
 * - Alternative text for QR codes
 */
interface QRCodeGeneratorProps {
  pollId: string;
  pollTitle?: string;
  className?: string;
}

export function QRCodeGenerator({ pollId, pollTitle, className }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [customUrl, setCustomUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate poll URL with validation
  const pollUrl = (() => {
    if (!customUrl) {
      return `${window.location.origin}/polls/${pollId}`;
    }
    
    try {
      // Validate and normalize the custom URL
      const url = new URL(customUrl, window.location.origin);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        console.warn('Invalid protocol in custom URL, falling back to default');
        return `${window.location.origin}/polls/${pollId}`;
      }
      
      // Only allow same origin or trusted domains (you can customize this)
      const allowedOrigins = [window.location.origin];
      if (!allowedOrigins.some(origin => url.origin === origin)) {
        console.warn('Custom URL origin not allowed, falling back to default');
        return `${window.location.origin}/polls/${pollId}`;
      }
      
      return url.toString();
    } catch (error) {
      console.warn('Invalid custom URL, falling back to default:', error);
      return `${window.location.origin}/polls/${pollId}`;
    }
  })();

  // Generate QR code when component mounts or URL changes
  useEffect(() => {
    let isMounted = true;
    
    const generateQRCodeSafe = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        const qrSize = getQRSize(size);
        const qrCodeDataUrl = await QRCode.toDataURL(pollUrl, {
          width: qrSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });

        // Only update state if component is still mounted
        if (isMounted) {
          setQrCodeDataUrl(qrCodeDataUrl);
        }
      } catch (err) {
        console.error('Error generating QR code:', err);
        if (isMounted) {
          setError('Failed to generate QR code');
        }
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateQRCodeSafe();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [pollUrl, size]);

  /**
   * Generate QR code for the poll URL (called manually for retry)
   * 
   * WHY: Creates a scannable QR code for easy poll sharing.
   * Provides multiple size options for different use cases.
   */
  const generateQRCode = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const qrSize = getQRSize(size);
      const qrCodeDataUrl = await QRCode.toDataURL(pollUrl, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeDataUrl(qrCodeDataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Get QR code size based on selected option
   * 
   * WHY: Provides appropriate QR code sizes for different use cases.
   * Ensures QR codes are scannable on various devices.
   * 
   * @param sizeOption - Size option selected
   * @returns QR code size in pixels
   */
  const getQRSize = (sizeOption: string): number => {
    switch (sizeOption) {
      case 'small':
        return 128;
      case 'medium':
        return 256;
      case 'large':
        return 512;
      default:
        return 256;
    }
  };

  /**
   * Download QR code as PNG
   * 
   * WHY: Allows users to save QR codes for offline sharing.
   * Provides flexibility in how users share polls.
   */
  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `poll-${pollId}-qr-code.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Copy QR code to clipboard
   * 
   * WHY: Provides quick sharing option for QR codes.
   * Enhances user experience with easy sharing capabilities.
   */
  const copyQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } catch (err) {
      console.error('Error copying QR code:', err);
    }
  };

  /**
   * Share QR code using Web Share API
   * 
   * WHY: Provides native sharing capabilities for mobile devices.
   * Enhances user experience with platform-specific sharing.
   */
  const shareQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      if (navigator.share) {
        const response = await fetch(qrCodeDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `poll-${pollId}-qr-code.png`, { type: 'image/png' });
        
        await navigator.share({
          title: pollTitle || 'Poll QR Code',
          text: `Scan this QR code to vote on: ${pollTitle || 'Poll'}`,
          files: [file]
        });
      } else {
        // Fallback to download
        downloadQRCode();
      }
    } catch (err) {
      console.error('Error sharing QR code:', err);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="h-5 w-5" />
          <span>QR Code</span>
        </CardTitle>
        <CardDescription>
          Generate a QR code to share this poll easily
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Size Selection */}
        <div className="space-y-2">
          <Label htmlFor="qr-size">QR Code Size</Label>
          <div className="flex space-x-2">
            <Button
              variant={size === 'small' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSize('small')}
              className="flex items-center space-x-1"
            >
              <Smartphone className="h-3 w-3" />
              <span>Small</span>
            </Button>
            <Button
              variant={size === 'medium' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSize('medium')}
              className="flex items-center space-x-1"
            >
              <Tablet className="h-3 w-3" />
              <span>Medium</span>
            </Button>
            <Button
              variant={size === 'large' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSize('large')}
              className="flex items-center space-x-1"
            >
              <Monitor className="h-3 w-3" />
              <span>Large</span>
            </Button>
          </div>
        </div>

        {/* Custom URL Input */}
        <div className="space-y-2">
          <Label htmlFor="custom-url">Custom URL (Optional)</Label>
          <Input
            id="custom-url"
            type="url"
            placeholder="Enter custom URL for QR code"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
        </div>

        {/* QR Code Display */}
        <div className="flex justify-center">
          {isGenerating ? (
            <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-muted-foreground rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Generating QR code...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-destructive rounded-lg">
              <div className="text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateQRCode}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : qrCodeDataUrl ? (
            <div className="text-center">
              <img
                src={qrCodeDataUrl}
                alt={`QR code for poll: ${pollTitle || pollId}`}
                className="mx-auto border rounded-lg"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Scan with your camera to vote
              </p>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {qrCodeDataUrl && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="flex items-center space-x-1"
            >
              <Download className="h-3 w-3" />
              <span>Download</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyQRCode}
              className="flex items-center space-x-1"
            >
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={shareQRCode}
              className="flex items-center space-x-1"
            >
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </Button>
          </div>
        )}

        {/* Poll URL Display */}
        <div className="space-y-2">
          <Label>Poll URL</Label>
          <div className="flex items-center space-x-2">
            <Input
              value={pollUrl}
              readOnly
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(pollUrl)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            💡 Tip: QR codes work best when printed or displayed on screens
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

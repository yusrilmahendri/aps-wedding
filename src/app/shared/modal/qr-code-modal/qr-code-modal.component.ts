import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import * as QRCode from 'qrcode';

interface GuestQRData {
  type: string;
  wedding_domain: string;
  guest_name: string;
  token: string;
}

@Component({
  selector: 'wc-qr-code-modal',
  templateUrl: './qr-code-modal.component.html',
  styleUrls: ['./qr-code-modal.component.scss']
})
export class QRCodeModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() url: string = '';
  @Input() title: string = 'Share Wedding Invitation';
  @Input() description: string = 'Scan this QR code to view the wedding invitation';
  @Input() guestName?: string;
  @Input() domain?: string;
  @Input() guestToken?: string;
  @Input() useGuestQR: boolean = false;
  @Output() close = new EventEmitter<void>();

  @ViewChild('qrCanvas', { static: false }) qrCanvas!: ElementRef<HTMLCanvasElement>;

  isGenerating: boolean = false;
  errorMessage: string = '';
  qrCodeGenerated: boolean = false;

  constructor(public bsModalRef: BsModalRef) {
    console.log('QRCodeModalComponent constructor called');
  }

  ngOnInit(): void {
    console.log('QRCodeModalComponent ngOnInit called with:', {
      url: this.url,
      title: this.title,
      description: this.description
    });
  }

  ngAfterViewInit(): void {
    console.log('QRCodeModalComponent ngAfterViewInit called');
    console.log('qrCanvas available:', !!this.qrCanvas);

    if (this.url) {
      // Use setTimeout to ensure the view is fully rendered
      setTimeout(() => {
        this.generateQRCode();
      }, 100);
    } else {
      this.errorMessage = 'No URL provided for QR code generation';
      console.error('QRCodeModalComponent: No URL provided');
    }
  }

  ngOnDestroy(): void {
    console.log('QRCodeModalComponent destroyed');
  }

  /**
   * Generate QR code from the provided URL or guest data
   */
  private async generateQRCode(): Promise<void> {
    console.log('generateQRCode called with:', {
      url: this.url,
      guestName: this.guestName,
      domain: this.domain,
      guestToken: this.guestToken,
      useGuestQR: this.useGuestQR
    });
    console.log('qrCanvas element:', this.qrCanvas);

    if (!this.qrCanvas) {
      this.errorMessage = 'Canvas element not found';
      console.error('qrCanvas element not found');
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';

    try {
      const canvas = this.qrCanvas.nativeElement;
      console.log('Canvas element:', canvas);

      // Determine QR data content
      let qrDataContent: string;

      if (this.useGuestQR && this.guestName && this.domain && this.guestToken) {
        // Generate JSON format QR for guest attendance
        const guestQRData: GuestQRData = {
          type: 'wedding_attendance',
          wedding_domain: this.domain,
          guest_name: this.guestName,
          token: this.guestToken
        };
        qrDataContent = JSON.stringify(guestQRData);
        console.log('Generating guest QR with data:', guestQRData);
      } else if (this.url) {
        // Use URL for regular invitation QR
        qrDataContent = this.url;
        console.log('Generating URL QR with:', this.url);
      } else {
        this.errorMessage = 'Missing URL or guest data for QR code generation';
        console.error('No URL or guest data provided for QR code generation');
        this.isGenerating = false;
        return;
      }

      // QR code options for wedding invitation style
      const options = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#2c5530', // Wedding theme green
          light: '#FFFFFF'
        },
        width: 280, // Size for mobile-friendly scanning
        scale: 4
      };

      console.log('Generating QR code with options:', options);
      await QRCode.toCanvas(canvas, qrDataContent, options);

      this.qrCodeGenerated = true;
      this.isGenerating = false;
      console.log('QR code generated successfully');

    } catch (error) {
      console.error('Error generating QR code:', error);
      this.errorMessage = 'Failed to generate QR code. Please try again.';
      this.isGenerating = false;
    }
  }

  /**
   * Retry generating QR code
   */
  retryGeneration(): void {
    console.log('Retrying QR code generation');
    this.generateQRCode();
  }

  /**
   * Copy URL to clipboard
   */
  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      console.log('URL copied to clipboard:', this.url);
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback for older browsers
      this.fallbackCopyUrl();
    }
  }

  /**
   * Fallback copy method for older browsers
   */
  private fallbackCopyUrl(): void {
    const textArea = document.createElement('textarea');
    textArea.value = this.url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('URL copied using fallback method');
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }

    document.body.removeChild(textArea);
  }

  /**
   * Download QR code as PNG image
   */
  downloadQRCode(): void {
    if (!this.qrCanvas || !this.qrCodeGenerated) {
      console.error('QR code not available for download');
      return;
    }

    try {
      const canvas = this.qrCanvas.nativeElement;
      const dataURL = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = 'wedding-qr-code.png';
      link.href = dataURL;
      link.click();

      console.log('QR code download initiated');
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  }

  /**
   * Share URL using Web Share API or fallback
   */
  async shareUrl(): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.title,
          text: this.description,
          url: this.url
        });
        console.log('URL shared successfully');
      } catch (error) {
        console.error('Error sharing URL:', error);
        this.copyUrl(); // Fallback to copy
      }
    } else {
      // Fallback for browsers without Web Share API
      this.copyUrl();
    }
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    console.log('Closing QR modal');
    this.close.emit();
    this.bsModalRef.hide();
  }
}

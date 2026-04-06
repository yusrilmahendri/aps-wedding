import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import * as QRCode from 'qrcode';
import { DashboardService, DashboardServiceType } from '../../../dashboard.service';

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
  @ViewChild('qrCanvasFull', { static: false }) qrCanvasFull!: ElementRef<HTMLCanvasElement>;

  isGenerating: boolean = false;
  isFullscreen: boolean = false;
  errorMessage: string = '';
  qrCodeGenerated: boolean = false;

  scanStatus: 'idle' | 'success' | 'error' = 'idle';
  scanStatusMessage: string = '';
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(public bsModalRef: BsModalRef, private dashboardSvc: DashboardService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.url) {
      setTimeout(() => {
        this.generateQRCode();
        if (this.useGuestQR && this.guestToken) {
          this.startAttendancePolling();
        }
      }, 100);
    } else {
      this.errorMessage = 'No URL provided for QR code generation';
    }
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Toggle fullscreen QR overlay for scanning officers
   */
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      setTimeout(() => this.generateQRCode(480), 50);
    }
  }

  /**
   * Poll attendance status every 3 seconds until scan confirmed
   */
  private startAttendancePolling(): void {
    this.pollingInterval = setInterval(() => {
      this.dashboardSvc.getParam(DashboardServiceType.GUEST_VERIFY_TOKEN, '/' + this.guestToken).subscribe({
        next: (res: any) => {
          if (res?.data?.attended === true) {
            this.scanStatus = 'success';
            this.scanStatusMessage = 'QR Anda telah berhasil discan!';
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
              this.pollingInterval = null;
            }
          }
        },
        error: () => {
          this.scanStatus = 'error';
          this.scanStatusMessage = 'Gagal memeriksa status kehadiran';
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
        }
      });
    }, 3000);
  }

  /**
   * Generate QR code from the provided URL or guest data
   */
  private async generateQRCode(size: number = 280): Promise<void> {
    const targetCanvas = size > 280 ? this.qrCanvasFull : this.qrCanvas;

    if (!targetCanvas) {
      this.errorMessage = 'Canvas element not found';
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';

    try {
      const canvas = targetCanvas.nativeElement;

      let qrDataContent: string;

      if (this.useGuestQR && this.guestName && this.domain && this.guestToken) {
        const guestQRData: GuestQRData = {
          type: 'wedding_attendance',
          wedding_domain: this.domain,
          guest_name: this.guestName,
          token: this.guestToken
        };
        qrDataContent = JSON.stringify(guestQRData);
      } else if (this.url) {
        qrDataContent = this.url;
      } else {
        this.errorMessage = 'Missing URL or guest data for QR code generation';
        this.isGenerating = false;
        return;
      }

      const options = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#2c5530',
          light: '#FFFFFF'
        },
        width: size,
        scale: 4
      };

      await QRCode.toCanvas(canvas, qrDataContent, options);

      this.qrCodeGenerated = true;
      this.isGenerating = false;

    } catch (error) {
      this.errorMessage = 'Failed to generate QR code. Please try again.';
      this.isGenerating = false;
    }
  }

  /**
   * Retry generating QR code
   */
  retryGeneration(): void {
    this.generateQRCode();
  }

  /**
   * Copy URL to clipboard
   */
  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
    } catch (error) {
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
    } catch (error) {
      // fallback failed silently
    }

    document.body.removeChild(textArea);
  }

  /**
   * Download QR code as PNG image
   */
  downloadQRCode(): void {
    if (!this.qrCanvas || !this.qrCodeGenerated) return;

    try {
      const canvas = this.qrCanvas.nativeElement;
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'wedding-qr-code.png';
      link.href = dataURL;
      link.click();
    } catch (_err) {}
  }

  /**
   * Share URL using Web Share API or fallback
   */
  async shareUrl(): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({ title: this.title, text: this.description, url: this.url });
      } catch (_err) {
        this.copyUrl();
      }
    } else {
      this.copyUrl();
    }
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    this.close.emit();
    this.bsModalRef.hide();
  }
}

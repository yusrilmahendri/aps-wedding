import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import jsQR from 'jsqr';

interface AttendanceScan {
  id: number;
  guest_name: string;
  acara_type: string;
  scan_type: string;
  scanned_at: string;
}

interface ScanStatistics {
  total_scans: number;
  qr_scans: number;
  manual_scans: number;
  today_scans: number;
  by_acara_type: { [key: string]: number };
}

interface AcaraOption {
  id: number;
  jenis_acara: string;
  nama_acara: string;
}

interface GuestQRData {
  type: string;
  wedding_domain: string;
  guest_name: string;
  token: string;
}

@Component({
  selector: 'wc-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss']
})
export class QRScannerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private notyf: Notyf;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  // Form for manual entry
  manualEntryForm: FormGroup;

  // UI state
  isScanning = false;
  isProcessing = false;
  selectedTab: 'scan' | 'list' | 'stats' = 'scan';
  selectedAcaraId: number | null = null;
  scannedQrData: string | null = null;
  hasCameraPermission = false;
  cameraError: string | null = null;
  currentFacingMode: 'environment' | 'user' = 'environment'; // 'environment' = belakang, 'user' = depan

  // Parsed guest data from QR
  scannedGuestData: {
    name: string;
    domain: string;
    token: string;
  } | null = null;

  // Data
  attendanceScans: AttendanceScan[] = [];
  statistics: ScanStatistics | null = null;
  availableAcara: AcaraOption[] = [];

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

    this.manualEntryForm = this.fb.group({
      guest_name: ['', Validators.required],
      acara_id: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcaraOptions();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopScanning();
  }

  ngAfterViewInit(): void {
    // Video and canvas elements are now available
    console.log('QR Scanner component initialized');
  }

  /**
   * Load available acara (akad/resepsi) for scanning
   */
  private loadAcaraOptions(): void {
    this.dashboardSvc.list(DashboardServiceType.ACARA_DATA).subscribe({
      next: (res: any) => {
        if (res?.data?.acaras) {
          this.availableAcara = res.data.acaras;
        }
      },
      error: (err) => {
        console.error('Error loading acara options:', err);
        this.notyf.error('Gagal memuat data acara');
      }
    });
  }

  /**
   * Toggle camera facing mode (front/back)
   */
  toggleCamera(): void {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';

    // Stop current scanning and restart with new camera
    if (this.isScanning) {
      this.stopScanning();
      setTimeout(() => {
        this.startScanning();
      }, 100);
    }

    const cameraName = this.currentFacingMode === 'environment' ? 'Belakang' : 'Depan';
    this.notyf.success(`Kamera dialih ke ${cameraName}`);
  }

  /**
   * Start QR code scanner
   */
  async startScanning(): Promise<void> {
    if (!this.selectedAcaraId) {
      this.notyf.error('Pilih acara terlebih dahulu');
      return;
    }

    if (this.isScanning) {
      return;
    }

    this.isProcessing = true;
    this.cameraError = null;

    try {
      console.log('Requesting camera permission...');

      // Request fullscreen on mobile devices
      if (document.documentElement.requestFullscreen && window.innerWidth < 768) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (e) {
          console.log('Fullscreen not supported or denied');
        }
      }

      // Request camera permission with current facing mode
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('Camera permission granted, stream obtained:', this.stream);

      this.hasCameraPermission = true;
      this.isScanning = true;

      // Wait for next tick to ensure DOM is updated
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          const video = this.videoElement.nativeElement;
          video.srcObject = this.stream;
          video.muted = true;
          video.playsInline = true;

          video.onloadedmetadata = () => {
            console.log('Video metadata loaded, starting playback');
            video.play()
              .then(() => {
                console.log('Video playback started');
                this.startScanningLoop();
              })
              .catch(err => {
                console.error('Error playing video:', err);
              });
          };

          video.onerror = (e) => {
            console.error('Video error:', e);
          };
        } else {
          console.error('Video element not available');
          this.cameraError = 'Video element tidak tersedia';
          this.stopScanning();
        }

        this.isProcessing = false;
        this.notyf.success('Kamera diaktifkan');
      }, 100);

    } catch (error) {
      console.error('Error accessing camera:', error);
      this.cameraError = 'Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.';
      this.notyf.error(this.cameraError);
      this.isScanning = false;
      this.isProcessing = false;
    }
  }

  /**
   * Stop QR code scanner
   */
  stopScanning(): void {
    this.isScanning = false;
    this.hasCameraPermission = false;

    // Exit fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.log('Error exiting fullscreen:', err);
      });
    }

    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop video stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear video element
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  /**
   * Start the scanning loop
   */
  private startScanningLoop(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    const scan = () => {
      if (!this.isScanning) {
        return;
      }

      if (video?.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        // Set canvas dimensions to match video
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for QR scanning
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Try to find QR code - only process if we have valid data
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data && code.data.trim().length > 0) {
          console.log('QR Code found:', code.data);
          this.onScanSuccess(code.data);
          return; // Stop scanning after successful scan
        }
      }

      // Continue scanning
      this.animationFrameId = requestAnimationFrame(scan);
    };

    // Start the scanning loop
    this.animationFrameId = requestAnimationFrame(scan);
  }

  /**
   * Handle QR code scan result
   */
  onScanSuccess(qrData: string): void {
    if (!this.selectedAcaraId || this.isProcessing) {
      return;
    }

    console.log('QR Data scanned:', qrData);
    this.scannedQrData = qrData;
    this.isProcessing = true;

    // Stop scanning after successful scan
    this.stopScanning();

    try {
      // Parse QR data - expecting JSON format
      const scanData: GuestQRData = JSON.parse(qrData);

      console.log('Parsed QR Data:', scanData);

      // Validate QR data format
      if (scanData.type !== 'wedding_attendance') {
        this.notyf.error('QR Code tidak valid untuk kehadiran');
        this.isProcessing = false;
        this.scannedGuestData = null;
        return;
      }

      // Validate required fields
      if (!scanData.wedding_domain || !scanData.guest_name || !scanData.token) {
        this.notyf.error('QR Code tidak lengkap');
        this.isProcessing = false;
        this.scannedGuestData = null;
        return;
      }

      // Store parsed guest data for UI display
      this.scannedGuestData = {
        name: scanData.guest_name,
        domain: scanData.wedding_domain,
        token: scanData.token
      };

      // Process the scan with new guest tracking API
      this.processGuestAttendanceScan({
        guest_token: scanData.token,
        acara_id: this.selectedAcaraId,
        scan_type: 'qr_code',
        notes: `QR scan dari ${scanData.guest_name}`
      });

    } catch (error) {
      console.error('Error parsing QR data:', error);
      this.notyf.error('Format QR Code tidak valid');
      this.isProcessing = false;
      this.scannedGuestData = null;
    }
  }

  /**
   * Handle manual entry submission
   */
  onManualSubmit(): void {
    if (this.manualEntryForm.invalid) {
      this.notyf.error('Mohon lengkapi form');
      return;
    }

    const formValue = this.manualEntryForm.value;

    this.processAttendanceScan({
      acara_id: formValue.acara_id,
      guest_name: formValue.guest_name,
      scan_type: 'manual',
      notes: formValue.notes || null
    });
  }

  /**
   * Process guest attendance scan with token (new API)
   * This is called when scanning QR codes with guest tokens
   */
  private processGuestAttendanceScan(payload: any): void {
    this.dashboardSvc.create(DashboardServiceType.GUEST_CONFIRM_ATTENDANCE, payload).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Kehadiran berhasil dicatat');
        this.loadStatistics();

        if (this.selectedTab === 'list') {
          this.loadAttendanceScans();
        }

        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error processing guest scan:', err);

        if (err.status === 409) {
          this.notyf.error(err?.error?.message || 'Tamu ini sudah di-scan sebelumnya');
        } else {
          this.notyf.error(err?.error?.message || 'Gagal memproses scan');
        }

        this.isProcessing = false;
      }
    });
  }

  /**
   * Reset scan data
   */
  resetScan(): void {
    this.scannedQrData = null;
    this.scannedGuestData = null;
  }

  /**
   * Process attendance scan (send to API) - legacy method for manual entry
   */
  private processAttendanceScan(payload: any): void {
    this.dashboardSvc.create(DashboardServiceType.ATTENDANCE_SCAN_PROCESS, payload).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Kehadiran berhasil dicatat');
        this.manualEntryForm.reset();
        this.loadStatistics();

        if (this.selectedTab === 'list') {
          this.loadAttendanceScans();
        }

        this.isProcessing = false;
      },
      error: (err) => {
        console.error('Error processing scan:', err);

        if (err.status === 409) {
          this.notyf.error(err?.error?.message || 'Tamu ini sudah di-scan sebelumnya');
        } else {
          this.notyf.error(err?.error?.message || 'Gagal memproses scan');
        }

        this.isProcessing = false;
      }
    });
  }

  /**
   * Load attendance scans list
   */
  loadAttendanceScans(): void {
    const params = this.selectedAcaraId ? { acara_id: this.selectedAcaraId } : {};

    this.dashboardSvc.list(DashboardServiceType.ATTENDANCE_SCAN_LIST, params).subscribe({
      next: (res: any) => {
        this.attendanceScans = res?.data?.data || [];
      },
      error: (err) => {
        console.error('Error loading attendance scans:', err);
        this.notyf.error('Gagal memuat data scan');
      }
    });
  }

  /**
   * Load attendance statistics
   */
  loadStatistics(): void {
    const params = this.selectedAcaraId ? { acara_id: this.selectedAcaraId } : {};

    this.dashboardSvc.list(DashboardServiceType.ATTENDANCE_SCAN_STATISTICS, params).subscribe({
      next: (res: any) => {
        this.statistics = res?.data || null;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
      }
    });
  }

  /**
   * Delete scan record
   */
  deleteScan(scanId: number): void {
    if (!confirm('Hapus data scan ini?')) {
      return;
    }

    this.dashboardSvc.deleteV2(DashboardServiceType.ATTENDANCE_SCAN_DELETE, scanId).subscribe({
      next: (res: any) => {
        this.notyf.success('Data scan berhasil dihapus');
        this.loadAttendanceScans();
        this.loadStatistics();
      },
      error: (err) => {
        console.error('Error deleting scan:', err);
        this.notyf.error('Gagal menghapus data scan');
      }
    });
  }

  /**
   * Export attendance data
   */
  exportData(): void {
    this.notyf.error('Fitur export akan segera tersedia');
  }

  /**
   * Get display name for acara type
   */
  getAcaraTypeName(jenisAcara: string): string {
    return jenisAcara === 'akad' ? 'Akad Nikah' : 'Resepsi';
  }
}

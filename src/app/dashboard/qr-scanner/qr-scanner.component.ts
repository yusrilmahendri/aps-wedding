import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { UserProfileResponse } from 'src/app/interfaces/user-profile.interface';
import { Subject } from 'rxjs';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AttendanceScan {
  id: number;
  guest_name: string;
  acara_type: string;
  scan_type: string;
  scanned_at: string;
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

  private destroy$ = new Subject<void>();
  private notyf: Notyf;
  private codeReader: BrowserMultiFormatReader | null = null;
  private scanControls: any = null;
  private lastScannedData: string | null = null;
  private scanCooldown = false;
  private pendingScanStart = false;
  private videoElementReady = false;

  // Form for manual entry
  manualEntryForm: FormGroup;

  // UI state
  isScanning = false;
  isProcessing = false;
  isInitializing = false;
  selectedTab: 'scan' | 'list' | 'manual' = 'scan';
  selectedAcaraId: number | null = null;
  scannedQrData: string | null = null;
  hasCameraPermission = false;
  cameraError: string | null = null;
  currentFacingMode: 'environment' | 'user' = 'environment';

  // Parsed guest data from QR
  scannedGuestData: {
    name: string;
    domain: string;
    token: string;
  } | null = null;

  // Authenticated user's wedding domain for ownership validation
  userDomain: string = '';

  // Data
  attendanceScans: AttendanceScan[] = [];
  availableAcara: AcaraOption[] = [];

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

    this.manualEntryForm = this.fb.group({
      guest_name: ['', Validators.required],
      acara_id: ['', Validators.required],
      notes: ['']
    });

    this.codeReader = new BrowserMultiFormatReader();
  }

  ngOnInit(): void {
    this.loadAcaraOptions();
    this.loadUserDomain();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopScanning();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkVideoElementReady();
    }, 100);
  }

  /**
   * Check if video element is ready in DOM
   */
  private checkVideoElementReady(): void {
    this.videoElementReady = !!(this.videoElement && this.videoElement.nativeElement);

    if (this.videoElementReady && this.pendingScanStart) {
      this.pendingScanStart = false;
      this.zone.run(() => {
        this.startScanning();
      });
    }

    this.cdr.detectChanges();
  }

  /**
   * Load authenticated user's domain for QR ownership validation
   */
  private loadUserDomain(): void {
    this.dashboardSvc.list(DashboardServiceType.PROFILE_API).subscribe({
      next: (res: UserProfileResponse) => {
        if (res && res.success && res.data && res.data.domain_info) {
          this.userDomain = res.data.domain_info.domain;
        }
      },
      error: () => {
        // Silent fail — ownership validation degrades gracefully
      }
    });
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
    const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';

    if (this.isScanning) {
      this.stopScanning();
      this.currentFacingMode = newFacingMode;

      setTimeout(() => {
        this.startScanning();
      }, 300);
    } else {
      this.currentFacingMode = newFacingMode;
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

    if (this.isScanning || this.isInitializing) {
      console.log('Already scanning or initializing, ignoring start request');
      return;
    }

    // Check video element availability
    if (!this.videoElement || !this.videoElement.nativeElement) {
      console.log('Video element not ready, setting pending flag');
      this.pendingScanStart = true;
      this.isInitializing = true;
      this.notyf.success('Menyiapkan kamera...');

      // Retry after a delay
      setTimeout(() => {
        this.checkVideoElementReady();
        if (!this.videoElementReady) {
          this.isInitializing = false;
          this.cameraError = 'Video element tidak tersedia. Silakan refresh halaman.';
          this.notyf.error(this.cameraError);
          this.pendingScanStart = false;
        }
      }, 500);
      return;
    }

    this.isInitializing = true;
    this.isProcessing = true;
    this.cameraError = null;
    this.scanCooldown = false;
    this.lastScannedData = null;
    this.pendingScanStart = false;

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

      const video = this.videoElement.nativeElement;

      // Request camera permission with current facing mode
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('Camera permission granted, stream obtained');

      this.hasCameraPermission = true;
      this.isScanning = true;
      this.isInitializing = false;
      this.isProcessing = false;

      // Set up video element
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video play timeout'));
        }, 10000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.play()
            .then(() => {
              console.log('Video playback started');
              resolve();
            })
            .catch((err) => {
              console.error('Error playing video:', err);
              reject(err);
            });
        };

        video.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
      });

      // Start QR scanning using zxing
      console.log('Starting QR code scanning...');
      this.scanControls = this.codeReader!.decodeFromVideoDevice(
        undefined,
        video,
        (result: Result | undefined) => {
          if (!this.isScanning || this.isProcessing || this.scanCooldown) {
            return;
          }

          if (result) {
            const qrText = result.getText();
            if (qrText && qrText.trim().length > 0) {
              if (qrText === this.lastScannedData) {
                return;
              }

              console.log('QR Code found:', qrText);
              this.lastScannedData = qrText;
              this.zone.run(() => {
                this.onScanSuccess(qrText);
              });
            }
          }
        }
      );

      this.notyf.success('Kamera diaktifkan');

    } catch (error) {
      console.error('Error accessing camera:', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          this.cameraError = 'Izin kamera ditolak. Berikan izin kamera di browser settings.';
        } else if (error.name === 'NotFoundError') {
          this.cameraError = 'Tidak ada kamera ditemukan pada perangkat ini.';
        } else {
          this.cameraError = `Gagal mengakses kamera: ${error.message}`;
        }
      } else {
        this.cameraError = 'Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.';
      }

      this.notyf.error(this.cameraError);
      this.isScanning = false;
      this.isInitializing = false;
      this.isProcessing = false;
    }
  }

  /**
   * Stop QR code scanner
   */
  stopScanning(): void {
    console.log('Stopping scanner...');
    this.isScanning = false;
    this.hasCameraPermission = false;
    this.isInitializing = false;
    this.scanCooldown = true;
    this.pendingScanStart = false;

    // Reset scan controls to null - this will stop the callback from processing
    if (this.scanControls) {
      this.scanControls = null;
    }

    // Abort any ongoing scans by re-creating the reader
    if (this.codeReader) {
      try {
        this.codeReader = new BrowserMultiFormatReader();
      } catch (e) {
        console.log('Error resetting code reader:', e);
      }
    }

    // Exit fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.log('Error exiting fullscreen:', err);
      });
    }

    // Stop video stream
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      const stream = video.srcObject as MediaStream;

      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
      }

      video.pause();
      video.srcObject = null;
      video.load();
    }

    console.log('Scanner stopped');
  }

  /**
   * Handle QR code scan result
   */
  onScanSuccess(qrData: string): void {
    if (!this.selectedAcaraId || this.isProcessing || this.scanCooldown) {
      return;
    }

    console.log('QR Data scanned:', qrData);
    this.scannedQrData = qrData;
    this.isProcessing = true;
    this.scanCooldown = true;

    this.stopScanning();

    setTimeout(() => {
      this.scanCooldown = false;
      this.lastScannedData = null;
    }, 2000);

    try {
      const scanData: GuestQRData = JSON.parse(qrData);

      console.log('Parsed QR Data:', scanData);

      if (scanData.type !== 'wedding_attendance') {
        this.notyf.error('QR Code tidak valid untuk kehadiran');
        this.isProcessing = false;
        this.scannedGuestData = null;
        return;
      }

      if (!scanData.wedding_domain || !scanData.guest_name || !scanData.token) {
        this.notyf.error('QR Code tidak lengkap');
        this.isProcessing = false;
        this.scannedGuestData = null;
        return;
      }

      // Domain ownership guard: QR must belong to the logged-in user's invitation
      if (this.userDomain && scanData.wedding_domain !== this.userDomain) {
        this.notyf.error('QR Code ini bukan bagian dari undangan Anda');
        this.isProcessing = false;
        this.scannedGuestData = null;
        return;
      }

      this.scannedGuestData = {
        name: scanData.guest_name,
        domain: scanData.wedding_domain,
        token: scanData.token
      };

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
   * Process guest attendance scan with token
   */
  private processGuestAttendanceScan(payload: any): void {
    this.dashboardSvc.create(DashboardServiceType.GUEST_CONFIRM_ATTENDANCE, payload).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Kehadiran berhasil dicatat');

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
    this.isProcessing = false;
    this.scanCooldown = false;
    this.lastScannedData = null;
  }

  /**
   * Process attendance scan (legacy method for manual entry)
   */
  private processAttendanceScan(payload: any): void {
    this.dashboardSvc.create(DashboardServiceType.ATTENDANCE_SCAN_PROCESS, payload).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Kehadiran berhasil dicatat');
        this.manualEntryForm.reset();

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
      },
      error: (err) => {
        console.error('Error deleting scan:', err);
        this.notyf.error('Gagal menghapus data scan');
      }
    });
  }

  /**
   * Export attendance data to Excel
   */
  exportData(): void {
    if (this.attendanceScans.length === 0) {
      this.notyf.error('Tidak ada data untuk diexport');
      return;
    }

    try {
      // Prepare data for Excel
      const exportData = this.attendanceScans.map((scan, index) => ({
        'No': index + 1,
        'Nama Tamu': scan.guest_name,
        'Acara': this.getAcaraTypeName(scan.acara_type),
        'Tipe Scan': scan.scan_type === 'qr_code' ? 'QR Code' : 'Manual',
        'Waktu Scan': scan.scanned_at
      }));

      // Create workbook
      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      // Create worksheet
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 30 },  // Nama Tamu
        { wch: 15 },  // Acara
        { wch: 12 },  // Tipe Scan
        { wch: 20 }   // Waktu Scan
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar Kehadiran');

      // Generate Excel file
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Create blob and save
      const blob: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Generate filename with timestamp
      const date = new Date();
      const timestamp = date.toISOString().slice(0, 10).replace(/-/g, '');
      const acaraName = this.selectedAcaraId
        ? this.availableAcara.find(a => a.id === this.selectedAcaraId)?.jenis_acara || 'semua'
        : 'semua';
      const fileName = `daftar_kehadiran_${acaraName}_${timestamp}.xlsx`;

      saveAs(blob, fileName);

      this.notyf.success('Data berhasil diexport ke Excel');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.notyf.error('Gagal mengekspor data ke Excel');
    }
  }

  /**
   * Get display name for acara type
   */
  getAcaraTypeName(jenisAcara: string): string {
    return jenisAcara === 'akad' ? 'Akad Nikah' : 'Resepsi';
  }
}

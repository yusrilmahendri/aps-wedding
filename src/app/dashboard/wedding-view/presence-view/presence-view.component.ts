import { Component, OnInit, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { WeddingData } from '../../../services/wedding-data.service';
import { DashboardService, DashboardServiceType } from '../../../dashboard.service';
import { ToastService } from '../../../toast.service';
import { Notyf } from 'notyf';

// Attendance interface matching API contract
interface AttendanceRequest {
  user_id: number;
  nama: string;
  kehadiran: 'hadir' | 'tidak_hadir' | 'mungkin';
  pesan: string;
}

interface AttendanceResponse {
  message: string;
  data?: {
    id: number;
    user_id: number;
    nama: string;
    kehadiran: string;
    pesan: string;
    created_at: string;
  };
  errors?: any;
  error?: string;
}

interface PresenceFormData {
  nama: string;
  kehadiran: string;
  ucapan: string;
}

@Component({
  selector: 'wc-presence-view',
  templateUrl: './presence-view.component.html',
  styleUrls: ['./presence-view.component.scss']
})
export class PresenceViewComponent implements OnInit, OnDestroy {
  @Input() weddingData: WeddingData | undefined;
  @Output() attendanceSubmitted = new EventEmitter<void>();

  formData: PresenceFormData = {
    nama: '',
    kehadiran: '',
    ucapan: ''
  };

  isSubmitting: boolean = false;
  private notyf: Notyf;


  // Subscriptions management
  private subscriptions = new Subscription();

  constructor(
    private dashboardService: DashboardService,
    private toastService: ToastService
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

  }

  ngOnInit(): void {
    console.log('PresenceViewComponent initialized with weddingData:', this.weddingData);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getCoupleNames(): string {
    const groomName = this.weddingData?.mempelai?.pria?.nama_panggilan || 'Mempelai Pria';
    const brideName = this.weddingData?.mempelai?.wanita?.nama_panggilan || 'Mempelai Wanita';
    return `${groomName} & ${brideName}`;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.showValidationErrors();
      return;
    }

    if (!this.weddingData?.user_info?.id) {
      this.showError('Tidak dapat mengirim konfirmasi kehadiran. Data pengguna tidak tersedia.');
      return;
    }

    this.isSubmitting = true;

    // Map form data to API format
    const attendanceData: AttendanceRequest = {
      user_id: this.weddingData.user_info.id,
      nama: this.formData.nama.trim(),
      kehadiran: this.mapKehadiranToAPI(this.formData.kehadiran),
      pesan: this.formData.ucapan.trim() || 'Terima kasih atas undangannya!'
    };

    console.log('Submitting attendance confirmation:', attendanceData);

    // Call attendance API
    const attendanceSubscription = this.dashboardService.create(
      DashboardServiceType.ATTENDANCE,
      attendanceData
    ).subscribe({
      next: (response: AttendanceResponse) => {
        console.log('Attendance confirmation successful:', response);
        this.handleSubmissionSuccess(response);
      },
      error: (error) => {
        console.error('Attendance confirmation failed:', error);
        this.handleSubmissionError(error);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });

    this.subscriptions.add(attendanceSubscription);
  }

  private isFormValid(): boolean {
    return !!(this.formData.nama.trim() && this.formData.kehadiran && this.formData.ucapan.trim());
  }

  private showValidationErrors(): void {
    let errorMessage = 'Mohon lengkapi:';

    if (!this.formData.nama.trim()) {
      errorMessage += '\n- Nama';
    }

    if (!this.formData.kehadiran) {
      errorMessage += '\n- Konfirmasi kehadiran';
    }

    if (!this.formData.ucapan.trim()) {
      errorMessage += '\n- Ucapan';
    }

    alert(errorMessage);
  }

  private showError(message: string): void {
    alert(message);
  }

  private mapKehadiranToAPI(kehadiran: string): 'hadir' | 'tidak_hadir' | 'mungkin' {
    switch (kehadiran) {
      case 'ya':
        return 'hadir';
      case 'tidak':
        return 'tidak_hadir';
      case 'belum_pasti':
        return 'mungkin';
      default:
        return 'hadir'; // default fallback
    }
  }

  private handleSubmissionSuccess(response: AttendanceResponse): void {
    const successMessage = `Terima kasih ${this.formData.nama}! Konfirmasi kehadiran Anda untuk acara ${this.getCoupleNames()} telah berhasil dikirim.`;

    this.notyf.success(successMessage);
    this.attendanceSubmitted.emit();

    // Reset form after successful submission
    this.resetForm();
  }

  private handleSubmissionError(error: any): void {
    this.isSubmitting = false;

    let errorMessage = 'Terjadi kesalahan saat mengirim konfirmasi kehadiran.';

    if (error.status === 422 && error.error?.errors) {
      // Validation errors
      const validationErrors = error.error.errors;
      const errorMessages: string[] = [];

      Object.keys(validationErrors).forEach(field => {
        const fieldErrors = validationErrors[field];
        if (Array.isArray(fieldErrors)) {
          errorMessages.push(...fieldErrors);
        }
      });

      if (errorMessages.length > 0) {
        errorMessage = 'Validasi gagal:\n' + errorMessages.join('\n');
      }
    } else if (error.status === 500) {
      errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('Attendance submission error details:', {
      status: error.status,
      message: error.error?.message,
      errors: error.error?.errors
    });

    alert(errorMessage);
  }

  private resetForm(): void {
    this.formData = {
      nama: '',
      kehadiran: '',
      ucapan: ''
    };

    this.isSubmitting = false;
  }

}

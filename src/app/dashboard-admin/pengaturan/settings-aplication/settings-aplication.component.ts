import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from 'src/app/dashboard.service';
import {
  AdminContactSetting,
  AdminContactSettingResponse,
  AdminContactSettingUpdateRequest
} from 'src/app/interfaces/admin-contact-setting.interface';
import { Notyf } from 'notyf';

@Component({
  selector: 'wc-settings-aplication',
  templateUrl: './settings-aplication.component.html',
  styleUrls: ['./settings-aplication.component.scss']
})
export class SettingsAplicationComponent implements OnInit {
  contactForm: FormGroup;
  contactData: AdminContactSetting | null = null;
  isLoading = false;
  isSubmitting = false;
  private notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    dismissible: true
  });

  constructor(
    private fb: FormBuilder,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.contactForm = this.fb.group({
      host_email: ['', [Validators.email]],
      email: ['', [Validators.email]],
      nama: ['', [Validators.maxLength(255)]],
      whatsapp: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;

    this.dashboardService.getAdminContactSettings().subscribe({
      next: (response: AdminContactSettingResponse) => {
        this.contactData = response.data;
        this.populateForm();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (error.status === 404) {
          this.isLoading = false;
        } else {
          console.error('Error loading contact settings:', error);
          this.notyf.error('Gagal memuat pengaturan kontak');
          this.isLoading = false;
        }
      }
    });
  }

  populateForm(): void {
    if (this.contactData) {
      this.contactForm.patchValue({
        host_email: this.contactData.host_email || '',
        email: this.contactData.email || '',
        nama: this.contactData.nama || '',
        whatsapp: this.contactData.whatsapp || ''
      });
    }
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.notyf.error('Periksa kembali form anda');
      return;
    }

    this.isSubmitting = true;
    const formData: AdminContactSettingUpdateRequest = this.contactForm.value;

    this.dashboardService.updateAdminContactSettings(formData).subscribe({
      next: (response: AdminContactSettingResponse) => {
        this.contactData = response.data;
        this.notyf.success(response.message || 'Pengaturan kontak berhasil disimpan');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.handleValidationErrors(error);
        this.isSubmitting = false;
      }
    });
  }

  onDelete(): void {
    if (!confirm('Apakah anda yakin ingin menghapus pengaturan kontak? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    this.isSubmitting = true;

    this.dashboardService.deleteAdminContactSettings().subscribe({
      next: (response) => {
        this.contactData = null;
        this.contactForm.reset();
        this.notyf.success(response.message || 'Pengaturan kontak berhasil dihapus');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting contact settings:', error);
        this.notyf.error(error.error?.message || 'Gagal menghapus pengaturan kontak');
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private handleValidationErrors(error: any): void {
    if (error.status === 422 && error.error?.errors) {
      const errors = error.error.errors;

      for (const field in errors) {
        if (errors[field] && errors[field].length > 0) {
          this.notyf.error(errors[field][0]);
          break;
        }
      }
    } else {
      this.notyf.error(error.error?.message || 'Terjadi kesalahan sistem');
    }
  }

  get f() {
    return this.contactForm.controls;
  }
}

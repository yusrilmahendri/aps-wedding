import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import {
  DashboardService,
  DashboardServiceType,
  TestimoniCreateRequest,
  TestimoniCreateResponse
} from 'src/app/dashboard.service';

@Component({
  selector: 'wc-testimoni',
  templateUrl: './testimoni.component.html',
  styleUrls: ['./testimoni.component.scss']
})
export class TestimoniComponent implements OnInit {
  // Form properties
  reviewForm!: FormGroup;
  isSubmitting = false;

  private notyf: Notyf;

  constructor(
    private dashboardService: DashboardService
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: {
        x: 'right',
        y: 'top'
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize reactive form with validation
   */
  private initializeForm(): void {
    this.reviewForm = new FormGroup({
      provinsi: new FormControl('', [
        Validators.required,
        Validators.minLength(3)
      ]),
      kota: new FormControl('', [
        Validators.required,
        Validators.minLength(3)
      ]),
      ulasan: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(500)
      ])
    });
  }

  /**
   * Submit testimonial form
   */
  onSubmit(): void {
    if (this.reviewForm.invalid) {
      this.markFormGroupTouched();
      this.notyf.error('Silakan lengkapi semua field yang diperlukan.');
      return;
    }

    this.isSubmitting = true;
    const formData = this.reviewForm.value as TestimoniCreateRequest;

    this.dashboardService.create(DashboardServiceType.USER_TESTIMONI, formData).subscribe({
      next: (response: TestimoniCreateResponse) => {
        this.isSubmitting = false;
        const message = response?.message || 'Testimoni berhasil dikirim!';
        this.notyf.success(message);
        this.reviewForm.reset();
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting testimonial:', error);

        // Handle validation errors
        if (error.status === 422 && error.error?.errors) {
          this.handleValidationErrors(error.error.errors);
        } else {
          this.notyf.error('Gagal mengirim testimoni. Silakan coba lagi.');
        }
      }
    });
  }

  /**
   * Handle validation errors from API
   */
  private handleValidationErrors(errors: any): void {
    Object.keys(errors).forEach(field => {
      const control = this.reviewForm.get(field);
      if (control) {
        control.setErrors({ serverError: errors[field][0] });
      }
    });
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.reviewForm.controls).forEach(key => {
      const control = this.reviewForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Get form field error message
   */
  getFieldError(fieldName: string): string {
    const control = this.reviewForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} wajib diisi.`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} minimal ${control.errors['minlength'].requiredLength} karakter.`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} maksimal ${control.errors['maxlength'].requiredLength} karakter.`;
      }
      if (control.errors['serverError']) {
        return control.errors['serverError'];
      }
    }
    return '';
  }

  /**
   * Get friendly field label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'provinsi': 'Provinsi',
      'kota': 'Kota',
      'ulasan': 'Ulasan'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.reviewForm.get(fieldName);
    return !!(control && control.errors && control.touched);
  }
}

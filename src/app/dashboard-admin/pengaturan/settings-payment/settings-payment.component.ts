import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardServiceType } from '../../../dashboard.service';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { BankAccount } from '../../../services/wedding-data.service';

/**
 * SettingsPaymentComponent
 *
 * Admin component for managing payment methods settings.
 * For manual payment method (rekening), implements full CRUD operations
 * according to the API contract specifications:
 *
 * - CREATE: POST /api/v1/admin/send-rekening
 * - READ:   GET /api/v1/admin/get-rekening
 * - UPDATE: PUT /api/v1/admin/update-rekening/{id}
 * - DELETE: DELETE /api/v1/admin/delete-rekening/{id}
 *
 * All operations support file upload for photo_rek (optional).
 * Validation includes bank code verification and file type/size checks.
 */

interface PaymentMethod {
  id: number;
  name: string;
}

interface ActivePaymentMethodData {
  id: number | string;
  metode_transaction_id: number | string;
  is_active: boolean;
  metodeTransaction?: PaymentMethod;
}

interface Bank {
  id: number;
  kode_bank: string;
  name: string;
  logo?: string;
}

interface PaymentMethodDetail {
  id: number;
  metodePembayaran: string;
  idMetodePembayaran: string;
  userId?: number;
  // Manual payment fields
  pengguna?: string;
  email?: string;
  noRekening?: string;
  namaBank?: string;
  kodeBank?: string;
  namaPemilik?: string;
  photoRek?: string | null;
  // Midtrans fields
  url?: string;
  serverKey?: string;
  clientKey?: string;
  metodeProduction?: string;
  // Trial fields
  trialInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RekeningApiResponse {
  id: number;
  kode_bank: string;
  nomor_rekening: string;
  nama_bank: string;
  nama_pemilik: string;
  photo_rek: string | null;
  bank_info: {
    id: number;
    name: string;
    kode_bank: string;
  };
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

interface ApiErrorResponse {
  message: string;
  errors?: { [key: string]: string[] };
}

@Component({
  selector: 'wc-settings-payment',
  templateUrl: './settings-payment.component.html',
  styleUrls: ['./settings-payment.component.scss']
})
export class SettingsPaymentComponent implements OnInit {

  // Payment method selection
  paymentMethods: PaymentMethod[] = [];
  selectedPaymentMethod: PaymentMethod | null = null;

  // Active Payment Method Management
  activePaymentMethod: ActivePaymentMethodData | null = null;
  availablePaymentMethods: PaymentMethod[] = [];
  isLoadingActiveMethod = false;

  // Bank list for manual payments
  bankList: Bank[] = [];

  // Forms
  paymentForm!: FormGroup;
  editPaymentForm?: FormGroup;

  // Data display
  paymentDetails: PaymentMethodDetail[] = [];

  // UI state for multiple rekenings
  isLoading = false;
  isSubmitting = false;
  selectedPhotoFile: File | null = null; // Single file for current form
  selectedEditPhotoFile: File | null = null; // Single file for edit mode
  maxRekenings = 2; // Maximum 2 rekenings as per Laravel backend

  // Modal state
  currentEditItem: PaymentMethodDetail | null = null;

  private notyf: Notyf;

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  ngOnInit(): void {
    // Initialize empty form first to prevent null errors
    this.paymentForm = this.fb.group({});

    this.loadPaymentMethods();
    this.loadActivePaymentMethod();
  }

  private loadPaymentMethods(): void {
    this.isLoading = true;
    this.dashboardSvc.getParam(DashboardServiceType.MD_RGS_PAYMENT, '').subscribe({
      next: (response) => {
        this.paymentMethods = response?.data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading payment methods:', err);
        this.notyf.error('Gagal memuat metode pembayaran');
        this.isLoading = false;
      }
    });
  }

  private loadActivePaymentMethod(): void {
    this.isLoadingActiveMethod = true;
    this.dashboardSvc.list(DashboardServiceType.ADM_ACTIVE_PAYMENT_METHOD).subscribe({
      next: (response) => {
        this.activePaymentMethod = response?.data || null;
        // Also store available methods for the card selection UI
        this.availablePaymentMethods = this.paymentMethods.filter(m =>
          m.id !== 2 // Filter out Tripay (id: 2)
        );
        this.isLoadingActiveMethod = false;
      },
      error: (err) => {
        console.error('Error loading active payment method:', err);
        this.isLoadingActiveMethod = false;
      }
    });
  }

  setActivePaymentMethod(methodId: number): void {
    this.isLoadingActiveMethod = true;
    this.dashboardSvc.update(DashboardServiceType.SET_ACTIVE_PAYMENT_METHOD, `/${methodId}`, {}).subscribe({
      next: (response) => {
        this.activePaymentMethod = response?.data || null;
        this.notyf.success(response?.message || 'Active payment method updated successfully');
        this.isLoadingActiveMethod = false;
      },
      error: (err) => {
        console.error('Error setting active payment method:', err);
        this.notyf.error('Gagal mengubah metode pembayaran aktif');
        this.isLoadingActiveMethod = false;
      }
    });
  }

  isPaymentMethodActive(methodId: number): boolean {
    return Number(this.activePaymentMethod?.metode_transaction_id) === methodId ||
           Number(this.activePaymentMethod?.metodeTransaction?.id) === methodId;
  }

  private loadBankList(): void {
    this.dashboardSvc.list(DashboardServiceType.MD_LIST_BANK).subscribe({
      next: (res) => {
        this.bankList = res?.data || [];
      },
      error: (err) => {
        console.error('Error loading bank list:', err);
        this.notyf.error('Gagal memuat daftar bank');
      }
    });
  }

  onPaymentMethodSelect(selectedItem: any): void {
    console.log('Payment method select event:', selectedItem);

    // Extract the ID from the selected item
    const methodId = selectedItem?.id || selectedItem;
    if (!methodId) return;

    const method = this.paymentMethods.find(m => m.id === methodId);
    if (!method) return;

    console.log('Selected payment method:', method);

    // Clear previous state completely
    this.selectedPaymentMethod = null;
    this.paymentDetails = [];

    // Initialize an empty form to prevent null reference errors
    this.paymentForm = this.fb.group({});

    // Use setTimeout to ensure proper timing for state updates
    setTimeout(() => {
      // Set new payment method
      this.selectedPaymentMethod = method;

      // Initialize the proper form
      this.initializeForm();

      // Load data after form is properly initialized
      setTimeout(() => {
        this.loadPaymentDetails();

        // Load bank list if manual payment is selected
        if (methodId === 1) {
          this.loadBankList();
        }
      }, 50);
    }, 10);
  }

  private initializeForm(): void {
    if (!this.selectedPaymentMethod) {
      this.paymentForm = this.fb.group({});
      return;
    }

    console.log('Initializing form for payment method:', this.selectedPaymentMethod.id);

    // Create the form based on payment method type
    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual - According to API contract
        this.paymentForm = this.fb.group({
          kode_bank: new FormControl('', [Validators.required]),
          nomor_rekening: new FormControl('', [Validators.required]),
          nama_pemilik: new FormControl('', [Validators.required, Validators.minLength(2)])
        });
        break;

      case 3: // Midtrans (Tripay removed - id 2 no longer exists)
        this.paymentForm = this.fb.group({
          url: new FormControl('', [Validators.required]),
          server_key: new FormControl('', [Validators.required]),
          client_key: new FormControl('', [Validators.required]),
          metode_production: new FormControl('', [Validators.required]),
          methode_pembayaran: new FormControl('Midtrans', [Validators.required]),
          id_methode_pembayaran: new FormControl('3', [Validators.required])
        });
        break;

      default:
        this.paymentForm = this.fb.group({});
    }

    console.log('Form initialized successfully:', this.paymentForm);
  }

  onBankSelect(selectedItem: any): void {
    if (!this.paymentForm) return;

    // Extract the bank code from the selected item
    const bankCode = selectedItem?.kode_bank || selectedItem;
    this.paymentForm.get('kode_bank')?.setValue(bankCode);
  }

  private validateBankCode(bankCode: string): boolean {
    if (!this.bankList || this.bankList.length === 0) {
      return false;
    }
    return this.bankList.some(bank => bank.kode_bank === bankCode);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.validateFile(file)) {
        return;
      }

      this.selectedPhotoFile = file;
    }
  }

  private loadPaymentDetails(): void {
    if (!this.selectedPaymentMethod) return;

    this.isLoading = true;

    // Handle different payment methods
    if (this.selectedPaymentMethod.id === 1) {
      // Manual payment - use admin rekening endpoint
      this.loadManualPaymentDetails();
    } else {
      // Other payment methods - use existing logic
      const params = {
        id_methode_pembayaran: this.selectedPaymentMethod.id,
        name_methode_pembayaran: this.selectedPaymentMethod.name
      };

      this.dashboardSvc.list(DashboardServiceType.MNL_MD_METHOD_DETAIL, params).subscribe({
        next: (res) => {
          const paymentList = res?.data || [];
          this.mapPaymentDetails(paymentList);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading payment details:', err);
          this.notyf.error('Gagal memuat detail pembayaran');
          this.isLoading = false;
        }
      });
    }
  }

  private loadManualPaymentDetails(): void {
    this.dashboardSvc.list(DashboardServiceType.ADM_GET_REKENING).subscribe({
      next: (response: any) => {
        console.log('Manual payment API response:', response);
        this.mapManualPaymentDetails(response.data || []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading manual payment details:', err);
        this.notyf.error('Gagal memuat detail rekening');
        this.isLoading = false;
      }
    });
  }

  private mapManualPaymentDetails(data: RekeningApiResponse[]): void {
    console.log('Mapping manual payment details:', data);

    this.paymentDetails = data.map((item: RekeningApiResponse) => {
      const detail: PaymentMethodDetail = {
        id: item.id,
        metodePembayaran: 'Manual',
        idMetodePembayaran: '1',
        userId: undefined,
        pengguna: item.nama_pemilik,
        email: '-',
        noRekening: item.nomor_rekening,
        namaBank: item.nama_bank,
        kodeBank: item.kode_bank,
        namaPemilik: item.nama_pemilik,
        photoRek: item.photo_rek,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };

      return detail;
    });

    console.log('Mapped manual payment details:', this.paymentDetails);
  }

  private mapPaymentDetails(data: any[]): void {
    console.log('Raw API data:', data); // Debug logging

    this.paymentDetails = data.map((item: any) => {
      // Set payment method info based on selected method since API response doesn't include it
      const methodId = this.selectedPaymentMethod?.id || 1;
      const methodName = this.selectedPaymentMethod?.name || 'Manual';

      let detail: PaymentMethodDetail = {
        id: item.id,
        metodePembayaran: item.methode_pembayaran || methodName,
        idMetodePembayaran: item.id_methode_pembayaran?.toString() || methodId.toString(),
        userId: item.user_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };

      // Map specific fields based on payment method
      // Use selected payment method ID since API response may not include it
      const paymentMethodId = item.id_methode_pembayaran?.toString() || methodId.toString();

      switch (paymentMethodId) {
        case '1': // Manual
          detail = {
            ...detail,
            pengguna: item.nama_pemilik || item.email || '-',
            email: item.email || '-',
            noRekening: item.nomor_rekening || '-',
            namaBank: this.getBankNameFromCode(item.kode_bank) || '-',
            kodeBank: item.kode_bank || '-',
            namaPemilik: item.nama_pemilik || '-',
            photoRek: item.photo_rek || null
          };
          break;

        case '3': // Midtrans (Tripay removed)
          detail = {
            ...detail,
            url: item.url || '-',
            serverKey: item.server_key || '-',
            clientKey: item.client_key || '-',
            metodeProduction: item.metode_production || '-'
          };
          break;

        case '4': // Trial
          detail = {
            ...detail,
            trialInfo: 'Trial Mode Active'
          };
          break;
      }

      console.log('Mapped detail for item:', item, 'Result:', detail); // Debug logging
      return detail;
    });

    console.log('Final mapped payment details:', this.paymentDetails); // Debug logging
  }

  private getBankNameFromCode(kodeBank: string): string {
    if (!kodeBank || !this.bankList || this.bankList.length === 0) {
      return 'Bank tidak ditemukan';
    }
    const bank = this.bankList.find(b => b.kode_bank === kodeBank);
    return bank?.name || 'Bank tidak ditemukan';
  }

  private validateFile(file: File): boolean {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (file.size > maxSize) {
      this.notyf.error('Ukuran file maksimal 2MB');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.notyf.error('Format file harus JPEG, PNG, atau JPG');
      return false;
    }

    return true;
  }

  onSubmitPayment(): void {
    if (!this.selectedPaymentMethod || !this.paymentForm || this.paymentForm.invalid || this.isSubmitting) {
      if (this.isSubmitting) {
        this.notyf.error('Proses sedang berlangsung, harap tunggu...');
      } else {
        this.notyf.error('Harap lengkapi semua field yang wajib diisi');
      }
      return;
    }

    const formValues = this.paymentForm.value;
    this.isSubmitting = true;

    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual
        this.submitManualPayment(formValues);
        break;
      case 3: // Midtrans (Tripay removed - case 2 no longer exists)
        this.submitMidtransPayment(formValues);
        break;
      default:
        this.isSubmitting = false;
        this.notyf.error('Metode pembayaran tidak didukung');
    }
  }

  private submitManualPayment(formValues: any): void {
    // Check maksimal 2 rekening limit
    if (this.paymentDetails.length >= 2) {
      this.notyf.error('Maksimal hanya boleh memiliki 2 rekening');
      this.isSubmitting = false;
      return;
    }

    // Validate bank code exists
    if (!this.validateBankCode(formValues.kode_bank)) {
      this.notyf.error('Kode bank tidak valid');
      this.isSubmitting = false;
      return;
    }

    // Use FormData for file upload support as per API contract
    const formData = new FormData();

    // Append required fields according to API contract
    formData.append('kode_bank', formValues.kode_bank);
    formData.append('nomor_rekening', formValues.nomor_rekening);
    formData.append('nama_pemilik', formValues.nama_pemilik);

    // Add optional photo file
    if (this.selectedPhotoFile) {
      formData.append('photo_rek', this.selectedPhotoFile);
    }

    // Call admin endpoint using DashboardServiceType
    this.dashboardSvc.create(DashboardServiceType.ADM_ADD_REKENING, formData).subscribe({
      next: (response: any) => {
        console.log('Create rekening response:', response);
        this.notyf.success(response?.message || 'Rekening berhasil ditambahkan');
        this.loadPaymentDetails();
        this.resetForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleRekeningApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  private submitMidtransPayment(formValues: any): void {
    const formData = new FormData();
    Object.keys(formValues).forEach(key => {
      if (formValues[key] !== null && formValues[key] !== undefined) {
        formData.append(key, formValues[key]);
      }
    });

    this.dashboardSvc.create(DashboardServiceType.ADM_MIDTRANS_PAYMENT, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Konfigurasi Midtrans berhasil disimpan');
        this.loadPaymentDetails();
        this.resetForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  private resetForm(): void {
    if (this.paymentForm) {
      this.paymentForm.reset();

      // Re-initialize manual payment form if needed
      if (this.selectedPaymentMethod?.id === 1) {
        this.initializeForm();
      }
    }
    this.selectedPhotoFile = null;
    this.selectedEditPhotoFile = null;
  }

  private handleApiError(err: any): void {
    console.error('API Error:', err);

    if (err?.error?.errors) {
      Object.values(err.error.errors).forEach((messages: any) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => this.notyf.error(message));
        }
      });
    } else if (err?.error?.message) {
      this.notyf.error(err.error.message);
    } else {
      this.notyf.error('Terjadi kesalahan pada sistem');
    }
  }

  private handleRekeningApiError(err: any): void {
    console.error('Rekening API Error:', err);

    // Handle specific rekening API errors according to contract
    if (err.status === 422) {
      // Validation errors
      if (err.error?.errors) {
        Object.values(err.error.errors).forEach((messages: any) => {
          if (Array.isArray(messages)) {
            messages.forEach((message: string) => this.notyf.error(message));
          }
        });
      } else if (err.error?.message) {
        this.notyf.error(err.error.message);
      }
    } else if (err.status === 404) {
      this.notyf.error('Rekening tidak ditemukan');
    } else if (err.status === 401) {
      this.notyf.error('Tidak memiliki akses');
    } else if (err.status === 500) {
      this.notyf.error('Terjadi kesalahan server');
    } else if (err.error?.message) {
      this.notyf.error(err.error.message);
    } else {
      this.notyf.error('Terjadi kesalahan pada sistem');
    }
  }

  // Table display methods
  getTableColumns(): string[] {
    if (!this.selectedPaymentMethod) return [];

    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual
        return ['pengguna', 'email', 'noRekening', 'namaBank', 'metodePembayaran'];
      case 3: // Midtrans (Tripay removed - case 2 no longer exists)
        return ['url', 'serverKey', 'clientKey', 'metodePembayaran'];
      case 4: // Trial
        return ['trialInfo', 'metodePembayaran'];
      default:
        return ['metodePembayaran'];
    }
  }

  getColumnHeader(column: string): string {
    const headers: { [key: string]: string } = {
      pengguna: 'Pengguna',
      email: 'Email',
      noRekening: 'No Rekening',
      namaBank: 'Bank',
      url: 'URL',
      serverKey: 'Server Key',
      clientKey: 'Client Key',
      metodePembayaran: 'Metode Pembayaran',
      trialInfo: 'Trial Info'
    };
    return headers[column] || column;
  }

  getBankName(kodeBank: string): string {
    const bank = this.bankList.find(b => b.kode_bank === kodeBank);
    return bank?.name || 'Bank tidak ditemukan';
  }

  // Utility methods
  getFieldError(fieldName: string): string | null {
    if (!this.paymentForm) return null;

    const field = this.paymentForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `${this.getFieldDisplayName(fieldName)} wajib diisi`;
      if (field.errors['minlength']) return `${this.getFieldDisplayName(fieldName)} minimal 2 karakter`;
      if (field.errors['email']) return `Format email tidak valid`;
    }
    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'kode_bank': 'Bank',
      'nomor_rekening': 'Nomor Rekening',
      'nama_pemilik': 'Nama Pemilik',
      'url': 'URL',
      'server_key': 'Server Key',
      'client_key': 'Client Key',
      'metode_production': 'Mode Production'
    };
    return fieldNames[fieldName] || fieldName;
  }

  isFormValid(): boolean {
    return this.paymentForm ? this.paymentForm.valid : false;
  }

  hasPaymentDetails(): boolean {
    return this.paymentDetails.length > 0;
  }

  // Helper method for displaying values in table (show '-' for empty values)
  getDisplayValue(value: string | undefined | null): string {
    return value && value.trim() !== '' ? value : '-';
  }

  // Helper method to get selected file name for display
  getSelectedFileName(): string {
    if (this.selectedPhotoFile) {
      return this.selectedPhotoFile.name;
    }
    return 'No file chosen';
  }

  // Helper method to get field error for form validation
  getFormFieldError(fieldName: string): string | null {
    if (!this.paymentForm) return null;

    const field = this.paymentForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `${fieldName} wajib diisi`;
      if (field.errors['minlength']) return `${fieldName} minimal 2 karakter`;
    }
    return null;
  }

  // Modal Methods
  openEditModal(detail: PaymentMethodDetail): void {
    console.log('Opening edit modal with detail:', detail); // Debug logging

    this.currentEditItem = detail;
    this.initializeEditForm(detail);

    // Show modal using Bootstrap
    const modalElement = document.getElementById('editPaymentModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }  openDeleteModal(detail: PaymentMethodDetail): void {
    this.currentEditItem = detail;

    // Show modal using Bootstrap
    const modalElement = document.getElementById('deletePaymentModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  private initializeEditForm(detail: PaymentMethodDetail): void {
    if (!this.selectedPaymentMethod) return;

    console.log('Initializing edit form with detail:', detail); // Debug logging
    console.log('Selected payment method:', this.selectedPaymentMethod); // Debug logging

    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual
        this.editPaymentForm = this.fb.group({
          kode_bank: [detail.kodeBank || '', Validators.required],
          nomor_rekening: [detail.noRekening || '', [Validators.required]],
          nama_pemilik: [detail.namaPemilik || '', [Validators.required, Validators.minLength(2)]]
        });
        break;

      case 3: // Midtrans (Tripay removed - case 2 no longer exists)
        this.editPaymentForm = this.fb.group({
          url: [detail.url || '', Validators.required],
          server_key: [detail.serverKey || '', Validators.required],
          client_key: [detail.clientKey || '', Validators.required],
          metode_production: [detail.metodeProduction || '', Validators.required],
          methode_pembayaran: ['Midtrans', Validators.required],
          id_methode_pembayaran: ['3', Validators.required]
        });
        break;

      default:
        this.editPaymentForm = this.fb.group({});
    }

    console.log('Edit form created:', this.editPaymentForm.value); // Debug logging
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.validateFile(file)) {
        return;
      }

      this.selectedEditPhotoFile = file;
    }
  }

  onSubmitEditPayment(): void {
    if (!this.selectedPaymentMethod || !this.editPaymentForm || this.editPaymentForm.invalid) {
      this.notyf.error('Harap lengkapi semua field yang wajib diisi');
      return;
    }

    const formValues = this.editPaymentForm.value;
    console.log('Form values being sent:', formValues); // Debug logging
    this.isSubmitting = true;

    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual
        this.updateManualPayment(formValues);
        break;
      case 3: // Midtrans (Tripay removed - case 2 no longer exists)
        this.updateMidtransPayment(formValues);
        break;
      default:
        this.isSubmitting = false;
        this.notyf.error('Metode pembayaran tidak didukung');
    }
  }

  private updateManualPayment(formValues: any): void {
    // Validate bank code exists
    if (!this.validateBankCode(formValues.kode_bank)) {
      this.notyf.error('Kode bank tidak valid');
      this.isSubmitting = false;
      return;
    }

    // Use FormData for file upload support as per API contract
    const formData = new FormData();

    // Add Laravel method spoofing for PUT request with FormData
    formData.append('_method', 'PUT');

    // Append required fields according to API contract
    formData.append('kode_bank', formValues.kode_bank);
    formData.append('nomor_rekening', formValues.nomor_rekening);
    formData.append('nama_pemilik', formValues.nama_pemilik);

    // Add optional photo file if selected
    if (this.selectedEditPhotoFile) {
      formData.append('photo_rek', this.selectedEditPhotoFile);
    }

    const itemId = this.currentEditItem!.id;

    // Use uploadFileWithId for FormData compatibility with Laravel method spoofing
    this.dashboardSvc.uploadFileWithId(DashboardServiceType.UPDATE_REKENING_ADMIN, itemId, formData).subscribe({
      next: (response: any) => {
        console.log('Update rekening response:', response);
        this.notyf.success(response?.message || 'Rekening berhasil diperbarui');
        this.loadPaymentDetails();
        this.closeEditModal();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleRekeningApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  private updateMidtransPayment(formValues: any): void {
    const itemId = this.currentEditItem!.id;

    this.dashboardSvc.update(DashboardServiceType.ADM_GET_MIDTRANS_DETAIL, `/${itemId}`, formValues).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Konfigurasi Midtrans berhasil diperbarui');
        this.loadPaymentDetails();
        this.closeEditModal();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  onConfirmDelete(): void {
    if (!this.currentEditItem || !this.selectedPaymentMethod) {
      return;
    }

    this.isSubmitting = true;

    switch (this.selectedPaymentMethod.id) {
      case 1: // Manual
        this.deleteManualPayment();
        break;
      case 3: // Midtrans (Tripay removed - case 2 no longer exists)
        this.deleteMidtransPayment();
        break;
      default:
        this.isSubmitting = false;
        this.notyf.error('Metode pembayaran tidak didukung');
    }
  }

  private deleteManualPayment(): void {
    const itemId = this.currentEditItem!.id;

    // Call admin delete endpoint using DashboardServiceType
    this.dashboardSvc.deleteV2(DashboardServiceType.DELETE_REKENING_ADMIN, itemId).subscribe({
      next: (response: any) => {
        console.log('Delete rekening response:', response);
        this.notyf.success(response?.message || 'Rekening berhasil dihapus');
        this.loadPaymentDetails();
        this.closeDeleteModal();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleRekeningApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  private deleteMidtransPayment(): void {
    const itemId = this.currentEditItem!.id;

    // Use DashboardService deleteV2 method with service type
    this.dashboardSvc.deleteV2(DashboardServiceType.ADM_GET_MIDTRANS_DETAIL, itemId).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Konfigurasi Midtrans berhasil dihapus');
        this.loadPaymentDetails();
        this.closeDeleteModal();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.handleApiError(err);
        this.isSubmitting = false;
      }
    });
  }

  private closeEditModal(): void {
    const modalElement = document.getElementById('editPaymentModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.currentEditItem = null;
    this.selectedEditPhotoFile = null;
  }

  private closeDeleteModal(): void {
    const modalElement = document.getElementById('deletePaymentModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.currentEditItem = null;
  }
}

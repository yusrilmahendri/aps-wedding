import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { Subject, takeUntil, finalize } from 'rxjs';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

interface PackageData {
  id: number;
  jenis_paket: string;
  name_paket: string;
  price: string;
  masa_aktif: string;
  halaman_buku: string | number;
  kirim_wa: string | number;
  bebas_pilih_tema: string | number;
  kirim_hadiah: string | number;
  import_data: string | number;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'wc-settings-bundle',
  templateUrl: './settings-bundle.component.html',
  styleUrls: ['./settings-bundle.component.scss']
})
export class SettingsBundleComponent implements OnInit, OnDestroy {

  silverForm!: FormGroup;
  goldForm!: FormGroup;
  platinumForm!: FormGroup;
  trialForm!: FormGroup; // New form for Trial configuration


  silverLoading = false;
  goldLoading = false;
  platinumLoading = false;
  trialLoading = false; // Loading state for Trial config
  dataLoading = true;

  private notyf: Notyf;
  private modalRef?: BsModalRef;
  private destroy$ = new Subject<void>();


  private originalData: PackageData[] = [];

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private modalSvc: BsModalService
  ) {
    this.notyf = new Notyf({
      duration: 4000,
      position: { x: 'right', y: 'top' },
      dismissible: true
    });
  }

  ngOnInit(): void {
    this.initForms();
    this.getDataBundle();
    this.getTrialConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalRef?.hide();
  }

  private initForms(): void {

    this.silverForm = this.fb.group({
      id: [null],
      name_paket: ['', [Validators.required, Validators.minLength(3)]],
      price: ['', [Validators.required, Validators.min(0)]],
      masa_aktif: ['', [Validators.required, Validators.min(1)]],
      halaman_buku: [false],
      kirim_wa: [false],
      bebas_pilih_tema: [false],
      kirim_hadiah: [false],
      import_data: [false]
    });


    this.goldForm = this.fb.group({
      id: [null],
      name_paket: ['', [Validators.required, Validators.minLength(3)]],
      price: ['', [Validators.required, Validators.min(0)]],
      masa_aktif: ['', [Validators.required, Validators.min(1)]],
      halaman_buku: [false],
      kirim_wa: [false],
      bebas_pilih_tema: [false],
      kirim_hadiah: [false],
      import_data: [false]
    });


    this.platinumForm = this.fb.group({
      id: [null],
      name_paket: ['', [Validators.required, Validators.minLength(3)]],
      price: ['', [Validators.required, Validators.min(0)]],
      masa_aktif: ['', [Validators.required, Validators.min(1)]],
      halaman_buku: [false],
      kirim_wa: [false],
      bebas_pilih_tema: [false],
      kirim_hadiah: [false],
      import_data: [false]
    });

    // Trial configuration form - only active period is configurable
    this.trialForm = this.fb.group({
      trial_masa_aktif: [3, [Validators.required, Validators.min(1), Validators.max(30)]]
    });

    this.trackFormChanges();
  }

  private trackFormChanges(): void {
    [this.silverForm, this.goldForm, this.platinumForm].forEach(form => {
      form.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {

        });
    });
  }

  getDataBundle(): void {
    this.dataLoading = true;

    this.dashboardSvc.list(DashboardServiceType.ST_BUNDLE_ADMIN)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.dataLoading = false)
      )
      .subscribe({
        next: (res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length >= 3) {
            this.originalData = [...res.data];
            this.populateFormData(res.data);
          } else {
            this.notyf.error('Data paket tidak lengkap atau tidak valid');
          }
        },
        error: (err) => {
          console.error('Error fetching bundle data:', err);
          this.notyf.error(err?.error?.message || 'Gagal memuat data paket undangan');
        }
      });
  }

  private getTrialConfig(): void {
    this.dashboardSvc.list(DashboardServiceType.TRIAL_CONFIG).subscribe({
      next: (res) => {
        const trialDays = res?.data?.trial_masa_aktif || 3;
        this.trialForm.patchValue({ trial_masa_aktif: trialDays });
      },
      error: (err) => {
        console.error('Error fetching trial config:', err);
        // Set default value on error
        this.trialForm.patchValue({ trial_masa_aktif: 3 });
      }
    });
  }

  private populateFormData(data: PackageData[]): void {
    const [, silver, gold, platinum] = data;


    if (silver) {
      this.silverForm.patchValue({
        id: silver.id,
        name_paket: silver.name_paket,
        price: this.formatPrice(silver.price),
        masa_aktif: silver.masa_aktif,
        halaman_buku: this.convertToBoolean(silver.halaman_buku),
        kirim_wa: this.convertToBoolean(silver.kirim_wa),
        bebas_pilih_tema: this.convertToBoolean(silver.bebas_pilih_tema),
        kirim_hadiah: this.convertToBoolean(silver.kirim_hadiah),
        import_data: this.convertToBoolean(silver.import_data)
      });
    }


    if (gold) {
      this.goldForm.patchValue({
        id: gold.id,
        name_paket: gold.name_paket,
        price: this.formatPrice(gold.price),
        masa_aktif: gold.masa_aktif,
        halaman_buku: this.convertToBoolean(gold.halaman_buku),
        kirim_wa: this.convertToBoolean(gold.kirim_wa),
        bebas_pilih_tema: this.convertToBoolean(gold.bebas_pilih_tema),
        kirim_hadiah: this.convertToBoolean(gold.kirim_hadiah),
        import_data: this.convertToBoolean(gold.import_data)
      });
    }


    if (platinum) {
      this.platinumForm.patchValue({
        id: platinum.id,
        name_paket: platinum.name_paket,
        price: this.formatPrice(platinum.price),
        masa_aktif: platinum.masa_aktif,
        halaman_buku: this.convertToBoolean(platinum.halaman_buku),
        kirim_wa: this.convertToBoolean(platinum.kirim_wa),
        bebas_pilih_tema: this.convertToBoolean(platinum.bebas_pilih_tema),
        kirim_hadiah: this.convertToBoolean(platinum.kirim_hadiah),
        import_data: this.convertToBoolean(platinum.import_data)
      });
    }
  }

  private convertToBoolean(value: string | number): boolean {
    return value === 1 || value === '1';
  }

  private formatPrice(price: string | number): string {

    return Math.floor(parseFloat(price.toString())).toString();
  }

  private prepareFormData(form: FormGroup): any {
    const formValue = form.value;
    return {
      ...formValue,
      price: parseFloat(formValue.price.toString().replace(/[^\d]/g, '')),
      masa_aktif: parseInt(formValue.masa_aktif),
      halaman_buku: formValue.halaman_buku ? 1 : 0,
      kirim_wa: formValue.kirim_wa ? 1 : 0,
      bebas_pilih_tema: formValue.bebas_pilih_tema ? 1 : 0,
      kirim_hadiah: formValue.kirim_hadiah ? 1 : 0,
      import_data: formValue.import_data ? 1 : 0
    };
  }

  onClickSilver(): void {
    if (!this.silverForm.valid) {
      this.markFormGroupTouched(this.silverForm);
      this.notyf.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    this.showConfirmationModal(
      'Apakah Anda yakin ingin mengubah pengaturan Paket Silver?',
      () => this.saveSilver()
    );
  }

  onClickGold(): void {
    if (!this.goldForm.valid) {
      this.markFormGroupTouched(this.goldForm);
      this.notyf.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    this.showConfirmationModal(
      'Apakah Anda yakin ingin mengubah pengaturan Paket Gold?',
      () => this.saveGold()
    );
  }

  onClickPlatinum(): void {
    if (!this.platinumForm.valid) {
      this.markFormGroupTouched(this.platinumForm);
      this.notyf.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    this.showConfirmationModal(
      'Apakah Anda yakin ingin mengubah pengaturan Paket Platinum?',
      () => this.savePlatinum()
    );
  }

  private showConfirmationModal(message: string, confirmCallback: () => void): void {
    const initialState = {
      message,
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: confirmCallback,
      submitMessage: 'Simpan Perubahan',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });

    if (this.modalRef?.content) {
      this.modalRef.content.onClose
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          if (res?.state === 'cancel') {
            this.modalRef?.hide();
          }
        });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  saveSilver(): void {
    if (this.silverLoading) return;

    this.silverLoading = true;
    const formData = this.prepareFormData(this.silverForm);
    const packageId = formData.id || 1;

    this.dashboardSvc.update(DashboardServiceType.ST_BUNDLE_ADMIN, `/${packageId}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.silverLoading = false;
          this.modalRef?.hide();
        })
      )
      .subscribe({
        next: (res) => {
          this.notyf.success(res?.message || 'Berhasil mengubah Paket Silver');
          this.refreshSinglePackage(1, this.silverForm);
        },
        error: (err) => {
          console.error('Error updating silver package:', err);
          this.notyf.error(err?.error?.message || 'Gagal menyimpan Paket Silver');
        }
      });
  }

  saveGold(): void {
    if (this.goldLoading) return;

    this.goldLoading = true;
    const formData = this.prepareFormData(this.goldForm);
    const packageId = formData.id || 2;

    this.dashboardSvc.update(DashboardServiceType.ST_BUNDLE_ADMIN, `/${packageId}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.goldLoading = false;
          this.modalRef?.hide();
        })
      )
      .subscribe({
        next: (res) => {
          this.notyf.success(res?.message || 'Berhasil mengubah Paket Gold');
          this.refreshSinglePackage(2, this.goldForm);
        },
        error: (err) => {
          console.error('Error updating gold package:', err);
          this.notyf.error(err?.error?.message || 'Gagal menyimpan Paket Gold');
        }
      });
  }

  savePlatinum(): void {
    if (this.platinumLoading) return;

    this.platinumLoading = true;
    const formData = this.prepareFormData(this.platinumForm);
    const packageId = formData.id || 3;

    this.dashboardSvc.update(DashboardServiceType.ST_BUNDLE_ADMIN, `/${packageId}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.platinumLoading = false;
          this.modalRef?.hide();
        })
      )
      .subscribe({
        next: (res) => {
          this.notyf.success(res?.message || 'Berhasil mengubah Paket Platinum');
          this.refreshSinglePackage(3, this.platinumForm);
        },
        error: (err) => {
          console.error('Error updating platinum package:', err);
          this.notyf.error(err?.error?.message || 'Gagal menyimpan Paket Platinum');
        }
      });
  }

  private refreshSinglePackage(packageId: number, form: FormGroup): void {

    this.dashboardSvc.list(DashboardServiceType.ST_BUNDLE_ADMIN)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res?.data) {
            const updatedPackage = res.data.find((pkg: PackageData) => pkg.id === packageId);
            if (updatedPackage) {
              this.updateSingleForm(form, updatedPackage);
            }
          }
        },
        error: (err) => {
          console.error('Error refreshing package data:', err);
        }
      });
  }

  private updateSingleForm(form: FormGroup, packageData: PackageData): void {
    form.patchValue({
      id: packageData.id,
      name_paket: packageData.name_paket,
      price: this.formatPrice(packageData.price),
      masa_aktif: packageData.masa_aktif,
      halaman_buku: this.convertToBoolean(packageData.halaman_buku),
      kirim_wa: this.convertToBoolean(packageData.kirim_wa),
      bebas_pilih_tema: this.convertToBoolean(packageData.bebas_pilih_tema),
      kirim_hadiah: this.convertToBoolean(packageData.kirim_hadiah),
      import_data: this.convertToBoolean(packageData.import_data)
    }, { emitEvent: false });
  }


  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} wajib diisi`;
      if (field.errors['minlength']) return `${fieldName} minimal ${field.errors['minlength'].requiredLength} karakter`;
      if (field.errors['min']) return `${fieldName} harus lebih besar dari ${field.errors['min'].min}`;
    }
    return '';
  }


  resetForm(packageType: 'silver' | 'gold' | 'platinum'): void {
    const originalPackage = this.originalData.find(pkg => {
      if (packageType === 'silver') return pkg.id === 1;
      if (packageType === 'gold') return pkg.id === 2;
      if (packageType === 'platinum') return pkg.id === 3;
      return false;
    });

    if (originalPackage) {
      const form = packageType === 'silver' ? this.silverForm :
        packageType === 'gold' ? this.goldForm : this.platinumForm;
      this.updateSingleForm(form, originalPackage);
    }
  }

  // Trial Configuration Methods
  onClickTrial(): void {
    if (!this.trialForm.valid || this.trialLoading) {
      this.markFormGroupTouched(this.trialForm);
      this.notyf.error('Mohon lengkapi field dengan benar');
      return;
    }

    this.showConfirmationModal(
      'Apakah Anda yakin ingin mengubah konfigurasi Trial?',
      () => this.saveTrialConfig()
    );
  }

  private saveTrialConfig(): void {
    this.trialLoading = true;
    const formData = this.trialForm.value;

    this.dashboardSvc.update(DashboardServiceType.TRIAL_CONFIG, '', formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.trialLoading = false;
          this.modalRef?.hide();
        })
      )
      .subscribe({
        next: (res) => {
          this.notyf.success(res?.message || 'Berhasil mengubah konfigurasi Trial');
        },
        error: (err) => {
          console.error('Error updating trial config:', err);
          this.notyf.error(err?.error?.message || 'Gagal menyimpan konfigurasi Trial');
        }
      });
  }

  resetTrialForm(): void {
    this.trialForm.patchValue({ trial_masa_aktif: 3 });
  }
}

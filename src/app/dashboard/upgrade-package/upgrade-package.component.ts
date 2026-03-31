import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { Router } from '@angular/router';

interface PackageOption {
  id: number;
  name_paket: string;
  price: string;
  masa_aktif: string;
  jenis_paket: string;
  halaman_buku: string;
  kirim_wa: string;
  bebas_pilih_tema: string;
  kirim_hadiah: string;
  import_data: string;
}

interface EligiblePackagesResponse {
  data: PackageOption[];
  current_package_id: number | null;
  is_trial: boolean;
  has_pending_upgrade?: boolean;
}

@Component({
  selector: 'wc-upgrade-package',
  templateUrl: './upgrade-package.component.html',
  styleUrls: ['./upgrade-package.component.scss']
})
export class UpgradePackageComponent implements OnInit {
  packages: PackageOption[] = [];
  currentPackageId: number | null = null;
  isTrialUser = false;
  hasPendingUpgrade = false;
  isLoading = false;
  isProcessing = false;
  selectedPackage: PackageOption | null = null;

  upgradeForm: FormGroup;
  private notyf: Notyf;

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private router: Router
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });

    this.upgradeForm = this.fb.group({
      paket_undangan_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadEligiblePackages();
  }

  loadEligiblePackages(): void {
    this.isLoading = true;
    this.dashboardSvc.list(DashboardServiceType.USER_ELIGIBLE_PACKAGES, '').subscribe({
      next: (res: EligiblePackagesResponse) => {
        this.packages = res.data ?? [];
        this.currentPackageId = res.current_package_id;
        this.isTrialUser = res.is_trial ?? false;
        this.hasPendingUpgrade = res.has_pending_upgrade ?? false;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err.error?.message || 'Gagal memuat paket yang tersedia';
        this.notyf.error(errorMsg);
        console.error('Error loading eligible packages:', err);
      }
    });
  }

  onSelectPackage(pkg: PackageOption): void {
    this.selectedPackage = pkg;
    this.upgradeForm.patchValue({ paket_undangan_id: pkg.id });
  }

  onContinue(): void {
    if (this.upgradeForm.invalid || !this.selectedPackage) {
      this.notyf.error('Pilih paket terlebih dahulu');
      return;
    }

    if (this.isProcessing) {
      this.notyf.error('Permintaan sedang diproses. Mohon tunggu...');
      return;
    }

    this.isProcessing = true;

    // Capture selected package locally to avoid null issues in async callback
    const selectedPkg = this.selectedPackage;
    const isTrial = this.isTrialUser;

    // Initiate upgrade first to get invitation ID
    this.dashboardSvc.create(DashboardServiceType.USER_UPGRADE_PACKAGE, {
      paket_undangan_id: selectedPkg.id
    }).subscribe({
      next: (res: any) => {
        // Store upgrade data with invitation_id
        const formData = {
          upgrade: {
            paket_undangan_id: selectedPkg.id,
            package: selectedPkg,
            isUpgrade: true,
            isTrial: isTrial,
            invitation_id: res.data.invitation_id,
            kode_pemesanan: res.data.kode_pemesanan
          }
        };

        localStorage.setItem('upgradeData', JSON.stringify(formData));
        this.isProcessing = false;
        this.router.navigate(['/dashboard/upgrade/payment']);
      },
      error: (err) => {
        this.isProcessing = false;

        // Handle 409 Conflict - pending upgrade exists
        if (err.status === 409) {
          this.notyf.error(err.error?.message || 'Anda memiliki pengajuan upgrade yang sedang diproses.');
          return;
        }

        const errorMsg = err.error?.message || 'Gagal memproses upgrade';
        this.notyf.error(errorMsg);
      }
    });
  }

  formatPrice(price: string): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(price));
  }

  getFeatureIcon(value: string): boolean {
    return value === '1' || value === 'true';
  }

  /**
   * Get feature display name
   */
  getFeatureName(key: string): string {
    const names: { [key: string]: string } = {
      'kirim_wa': 'Kirim WA',
      'bebas_pilih_tema': 'Bebas Pilih Tema',
      'kirim_hadiah': 'Kirim Hadiah',
      'import_data': 'Import Data'
    };
    return names[key] || key;
  }

  /**
   * Get package features as array
   */
  getPackageFeatures(pkg: PackageOption): Array<{ name: string; active: boolean }> {
    return [
      { name: 'Kirim WA', active: this.getFeatureIcon(pkg.kirim_wa) },
      { name: 'Bebas Pilih Tema', active: this.getFeatureIcon(pkg.bebas_pilih_tema) },
      { name: 'Kirim Hadiah', active: this.getFeatureIcon(pkg.kirim_hadiah) },
      { name: 'Import Data', active: this.getFeatureIcon(pkg.import_data) }
    ];
  }
}

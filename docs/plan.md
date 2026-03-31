Ready for review
Select text to add comments on the plan
Package Upgrade Feature Implementation Plan
Context
User wants to add a package upgrade feature for the wedding invitation system. This includes:

Admin Side: Add ability to change user package manually via admin dashboard
User Side: Add "Upgrade" menu in user dashboard for self-service package upgrades
Payment Integration: Use existing wc-regis-pembayaran UI for upgrade payment flow
Key Requirements
New users appear first in admin dashboard (sort by updated_at DESC)
Admin can edit user package via pencil icon next to confirm button
User can upgrade via new "Upgrade" menu in sidebar
Package list filters out current package (shows only other packages)
Trial users can select any package
Midtrans payment = auto-confirm (webhook handles status)
Manual payment = admin confirms via edit package modal
New invoice generated for each upgrade (new order_id)
Add is_trial flag to identify trial users
TODO LIST
Phase 1: Backend API Changes
 1.1 Modify /v1/admin/get-users API - sort by updated_at DESC (newest first)
 1.2 Add is_trial flag to User/Invitation model (computed from domain_expires_at and creation)
 1.3 Create POST /v1/admin/change-package - Admin changes user package
 1.4 Create POST /v1/user/upgrade-package - User initiates upgrade (creates new invitation record)
 1.5 Update Midtrans webhook to handle upgrade payments
 1.6 Create GET /v1/user/package-eligible - Get packages user can upgrade to
Phase 2: Admin Dashboard - Edit Package
 2.1 Add pencil icon button next to "Konfirmasi" in dashboard table
 2.2 Create modal for editing user package
 2.3 Add package selector (ngx-select) in modal
 2.4 Display current package info in modal
 2.5 Handle save action - calls /v1/admin/change-package
 2.6 Add trial badge display for trial users
Phase 3: User Dashboard - Upgrade Menu
 3.1 Add "Upgrade" menu item to sidebar (between Testimoni and divider)
 3.2 Create new route /dashboard/upgrade
 3.3 Create UpgradePackageComponent with package selection
 3.4 Integrate wc-regis-pembayaran for upgrade flow
 3.5 Filter package list (exclude current package, show all for trial)
Phase 4: Payment Flow for Upgrade
 4.1 Modify wc-regis-pembayaran to detect upgrade mode
 4.2 Generate new invoice number for upgrades
 4.3 Create new invitation record linked to user (upgrade history)
 4.4 Update Midtrans service for upgrade orders
 4.5 Handle manual payment confirmation for upgrades
Phase 5: Database Schema
 5.1 Add is_trial column to invitations table (migration)
 5.2 Add parent_invitation_id to track upgrades (optional)
 5.3 Add upgrade_type enum (initial, renewal, upgrade)
Detailed Implementation
1. Backend Changes
1.1 Sort Users by Newest First
File: /horuzt-app/app/Http/Controllers/UserController.php (line ~68)

Change:

$usersQuery = User::whereDoesntHave('roles', function ($query) {
    $query->where('name', 'admin');
})->with([...])
->orderBy('updated_at', 'desc'); // ADD THIS
1.2 Add is_trial Flag
Migration: Create migration to add is_trial to invitations table

Schema::table('invitations', function (Blueprint $table) {
    $table->boolean('is_trial')->default(true)->after('payment_status');
    $table->index('is_trial');
});
Model Update: /horuzt-app/app/Models/Invitation.php

protected $fillable = [..., 'is_trial'];

// Accessor to determine if still in trial
public function getIsTrialAttribute(): bool
{
    // If explicitly set to false (paid), return false
    if (isset($this->attributes['is_trial']) && $this->attributes['is_trial'] === false) {
        return false;
    }
    // If payment status is pending and within 3 days, it's trial
    if ($this->payment_status === 'pending' && $this->domain_expires_at) {
        return now()->lt($this->domain_expires_at);
    }
    return false;
}
1.3 Admin Change Package Endpoint
File: /horuzt-app/app/Http/Controllers/PackageUpgradeController.php (NEW)

<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Invitation;
use App\Models\Mempelai;
use App\Models\PaketUndangan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PackageUpgradeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Admin changes user package
     * POST /v1/admin/change-package
     */
    public function changePackage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'paket_undangan_id' => 'required|exists:paket_undangans,id',
            'extend_from_now' => 'nullable|boolean', // true = extend from now, false = from expiry
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $user = User::findOrFail($validated['user_id']);
            $newPackage = PaketUndangan::findOrFail($validated['paket_undangan_id']);
            $invitation = Invitation::where('user_id', $user->id)->firstOrFail();
            $mempelai = Mempelai::where('user_id', $user->id)->first();

            // Determine base date for expiry calculation
            $extendFromNow = $request->input('extend_from_now', false);
            $baseDate = $extendFromNow ? now() : ($invitation->domain_expires_at ?? now());

            // Calculate new expiry
            $newExpiryAt = $baseDate->copy()->addDays($newPackage->masa_aktif);

            // Update invitation with new package
            $invitation->update([
                'paket_undangan_id' => $newPackage->id,
                'payment_status' => 'paid',
                'is_trial' => false,
                'domain_expires_at' => $newExpiryAt,
                'package_price_snapshot' => $newPackage->price,
                'package_duration_snapshot' => $newPackage->masa_aktif,
                'package_features_snapshot' => [
                    'jenis_paket' => $newPackage->jenis_paket,
                    'name_paket' => $newPackage->name_paket,
                    'halaman_buku' => $newPackage->halaman_buku,
                    'kirim_wa' => $newPackage->kirim_wa,
                    'bebas_pilih_tema' => $newPackage->bebas_pilih_tema,
                    'kirim_hadiah' => $newPackage->kirim_hadiah,
                    'import_data' => $newPackage->import_data,
                    'upgraded_at' => now()->toISOString(),
                    'previous_package_id' => $invitation->paket_undangan_id
                ]
            ]);

            // Update mempelai status
            if ($mempelai) {
                $mempelai->update([
                    'status' => 'Sudah Bayar',
                    'kd_status' => 'SB'
                ]);
            }

            return response()->json([
                'message' => 'Package berhasil diubah',
                'data' => [
                    'user_id' => $user->id,
                    'new_package' => $newPackage->name_paket,
                    'domain_expires_at' => $newExpiryAt->format('Y-m-d H:i:s'),
                    'active_days' => $newPackage->masa_aktif
                ]
            ], 200);
        });
    }

    /**
     * Get eligible packages for upgrade (excludes current)
     * GET /v1/user/eligible-packages
     */
    public function getEligiblePackages(Request $request): JsonResponse
    {
        $user = auth()->user();
        $invitation = Invitation::where('user_id', $user->id)->first();

        $currentPackageId = $invitation?->paket_undangan_id;

        $packages = PaketUndangan::where('id', '!=', $currentPackageId)
            ->orderBy('masa_aktif', 'asc')
            ->get();

        return response()->json([
            'data' => $packages,
            'current_package_id' => $currentPackageId,
            'is_trial' => $invitation?->is_trial ?? true
        ], 200);
    }

    /**
     * User initiates package upgrade
     * POST /v1/user/upgrade-package
     */
    public function initiateUpgrade(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'paket_undangan_id' => 'required|exists:paket_undangans,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $user = auth()->user();
            $newPackage = PaketUndangan::findOrFail($validated['paket_undangan_id']);
            $currentInvitation = Invitation::where('user_id', $user->id)->firstOrFail();

            // Generate new invoice number for upgrade
            $newInvoiceNumber = '#UPG-' . str_pad($user->id, 6, '0', STR_PAD_LEFT) . '-' . time();

            // Create upgrade invitation record
            $upgradeInvitation = Invitation::create([
                'user_id' => $user->id,
                'paket_undangan_id' => $newPackage->id,
                'kode_pemesanan' => $newInvoiceNumber,
                'status' => 'upgrade_pending',
                'payment_status' => 'pending',
                'is_trial' => false,
                'domain_expires_at' => null, // Set after payment
                'package_price_snapshot' => $newPackage->price,
                'package_duration_snapshot' => $newPackage->masa_aktif,
                'package_features_snapshot' => [
                    'jenis_paket' => $newPackage->jenis_paket,
                    'name_paket' => $newPackage->name_paket,
                    'halaman_buku' => $newPackage->halaman_buku,
                    'kirim_wa' => $newPackage->kirim_wa,
                    'bebas_pilih_tema' => $newPackage->bebas_pilih_tema,
                    'kirim_hadiah' => $newPackage->kirim_hadiah,
                    'import_data' => $newPackage->import_data,
                    'upgrade_from_invitation_id' => $currentInvitation->id,
                    'previous_package_id' => $currentInvitation->paket_undangan_id,
                    'initiated_at' => now()->toISOString()
                ]
            ]);

            return response()->json([
                'message' => 'Upgrade initiated',
                'data' => [
                    'invitation_id' => $upgradeInvitation->id,
                    'kode_pemesanan' => $newInvoiceNumber,
                    'package' => $newPackage->name_paket,
                    'amount' => $newPackage->price,
                    'duration_days' => $newPackage->masa_aktif
                ]
            ], 201);
        });
    }
}
1.4 Add Routes
File: /horuzt-app/routes/api.php

// Inside role:admin middleware group (around line 226)
Route::controller(PackageUpgradeController::class)->group(function () {
    Route::post('/v1/admin/change-package', 'changePackage');
});

// Inside auth:sanctum middleware group
Route::controller(PackageUpgradeController::class)->group(function () {
    Route::get('/v1/user/eligible-packages', 'getEligiblePackages');
    Route::post('/v1/user/upgrade-package', 'initiateUpgrade');
});
2. Admin Dashboard Frontend
2.1-2.6 Add Edit Package Button and Modal
File: /aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.ts

Add properties:

// Add to class properties
editPackageForm: FormGroup;
selectedUserForPackage: any = null;
packageListForEdit: any[] = [];
Update constructor:

this.editPackageForm = this.fb.group({
  user_id: ['', Validators.required],
  paket_undangan_id: ['', Validators.required],
  extend_from_now: [false] // Extend from now vs from current expiry
});
Add methods:

onEditPackageClicked(row: any, template: TemplateRef<any>) {
  this.selectedUserForPackage = row;
  this.editPackageForm.patchValue({
    user_id: row.originalData.id,
    paket_undangan_id: row.originalData.paket_undangan_id,
    extend_from_now: false
  });
  this.modalRef = this.modalService.show(template);
}

onSubmitPackageChange() {
  if (this.editPackageForm.invalid) {
    this.notyf.error('Harap lengkapi form');
    return;
  }

  const payload = this.editPackageForm.value;

  this.dashboardSvc.create(DashboardServiceType.ADMIN_CHANGE_PACKAGE, payload).subscribe({
    next: (res) => {
      this.notyf.success(res.message || 'Package berhasil diubah');
      this.modalRef?.hide();
      this.getDetailUser(); // Refresh data
    },
    error: (err) => {
      this.notyf.error(err.error?.message || 'Gagal mengubah package');
    }
  });
}

onCancelPackageModal() {
  this.modalRef?.hide();
  this.editPackageForm.reset();
  this.selectedUserForPackage = null;
}

isTrialUser(row: any): boolean {
  return row.originalData?.is_trial ?? false;
}
File: /aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.html

Update table actions cell (around line 109):

<td>
  <div class="action-buttons">
    <!-- Edit Package Button -->
    <button class="btn-icon btn-edit"
            (click)="onEditPackageClicked(row, editPackageModal)"
            [attr.aria-label]="'Edit paket ' + row.pengguna"
            title="Edit Paket">
      <i class="fas fa-pencil-alt" aria-hidden="true"></i>
    </button>

    <!-- Confirm Button -->
    <button class="btn-konfirmasi"
            [disabled]="!row.konfirmasiAktif"
            [ngClass]="{ 'active': row.konfirmasiAktif }"
            (click)="onConfirmClicked(row, confirmPaymentModal)">
      Konfirmasi
    </button>
  </div>
</td>
Add trial badge in status cell:

<td>
  <div class="status-container">
    <span class="status-badge"
          [ngClass]="row.statusData.class">
      <span class="dot"></span>
      {{ row.statusData.text }}
    </span>
    <span class="trial-badge"
          *ngIf="isTrialUser(row)"
          aria-label="Trial User">
      Trial
    </span>
  </div>
</td>
Add edit package modal (after confirmPaymentModal):

<!-- Edit Package Modal -->
<ng-template #editPackageModal>
  <div class="modal-header">
    <h4 class="modal-title pull-left">Ubah Paket Undangan</h4>
    <button type="button" class="btn-close" aria-label="Close" (click)="onCancelPackageModal()">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body">
    <form [formGroup]="editPackageForm">
      <!-- User Info -->
      <div class="user-info-card mb-3">
        <h6 class="mb-2">Informasi Pengguna</h6>
        <p class="mb-1"><strong>Email:</strong> {{ selectedUserForPackage?.pengguna }}</p>
        <p class="mb-1"><strong>Domain:</strong> {{ selectedUserForPackage?.domain || '–' }}</p>
        <p class="mb-0"><strong>Paket Saat Ini:</strong>
          <span class="badge bg-info">
            {{ paketList.find(p => p.id == selectedUserForPackage?.originalData?.paket_undangan_id)?.name_paket || '–' }}
          </span>
        </p>
      </div>

      <!-- Package Selection -->
      <div class="mb-3">
        <label for="paket_undangan_id" class="form-label">Pilih Paket Baru <span class="text-danger">*</span></label>
        <select id="paket_undangan_id"
                class="form-select"
                formControlName="paket_undangan_id"
                required>
          <option value="">Pilih Paket</option>
          <option *ngFor="let pkg of paketList"
                  [ngValue]="pkg.id">
            {{ pkg.name_paket }} - Rp {{ pkg.price | number:'1.0-0':'en-US' }}
            ({{ pkg.masa_aktif }} hari)
          </option>
        </select>
        <div class="invalid-feedback"
             *ngIf="editPackageForm.get('paket_undangan_id')?.invalid && editPackageForm.get('paket_undangan_id')?.touched">
          Paket harus dipilih
        </div>
      </div>

      <!-- Expiry Option -->
      <div class="mb-3">
        <div class="form-check">
          <input class="form-check-input"
                 type="checkbox"
                 id="extend_from_now"
                 formControlName="extend_from_now">
          <label class="form-check-label" for="extend_from_now">
            Hitung masa aktif dari sekarang
            <small class="d-block text-muted">
              Jika tidak dicentang, masa aktif dihitung dari tanggal kadaluarsa domain saat ini
            </small>
          </label>
        </div>
      </div>

      <!-- Hidden user_id -->
      <input type="hidden" formControlName="user_id">
    </form>
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-secondary" (click)="onCancelPackageModal()">
      <i class="fas fa-times me-1"></i> Batal
    </button>
    <button type="button"
            class="btn btn-primary"
            [disabled]="editPackageForm.invalid"
            (click)="onSubmitPackageChange()">
      <i class="fas fa-save me-1"></i> Simpan Perubahan
    </button>
  </div>
</ng-template>
File: /aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.scss

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #66a3ff;
    color: #66a3ff;
    background: #f0f8ff;
  }
}

.btn-edit {
  &:hover {
    border-color: #f59e0b;
    color: #f59e0b;
    background: #fffbeb;
  }
}

.status-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trial-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
3. User Dashboard - Upgrade Menu
3.1 Add Upgrade Menu to Sidebar
File: /aps-wedding/src/app/dashboard/dashboard-user/dashboard-user.component.html

Add after Testimoni menu (around line 187):

<!-- Upgrade Package -->
<div class="menu-section">
  <a class="menu-item"
     routerLink="upgrade"
     routerLinkActive="active"
     (click)="onMenuItemClick()"
     tabindex="0">
    <i class="fas fa-rocket" aria-hidden="true"></i>
    <span>Upgrade</span>
  </a>
</div>
3.2-3.4 Create Upgrade Package Component
File: /aps-wedding/src/app/dashboard/upgrade-package/upgrade-package.component.ts

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

@Component({
  selector: 'wc-upgrade-package',
  templateUrl: './upgrade-package.component.html',
  styleUrls: ['./upgrade-package.component.scss']
})
export class UpgradePackageComponent implements OnInit {
  packages: PackageOption[] = [];
  currentPackage: any = null;
  isLoading = false;
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
      next: (res) => {
        this.packages = res.data ?? [];
        this.currentPackage = res.current_package_id;
        this.isLoading = false;
      },
      error: (err) => {
        this.notyf.error(err.error?.message || 'Gagal memuat paket');
        this.isLoading = false;
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

    // Store upgrade data in localStorage for payment flow
    const formData = {
      upgrade: {
        paket_undangan_id: this.selectedPackage.id,
        package: this.selectedPackage,
        isUpgrade: true
      }
    };

    localStorage.setItem('upgradeData', JSON.stringify(formData));

    // Navigate to payment (reuse regis-pembayaran)
    this.router.navigate(['/dashboard/upgrade/payment']);
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
}
File: /aps-wedding/src/app/dashboard/upgrade-package/upgrade-package.component.html

<div class="upgrade-container">
  <div class="upgrade-header">
    <h1>Upgrade Paket Undangan</h1>
    <p class="text-muted">Pilih paket yang sesuai dengan kebutuhan Anda</p>
  </div>

  <div *ngIf="isLoading" class="text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>

  <div class="packages-grid" *ngIf="!isLoading">
    <div *ngFor="let pkg of packages"
         class="package-card"
         [class.selected]="selectedPackage?.id === pkg.id"
         (click)="onSelectPackage(pkg)">

      <div class="package-header">
        <h3 class="package-name">{{ pkg.name_paket }}</h3>
        <div class="package-price">{{ formatPrice(pkg.price) }}</div>
        <div class="package-duration">{{ pkg.masa_aktif }} hari aktif</div>
      </div>

      <div class="package-features">
        <div class="feature-item" [class.active]="getFeatureIcon(pkg.kirim_wa)">
          <i class="fas" [class.fa-check]="getFeatureIcon(pkg.kirim_wa)" [class.fa-times]="!getFeatureIcon(pkg.kirim_wa)"></i>
          <span>Kirim WA</span>
        </div>
        <div class="feature-item" [class.active]="getFeatureIcon(pkg.bebas_pilih_tema)">
          <i class="fas" [class.fa-check]="getFeatureIcon(pkg.bebas_pilih_tema)" [class.fa-times]="!getFeatureIcon(pkg.bebas_pilih_tema)"></i>
          <span>Bebas Pilih Tema</span>
        </div>
        <div class="feature-item" [class.active]="getFeatureIcon(pkg.kirim_hadiah)">
          <i class="fas" [class.fa-check]="getFeatureIcon(pkg.kirim_hadiah)" [class.fa-times]="!getFeatureIcon(pkg.kirim_hadiah)"></i>
          <span>Kirim Hadiah</span>
        </div>
        <div class="feature-item" [class.active]="getFeatureIcon(pkg.import_data)">
          <i class="fas" [class.fa-check]="getFeatureIcon(pkg.import_data)" [class.fa-times]="!getFeatureIcon(pkg.import_data)"></i>
          <span>Import Data</span>
        </div>
      </div>

      <div class="package-footer">
        <button class="btn-select"
                [class.btn-primary]="selectedPackage?.id === pkg.id"
                [class.btn-outline-primary]="selectedPackage?.id !== pkg.id">
          {{ selectedPackage?.id === pkg.id ? 'Dipilih' : 'Pilih' }}
        </button>
      </div>
    </div>
  </div>

  <div class="upgrade-actions" *ngIf="selectedPackage">
    <div class="summary-card">
      <h4>Ringkasan Upgrade</h4>
      <div class="summary-row">
        <span>Paket yang dipilih:</span>
        <strong>{{ selectedPackage.name_paket }}</strong>
      </div>
      <div class="summary-row">
        <span>Total pembayaran:</span>
        <strong class="text-primary">{{ formatPrice(selectedPackage.price) }}</strong>
      </div>
      <div class="summary-row">
        <span>Masa aktif:</span>
        <strong>{{ selectedPackage.masa_aktif }} hari</strong>
      </div>
    </div>

    <button class="btn-continue"
            (click)="onContinue()">
      Lanjutkan ke Pembayaran
      <i class="fas fa-arrow-right ms-2"></i>
    </button>
  </div>
</div>
File: /aps-wedding/src/app/dashboard/upgrade-package/upgrade-package.component.scss

.upgrade-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.upgrade-header {
  text-align: center;
  margin-bottom: 40px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.package-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }

  &.selected {
    border-color: #66a3ff;
    background: linear-gradient(135deg, #f0f8ff 0%, #fff 100%);
  }
}

.package-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e1e5e9;

  .package-name {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .package-price {
    font-size: 24px;
    font-weight: 700;
    color: #66a3ff;
    margin-bottom: 4px;
  }

  .package-duration {
    font-size: 14px;
    color: #6b7280;
  }
}

.package-features {
  margin-bottom: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: #6b7280;

  &.active {
    color: #10b981;
  }

  i {
    width: 20px;
  }
}

.package-footer {
  text-align: center;
}

.upgrade-actions {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin-top: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.summary-card {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;

  h4 {
    margin-bottom: 16px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e1e5e9;

    &:last-child {
      border-bottom: none;
    }
  }
}

.btn-continue {
  background: #66a3ff;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #5588ee;
    transform: translateY(-2px);
  }
}
3.5 Add Routing
File: /aps-wedding/src/app/dashboard/dashboard-user/dashboard-user-routing.module.ts

const routes: Routes = [
  {
    path: '',
    component: DashboardUserComponent,
    children: [
      // ... existing routes
      { path: 'upgrade', component: UpgradePackageComponent },
      { path: 'upgrade/payment', component: UpgradePaymentComponent }
    ]
  }
];
4. Payment Flow for Upgrade
4.1-4.5 Upgrade Payment Component
File: /aps-wedding/src/app/dashboard/upgrade-payment/upgrade-payment.component.ts

import { Component, OnInit } from '@angular/core';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { MidtransPaymentService } from 'src/app/services/midtrans-payment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'wc-upgrade-payment',
  templateUrl: './upgrade-payment.component.html',
  styleUrls: ['./upgrade-payment.component.scss']
})
export class UpgradePaymentComponent implements OnInit {
  upgradeData: any = null;
  isPayingMidtrans = false;
  midtransPaymentStatus: 'idle' | 'pending' | 'paid' | 'failed' = 'idle';

  events: any[] = [];
  selectedMethod: any;
  bill: any[] = [];
  manualBill: any;

  selectOptions: any = {
    payment: {
      items: [],
      defaultValue: [],
      FormControl: new FormControl(),
    },
  };

  private notyf: Notyf;
  private invitationId: number | null = null;
  private upgradeInvitationId: number | null = null;
  private invoiceAmount: number = 0;

  constructor(
    private dashboardSvc: DashboardService,
    private midtransSvc: MidtransPaymentService,
    private router: Router
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  ngOnInit(): void {
    this.getMasterPayment();
    this.loadUpgradeData();
  }

  loadUpgradeData(): void {
    const raw = localStorage.getItem('upgradeData');
    if (!raw) {
      this.notyf.error('Data upgrade tidak ditemukan');
      this.router.navigate(['/dashboard/upgrade']);
      return;
    }

    const data = JSON.parse(raw);
    this.upgradeData = data.upgrade;
    this.invoiceAmount = Number(this.upgradeData.package.price);
    this.manualBill = this.invoiceAmount;

    // Create upgrade invitation first
    this.initiateUpgrade();
  }

  initiateUpgrade(): void {
    this.dashboardSvc.create(DashboardServiceType.USER_UPGRADE_PACKAGE, {
      paket_undangan_id: this.upgradeData.paket_undangan_id
    }).subscribe({
      next: (res) => {
        this.upgradeInvitationId = res.data.invitation_id;
        this.invitationId = res.data.invitation_id;
      },
      error: (err) => {
        this.notyf.error(err.error?.message || 'Gagal memproses upgrade');
      }
    });
  }

  getMasterPayment(): void {
    this.dashboardSvc.getParam(DashboardServiceType.MD_RGS_PAYMENT, '').subscribe((res) => {
      this.selectOptions.payment.items = res['data'];
    });
  }

  getDetailMethod(): void {
    const query = `?id_methode_pembayaran=${this.selectedMethod}`;
    this.dashboardSvc.getParam(DashboardServiceType.MNL_MD_METHOD_DETAIL, query).subscribe((res) => {
      this.bill = res?.data ?? [];
    });
  }

  onMetodeSelect(event: any): void {
    this.selectedMethod = event;
    this.getDetailMethod();
  }

  onPayWithMidtrans(): void {
    if (!this.invitationId) {
      this.notyf.error('Invitation ID tidak tersedia');
      return;
    }

    this.isPayingMidtrans = true;

    this.midtransSvc.createSnapToken(this.invitationId, this.invoiceAmount).subscribe({
      next: (res) => {
        this.loadSnapJsAndPay(res.data.snap_token, res.data.order_id);
      },
      error: (err) => {
        this.isPayingMidtrans = false;
        this.notyf.error(err.error?.message || 'Gagal memproses pembayaran');
      }
    });
  }

  loadSnapJsAndPay(snapToken: string, orderId: string): void {
    // Similar to regis-pembayaran - load Snap.js and open payment
  }

  onManualPaymentConfirm(): void {
    // Show manual payment confirmation
    // After confirmation, redirect to dashboard
    localStorage.removeItem('upgradeData');
    this.router.navigate(['/dashboard/overview']);
  }
}
5. Dashboard Service Updates
File: /aps-wedding/src/app/dashboard.service.ts

Add to enum:

ADMIN_CHANGE_PACKAGE,
USER_ELIGIBLE_PACKAGES,
USER_UPGRADE_PACKAGE,
Add to getUrl method:

case DashboardServiceType.ADMIN_CHANGE_PACKAGE:
  return `${this.BASE_URL_API}/v1/admin/change-package`;

case DashboardServiceType.USER_ELIGIBLE_PACKAGES:
  return `${this.BASE_URL_API}/v1/user/eligible-packages`;

case DashboardServiceType.USER_UPGRADE_PACKAGE:
  return `${this.BASE_URL_API}/v1/user/upgrade-package`;
Verification Steps
Admin Dashboard Sort Order:

Login as admin
Navigate to dashboard
Verify newest users appear first (by updated_at)
Trial Badge Display:

Users in trial period should show "Trial" badge
Badge appears next to status badge
Admin Change Package:

Click pencil icon on any user row
Modal opens with current package info
Select different package
Choose extend from now or from expiry
Save and verify changes
User Upgrade Menu:

Login as user
See "Upgrade" menu in sidebar (with rocket icon)
Navigate to upgrade page
See packages excluding current package
Trial users see all packages
Upgrade Payment Flow:

Select package for upgrade
Continue to payment
Select Midtrans or Manual payment
Midtrans: Auto-confirm after payment
Manual: Admin confirms via edit package
Upgrade Success:

Domain expiry extends correctly
Package features update
New invoice generated
Status changes to "Aktif"
Files to Modify Summary
Backend (Laravel)
/horuzt-app/app/Http/Controllers/UserController.php - Add orderBy('updated_at', 'desc')
/horuzt-app/app/Http/Controllers/PackageUpgradeController.php - NEW FILE
/horuzt-app/app/Models/Invitation.php - Add is_trial attribute
/horuzt-app/database/migrations/xxxx_add_is_trial_to_invitations.php - NEW migration
/horuzt-app/routes/api.php - Add upgrade routes
Frontend (Angular)
/aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.ts - Add edit package logic
/aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.html - Add edit button and modal
/aps-wedding/src/app/dashboard-admin/dashboard/dashboard.component.scss - Add styles
/aps-wedding/src/app/dashboard/dashboard-user/dashboard-user.component.html - Add Upgrade menu
/aps-wedding/src/app/dashboard/upgrade-package/upgrade-package.component.ts - NEW
/aps-wedding/src/app/dashboard/upgrade-package/upgrade-package.component.html - NEW
/aps-wedding/src/app/dashboard/upgrade-package/upgrade-payment.component.ts - NEW
/aps-wedding/src/app/dashboard/upgrade-payment/upgrade-payment.component.html - NEW
/aps-wedding/src/app/dashboard.service.ts - Add upgrade service types
/aps-wedding/src/app/dashboard/dashboard-user/dashboard-user-routing.module.ts - Add routes

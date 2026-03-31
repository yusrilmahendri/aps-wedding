import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { PaymentConfirmComponent } from 'src/app/shared/payment-confirm/payment-confirm.component';
import { MidtransPaymentService, SnapResult } from 'src/app/services/midtrans-payment.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

interface PaymentState {
  snapToken: string;
  orderId: string;
  invitationId: number;
  amount: number;
  timestamp: number;
}

interface UpgradeData {
  upgrade: {
    paket_undangan_id: number;
    package: any;
    isUpgrade: boolean;
    isTrial?: boolean;
    invitation_id?: number;
    kode_pemesanan?: string;
  };
}

@Component({
  selector: 'wc-upgrade-payment',
  templateUrl: './upgrade-payment.component.html',
  styleUrls: ['./upgrade-payment.component.scss'],
})
export class UpgradePaymentComponent implements OnInit, OnDestroy {
  events: any[] = [];
  selectedMethod: any;
  bill: any[] = [];
  manualBill: any;
  isPayingMidtrans = false;
  midtransPaymentStatus: 'idle' | 'pending' | 'paid' | 'failed' = 'idle';
  currentOrderId: string | null = null;
  private currentSnapToken: string | null = null;

  private readonly PAYMENT_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  private readonly PAYMENT_STATE_KEY = 'upgrade_payment_state';
  private readonly UPGRADE_DATA_KEY = 'upgradeData';

  get hasSnapToken(): boolean {
    return !!this.currentSnapToken;
  }

  private notyf: Notyf;
  private pollSubscription: Subscription | null = null;

  selectOptions: any = {
    payment: {
      items: [],
      defaultValue: [],
      FormControl: new FormControl(),
    },
  };

  userId: any;
  private invitationId: number | null = null;
  invoiceAmount: number | null = null;
  upgradeData: UpgradeData | null = null;
  isLoading = true;

  constructor(
    private dashboardSvc: DashboardService,
    private modalService: BsModalService,
    private midtransSvc: MidtransPaymentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' },
    });
  }

  ngOnInit(): void {
    this.getMasterPayment();
    this.loadUpgradeData();
  }

  loadUpgradeData(): void {
    const raw = localStorage.getItem(this.UPGRADE_DATA_KEY);
    if (!raw) {
      this.notyf.error('Data upgrade tidak ditemukan. Silakan pilih paket terlebih dahulu.');
      this.router.navigate(['/dashboard/upgrade']);
      return;
    }

    this.upgradeData = JSON.parse(raw) as UpgradeData;
    const pkg = this.upgradeData?.upgrade?.package;

    if (!pkg) {
      this.notyf.error('Data paket tidak valid.');
      this.router.navigate(['/dashboard/upgrade']);
      return;
    }

    this.manualBill = Number(pkg.price) || 0;
    this.invoiceAmount = this.manualBill;

    // Use invitation_id from stored upgrade data (already initiated in previous component)
    this.invitationId = this.upgradeData?.upgrade?.invitation_id ?? null;

    if (!this.invitationId) {
      this.notyf.error('ID invitation tidak ditemukan. Silakan coba lagi.');
      this.router.navigate(['/dashboard/upgrade']);
      return;
    }

    this.isLoading = false;

    // Restore payment state if available
    this.restorePaymentState();
  }

  getMasterPayment(): void {
    this.dashboardSvc
      .getParam(DashboardServiceType.MD_RGS_PAYMENT, '')
      .subscribe((response) => {
        this.selectOptions.payment.items = response['data'];
      });
  }

  getDetailMethod(): void {
    const query = `?id_methode_pembayaran=${this.selectedMethod}`;
    this.dashboardSvc
      .getParam(DashboardServiceType.MNL_MD_METHOD_DETAIL, query)
      .subscribe((res) => {
        this.bill = res?.data ?? [];
      });
  }

  onMetodeSelect(event: any): void {
    this.selectedMethod = event;
    this.midtransPaymentStatus = 'idle';
    this.currentOrderId = null;
    this.currentSnapToken = null;
    this.clearPaymentState();
    this.getDetailMethod();
  }

  onBack(): void {
    localStorage.removeItem(this.UPGRADE_DATA_KEY);
    this.router.navigate(['/dashboard/upgrade']);
  }

  onNextClicked(): void {
    // For manual payment confirmation
    this.notyf.success('Permintaan upgrade telah dikirim. Admin akan mengkonfirmasi pembayaran Anda.');
    localStorage.removeItem(this.UPGRADE_DATA_KEY);
    this.router.navigate(['/dashboard/overview']);
  }

  /**
   * Initiate Midtrans Snap payment popup for upgrade.
   */
  onPayWithMidtrans(): void {
    // If we have an existing snap token, reopen the popup directly
    if (this.currentSnapToken && this.currentOrderId) {
      this.reopenSnapPopup();
      return;
    }

    if (!this.invitationId || !this.invoiceAmount) {
      this.notyf.error('Data pembayaran tidak lengkap. Silakan coba lagi.');
      return;
    }

    const midtransConfig = this.bill?.[0];
    if (!midtransConfig?.client_key) {
      this.notyf.error('Konfigurasi Midtrans tidak ditemukan.');
      return;
    }

    this.isPayingMidtrans = true;
    this.midtransPaymentStatus = 'idle';

    this.midtransSvc
      .createSnapToken({
        invitation_id: this.invitationId,
        amount: this.invoiceAmount,
      })
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.isPayingMidtrans = false;
            this.notyf.error('Gagal membuat token pembayaran.');
            return;
          }

          this.currentOrderId = res.data.order_id;
          this.currentSnapToken = res.data.snap_token;

          // Persist payment state for recovery after page refresh
          this.savePaymentState({
            snapToken: res.data.snap_token,
            orderId: res.data.order_id,
            invitationId: this.invitationId!,
            amount: this.invoiceAmount!,
            timestamp: Date.now(),
          });

          const isProduction = midtransConfig.metode_production === 'production';

          this.midtransSvc
            .openSnapPopup(res.data.snap_token, midtransConfig.client_key, {
              onSuccess: (result: SnapResult) => this.onSnapSuccess(result),
              onPending: (result: SnapResult) => this.onSnapPending(result),
              onError: (result: SnapResult) => this.onSnapError(result),
              onClose: () => this.onSnapClose(),
            }, isProduction)
            .catch((err: Error) => {
              this.isPayingMidtrans = false;
              this.notyf.error(err.message ?? 'Gagal membuka halaman pembayaran.');
            });
        },
        error: (err: Error) => {
          // Handle case where payment was already initiated
          if (this.isPaymentAlreadyInitiatedError(err)) {
            this.handleExistingPaymentError();
            return;
          }
          this.isPayingMidtrans = false;
          this.notyf.error(err.message ?? 'Gagal memproses pembayaran.');
        },
      });
  }

  private reopenSnapPopup(): void {
    const midtransConfig = this.bill?.[0];
    if (!midtransConfig?.client_key || !this.currentSnapToken) {
      this.currentSnapToken = null;
      this.onPayWithMidtrans();
      return;
    }

    this.isPayingMidtrans = true;
    this.midtransPaymentStatus = 'idle';
    const isProduction = midtransConfig.metode_production === 'production';

    this.midtransSvc
      .openSnapPopup(this.currentSnapToken, midtransConfig.client_key, {
        onSuccess: (result: SnapResult) => this.onSnapSuccess(result),
        onPending: (result: SnapResult) => this.onSnapPending(result),
        onError: (result: SnapResult) => this.onSnapError(result),
        onClose: () => this.onSnapClose(),
      }, isProduction)
      .catch((err: Error) => {
        // Token expired or invalid - clear state and inform user
        this.clearPaymentState();
        this.currentSnapToken = null;
        this.isPayingMidtrans = false;
        this.notyf.error('Sesi pembayaran kedaluwarsa. Silakan coba lagi atau hubungi support.');
      });
  }

  private onSnapSuccess(result: SnapResult): void {
    const orderId = result.order_id ?? this.currentOrderId;

    if (!orderId) {
      this.isPayingMidtrans = false;
      this.midtransPaymentStatus = 'paid';
      this.clearPaymentState();
      this.clearUpgradeData();
      this.notyf.success('Upgrade berhasil! Mengarahkan ke dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard/overview';
      }, 1500);
      return;
    }

    // Verify payment with backend to trigger database update
    this.midtransSvc.checkPaymentStatus(orderId).subscribe({
      next: (res) => {
        this.isPayingMidtrans = false;
        this.midtransPaymentStatus = 'paid';

        if (res.payment_status === 'paid') {
          this.notyf.success('Upgrade berhasil! Mengarahkan ke dashboard...');
        } else {
          this.notyf.success('Upgrade berhasil! Mengarahkan ke dashboard...');
        }

        this.clearPaymentState();
        this.clearUpgradeData();
        setTimeout(() => {
          window.location.href = '/dashboard/overview';
        }, 1500);
      },
      error: (err) => {
        // Payment succeeded in Midtrans but backend verification failed
        // Proceed with redirect anyway - webhook or manual sync will handle it
        console.error('Failed to verify payment status:', err);
        this.isPayingMidtrans = false;
        this.midtransPaymentStatus = 'paid';
        this.clearPaymentState();
        this.clearUpgradeData();
        this.notyf.success('Upgrade berhasil! Mengarahkan ke dashboard...');

        setTimeout(() => {
          window.location.href = '/dashboard/overview';
        }, 1500);
      }
    });
  }

  private onSnapPending(result: SnapResult): void {
    console.log('Snap onPending callback triggered');
    this.midtransPaymentStatus = 'pending';
    this.notyf.success('Pembayaran dalam proses. Kami akan memverifikasi secara otomatis.');
    this.startStatusPolling(result.order_id ?? this.currentOrderId ?? '');
  }

  private onSnapError(result: SnapResult): void {
    this.isPayingMidtrans = false;
    this.midtransPaymentStatus = 'failed';
    this.notyf.error('Pembayaran gagal. Silakan coba lagi.');
  }

  private onSnapClose(): void {
    console.log('Snap popup closed by user');
    this.stopPolling();
    this.isPayingMidtrans = false;
    if (this.midtransPaymentStatus !== 'paid') {
      this.midtransPaymentStatus = 'idle';
    }
    this.cdr.detectChanges();
  }

  private startStatusPolling(orderId: string): void {
    this.stopPolling();

    this.pollSubscription = this.midtransSvc.pollPaymentStatus(orderId).subscribe({
      next: (res) => {
        if (res.payment_status === 'paid') {
          this.stopPolling();
          this.midtransPaymentStatus = 'paid';
          this.isPayingMidtrans = false;
          this.clearPaymentState();
          this.clearUpgradeData();
          this.notyf.success('Upgrade berhasil! Mengarahkan ke dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard/overview';
          }, 1500);
        } else if (res.payment_status === 'failed') {
          this.stopPolling();
          this.midtransPaymentStatus = 'failed';
          this.isPayingMidtrans = false;
          this.notyf.error('Pembayaran gagal atau expired.');
        }
      },
      error: () => {
        this.stopPolling();
        this.isPayingMidtrans = false;
      },
    });
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => this.notyf.success('Nomor rekening disalin!'))
      .catch(() => this.notyf.error('Gagal menyalin.'));
  }

  copyTripayToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => this.notyf.success('Kode Tripay disalin!'))
      .catch(() => this.notyf.error('Gagal menyalin.'));
  }

  // ─── Payment State Persistence Methods ───────────────────────────────────────

  private savePaymentState(state: PaymentState): void {
    try {
      localStorage.setItem(this.PAYMENT_STATE_KEY, JSON.stringify(state));
    } catch {
      console.warn('Failed to save payment state to localStorage');
    }
  }

  private restorePaymentState(): void {
    try {
      const raw = localStorage.getItem(this.PAYMENT_STATE_KEY);
      if (!raw) return;

      const state: PaymentState = JSON.parse(raw);

      if (state.invitationId === this.invitationId && this.isValidPaymentState(state)) {
        this.currentSnapToken = state.snapToken;
        this.currentOrderId = state.orderId;
        console.log('Upgrade payment state restored for order:', state.orderId);
      } else {
        this.clearPaymentState();
      }
    } catch {
      this.clearPaymentState();
    }
  }

  private clearPaymentState(): void {
    try {
      localStorage.removeItem(this.PAYMENT_STATE_KEY);
    } catch {
      // Storage might be disabled; fail silently
    }
  }

  private clearUpgradeData(): void {
    try {
      localStorage.removeItem(this.UPGRADE_DATA_KEY);
    } catch {
      // Storage might be disabled; fail silently
    }
  }

  private isValidPaymentState(state: PaymentState): boolean {
    const age = Date.now() - state.timestamp;
    return age < this.PAYMENT_STATE_MAX_AGE_MS;
  }

  private isPaymentAlreadyInitiatedError(err: Error): boolean {
    const msg = err.message.toLowerCase();
    return msg.includes('already initiated') || msg.includes('sudah ada');
  }

  private handleExistingPaymentError(): void {
    const saved = this.getSavedPaymentState();

    if (saved && saved.invitationId === this.invitationId && this.isValidPaymentState(saved)) {
      this.currentOrderId = saved.orderId;
      this.currentSnapToken = saved.snapToken;
      this.isPayingMidtrans = false;
      this.notyf.success('Pembayaran sebelumnya ditemukan. Silakan lanjutkan.');
      this.cdr.detectChanges();
    } else {
      this.isPayingMidtrans = false;
      this.notyf.error('Pembayaran sedang diproses. Hubungi support untuk melanjutkan.');
    }
  }

  private getSavedPaymentState(): PaymentState | null {
    try {
      const raw = localStorage.getItem(this.PAYMENT_STATE_KEY);
      return raw ? (JSON.parse(raw) as PaymentState) : null;
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getPackageName(): string {
    return this.upgradeData?.upgrade?.package?.name_paket || 'Paket';
  }

  getPackageDuration(): string {
    return this.upgradeData?.upgrade?.package?.masa_aktif || '0';
  }
}

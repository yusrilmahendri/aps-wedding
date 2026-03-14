import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { PaymentConfirmComponent } from 'src/app/shared/payment-confirm/payment-confirm.component';
import { MidtransPaymentService, SnapResult } from 'src/app/services/midtrans-payment.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Interface for persisted payment state in localStorage.
 * Enables recovery after page refresh or browser close.
 */
interface PaymentState {
  snapToken: string;
  orderId: string;
  invitationId: number;
  amount: number;
  timestamp: number;
}

interface InvoiceData {
  kode_pemesanan: string;
  paket: string;
  email: string;
  phone: string;
  domain: string;
  total: number;
}

@Component({
  selector: 'wc-regis-pembayaran',
  templateUrl: './regis-pembayaran.component.html',
  styleUrls: ['./regis-pembayaran.component.scss'],
})
export class RegisPembayaranComponent implements OnInit, OnDestroy {
  @Input() formData: any;
  @Output() prev = new EventEmitter<void>();

  events: any[] = [];
  selectedMethod: any;
  bill: any[] = [];
  manualBill: any;
  isPayingMidtrans = false;
  midtransPaymentStatus: 'idle' | 'pending' | 'paid' | 'failed' = 'idle';
  currentOrderId: string | null = null;
  private currentSnapToken: string | null = null;
  invoiceData: InvoiceData | null = null;

  /**
   * Maximum age of payment state before it's considered stale.
   * Snap tokens typically expire after 24 hours.
   */
  private readonly PAYMENT_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  private readonly PAYMENT_STATE_KEY = 'midtrans_payment_state';

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
  private invoiceAmount: number | null = null;

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
    const raw = localStorage.getItem('formData');
    if (raw) {
      const stored = JSON.parse(raw);
      const priceSnapshot = stored?.registrasi?.response?.invitation?.package_price_snapshot;
      const formPrice     = stored?.registrasi?.formData?.price;
      const resolvedPrice = priceSnapshot ?? formPrice ?? null;

      this.manualBill    = resolvedPrice !== null ? Number(resolvedPrice) : null;
      this.invoiceAmount = this.manualBill;
      this.userId        = stored?.registrasi?.response?.user?.id ?? null;
      this.invitationId  = stored?.registrasi?.response?.invitation?.id ?? null;

      // Populate invoice data
      this.invoiceData = {
        kode_pemesanan: stored?.registrasi?.response?.user?.kode_pemesanan
          ?? stored?.registrasi?.formData?.kode_pemesanan
          ?? '-',
        paket: stored?.registrasi?.response?.invitation?.package_features_snapshot?.name_paket
          ?? stored?.registrasi?.formData?.paket_name
          ?? '-',
        email: stored?.registrasi?.formData?.email ?? '-',
        phone: stored?.registrasi?.formData?.phone ?? '-',
        domain: stored?.registrasi?.formData?.domain ?? '-',
        total: this.manualBill ?? 0
      };
    }

    // Restore payment state if available (e.g., after page refresh)
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
    this.prev.emit();
  }

  onNextClicked(): void {
    this.modalService.show(PaymentConfirmComponent, {
      initialState: { userId: this.userId },
    });
  }

  /**
   * Initiate Midtrans Snap payment popup.
   * Calls createSnapToken → loads Snap.js → opens popup.
   * On pending → starts polling checkPaymentStatus every 5s.
   */
  onPayWithMidtrans(): void {
    // If we have an existing snap token, reopen the popup directly
    if (this.currentSnapToken && this.currentOrderId) {
      this.reopenSnapPopup();
      return;
    }

    if (!this.invitationId || !this.invoiceAmount) {
      this.notyf.error('Data pembayaran tidak lengkap. Ulangi proses registrasi.');
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
      this.notyf.success('Pembayaran berhasil! Mengarahkan ke dashboard...');
      setTimeout(() => {
        localStorage.removeItem('formData');
        localStorage.removeItem('formRegis');
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
          this.notyf.success('Pembayaran terkonfirmasi! Mengarahkan ke dashboard...');
        } else {
          this.notyf.success('Pembayaran berhasil! Mengarahkan ke dashboard...');
        }

        this.clearPaymentState();
        setTimeout(() => {
          localStorage.removeItem('formData');
          localStorage.removeItem('formRegis');
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
        this.notyf.success('Pembayaran berhasil! Mengarahkan ke dashboard...');

        setTimeout(() => {
          localStorage.removeItem('formData');
          localStorage.removeItem('formRegis');
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
    // User closed Snap popup — stop everything and allow reopening
    console.log('Snap popup closed by user');
    console.log('Before reset - isPayingMidtrans:', this.isPayingMidtrans, 'status:', this.midtransPaymentStatus, 'hasToken:', this.currentSnapToken ? 'yes' : 'no');

    this.stopPolling();
    this.isPayingMidtrans = false;
    if (this.midtransPaymentStatus !== 'paid') {
      this.midtransPaymentStatus = 'idle';
    }

    // Force Angular to detect changes immediately
    this.cdr.detectChanges();

    console.log('After reset - isPayingMidtrans:', this.isPayingMidtrans, 'status:', this.midtransPaymentStatus);
  }

  private verifyPaymentAfterClose(): void {
    if (!this.currentOrderId) return;

    this.midtransSvc.checkPaymentStatus(this.currentOrderId).subscribe({
      next: (res) => {
        if (res.payment_status === 'paid') {
          this.stopPolling();
          this.isPayingMidtrans = false;
          this.midtransPaymentStatus = 'paid';
          this.notyf.success('Pembayaran terkonfirmasi! Mengarahkan ke dashboard...');
          setTimeout(() => {
            localStorage.removeItem('formData');
            localStorage.removeItem('formRegis');
            window.location.href = '/dashboard/overview';
          }, 1500);
        } else if (res.payment_status === 'pending') {
          // Payment still pending - allow user to reopen popup
          console.log('Payment still pending after popup close');
          this.isPayingMidtrans = false;
          this.midtransPaymentStatus = 'idle';
        } else {
          // Payment failed or other status - keep snap token for retry
          this.isPayingMidtrans = false;
          this.midtransPaymentStatus = 'idle';
        }
      },
      error: (err) => {
        console.error('Failed to verify payment after popup close:', err);
        this.isPayingMidtrans = false;
        this.midtransPaymentStatus = 'idle';
      }
    });
  }

  private startStatusPolling(orderId: string): void {
    this.stopPolling();

    this.pollSubscription = this.midtransSvc.pollPaymentStatus(orderId).subscribe({
      next: (res) => {
        if (res.payment_status === 'paid') {
          this.stopPolling();
          this.midtransPaymentStatus = 'paid';
          this.isPayingMidtrans = false;
          this.notyf.success('Pembayaran terkonfirmasi! Mengarahkan ke dashboard...');
          setTimeout(() => {
            localStorage.removeItem('formData');
            localStorage.removeItem('formRegis');
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

  /**
   * Save payment state to localStorage for recovery after page refresh.
   * Called immediately after successful snap token creation.
   */
  private savePaymentState(state: PaymentState): void {
    try {
      localStorage.setItem(this.PAYMENT_STATE_KEY, JSON.stringify(state));
    } catch {
      // Storage might be full or disabled; fail silently
      console.warn('Failed to save payment state to localStorage');
    }
  }

  /**
   * Restore payment state from localStorage on component init.
   * Validates state age and matching invitation ID before restoring.
   */
  private restorePaymentState(): void {
    try {
      const raw = localStorage.getItem(this.PAYMENT_STATE_KEY);
      if (!raw) return;

      const state: PaymentState = JSON.parse(raw);

      // Validate state matches current invitation and isn't expired
      if (state.invitationId === this.invitationId && this.isValidPaymentState(state)) {
        this.currentSnapToken = state.snapToken;
        this.currentOrderId = state.orderId;
        console.log('Payment state restored for order:', state.orderId);
      } else {
        // State is invalid or for different invitation - clear it
        this.clearPaymentState();
      }
    } catch {
      // Corrupted state - clear it
      this.clearPaymentState();
    }
  }

  /**
   * Clear payment state from localStorage.
   * Called after successful payment or when switching payment methods.
   */
  private clearPaymentState(): void {
    try {
      localStorage.removeItem(this.PAYMENT_STATE_KEY);
    } catch {
      // Storage might be disabled; fail silently
    }
  }

  /**
   * Validate payment state hasn't expired.
   * Snap tokens are valid for 24 hours by default.
   */
  private isValidPaymentState(state: PaymentState): boolean {
    const age = Date.now() - state.timestamp;
    return age < this.PAYMENT_STATE_MAX_AGE_MS;
  }

  /**
   * Check if error indicates payment was already initiated.
   */
  private isPaymentAlreadyInitiatedError(err: Error): boolean {
    const msg = err.message.toLowerCase();
    return msg.includes('already initiated') || msg.includes('sudah ada');
  }

  /**
   * Handle case where payment already exists on backend.
   * Attempts to recover using saved state or informs user.
   */
  private handleExistingPaymentError(): void {
    const saved = this.getSavedPaymentState();

    if (saved && saved.invitationId === this.invitationId && this.isValidPaymentState(saved)) {
      // Restore state and allow user to continue
      this.currentOrderId = saved.orderId;
      this.currentSnapToken = saved.snapToken;
      this.isPayingMidtrans = false;
      this.notyf.success('Pembayaran sebelumnya ditemukan. Silakan lanjutkan.');
      this.cdr.detectChanges();
    } else {
      // No valid saved state - user must contact support
      this.isPayingMidtrans = false;
      this.notyf.error('Pembayaran sedang diproses. Hubungi support untuk melanjutkan.');
    }
  }

  /**
   * Retrieve saved payment state from localStorage.
   */
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
}

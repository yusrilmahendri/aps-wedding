import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { PaymentConfirmComponent } from 'src/app/shared/payment-confirm/payment-confirm.component';
import { MidtransPaymentService, SnapResult } from 'src/app/services/midtrans-payment.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
    }
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
          this.isPayingMidtrans = false;
          this.notyf.error(err.message ?? 'Gagal memproses pembayaran.');
        },
      });
  }

  private onSnapSuccess(result: SnapResult): void {
    const orderId = result.order_id ?? this.currentOrderId;

    if (!orderId) {
      this.isPayingMidtrans = false;
      this.midtransPaymentStatus = 'paid';
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
    // When user closes Snap popup, check if payment was completed
    // This handles cases where 3DS timeout prevents callbacks from firing
    if (this.currentOrderId && this.midtransPaymentStatus !== 'paid') {
      console.log('Snap popup closed. Verifying payment status for order:', this.currentOrderId);
      
      // Give Midtrans a moment to process before checking
      setTimeout(() => {
        this.verifyPaymentAfterClose();
      }, 2000);
    } else if (this.midtransPaymentStatus === 'idle') {
      this.isPayingMidtrans = false;
    }
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
          // Payment still pending, continue polling
          console.log('Payment still pending after popup close');
          if (!this.pollSubscription) {
            this.startStatusPolling(this.currentOrderId!);
          }
        } else {
          // Payment failed or other status
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

  ngOnDestroy(): void {
    this.stopPolling();
  }
}

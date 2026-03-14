import { Component, Input, OnInit } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from '../../dashboard.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SuccessConfirmPaymentComponent } from '../success-confirm-payment/success-confirm-payment.component';
import { Observable } from 'rxjs';

interface InvoiceData {
  kode_pemesanan: string;
  paket: string;
  email: string;
  phone: string;
  domain: string;
  total: number;
}

@Component({
  selector: 'wc-payment-confirm',
  templateUrl: './payment-confirm.component.html',
  styleUrls: ['./payment-confirm.component.scss']
})
export class PaymentConfirmComponent implements OnInit {

  private notyf: Notyf;
  kodePayment: any;
  inputKodePayment: string = '';
  @Input() userId!: number;
  form!: FormGroup;
  invoiceData: InvoiceData | null = null;

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private modalService: BsModalService,
  ) {
    this.notyf = new Notyf({
      duration: 1000,
      position: {
        x: 'right',
        y: 'top'
      }
    });
  }

  ngOnInit() {
    const allDataFromStepsStr = localStorage.getItem('formData');
    console.log('userId', this.userId);

    let kodePemesanan = '';

    if (allDataFromStepsStr) {
      const allDataFromSteps = JSON.parse(allDataFromStepsStr);

      const kodeFromForm = allDataFromSteps?.registrasi?.formData?.kode_pemesanan;
      const kodeFromUser = allDataFromSteps?.registrasi?.response.user?.kode_pemesanan;

      if (kodeFromForm) {
        kodePemesanan = kodeFromForm;
      } else if (kodeFromUser) {
        kodePemesanan = kodeFromUser;
      }

      this.kodePayment = kodePemesanan;

      // Populate invoice data from localStorage
      const priceSnapshot = allDataFromSteps?.registrasi?.response?.invitation?.package_price_snapshot;
      const formPrice = allDataFromSteps?.registrasi?.formData?.price;
      const resolvedPrice = priceSnapshot ?? formPrice ?? null;

      this.invoiceData = {
        kode_pemesanan: kodePemesanan || '-',
        paket: allDataFromSteps?.registrasi?.response?.invitation?.package_features_snapshot?.name_paket
          ?? allDataFromSteps?.registrasi?.formData?.paket_name
          ?? '-',
        email: allDataFromSteps?.registrasi?.formData?.email ?? '-',
        phone: allDataFromSteps?.registrasi?.formData?.phone ?? '-',
        domain: allDataFromSteps?.registrasi?.formData?.domain ?? '-',
        total: resolvedPrice !== null ? Number(resolvedPrice) : 0
      };
    }

    this.form = this.fb.group({
      user_id: [this.userId],
      kode_pemesanan: [this.kodePayment || '']
    });
  }


  copyMidtrans(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.notyf.success('berhasil disalin!');
    }).catch(() => {
      this.notyf.error('Gagal menyalin.');
    });
  }

  createInvoice(): Observable<any> {
    return this.dashboardSvc.create(DashboardServiceType.USER_TAGIHAN, {
      user_id: this.userId
    });
  }

  onConfirm() {
    // First create invoice
    this.createInvoice().subscribe({
      next: (res) => {
        this.notyf.success('Tagihan berhasil dibuat. Silakan transfer pembayaran.');
        this.modalService.hide();
        setTimeout(() => {
          this.modalService.show(SuccessConfirmPaymentComponent, {
            initialState: {
              message: 'Konfirmasi berhasil! Silakan lakukan pembayaran.'
            }
          });
        }, 300);
      },
      error: (err) => {
        this.notyf.error(err.error?.message || 'Gagal membuat tagihan');
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

}

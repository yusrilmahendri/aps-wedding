import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/dashboard.service';

interface BillingRow {
  no_invoice: string;
  tanggal_transaksi: string;
  paket: string;
  status: string;
  statusLabel: string;
  harga: number;
}

@Component({
  selector: 'wc-bill-user',
  templateUrl: './bill-user.component.html',
  styleUrls: ['./bill-user.component.scss']
})
export class BillUserComponent implements OnInit {
  billingRows: BillingRow[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private dashboardSvc: DashboardService) {}

  ngOnInit(): void {
    this.loadBillingHistory();
  }

  loadBillingHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.dashboardSvc.getBillingHistory().subscribe({
      next: (res: any) => {
        const raw: any[] = res?.data ?? [];
        this.billingRows = raw.map((item) => ({
          no_invoice: item.no_invoice || item.invoice_number || '-',
          tanggal_transaksi: item.tanggal_transaksi || item.created_at || '-',
          paket: item.paket || item.package_name || item.paket_undangan?.name_paket || '-',
          status: item.status || '-',
          statusLabel: this.getStatusLabel(item.status),
          harga: item.harga ?? item.amount ?? item.total ?? 0,
        }));
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Gagal memuat riwayat tagihan.';
        this.isLoading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'settlement':
      case 'paid':
      case 'capture':
        return 'Lunas';
      case 'pending':
        return 'Belum Bayar';
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'Dibatalkan';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : '-';
    }
  }

  formatCurrency(amount: number): string {
    if (!amount) return 'Rp 0';
    return 'Rp ' + amount.toLocaleString('id-ID');
  }
}


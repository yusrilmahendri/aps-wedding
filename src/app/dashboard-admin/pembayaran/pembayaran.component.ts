import { Component, OnInit } from '@angular/core';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';

interface InvoiceRow {
  id: number;
  email: string;
  phone: string;
  domain: string;
  kode_pemesanan: string;
  midtrans_order_id: string;
  paket: string;
  harga: number;
  payment_status: string;
  payment_confirmed_at: string;
  domain_expires_at: string;
  created_at: string;

  statusLabel: string;
  statusClass: string;
}

interface InvoiceResponse {
  success: boolean;
  data: InvoiceRow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

@Component({
  selector: 'wc-pembayaran',
  templateUrl: './pembayaran.component.html',
  styleUrls: ['./pembayaran.component.scss']
})
export class PembayaranComponent implements OnInit {
  rows: InvoiceRow[] = [];
  displayedRows: InvoiceRow[] = [];

  isLoading = false;
  searchTerm = '';

  pagination = {
    currentPage: 1,
    totalPages: 1,
    perPage: 15,
    total: 0
  };

  perPageOptions = [10, 15, 25, 50, 100];

  selectedInvoice: InvoiceRow | null = null;
  isModalOpen = false;

  private notyf: Notyf;

  constructor(private dashboardSvc: DashboardService) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(page: number = 1): void {
    this.isLoading = true;

    const params: any = {
      page,
      per_page: this.pagination.perPage
    };

    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    this.dashboardSvc.list(DashboardServiceType.ADM_INVOICE_LIST, params).subscribe({
      next: (response: InvoiceResponse) => {
        if (response?.success && response?.data) {
          this.rows = this.mapInvoiceRows(response.data);
          this.displayedRows = this.rows;
          this.pagination = {
            currentPage: response.meta.current_page,
            totalPages: response.meta.last_page,
            perPage: response.meta.per_page,
            total: response.meta.total
          };
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.notyf.error('Gagal memuat data invoice');
        this.isLoading = false;
      }
    });
  }

  private mapInvoiceRows(data: any[]): InvoiceRow[] {
    return data.map(item => ({
      ...item,
      statusLabel: this.getStatusLabel(item.payment_status),
      statusClass: this.getStatusClass(item.payment_status)
    }));
  }

  private getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'paid': 'Lunas',
      'pending': 'Pending',
      'failed': 'Gagal',
      'expired': 'Expired',
      'refunded': 'Refund'
    };
    return statusMap[status] || status;
  }

  private getStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      'paid': 'aktif',
      'pending': 'waiting',
      'failed': 'unpaid',
      'expired': 'expired',
      'refunded': 'pending'
    };
    return classMap[status] || 'pending';
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.pagination.currentPage = 1;
    this.loadInvoices(1);
  }

  onPageSizeChange(size: number): void {
    this.pagination.perPage = size;
    this.pagination.currentPage = 1;
    this.loadInvoices(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.currentPage) {
      return;
    }
    this.loadInvoices(page);
  }

  openModal(invoice: InvoiceRow): void {
    this.selectedInvoice = invoice;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    setTimeout(() => {
      this.selectedInvoice = null;
    }, 300);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.pagination.currentPage - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > this.pagination.totalPages) {
      endPage = this.pagination.totalPages;
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  get paginationInfo(): string {
    const start = (this.pagination.currentPage - 1) * this.pagination.perPage + 1;
    const end = Math.min(
      this.pagination.currentPage * this.pagination.perPage,
      this.pagination.total
    );
    return `Menampilkan ${start}–${end} dari ${this.pagination.total} data`;
  }

  get visibleData(): InvoiceRow[] {
    return this.displayedRows;
  }

  get hasData(): boolean {
    return this.displayedRows.length > 0;
  }

  get showPagination(): boolean {
    return this.pagination.total > 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}

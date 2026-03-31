import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';

@Component({
  selector: 'wc-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  rows: Array<any> = [];
  columns: Array<any> = [];
  paketList: any[] = [];
  isLoading: boolean = false;

  user: any
  salary: any;
  total_users: any;
  pending_req: any;

  // Search & pagination
  allRows: Array<any> = [];
  filteredRows: Array<any> = [];
  displayedRows: Array<any> = [];
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  pageSizeOptions = [5, 10, 25, 50];

  // Modal and form properties
  modalRef?: BsModalRef;
  confirmPaymentForm: FormGroup;
  selectedUser: any = null;
  private notyf: Notyf;

  // Edit package properties
  editPackageForm: FormGroup;
  selectedUserForPackage: any = null;

  constructor(
    private dashboardSvc: DashboardService,
    private modalService: BsModalService,
    private fb: FormBuilder
  ) {
    // Initialize Notyf
    this.notyf = new Notyf({
      duration: 1000,
      position: {
        x: 'right',
        y: 'top'
      }
    });

    // Initialize forms
    this.confirmPaymentForm = this.fb.group({
      user_id: ['', Validators.required],
      kode_pemesanan: ['', Validators.required],
      confirmCheck: [false, Validators.requiredTrue]
    });

    this.editPackageForm = this.fb.group({
      user_id: ['', Validators.required],
      paket_undangan_id: ['', Validators.required],
      extend_from_now: [false]
    });
  }

  ngOnInit(): void {
    this.getPaketUndangan();
    this.columns = [
      { name: 'No Invoice', prop: 'invoice' },
      { name: 'Pengguna', prop: 'pengguna' },
      { name: 'Domain', prop: 'domain' },
      { name: 'Status', prop: 'status', type: 'html' }
    ];
  }

  getPaketUndangan() {
    this.isLoading = true;
    this.dashboardSvc.list(DashboardServiceType.MNL_MD_PACK_INVITATION,).subscribe(res => {
      this.paketList = res?.data ?? [];
      this.getDetailUser();
    });
  }

  getDetailUser() {
    this.dashboardSvc.getParam(DashboardServiceType.ADM_IDX_DASHBOARD, '').subscribe(res => {
      const users = res?.users?.data ?? [];
      const activeUsers = users.filter((user: any) => user.kd_status === 'SB');
      this.salary = activeUsers.reduce((total: number, user: any) => {
        const paket = this.paketList.find(p => p.id == user.paket_undangan_id);
        const harga = paket ? parseFloat(paket.price) : 0;
        return total + harga;
      }, 0);

      this.total_users = res?.total_users ?? 0;
      this.pending_req = (res?.jumlah_belum_lunas_dan_pending?.BL ?? 0) +
        (res?.jumlah_belum_lunas_dan_pending?.MK ?? 0);

      this.rows = users.map((user: any) => ({
        id: user.id,
        invoice: user.kode_pemesanan ?? '–',
        pengguna: user.email ?? '–',
        domain: user.domain ?? '–',
        statusCode: user.kd_status,
        statusData: this.getStatusData(user.kd_status),
        konfirmasiAktif: user.kd_status !== 'SB', // Disabled when already paid (SB)
        originalData: user
      }));

      this.allRows = [...this.rows];
      this.applyFilter();

      this.isLoading = false;
    });
  }

  getStatusData(code: string | null): {text: string, class: string, ariaLabel: string} {
    switch (code) {
      case 'SB':
        return {
          text: 'Aktif',
          class: 'aktif',
          ariaLabel: 'Status Aktif'
        };
      case 'MK':
        return {
          text: 'Menunggu Konfirmasi',
          class: 'waiting',
          ariaLabel: 'Status Menunggu Konfirmasi'
        };
      case 'BL':
        return {
          text: 'Belum Lunas',
          class: 'unpaid',
          ariaLabel: 'Status Belum Lunas'
        };
      case 'EX':
        return {
          text: 'Expired',
          class: 'expired',
          ariaLabel: 'Status Expired'
        };
      default:
        return {
          text: 'Belum selesai',
          class: 'pending',
          ariaLabel: 'Status Belum selesai'
        };
    }
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyFilter();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilter();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedRows();
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredRows = term
      ? this.allRows.filter(row =>
          row.invoice.toLowerCase().includes(term) ||
          row.pengguna.toLowerCase().includes(term) ||
          row.domain.toLowerCase().includes(term) ||
          row.statusData.text.toLowerCase().includes(term)
        )
      : [...this.allRows];

    this.totalPages = Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updateDisplayedRows();
  }

  updateDisplayedRows() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedRows = this.filteredRows.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  onConfirmClicked(row: any, template: TemplateRef<any>) {
    this.selectedUser = row;

    // Populate form with selected user data
    this.confirmPaymentForm.patchValue({
      user_id: row.id,
      kode_pemesanan: row.invoice === '–' ? '' : row.invoice
    });

    // Open modal with custom class for styling
    this.modalRef = this.modalService.show(template, {
      class: 'modal-lg custom-payment-modal',
      backdrop: 'static',
      keyboard: false
    });
  }

  onSubmitPaymentConfirmation() {
    if (this.confirmPaymentForm.valid) {
      const payload = this.confirmPaymentForm.value;

      this.dashboardSvc.update(DashboardServiceType.RDM_CONFIRM_PAYMENT, '', payload).subscribe({
        next: (res) => {
          this.notyf.success('Berhasil konfirmasi pembayaran');
          this.modalRef?.hide();
          this.getDetailUser(); // Refresh data
        },
        error: (error) => {
          console.error('Error confirming payment:', error);
          this.notyf.error('Gagal konfirmasi pembayaran');
        }
      });
    } else {
      this.notyf.error('Mohon lengkapi semua field yang diperlukan');
    }
  }

  onCancelModal() {
    this.modalRef?.hide();
    this.confirmPaymentForm.reset();
    this.confirmPaymentForm.patchValue({ confirmCheck: false });
    this.selectedUser = null;
  }

  // Edit Package Methods
  onEditPackageClicked(row: any, template: TemplateRef<any>) {
    this.selectedUserForPackage = row;
    this.editPackageForm.patchValue({
      user_id: row.id,
      paket_undangan_id: row.originalData?.paket_undangan_id || '',
      extend_from_now: false
    });
    this.modalRef = this.modalService.show(template, {
      class: 'modal-md',
      backdrop: 'static',
      keyboard: false
    });
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

  getCurrentPackageName(): string {
    if (!this.selectedUserForPackage?.originalData?.paket_undangan_id) {
      return '–';
    }
    // Use loose equality (==) to handle string vs number comparison
    const pkg = this.paketList.find(p => p.id == this.selectedUserForPackage.originalData.paket_undangan_id);
    return pkg?.name_paket || '–';
  }

  getCurrentPackagePrice(): string {
    if (!this.selectedUserForPackage?.originalData?.paket_undangan_id) {
      return '–';
    }
    const pkg = this.paketList.find(p => p.id == this.selectedUserForPackage.originalData.paket_undangan_id);
    if (pkg?.price) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(Number(pkg.price));
    }
    return '–';
  }

  getCurrentPackageDuration(): string {
    if (!this.selectedUserForPackage?.originalData?.paket_undangan_id) {
      return '–';
    }
    const pkg = this.paketList.find(p => p.id == this.selectedUserForPackage.originalData.paket_undangan_id);
    return pkg ? `${pkg.masa_aktif} hari` : '–';
  }

  formatPrice(price: string | number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(price));
  }

  onEditClicked(row: any) {
    console.log('Edit action:', row);
  }

  onDeleteClicked(row: any) {
    console.log('Delete action:', row);
  }
}

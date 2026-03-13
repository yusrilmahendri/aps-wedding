import { Component, OnInit } from '@angular/core';
import { Notyf } from 'notyf';
import {
  DashboardService,
  DashboardServiceType,
  UcapanItem,
  UcapanResponse,
  UcapanStatisticsResponse,
  UcapanDeleteResponse
} from 'src/app/dashboard.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { TranslateService } from '@ngx-translate/core';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { catchError, of, forkJoin } from 'rxjs';


@Component({
  selector: 'wc-ucapan',
  templateUrl: './ucapan.component.html',
  styleUrls: ['./ucapan.component.scss']
})
export class UcapanComponent implements OnInit {

  dataList: UcapanItem[] = [];
  statistics: UcapanStatisticsResponse['data'] | null = null;
  isLoading = false;
  apiError: string | null = null;

  private notyf: Notyf

  searchQuery = '';
  itemsPerPage = 10;
  currentPage = 1;
  attendanceFilter: 'all' | 'hadir' | 'tidak_hadir' | 'mungkin' = 'all';

  modalRef?: BsModalRef;


  constructor(
    private dashBoardSvc: DashboardService,
    private modalSvc: BsModalService,
  ) {
      this.notyf = new Notyf({
        duration: 3000,
        position: {
          x: 'right',
          y: 'top'
        }
      });
     }

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Load all data including statistics and ucapan list
   */
  private loadData(): void {
    this.isLoading = true;
    this.apiError = null;

    const ucapanList$ = this.dashBoardSvc.list(DashboardServiceType.UCAPAN_INDEX, '').pipe(
      catchError(error => {
        console.error('Error fetching ucapan list:', error);
        return of(null);
      })
    );

    const statistics$ = this.dashBoardSvc.list(DashboardServiceType.UCAPAN_STATISTICS, '').pipe(
      catchError(error => {
        console.error('Error fetching ucapan statistics:', error);
        return of(null);
      })
    );

    forkJoin({
      ucapanList: ucapanList$,
      statistics: statistics$
    }).subscribe(
      (results) => {
        if (results.ucapanList) {
          const response = results.ucapanList as UcapanResponse;
          this.dataList = response.data || [];
        }

        if (results.statistics) {
          const statsResponse = results.statistics as UcapanStatisticsResponse;
          this.statistics = statsResponse.data;
        }

        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading data:', error);
        this.apiError = 'Failed to load data';
        this.isLoading = false;
      }
    );
  }

  get filteredDataList(): UcapanItem[] {
    let filtered = this.dataList;

    // Filter by attendance status
    if (this.attendanceFilter !== 'all') {
      filtered = filtered.filter(item => item.kehadiran === this.attendanceFilter);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.nama.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.pesan.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return filtered;
  }

  get paginatedDataList(): UcapanItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredDataList.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDataList.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visiblePageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // Pages to show on each side of current page

    if (total <= 7) {
      return this.pageNumbers;
    }

    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    let prev = 0;
    for (const i of range) {
      if (prev && i - prev > 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      prev = i;
    }

    return rangeWithDots.filter(n => typeof n === 'number') as number[];
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return Math.min(end, this.filteredDataList.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  onItemsPerPageChange(value: number): void {
    this.itemsPerPage = value;
    this.currentPage = 1; // Reset to first page
  }

  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page on search
  }

  /**
   * Set attendance filter
   */
  setAttendanceFilter(filter: 'all' | 'hadir' | 'tidak_hadir' | 'mungkin'): void {
    this.attendanceFilter = filter;
    this.currentPage = 1; // Reset to first page on filter change
  }

  /**
   * Get count for specific attendance status
   */
  getAttendanceCount(status: 'hadir' | 'tidak_hadir' | 'mungkin'): number {
    if (!this.statistics) return 0;
    return this.statistics[status] || 0;
  }

  /**
   * Get total ucapan count
   */
  getTotalCount(): number {
    return this.statistics?.total_ucapan || 0;
  }

  doDelete(event: any): void {
    let parameterDelete = event.id;

    const initialState = {
        message: `Apakah anda ingin menghapus pesan dari ${event?.nama}?`,
        cancelClicked: () => this.handleCancelClicked(),
        // submitClicked: (data: any) => this.handleSubmitClicked(data, parameterDelete)
    };

    // Open modal and pass the dynamic message
    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });

    // Check if modalRef and modalRef.content are defined
    if (this.modalRef && this.modalRef.content) {
        this.modalRef.content.onClose.subscribe((res: any) => {
            if (res && res.state === 'delete') {
                this.deleteEntry(parameterDelete);
            } else if (res && res.state === 'cancel') {
                console.log('Delete canceled');
            }
            this.modalRef?.hide();
        });
    }
}

handleCancelClicked() {
    console.log('Cancel clicked');
    // Add any additional logic for cancel action
}

handleSubmitClicked(data: any, parameterDelete: any) {
    console.log('Submit clicked with data:', data);
    this.deleteEntry(parameterDelete); // Perform the delete operation here
}

  doDeleteAll(): void {  const initialState = {
      message: `Apakah anda ingin menghapus semua data?`,
      cancelClicked: () => this.handleCancelClicked(),
      submitClicked: (data: any) => this.handleDeleteAllClicked(data)
  };

  // Open modal and pass the dynamic message
  this.modalRef = this.modalSvc.show(ModalComponent, { initialState });

  // Check if modalRef and modalRef.content are defined
  if (this.modalRef && this.modalRef.content) {
      this.modalRef.content.onClose.subscribe((res: any) => {
          if (res && res.state === 'delete') {
              this.deleteAll();
          } else if (res && res.state === 'cancel') {
              console.log('Delete canceled');
          }
          this.modalRef?.hide();
      });
  }
}

handleDeleteAllClicked(data: any) {
  console.log('Submit clicked with data:', data);
  this.deleteAll(); // Perform the delete operation here
}


  deleteEntry(id: number | undefined): void {
    if (!id) {
      console.error('ID is required for deletion');
      return;
    }

    console.log('Deleting entry with ID: ', id);

    // Call the delete service with the id using the new ucapan endpoint
    this.dashBoardSvc.deleteV2(DashboardServiceType.UCAPAN_DELETE, id).subscribe({
      next: (response: UcapanDeleteResponse) => {
        this.notyf.success(response?.message || 'Successfully deleted');
        this.loadData(); // Refresh the data after a successful deletion
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem');
        console.error('Error while deleting entry:', err);
      }
    });
  }

  deleteAll(): void {
    // Note: The API contract doesn't specify a delete all endpoint for ucapan
    // This functionality may need to be implemented by deleting each item individually
    console.warn('Delete all functionality not specified in API contract');
    this.notyf.error('Delete all functionality not available');
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Get color for attendance badge
   */
  getAttendanceColor(kehadiran: string): string {
    switch (kehadiran) {
      case 'hadir':
        return '#10B981'; // Green
      case 'tidak_hadir':
        return '#EF4444'; // Red
      case 'mungkin':
        return '#F59E0B'; // Orange
      default:
        return '#6B7280'; // Gray
    }
  }
}

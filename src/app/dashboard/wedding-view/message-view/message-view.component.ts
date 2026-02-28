import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { GuestWish } from '../../../services/wedding-data.service';

@Component({
  selector: 'wc-message-view',
  templateUrl: './message-view.component.html',
  styleUrls: ['./message-view.component.scss']
})
export class MessageViewComponent implements OnInit {
  @Input() guestWishes: GuestWish[] | undefined = [];
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  currentPage = 1;
  itemsPerPage = 6;

  constructor() { }

  ngOnInit(): void {
    console.log('MessageViewComponent initialized with guestWishes:', this.guestWishes);
  }

  get totalPages(): number {
    return Math.ceil(this.getGuestWishes().length / this.itemsPerPage);
  }

  get paginatedWishes() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.getGuestWishes().slice(start, start + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTop();
    }
  }

  scrollToTop() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }


getGuestWishes(): GuestWish[] {
  return (this.guestWishes || []).filter(wish =>
    wish.pesan &&
    wish.pesan.trim().length > 0 &&
    !wish.pesan.toLowerCase().includes('telah dilihat')
  );
}

  hasMessages(): boolean {
    return this.getGuestWishes().length > 0;
  }

  getAttendanceClass(kehadiran?: string): string {
  return kehadiran ? kehadiran.toLowerCase() : '';
}

  getFormattedDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  getAttendanceText(kehadiran: string): string {
    switch (kehadiran.toLowerCase()) {
      case 'ya':
        return 'Akan hadir';
      case 'tidak':
        return 'Tidak hadir';
      case 'belum_pasti':
        return 'Belum pasti';
      default:
        return kehadiran;
    }
  }

  trackByWishId(index: number, item: GuestWish): number {
    return item.id;
  }
}

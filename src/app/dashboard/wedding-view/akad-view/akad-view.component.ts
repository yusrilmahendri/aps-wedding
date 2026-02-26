import { Component, OnInit, Input } from '@angular/core';
import { WeddingEvent } from '../../../services/wedding-data.service';

@Component({
  selector: 'wc-akad-view',
  templateUrl: './akad-view.component.html',
  styleUrls: ['./akad-view.component.scss']
})
export class AkadViewComponent implements OnInit {
  @Input() events: WeddingEvent[] | undefined = [];
  @Input() eventType: string = 'akad';
  @Input() weddingData: any;

  galleryImages: string[] = [];
  currentSlide = 0;

  constructor() { }

  ngOnInit(): void {
    // Component initialization
    console.log('AkadViewComponent initialized with events:', this.events);
    console.log('Wedding data received:', this.weddingData);
  this.galleryImages = this.weddingData.gallery;
  this.startAutoSlide();
  }

  startAutoSlide() {
  setInterval(() => {
    this.currentSlide =
      (this.currentSlide + 1) % this.galleryImages.length;
  }, 4000);
}

  getEventData(): WeddingEvent | null {
    if (!this.events || this.events.length === 0) {
      return null;
    }

    // Find event by type (akad, resepsi) or return first event
    const targetEvent = this.events.find(event =>
      event.nama_acara.toLowerCase().includes(this.eventType.toLowerCase())
    );

    return targetEvent || this.events[0];
  }

  getFormattedDate(): string {
    const event = this.getEventData();
    if (!event) return 'Tanggal akan diumumkan';

    try {
      const date = new Date(event.tanggal_acara);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return event.tanggal_acara;
    }
  }

  getFormattedTime(): string {
    const event = this.getEventData();
    if (!event) return 'Waktu akan diumumkan';

    return `${event.start_acara} - ${event.end_acara || 'Selesai'}`;
  }

  getLocation(): string {
    const event = this.getEventData();
    return event?.alamat || 'Lokasi akan diumumkan';
  }

  getMapsLink(): string | null {
    const event = this.getEventData();
    return event?.link_maps || null;
  }

  openMapsLocation(): void {
    const mapsLink = this.getMapsLink();
    if (mapsLink) {
      window.open(mapsLink, '_blank');
    }
  }

  hasValidEvent(): boolean {
    const event = this.getEventData();
    return !!(event && event.tanggal_acara && event.start_acara && event.alamat);
  }
}

import { Component, OnInit, Input } from '@angular/core';
import { GalleryItem } from '../../../services/wedding-data.service';

@Component({
  selector: 'wc-gallery-view',
  templateUrl: './gallery-view.component.html',
  styleUrls: ['./gallery-view.component.scss']
})
export class GalleryViewComponent implements OnInit {
  @Input() galleryItems: GalleryItem[] | undefined = [];

  constructor() { }

  ngOnInit(): void {
    console.log('GalleryViewComponent initialized with gallery:', this.galleryItems);
  }

  getGalleryImages(): GalleryItem[] {
    return this.galleryItems || [];
  }

  hasImages(): boolean {
    return !!(this.galleryItems && this.galleryItems.length > 0);
  }

  getImageUrl(item: GalleryItem): string {
    return item.photo || 'assets/default-gallery.jpg';
  }

  getImageAlt(item: GalleryItem, index: number): string {
    return item.nama_foto || `Gallery image ${index + 1}`;
  }

  trackByGalleryId(index: number, item: GalleryItem): number {
    return item.id;
  }
}

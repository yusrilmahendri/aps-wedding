import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// TypeScript interfaces for wedding data structure based on API response
export interface UserInfo {
  id: number;
  name: string | null;
  email: string;
  phone: string;
  kode_pemesanan: string;
}

export interface MempelaiPerson {
  photo: string;
  nama_lengkap: string;
  nama_panggilan: string;
  ayah: string;
  ibu: string;
}

export interface MempelaiData {
  id: number;
  cover_photo: string;
  urutan_mempelai: string | null;
  pria: MempelaiPerson;
  wanita: MempelaiPerson;
  status: string;
  kd_status: string;
}

export interface WeddingEvent {
  id: number;
  nama_acara: string;
  tanggal_acara: string;
  start_acara: string;
  end_acara: string;
  alamat: string;
  link_maps: string;
  countdown: string | null;
}

export interface WeddingStory {
  id: number;
  title: string;
  lead_cerita: string;
  tanggal_cerita: string;
  created_at: string;
}

export interface WeddingQuote {
  id: number;
  name: string;
  qoute: string;
  created_at: string;
}

export interface GalleryItem {
  id: number;
  photo: string;
  photo_url: string;
  url_video: string;
  nama_foto: string;
  status: number;
  created_at: string;
}

export interface BankAccount {
  id: number;
  kode_bank: string;
  nomor_rekening: string;
  nama_bank: string;
  nama_pemilik: string;
  methode_pembayaran: string;
  photo_rek: string | null;
  bank?: {
    id: number;
    name: string;
    kode_bank: string;
  } | null;
}

export interface WeddingSettings {
  id: number;
  domain: string;
  musik: string;
  salam_pembuka: string;
  salam_atas: string;
  salam_bawah: string;
  music_stream_url?: string;
  music_info?: {
    has_music: boolean;
    supports_streaming: boolean;
    supports_range_requests: boolean;
    format_support: string[];
  };
}

export interface FilterUndangan {
  id: number;
  halaman_sampul: number;
  halaman_mempelai: number;
  halaman_acara: number;
  halaman_ucapan: number;
  halaman_galery: number;
  halaman_cerita: number;
  halaman_lokasi: number;
  halaman_prokes: number;
  halaman_send_gift: number;
  halaman_qoute: number;
}

export interface GuestWish {
  id: number;
  nama: string;
  kehadiran: string;
  pesan: string;
  created_at: string;
}

export interface InvitationPackage {
  id: number;
  status: string;
  paket_undangan: {
    id: number;
    jenis_paket: string;
    name_paket: string;
    price: string;
    masa_aktif: number;
    features: {
      halaman_buku: number;
      kirim_wa: number;
      bebas_pilih_tema: number;
      kirim_hadiah: number;
      import_data: number;
    };
  };
}

export interface WeddingMetadata {
  profile_created_at: string;
  profile_updated_at: string;
  total_events: number;
  total_stories: number;
  total_quotes: number;
  total_gallery_items: number;
  total_guest_wishes: number;
  is_public_view: boolean;
}

export interface WeddingData {
  user_info: UserInfo;
  mempelai: MempelaiData;
  invitation_package: InvitationPackage;
  events: WeddingEvent[];
  stories: WeddingStory[];
  quotes: WeddingQuote[];
  gallery: GalleryItem[];
  bank_accounts: BankAccount[];
  settings: WeddingSettings;
  filter_undangan: FilterUndangan;
  guest_wishes: GuestWish[];
  guest_book: any[];
  testimonials: any[];
  themes: any[];
  metadata: WeddingMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class WeddingDataService {

  private weddingDataSubject = new BehaviorSubject<WeddingData | null>(null);
  private guestTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() { }

  /**
   * Set wedding data to be shared across components
   * @param weddingData - Complete wedding data from API
   */
  setWeddingData(weddingData: WeddingData): void {
    try {
      this.weddingDataSubject.next(weddingData);
      // console.log('Wedding data set in service successfully');
    } catch (error) {
      console.error('Error setting wedding data:', error);
    }
  }

  /**
   * Get current wedding data as observable
   * @returns Observable of wedding data
   */
  getWeddingData(): Observable<WeddingData | null> {
    return this.weddingDataSubject.asObservable();
  }

  /**
   * Get current wedding data synchronously
   * @returns Current wedding data or null
   */
  getCurrentWeddingData(): WeddingData | null {
    return this.weddingDataSubject.value;
  }

  /**
   * Generate couple name for URL from mempelai data
   * @param mempelai - Mempelai data containing pria and wanita info
   * @returns Formatted couple name for URL (e.g., "anton-keok")
   */
  generateCoupleName(mempelai: MempelaiData): string {
    try {
      if (!mempelai || !mempelai.pria || !mempelai.wanita) {
        console.warn('Invalid mempelai data structure:', mempelai);
        return 'wedding-invitation';
      }

      const groomName = mempelai.pria.nama_panggilan ||
                       mempelai.pria.nama_lengkap ||
                       'groom';
      const brideName = mempelai.wanita.nama_panggilan ||
                       mempelai.wanita.nama_lengkap ||
                       'bride';

      const sanitizedGroomName = this.sanitizeForUrl(groomName);
      const sanitizedBrideName = this.sanitizeForUrl(brideName);

      return `${sanitizedGroomName}-${sanitizedBrideName}`.toLowerCase();

    } catch (error) {
      console.error('Error generating couple name:', error);
      return 'wedding-invitation';
    }
  }

  /**
   * Generate wedding URL with couple name parameter (LEGACY METHOD)
   * @param weddingData - Complete wedding data
   * @returns Full wedding URL with couple name
   * @deprecated Use generateWeddingUrlWithDomain instead
   */
  generateWeddingUrl(weddingData: WeddingData): string {
    const coupleName = this.generateCoupleName(weddingData.mempelai);
    const baseUrl = window.location.origin;
    return `${baseUrl}/wedding/${coupleName}`;
  }

  /**
   * Generate wedding URL with domain parameter (NEW METHOD)
   * @param domain - Domain from settings
   * @returns Full wedding URL with domain
   */
  generateWeddingUrlWithDomain(domain: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/wedding/${domain}`;
  }

  /**
   * Generate wedding URL with domain from wedding data settings
   * @param weddingData - Complete wedding data containing settings with domain
   * @returns Full wedding URL with domain
   */
  generateWeddingUrlFromData(weddingData: WeddingData): string {
    const domain = weddingData.settings?.domain;
    if (domain) {
      return this.generateWeddingUrlWithDomain(domain);
    }

    // Fallback to old method if domain not available
    console.warn('Domain not found in wedding data, using fallback couple name method');
    return this.generateWeddingUrl(weddingData);
  }

  /**
   * Generate wedding URL with couple name and user_id for sharing (LEGACY METHOD)
   * @param weddingData - Complete wedding data
   * @param userId - User ID for API call
   * @returns Full wedding URL with couple name and user_id
   * @deprecated Use generateWeddingUrlWithDomainAndUserId instead
   */
  generateWeddingUrlWithUserId(weddingData: WeddingData, userId: number): string {
    const coupleName = this.generateCoupleName(weddingData.mempelai);
    const baseUrl = window.location.origin;
    return `${baseUrl}/wedding/${coupleName}?user_id=${userId}`;
  }

  /**
   * Generate wedding URL with domain and user_id for sharing (NEW METHOD)
   * @param domain - Domain from settings
   * @param userId - User ID for API call
   * @returns Full wedding URL with domain and user_id
   */
  generateWeddingUrlWithDomainAndUserId(domain: string, userId: number): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/wedding/${domain}?user_id=${userId}`;
  }

  /**
   * Extract domain from wedding data settings
   * @param weddingData - Wedding data
   * @returns Domain string or null if not found
   */
  extractDomain(weddingData: WeddingData): string | null {
    return weddingData?.settings?.domain || null;
  }

  /**
   * Clear wedding data
   */
  clearWeddingData(): void {
    this.weddingDataSubject.next(null);
    console.log('Wedding data cleared from service');
  }

  /**
   * Sanitize string for URL usage
   * @param input - String to sanitize
   * @returns URL-safe string
   */
  private sanitizeForUrl(input: string): string {
    if (!input || typeof input !== 'string') {
      return 'unknown';
    }

    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validate wedding data structure
   * @param data - Data to validate
   * @returns boolean - Whether data is valid
   */
  isValidWeddingData(data: any): data is WeddingData {
    return data &&
           data.user_info &&
           typeof data.user_info.id === 'number' &&
           data.mempelai &&
           data.mempelai.pria &&
           data.mempelai.wanita &&
           typeof data.mempelai.pria.nama_panggilan === 'string' &&
           typeof data.mempelai.wanita.nama_panggilan === 'string';
  }

  /**
   * Extract couple names from wedding data
   * @param weddingData - Wedding data
   * @returns Object with groom and bride names
   */
  extractCoupleNames(weddingData: WeddingData): { groom: string; bride: string } {
    const groom = weddingData.mempelai.pria.nama_panggilan ||
                  weddingData.mempelai.pria.nama_lengkap ||
                  'Groom';
    const bride = weddingData.mempelai.wanita.nama_panggilan ||
                  weddingData.mempelai.wanita.nama_lengkap ||
                  'Bride';

    return { groom, bride };
  }

  /**
   * Get formatted display name for couple
   * @param weddingData - Wedding data
   * @returns Formatted display name
   */
  getFormattedCoupleName(weddingData: WeddingData): string {
    const { groom, bride } = this.extractCoupleNames(weddingData);
    return `${groom} & ${bride}`;
  }

  /**
   * Check if wedding data has domain in settings
   * @param weddingData - Wedding data to check
   * @returns boolean - Whether domain is available
   */
  hasDomain(weddingData: WeddingData): boolean {
    return !!(weddingData?.settings?.domain);
  }

  /**
   * Get sharing URL for wedding invitation
   * Prefers domain-based URL, falls back to couple name
   * @param weddingData - Complete wedding data
   * @returns Shareable wedding URL
   */
  getShareableUrl(weddingData: WeddingData): string {
    const domain = this.extractDomain(weddingData);

    if (domain) {
      return this.generateWeddingUrlWithDomain(domain);
    }

    // Fallback to couple name approach
    console.warn('No domain found, using couple name fallback for sharing URL');
    return this.generateWeddingUrl(weddingData);
  }

  /**
   * Set guest token for QR code generation
   * @param token - Guest token from tracking API
   */
  setGuestToken(token: string): void {
    this.guestTokenSubject.next(token);
  }

  /**
   * Get current guest token
   * @returns Current guest token or null
   */
  getGuestToken(): string | null {
    return this.guestTokenSubject.value;
  }

  /**
   * Get guest token as observable
   * @returns Observable of guest token
   */
  getGuestToken$(): Observable<string | null> {
    return this.guestTokenSubject.asObservable();
  }

  /**
   * Clear guest token
   */
  clearGuestToken(): void {
    this.guestTokenSubject.next(null);
  }
}

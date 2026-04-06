import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { DashboardService, DashboardServiceType } from '../dashboard.service';
import { Notyf } from 'notyf';
import { UserProfileResponse } from '../interfaces/user-profile.interface';
import { environment } from '../../environments/environment';

@Component({
  selector: 'wc-guest-generator-components',
  templateUrl: './guest-generator-components.component.html',
  styleUrls: ['./guest-generator-components.component.scss']
})
export class GuestGeneratorComponentsComponent implements OnInit {
  form!: FormGroup;
  guests: any[] = [];

  // LocalStorage key for guest list
  private readonly STORAGE_KEY = 'wedding_guest_list';

  // Salam settings from API
  salamPembuka: string = '';
  salamAtas: string = '';
  salamBawah: string = '';
  private notyf = new Notyf();

  // User profile data
  userDomain: string = '';
  baseUrlUndangan: string = '';

  // Pagination & Search
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50, 100];

  // Modal state
  showMessageModal: boolean = false;
  currentMessage: string = '';
  currentMessageGuestName: string = '';

  // UI state for helper boxes
  showInstructions: boolean = false;
  showExample: boolean = false;

  // Expose Math to template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      baseUrl: [''],
      names: ['']
    });
    this.loadSalamSettings();
    this.loadUserProfile();
    this.loadGuestsFromLocalStorage();
  }

  // Load user profile to get domain
  loadUserProfile(): void {
    console.log('🔍 Loading user profile...');
    this.dashboardService.list(DashboardServiceType.PROFILE_API).subscribe({
      next: (res: UserProfileResponse) => {
        console.log('✅ Profile API Response:', res);
        if (res && res.success && res.data && res.data.domain_info) {
          this.userDomain = res.data.domain_info.domain;
          this.baseUrlUndangan = `${environment.baseUrlUndangan}/${this.userDomain}`;
          console.log('🌐 Domain found:', this.userDomain);
          console.log('🔗 Base URL Undangan:', this.baseUrlUndangan);
          // Auto-fill base URL
          this.form.patchValue({ baseUrl: this.baseUrlUndangan });
          console.log('✏️ Form patched with baseUrl:', this.baseUrlUndangan);
        } else {
          console.warn('⚠️ Invalid response structure:', res);
        }
      },
      error: (err: any) => {
        console.error('❌ Error loading user profile:', err);
        // Silent error, user can still input manually
      }
    });
  }

  // Save guests to localStorage
  saveGuestsToLocalStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.guests));
      console.log('💾 Guest list saved to localStorage:', this.guests.length, 'guests');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  // Load guests from localStorage
  loadGuestsFromLocalStorage(): void {
    try {
      const savedGuests = localStorage.getItem(this.STORAGE_KEY);
      if (savedGuests) {
        this.guests = JSON.parse(savedGuests);
        console.log('📂 Guest list loaded from localStorage:', this.guests.length, 'guests');
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      this.guests = [];
    }
  }

  // Load salam settings from API
  loadSalamSettings(): void {
    this.dashboardService.list(DashboardServiceType.SETTINGS_GET_FILTER).subscribe({
      next: (res: any) => {
        if (res && res.setting) {
          this.salamPembuka = res.setting.salam_pembuka || this.getDefaultSalamPembuka();
          this.salamAtas = res.setting.salam_atas || this.getDefaultSalamAtas();
          this.salamBawah = res.setting.salam_bawah || this.getDefaultSalamBawah();
        } else {
          this.salamPembuka = this.getDefaultSalamPembuka();
          this.salamAtas = this.getDefaultSalamAtas();
          this.salamBawah = this.getDefaultSalamBawah();
        }
        this.rebuildGuestMessages();
      },
      error: (err: any) => {
        console.error('Error loading salam settings:', err);
        this.notyf.error('Gagal memuat pengaturan salam, menggunakan default');
        this.salamPembuka = this.getDefaultSalamPembuka();
        this.salamAtas = this.getDefaultSalamAtas();
        this.salamBawah = this.getDefaultSalamBawah();
      }
    });
  }

  rebuildGuestMessages(): void {
    if (!this.guests.length) return;
    this.guests = this.guests.map(g => {
      const base = g.link?.includes('?guest=') ? g.link.split('?guest=')[0] : g.link;
      return {
        ...g,
        message: this.buildMessage(g.name, base),
        whatsappMessage: this.buildWhatsAppMessage(g.name, base)
      };
    });
    this.saveGuestsToLocalStorage();
  }

  // Default salam pembuka if API fails or empty
  getDefaultSalamPembuka(): string {
    return 'Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami.';
  }

  // Default salam atas if API fails or empty
  getDefaultSalamAtas(): string {
    return 'Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami.';
  }

  // Default salam bawah if API fails or empty
  getDefaultSalamBawah(): string {
    return 'Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.\n\nTerima Kasih';
  }

  // Toggle helper boxes
  toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  toggleExample(): void {
    this.showExample = !this.showExample;
  }

  // Filtered guests based on search
  get filteredGuests(): any[] {
    if (!this.searchTerm.trim()) {
      return this.guests;
    }

    const search = this.searchTerm.toLowerCase();
    return this.guests.filter(g =>
      g.name.toLowerCase().includes(search)
    );
  }

  // Paginated guests
  get paginatedGuests(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredGuests.slice(start, end);
  }

  // Total pages
  get totalPages(): number {
    return Math.ceil(this.filteredGuests.length / this.pageSize);
  }

  // Page numbers array for pagination
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
      } else if (this.currentPage >= this.totalPages - 2) {
        for (let i = this.totalPages - maxVisible + 1; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  }

  // Search handler
  onSearch(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1; // Reset to first page on search
  }

  // Page size change handler
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  // Pagination handlers
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Get actual index in full guests array
  getActualIndex(paginatedIndex: number): number {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.guests.findIndex(g => g === this.filteredGuests[start + paginatedIndex]);
  }

  generateGuests() {
    // 🔥 Base URL otomatis jika kosong
    const base: string =
      this.form.value.baseUrl?.trim() ||
      this.baseUrlUndangan ||
      'https://pio-wedding.pioneersolve.id';

    const rawNames: string = this.form.value.names?.trim();

    if (!rawNames) {
      Swal.fire('Oops', 'Nama tamu tidak boleh kosong', 'warning');
      return;
    }

    const lines: string[] = rawNames
      .split('\n')
      .map((v: string) => v.trim())
      .filter((v: string) => v !== '');

    lines.forEach((line: string) => {
      this.guests.push({
        name: line,
        link: `${base}?guest=${encodeURIComponent(line)}`,
        message: this.buildMessage(line, base),
        whatsappMessage: this.buildWhatsAppMessage(line, base)
      });
    });

    // Reset pagination
    this.currentPage = 1;
    this.searchTerm = '';

    // Clear input field to prevent duplication
    this.form.patchValue({ names: '' });

    // Save to localStorage
    this.saveGuestsToLocalStorage();

    Swal.fire('Berhasil', 'Daftar tamu berhasil ditambahkan!', 'success');
  }

  buildWhatsAppMessage(name: string, baseUrl: string): string {
    const link = `${baseUrl}?guest=${encodeURIComponent(name)}`;
    return `Kepada Yth.
Bapak/Ibu/Saudara/i ${name}
─────────

${this.salamPembuka}

${link}
─────────`;
  }

  buildMessage(name: string, baseUrl: string) {
    const link = `${baseUrl}?guest=${encodeURIComponent(name)}`;
    return `Kepada Yth.
Bapak/Ibu/Saudara/i ${name}
─────────

${this.salamAtas}

Berikut link undangan kami, untuk info lengkap dari acara, bisa kunjungi :

${link}

${this.salamBawah}
─────────`;
  }

  // Show message modal
  showMessagePreview(message: string, guestName: string): void {
    this.currentMessage = message;
    this.currentMessageGuestName = guestName;
    this.showMessageModal = true;
  }

  // Close message modal
  closeMessageModal(): void {
    this.showMessageModal = false;
    this.currentMessage = '';
    this.currentMessageGuestName = '';
  }

  // Copy from modal
  copyMessageFromModal(): void {
    navigator.clipboard.writeText(this.currentMessage).then(() => {
      this.closeMessageModal();
      Swal.fire('Berhasil', 'Pesan berhasil dicopy!', 'success');
    }).catch(() => {
      Swal.fire('Gagal', 'Tidak bisa menyalin pesan', 'error');
    });
  }

  copy(text: string, isMessage: boolean = true) {
    navigator.clipboard.writeText(text).then(() => {
      if (isMessage) {
        Swal.fire('Berhasil', 'Pesan berhasil dicopy!', 'success');
      } else {
        Swal.fire('Berhasil', 'Link berhasil dicopy!', 'success');
      }
    }).catch(() => {
      Swal.fire('Gagal', 'Tidak bisa menyalin', 'error');
    });
  }

  deleteGuest(index: number) {
    const actualIndex = this.getActualIndex(index);
    Swal.fire({
      title: 'Yakin?',
      text: `Apakah Anda yakin ingin menghapus tamu "${this.guests[actualIndex].name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        this.guests.splice(actualIndex, 1);

        // Adjust current page if needed
        if (this.paginatedGuests.length === 0 && this.currentPage > 1) {
          this.currentPage--;
        }

        // Save to localStorage
        this.saveGuestsToLocalStorage();

        Swal.fire('Terhapus!', 'Tamu berhasil dihapus.', 'success');
      }
    });
  }

  deleteAll() {
    Swal.fire({
      title: 'Yakin?',
      text: 'Apakah Anda yakin ingin menghapus semua daftar tamu?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus semua',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        this.guests = [];
        this.currentPage = 1;
        this.searchTerm = '';

        // Save to localStorage
        this.saveGuestsToLocalStorage();

        Swal.fire('Terhapus!', 'Semua daftar tamu berhasil dihapus.', 'success');
      }
    });
  }

  whatsapp(link: string, text: string) {
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n')}`;
    window.open(url, '_blank');
  }
}

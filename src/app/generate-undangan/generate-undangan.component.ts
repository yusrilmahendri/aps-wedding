import { Component, OnInit, OnDestroy } from '@angular/core';
import { SeoService } from '../services/seo.service';
import { Subject } from 'rxjs';

export interface InvitationFormData {
  registrasi: Record<string, any>;
  informasiMempelai: Record<string, any>;
  cerita: Record<string, any>;
  pembayaran: Record<string, any>;
  step: number;
}

@Component({
  selector: 'wc-generate-undangan',
  templateUrl: './generate-undangan.component.html',
  styleUrls: ['./generate-undangan.component.scss'],
})
export class GenerateUndanganComponent implements OnInit, OnDestroy {

  titles: string[] = ['Isi Data Akun', 'Informasi Mempelai', 'Konfirmasi Data', 'Pembayaran'];

  formData: InvitationFormData = {
    registrasi: {},
    informasiMempelai: {},
    cerita: {},
    pembayaran: {},
    step: 1,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.setSeoTags();
    this.restoreState();
    console.log('all formdata:', this.formData);
  }

  /**
   * Restore step and form data from localStorage
   * This ensures users stay on the same step after page refresh
   */
  private restoreState(): void {
    const savedData = localStorage.getItem('formData');
    if (!savedData) {
      console.log('[restoreState] No formData in localStorage');
      return;
    }

    try {
      const parsed = JSON.parse(savedData);
      console.log('[restoreState] Restoring state from localStorage:', parsed);

      // Restore step (default to 1 if not found or invalid)
      const savedStep = parsed?.step;
      if (savedStep && savedStep >= 1 && savedStep <= 4) {
        this.formData.step = savedStep;
        console.log('[restoreState] Restored step:', savedStep);
      }

      // Restore form data for each step
      if (parsed.registrasi) {
        this.formData.registrasi = parsed.registrasi;
        console.log('[restoreState] Restored registrasi data, has response:', !!parsed.registrasi?.response);
        if (parsed.registrasi?.response) {
          console.log('[restoreState] response.user_id:', parsed.registrasi.response.user_id);
          console.log('[restoreState] response.user?.id:', parsed.registrasi.response.user?.id);
        }
      }
      if (parsed.informasiMempelai) {
        this.formData.informasiMempelai = parsed.informasiMempelai;
      }
      if (parsed.cerita) {
        this.formData.cerita = parsed.cerita;
      }
      if (parsed.pembayaran) {
        this.formData.pembayaran = parsed.pembayaran;
      }
    } catch (error) {
      console.error('[restoreState] Error restoring state from localStorage:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setSeoTags(): void {
    // Set SEO meta tags for generate invitation page
    this.seoService.setMetaTags({
      title: 'Buat Undangan Digital Pernikahan Gratis - Sena Digital',
      description: 'Buat undangan digital pernikahan Anda sendiri dengan mudah dan gratis. Pilih template, customize desain, dan bagikan ke tamu undangan Anda.',
      keywords: 'buat undangan digital, create wedding invitation, undangan gratis, buat undangan pernikahan, undangan online gratis',
      url: 'https://sena-digital.com/buat-undangan',
      image: 'https://sena-digital.com/assets/images/sena-digital-og-image.jpg',
      type: 'website'
    });

    // Add Service structured data
    this.seoService.addStructuredData(this.seoService.getServiceSchema());
  }

  get title(): string {
    return this.titles[this.formData.step - 1] || 'Form';
  }

  get progress(): number {
    return (this.formData.step / this.titles.length) * 100;
  }

  nextStep(data: any): void {
    const step = this.formData.step;

    if (step === 1) {
      this.formData.registrasi = data;
    } else if (step === 2) {
      this.formData.informasiMempelai = data;
    } else if (step === 3) {
      this.formData.cerita = data;
    }

    // Increment step
    this.formData.step = step + 1;

    // Save to localStorage for persistence
    localStorage.setItem('formData', JSON.stringify(this.formData));
  }

  prevStep(): void {
    if (this.formData.step > 1) {
      this.formData.step--;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';

interface PaketUndangan {
  id: number;
  jenis_paket: string;
  name_paket: string;
  price: string;
  masa_aktif: number;
  halaman_buku: number | string;
  kirim_wa: number | string;
  bebas_pilih_tema: number | string;
  kirim_hadiah: number | string;
  import_data: number | string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'wc-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements OnInit {

  paketList: PaketUndangan[] = [];

  constructor(
    private dashboardSvc: DashboardService
  ) { }

  ngOnInit(): void {
    this.getPaketUndangan();
  }

  getPaketUndangan() {
    this.dashboardSvc.list(DashboardServiceType.MNL_MD_PACK_INVITATION,).subscribe(res => {
      const allPackages: PaketUndangan[] = res?.data ?? [];
      this.paketList = allPackages.filter((paket: PaketUndangan) => paket.id !== 1);
      console.log(this.paketList);
    });
  }

  getCardColor(id: number): string {
    switch (id) {
      case 1: return '#B5B2B2';
      case 2: return '#C47D13';
      case 3: return '#57B9EE';
      default: return '#ccc';
    }
  }

  /**
   * Check if a feature is enabled (handles both string and number values)
   * @param featureValue - The feature value from API (can be 0/1 as string or number)
   * @returns boolean indicating if feature is enabled
   */
  isFeatureEnabled(featureValue: number | string): boolean {
    return featureValue === 1 || featureValue === '1';
  }

  onRedirectToRegister(): void {
    window.location.href = '/buat-undangan';
  }


}

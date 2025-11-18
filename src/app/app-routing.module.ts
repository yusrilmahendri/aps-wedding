import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { DashboardUserComponent } from './dashboard/dashboard-user/dashboard-user.component';
import { OverviewComponent } from './dashboard/overview/overview.component';
import { HubungiKamiComponent } from './dashboard/hubungi-kami/hubungi-kami.component';
import { PengunjungComponent } from './dashboard/pengunjung/pengunjung.component';
import { TestimoniComponent } from './dashboard/testimoni/testimoni.component';
import { WebsiteComponent } from './dashboard-admin/website/website.component';
import { WebsiteUserComponent } from './dashboard/website/website.component';
import { TampilanComponent } from './dashboard/website/tampilan/tampilan.component';
import { PengaturanComponent } from './dashboard/website/pengaturan/pengaturan.component';
import { DataWebsiteComponent } from './dashboard/website/data-website/data-website.component';
import { MempelaiComponent } from './dashboard/website/mempelai/mempelai.component';
import { AcaraComponent } from './dashboard/website/acara/acara.component';
import { GalleryComponent } from './dashboard/website/gallery/gallery.component';
import { CeritaQuoteComponent } from './dashboard/website/cerita-quote/cerita-quote.component';
import { RekeningComponent } from './dashboard/website/rekening/rekening.component';
import { RiwayatComponent } from './dashboard/pengunjung/riwayat/riwayat.component';
import { UcapanComponent } from './dashboard/pengunjung/ucapan/ucapan.component';
import { GenerateUndanganComponent } from './generate-undangan/generate-undangan.component';
import { RegisterComponent } from './register/register.component';
import { AuthGuard } from './auth.guard';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { DashboardComponent } from './dashboard-admin/dashboard/dashboard.component';
import { PenggunaComponent } from './dashboard-admin/pengguna/pengguna.component';
import { PembayaranComponent } from './dashboard-admin/pembayaran/pembayaran.component';
import { GatewayComponent } from './dashboard-admin/gateway/gateway.component';
import { VideoComponent } from './dashboard-admin/video/video.component';
import { TestimoniesComponent } from './dashboard-admin/testimonies/testimonies.component';
import { SettingsAplicationComponent } from './dashboard-admin/pengaturan/settings-aplication/settings-aplication.component';
import { SettingsBundleComponent } from './dashboard-admin/pengaturan/settings-bundle/settings-bundle.component';
import { SettingsPaymentComponent } from './dashboard-admin/pengaturan/settings-payment/settings-payment.component';
import { WeddingViewComponent } from './dashboard/wedding-view/wedding-view.component';
import { ProfileComponent } from './dashboard/profile/profile.component';
import { BillUserComponent } from './dashboard/bill-user/bill-user.component';
import { ProfileAdminComponent } from './dashboard-admin/pengaturan/profile-admin/profile-admin.component';
import { GuestGeneratorComponentsComponent } from './guest-generator-components/guest-generator-components.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'wedding/:coupleName', component: WeddingViewComponent },
  { path: 'wedding', component: WeddingViewComponent }, // Fallback route without parameter
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'buat-undangan', component: GenerateUndanganComponent },
  { path: 'bagikan-undangan', component: GuestGeneratorComponentsComponent },
  {
    path: 'dashboard',
    component: DashboardUserComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'profile', component: ProfileComponent },
      { path: 'bill', component: BillUserComponent },
      { path: 'overview', component: OverviewComponent },
      { path: 'bagikan-undangan', component: GuestGeneratorComponentsComponent },
      {
        path: 'website',
        component: WebsiteUserComponent,
        children: [
          { path: 'tampilan', component: TampilanComponent },
          { path: 'pengaturan', component: PengaturanComponent },
          { path: 'data-website', component: DataWebsiteComponent },
          { path: 'mempelai', component: MempelaiComponent },
          { path: 'acara', component: AcaraComponent },
          { path: 'gallery', component: GalleryComponent },
          { path: 'cerita-quote', component: CeritaQuoteComponent },
          { path: 'rekening', component: RekeningComponent },
        ],
      },
      {
        path: 'pengunjung',
        component: PengunjungComponent,
        children: [
          { path: 'riwayat', component: RiwayatComponent },
          { path: 'ucapan', component: UcapanComponent },
        ],
      },      { path: 'testimoni', component: TestimoniComponent },
      { path: 'hubungi-kami', component: HubungiKamiComponent },
    ],
  },
  {
    path: 'admin',
    component: DashboardAdminComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'pengguna', component: PenggunaComponent },
      { path: 'profile', component: ProfileAdminComponent },
      { path: 'pembayaran', component: PembayaranComponent },
      { path: 'gateway', component: GatewayComponent },
      { path: 'testimoni', component: TestimoniesComponent },
      { path: 'website', component: WebsiteComponent },
      { path: 'video', component: VideoComponent },
      {
        path: 'pengaturan',
        children: [
          { path: 'aplikasi', component: SettingsAplicationComponent },
          { path: 'paket', component: SettingsBundleComponent },
          { path: 'pembayaran', component: SettingsPaymentComponent },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

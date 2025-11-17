import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker'; // Import BsDatepickerModule
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroSectionComponent } from './home/hero-section/hero-section.component';
import { FeaturesComponent } from './home/features/features.component';
import { CommunityComponent } from './home/community/community.component';
import { TestimonialsComponent } from './home/testimonials/testimonials.component';
import { DevelopersComponent } from './home/developers/developers.component';
import { FooterComponent } from './home/footer/footer.component';
import { FooterHeroComponent } from './home/footer-hero/footer-hero.component';
import { FeatureFooterComponent } from './home/features/feature-footer/feature-footer.component';
import { FeatureFooterSectionComponent } from './home/features/feature-footer/feature-footer-section/feature-footer-section.component';
import { TestemoniFooterComponent } from './home/testimonials/testemoni-footer/testemoni-footer.component';
import { TestemonialFooterComponent } from './home/testimonials/testemonial-footer/testemonial-footer.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { DashboardUserComponent } from './dashboard/dashboard-user/dashboard-user.component';
import { ProfileComponent } from './dashboard/profile/profile.component';
import { OverviewComponent } from './dashboard/overview/overview.component';
import { SettingsComponent } from './dashboard/settings/settings.component';
import { WebsiteComponent } from './dashboard-admin/website/website.component';
import { WebsiteUserComponent } from './dashboard/website/website.component';
import { PengunjungComponent } from './dashboard/pengunjung/pengunjung.component';
import { TestimoniComponent } from './dashboard/testimoni/testimoni.component';
import { HubungiKamiComponent } from './dashboard/hubungi-kami/hubungi-kami.component';
import { TampilanComponent } from './dashboard/website/tampilan/tampilan.component';
import { PengaturanComponent } from './dashboard/website/pengaturan/pengaturan.component';
import { DataWebsiteComponent } from './dashboard/website/data-website/data-website.component';
import { MempelaiComponent } from './dashboard/website/mempelai/mempelai.component';
import { AcaraComponent } from './dashboard/website/acara/acara.component';
import { GalleryComponent } from './dashboard/website/gallery/gallery.component';
import { CeritaQuoteComponent } from './dashboard/website/cerita-quote/cerita-quote.component';
import { RekeningComponent } from './dashboard/website/rekening/rekening.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RiwayatComponent } from './dashboard/pengunjung/riwayat/riwayat.component';
import { UcapanComponent } from './dashboard/pengunjung/ucapan/ucapan.component';
import { GenerateUndanganComponent } from './generate-undangan/generate-undangan.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { RegisterComponent } from './register/register.component';
import { ToastComponent } from './shared/toast/toast.component';
import { ToastService } from './toast.service';
import { TableComponent } from './shared/table/table.component';
import { ModalComponent } from './shared/modal/modal.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxSelectModule } from 'ngx-select-ex';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { DashboardComponent } from './dashboard-admin/dashboard/dashboard.component';
import { PenggunaComponent } from './dashboard-admin/pengguna/pengguna.component';
import { PembayaranComponent } from './dashboard-admin/pembayaran/pembayaran.component';
import { GatewayComponent } from './dashboard-admin/gateway/gateway.component';
import { TestimoniesComponent } from './dashboard-admin/testimonies/testimonies.component';
import { VideoComponent } from './dashboard-admin/video/video.component';
import { SettingsAplicationComponent } from './dashboard-admin/pengaturan/settings-aplication/settings-aplication.component';
import { SettingsBundleComponent } from './dashboard-admin/pengaturan/settings-bundle/settings-bundle.component';
import { SettingsPaymentComponent } from './dashboard-admin/pengaturan/settings-payment/settings-payment.component';
import { DataRegistrasiComponent } from './generate-undangan/data-registrasi/data-registrasi.component';
import { InformasiMempelaiComponent } from './generate-undangan/informasi-mempelai/informasi-mempelai.component';
import { RegisCeritaComponent } from './generate-undangan/regis-cerita/regis-cerita.component';
import { RegisPembayaranComponent } from './generate-undangan/regis-pembayaran/regis-pembayaran.component';
import { ModalUploadGaleriComponent } from './generate-undangan/modal-upload-galeri/modal-upload-galeri.component';
import { QueryService } from './dashboard.service';
import { InvitationSectionComponent } from './home/features/feature-footer/invitation-section/invitation-section.component';
import { PaymentConfirmComponent } from './shared/payment-confirm/payment-confirm.component';
import { SuccessConfirmPaymentComponent } from './shared/success-confirm-payment/success-confirm-payment.component';
import { ModalAddCategoryAdminComponent } from './shared/modal/modal-add-category-admin/modal-add-category-admin.component';
import { ModalEditCategoryAdminComponent } from './shared/modal/modal-edit-category-admin/modal-edit-category-admin.component';
import { ModalDeleteCategoryAdminComponent } from './shared/modal/modal-delete-category-admin/modal-delete-category-admin.component';
import { ModalDeleteAllCategoryComponent } from './shared/modal/modal-delete-all-category/modal-delete-all-category.component';
import { ModalAddVideoCategoryComponent } from './shared/modal/modal-add-video-category/modal-add-video-category.component';
import { ModalAddWebsiteCategoryComponent } from './shared/modal/modal-add-website-category/modal-add-website-category.component';
import { QRCodeModalComponent } from './shared/modal/qr-code-modal/qr-code-modal.component';
import { WeddingViewComponent } from './dashboard/wedding-view/wedding-view.component';
import { CoupleViewComponent } from './dashboard/wedding-view/couple-view/couple-view.component';
import { MessageViewComponent } from './dashboard/wedding-view/message-view/message-view.component';
import { AkadViewComponent } from './dashboard/wedding-view/akad-view/akad-view.component';
import { ResepsiViewComponent } from './dashboard/wedding-view/resepsi-view/resepsi-view.component';
import { StoryViewComponent } from './dashboard/wedding-view/story-view/story-view.component';
import { GalleryViewComponent } from './dashboard/wedding-view/gallery-view/gallery-view.component';
import { PresenceViewComponent } from './dashboard/wedding-view/presence-view/presence-view.component';
import { GiftViewComponent } from './dashboard/wedding-view/gift-view/gift-view.component';
import { BillUserComponent } from './dashboard/bill-user/bill-user.component';
import { ProfileAdminComponent } from './dashboard-admin/pengaturan/profile-admin/profile-admin.component';
import { GuestGeneratorComponentsComponent } from './guest-generator-components/guest-generator-components.component';
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavbarComponent,
    HeroSectionComponent,
    FeaturesComponent,
    CommunityComponent,
    TestimonialsComponent,
    DevelopersComponent,
    FooterComponent,
    FooterHeroComponent,
    FeatureFooterComponent,
    FeatureFooterSectionComponent,
    TestemoniFooterComponent,
    TestemonialFooterComponent,
    LoginPageComponent,
    DashboardUserComponent,
    ProfileComponent,
    OverviewComponent,
    SettingsComponent,
    WebsiteComponent,
    PengunjungComponent,
    TestimoniComponent,
    HubungiKamiComponent,
    TampilanComponent,
    PengaturanComponent,
    DataWebsiteComponent,
    MempelaiComponent,
    AcaraComponent,
    GalleryComponent,
    CeritaQuoteComponent,
    RekeningComponent,
    RiwayatComponent,
    UcapanComponent,
    GenerateUndanganComponent,
    WebsiteUserComponent,
    RegisterComponent,
    ToastComponent,
    TableComponent,
    ModalComponent,
    DashboardAdminComponent,
    DashboardComponent,
    PenggunaComponent,
    PembayaranComponent,
    GatewayComponent,
    TestimoniesComponent,
    VideoComponent,
    SettingsAplicationComponent,
    SettingsBundleComponent,
    SettingsPaymentComponent,
    DataRegistrasiComponent,
    InformasiMempelaiComponent,
    RegisCeritaComponent,
    RegisPembayaranComponent,
    ModalUploadGaleriComponent,
    InvitationSectionComponent,
    PaymentConfirmComponent,
    SuccessConfirmPaymentComponent,
    ModalAddCategoryAdminComponent,
    ModalEditCategoryAdminComponent,
    ModalDeleteCategoryAdminComponent,
    ModalDeleteAllCategoryComponent,
    ModalAddVideoCategoryComponent,
    ModalAddWebsiteCategoryComponent,
    QRCodeModalComponent,
    WeddingViewComponent,
    CoupleViewComponent,
    MessageViewComponent,
    AkadViewComponent,
    ResepsiViewComponent,
    StoryViewComponent,
    GalleryViewComponent,
    PresenceViewComponent,
    GiftViewComponent,
    BillUserComponent,
    ProfileAdminComponent,
    GuestGeneratorComponentsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    NgxSelectModule,
    BsDatepickerModule.forRoot(), // Use forRoot() on BsDatepickerModule
    ModalModule.forRoot(),
  ],
  providers: [
    Title,
    { provide: LOCALE_ID, useValue: 'id' },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

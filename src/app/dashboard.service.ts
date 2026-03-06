import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';


// === DashboardServiceType Enum - API Endpoint Categories ===
// This enum defines all API endpoint types used in the application.
// Grouped by functionality for easier navigation and maintenance.

export enum DashboardServiceType {
  // === Authentication Endpoints ===
  // Handles user login, logout, registration, and profile retrieval.
  USER_LOGIN,
  USER_LOGOUT,
  USER_REGISTER,
  USER_PROFILE,

  // === Manual Registration Endpoints ===
  // Manages multi-step registration process for users.
  MNL_STEP_ONE,
  MNL_STEP_THREE,
  MNL_STEP_FOUR,
  MNL_STEP_TWO,
  MNL_MD_METHOD,
  MNL_MD_METHOD_DETAIL,
  MNL_MD_PACK_INVITATION,

  // === Testimonial (Testimoni) Endpoints ===
  // Manages user testimonials, public display, and admin moderation.
  USER_TESTIMONI,
  PUBLIC_TESTIMONI,
  TESTIMONI_ADMIN_LIST,
  TESTIMONI_ADMIN_UPDATE_STATUS,
  TESTIMONI_ADMIN_DELETE_ALL,
  TESTIMONI_ADMIN_DELETE_BY_ID,

  // === Ucapan (Wedding Wishes) Endpoints ===
  // Handles guest book messages and wishes.
  USER_BUKUTAMU,
  USER_BUKUTAMU_V2,
  USER_BUKUTAMU_V3,

  // === Riwayat (Visitor History) Endpoints ===
  // Manages visitor tracking and history deletion.
  USER_PENGUNJUNG_RIWAYAT,
  DELETE_PENGUNJUNG_RIWAYAT_ALL,
  DELETE_PENGUNJUNG_RIWAYAT_SINGLE,

  // === Rekening (Bank Account) Endpoints ===
  // Handles bank account management for payments.
  SEND_REKENING,
  MD_LIST_BANK,
  REKENING_DATA,
  UPDATE_REKENING,
  REKENINGS_INDEX,
  REKENINGS_STORE,
  REKENINGS_UPDATE_JSON,
  REKENINGS_DELETE_JSON,

  // === Cerita (Story) Endpoints ===
  // Manages wedding stories and quotes.
  CERITA_SUBMIT,
  QUOTE_SUBMIT,
  GALERY_SUBMIT,
  GALERY_DATA,
  SETTINGS_SUBMIT,
  MEMPELAI_SUBMIT,
  MEMPELAI_DATA,
  MEMPELAI_SUBMIT_COVER,
  MEMPELAI_UPDATE,

  // === Acara (Event) Endpoints ===
  // Handles wedding event details and countdowns.
  ACARA_DATA,
  ACARA_SUBMIT_COUNTDOWN,
  SETTINGS_GET_FILTER,
  ACARA_SUBMIT_DYNAMIC,
  ACARA_SUBMIT_UPDATE_COUNTDOWN,
  ACARA_SUBMIT_UPDATE_DYNAMIC,
  ACARA_SUBMIT_DELETE_DYNAMIC,

  // === Admin Management Endpoints ===
  // General admin operations, including bundles and categories.
  ST_BUNDLE_ADMIN,
  ADM_TESTI,
  ADM_TESTI_DELETE_ALL,
  ADM_IDX_DASHBOARD,
  ADM_MANUAL_PAYMENT,
  MD_RGS_PAYMENT,
  ADM_ADD_REKENING,
  ADM_TRIPAY_PAYMENT,
  ADM_MIDTRANS_PAYMENT,
  ADM_ADD_CATEGORY,
  ADM_EDIT_CATEGORY,
  ADM_DELETE_CATEGORY,
  ADM_DELETE_ALL_CATEGORY,
  ADM_GET_CATEGORY,
  RDM_CONFIRM_PAYMENT,

  // === User Settings Endpoints ===
  // Manages user preferences like domain, music, and filters.
  USER_SETTINGS_SUBMIT_DOMAIN,
  USER_SETTINGS_SUBMIT_MUSIC,
  USER_SETTINGS_SUBMIT_SALAM,
  USER_SETTINGS_SUBMIT_MUSIC_DOWNLOAD,
  USER_SETTINGS_SUBMIT_MUSIC_GET,
  USER_SETTINGS_SUBMIT_FILTER,
  USER_SETTINGS_SUBMIT_FILTER_UPDATE,
  USER_SETTINGS_SUBMIT_LIST_FILTER,
  USER_SETTINGS_DELETE_MUSIC,
  GALERY_DELETE,
  CERITA_DATA,
  CERITA_UPDATE,
  QUOTE_DATA,
  QUOTE_UPDATE,
  CERITA_DELETE,
  QUOTE_DELETE,
  DELETE_REKENING,

  // === Wedding View Endpoints ===
  // Public and couple-specific wedding profile views.
  WEDDING_VIEW_CORE,
  WEDDING_VIEW_COUPLE,
  ATTENDANCE,

  // === Dashboard Analytics Endpoints ===
  // Provides overview, trends, and message analytics.
  DASHBOARD_OVERVIEW,
  DASHBOARD_TRENDS,
  DASHBOARD_MESSAGES,

  // === Ucapan (Wedding Wishes) Management Endpoints ===
  // Additional endpoints for managing wishes.
  UCAPAN_INDEX,
  UCAPAN_DELETE,
  UCAPAN_STATISTICS,

  // === Profile Management Endpoints ===
  // User and admin profile operations.
  PROFILE_GET,
  PROFILE_UPDATE,
  PROFILE_PHOTO_UPLOAD,
  PROFILE_PHOTO_DELETE,
  PROFILE_CHANGE_PASSWORD,
  ADMIN_PROFILE_GET,
  ADMIN_PROFILE_UPDATE,
  ADMIN_PROFILE_PHOTO_UPLOAD,
  ADMIN_PROFILE_PHOTO_DELETE,
  ADMIN_PROFILE_CHANGE_PASSWORD,

  // === Theme Management Endpoints ===
  // Admin and public theme/category management.
  THEME_ADMIN_CATEGORIES_LIST,
  THEME_ADMIN_CATEGORIES_CREATE,
  THEME_ADMIN_CATEGORIES_UPDATE,
  THEME_ADMIN_CATEGORIES_TOGGLE_ACTIVATION,
  THEME_ADMIN_CATEGORIES_SORT_ORDER,
  THEME_ADMIN_CATEGORIES_STATISTICS,
  THEME_ADMIN_CATEGORIES_DELETE,
  THEME_ADMIN_THEMES_LIST,
  THEME_ADMIN_THEMES_CREATE,
  THEME_ADMIN_THEMES_UPDATE,
  THEME_ADMIN_THEMES_TOGGLE_ACTIVATION,
  THEME_ADMIN_THEMES_SORT_ORDER,
  THEME_ADMIN_THEMES_CATEGORIES_AVAILABLE,
  THEME_ADMIN_THEMES_DELETE,
  THEME_PUBLIC_CATEGORIES_WITH_THEMES,
  THEME_PUBLIC_THEMES_BY_CATEGORY,
  THEME_PUBLIC_THEME_DETAILS,
  THEME_PUBLIC_POPULAR_THEMES,
  THEME_USER_SELECT,
  THEME_USER_SELECTED,
  DELETE_REKENING_ADMIN,
  UPDATE_REKENING_ADMIN,

  // === Midtrans Payment Endpoints ===
  // Snap token creation, status polling, and admin CRUD for Midtrans config.
  MIDTRANS_CREATE_SNAP_TOKEN,
  MIDTRANS_CHECK_STATUS,
  ADM_GET_MIDTRANS_LIST,
  ADM_GET_MIDTRANS_DETAIL,

  // === Billing / Tagihan Endpoints ===
  USER_TAGIHAN,
}

// Testimonial Interfaces
// Interfaces for handling testimonial data, responses, and requests.
export interface TestimonialUser {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  kode_pemesanan: string | null;
  user_aktif: number;
  domain: string | null;
  status: string | null;
  kd_status: string | null;
  domain_create_date: string | null;
  domain_end_date: string | null;
  paket_undangan_id: number | null;
}

export interface TestimonialData {
  id: number;
  user: TestimonialUser;
  kota: string;
  provinsi: string;
  ulasan: string;
  status: number; // API mengembalikan 0/1, bukan boolean
  created_at: string;
  updated_at: string;
}

export interface TestimonialMeta {
  current_page: number;
  from: number;
  last_page: number;
  links: any[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface TestimonialResponse {
  data: TestimonialData[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: TestimonialMeta;
}

export interface TestimonialStatusUpdateRequest {
  status: boolean;
}

export interface TestimonialBulkStatusRequest {
  ids: number[];
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly BASE_URL_API = environment.apiBaseUrl;

  constructor(public httpSvc: HttpClient) { }

  public getUrl(serviceType: DashboardServiceType): string {
    switch (serviceType) {

      case DashboardServiceType.USER_LOGIN:
        return `${this.BASE_URL_API}/v1/login`;

      case DashboardServiceType.USER_LOGOUT:
        return `${this.BASE_URL_API}/v1/logout`;

      case DashboardServiceType.USER_REGISTER:
        return `${this.BASE_URL_API}/v1/register`;

      case DashboardServiceType.USER_PROFILE:
        return `${this.BASE_URL_API}/v1/user-profile`;

      //MANUAL REGIS
      case DashboardServiceType.MNL_STEP_ONE:
        return `${this.BASE_URL_API}/v1/one-step`;

      case DashboardServiceType.MNL_STEP_TWO:
        return `${this.BASE_URL_API}/v1/two-step`;

      case DashboardServiceType.MNL_STEP_THREE:
        return `${this.BASE_URL_API}/v1/three-step`;

      case DashboardServiceType.MNL_STEP_FOUR:
        return `${this.BASE_URL_API}/v1/for-step`;

      case DashboardServiceType.MNL_MD_METHOD:
        return `${this.BASE_URL_API}/v1/master-tagihan`;

      case DashboardServiceType.MNL_MD_METHOD_DETAIL:
        return `${this.BASE_URL_API}/v1/list-methode-transaction/all`;

      case DashboardServiceType.MNL_MD_PACK_INVITATION:
        return `${this.BASE_URL_API}/v1/paket-undangan`;

      //testimoni (Fixed spelling and added admin endpoints)
      case DashboardServiceType.USER_TESTIMONI:
        return `${this.BASE_URL_API}/v1/user/testimoni`;
      case DashboardServiceType.PUBLIC_TESTIMONI:
        return `${this.BASE_URL_API}/v1/testimoni/public`;
      case DashboardServiceType.TESTIMONI_ADMIN_LIST:
        return `${this.BASE_URL_API}/v1/admin/testimoni`;
      case DashboardServiceType.TESTIMONI_ADMIN_UPDATE_STATUS:
        return `${this.BASE_URL_API}/v1/admin/testimoni`;
      case DashboardServiceType.TESTIMONI_ADMIN_DELETE_ALL:
        return `${this.BASE_URL_API}/v1/admin/testimoni/delete-all`;
      case DashboardServiceType.TESTIMONI_ADMIN_DELETE_BY_ID:
        return `${this.BASE_URL_API}/v1/admin/testimoni`;

      //Ucapan
      case DashboardServiceType.USER_BUKUTAMU:
        return `${this.BASE_URL_API}/v1/user/result-bukutamu`;

      case DashboardServiceType.USER_BUKUTAMU_V2:
        return `${this.BASE_URL_API}/v1/user/buku-tamu`;

      case DashboardServiceType.USER_BUKUTAMU_V3:
        return `${this.BASE_URL_API}/v1/user/buku-tamu/delete-all`;

      //RIWAYAT PENGUNJUNG
      case DashboardServiceType.USER_PENGUNJUNG_RIWAYAT:
        return `${this.BASE_URL_API}/v1/user/result-pengunjung`;

      case DashboardServiceType.DELETE_PENGUNJUNG_RIWAYAT_ALL:
        return `${this.BASE_URL_API}/v1/user/pengunjung/delete-all`;

      case DashboardServiceType.DELETE_PENGUNJUNG_RIWAYAT_SINGLE:
        return `${this.BASE_URL_API}/v1/user/pengunjung`;

      //REKENING
      case DashboardServiceType.SEND_REKENING:
        return `${this.BASE_URL_API}/v1/user/send-rekening`;
      case DashboardServiceType.MD_LIST_BANK:
        return `${this.BASE_URL_API}/v1/all-bank`;
      case DashboardServiceType.REKENING_DATA:
        return `${this.BASE_URL_API}/v1/user/get-rekening`;
      case DashboardServiceType.UPDATE_REKENING:
        return `${this.BASE_URL_API}/v1/user/update-rekening`;
      case DashboardServiceType.UPDATE_REKENING_ADMIN:
        return `${this.BASE_URL_API}/v1/admin/update-rekening`;
      case DashboardServiceType.DELETE_REKENING:
        return `${this.BASE_URL_API}/v1/user/delete-rekening`;
      case DashboardServiceType.DELETE_REKENING_ADMIN:
        return `${this.BASE_URL_API}/v1/admin/delete-rekening`;

      // New JSON-based CRUD endpoints for /api/rekenings
      case DashboardServiceType.REKENINGS_INDEX:
        return `${this.BASE_URL_API}/v1/user/get-rekening`;
      case DashboardServiceType.REKENINGS_STORE:
        return `${this.BASE_URL_API}/v1/user/send-rekening`;
      case DashboardServiceType.REKENINGS_UPDATE_JSON:
        return `${this.BASE_URL_API}/v1/user/update-rekening`;
      case DashboardServiceType.REKENINGS_DELETE_JSON:
        return `${this.BASE_URL_API}/v1/user/delete-rekening`;

      //CERITA
      case DashboardServiceType.CERITA_SUBMIT:
        return `${this.BASE_URL_API}/v1/user/send-cerita`;
      case DashboardServiceType.CERITA_DATA:
        return `${this.BASE_URL_API}/v1/user/list-cerita`;
      case DashboardServiceType.CERITA_UPDATE:
        return `${this.BASE_URL_API}/v1/user/update-cerita`;
      case DashboardServiceType.CERITA_DELETE:
        return `${this.BASE_URL_API}/v1/user/delete-cerita`;


      // Quote
      case DashboardServiceType.QUOTE_SUBMIT:
        return `${this.BASE_URL_API}/v1/user/send-qoute`;
      case DashboardServiceType.QUOTE_DATA:
        return `${this.BASE_URL_API}/v1/user/list-qoute`;
      case DashboardServiceType.QUOTE_UPDATE:
        return `${this.BASE_URL_API}/v1/user/update-qoute`;
      case DashboardServiceType.QUOTE_DELETE:
        return `${this.BASE_URL_API}/v1/user/delete-qoute`;

      //GALERY
      case DashboardServiceType.GALERY_SUBMIT:
        return `${this.BASE_URL_API}/v1/user/submission-galery`;
      case DashboardServiceType.GALERY_DATA:
        return `${this.BASE_URL_API}/v1/user/list-galery`;
      case DashboardServiceType.GALERY_DELETE:
        return `${this.BASE_URL_API}/v1/user/delete-galery`;

      // Settings
      case DashboardServiceType.SETTINGS_SUBMIT:
        return `${this.BASE_URL_API}/v1/user/settings/`;
      case DashboardServiceType.SETTINGS_GET_FILTER:
        return `${this.BASE_URL_API}/v1/user/list-data-setting`;

      //MEMPELAI
      case DashboardServiceType.MEMPELAI_DATA:
        return `${this.BASE_URL_API}/v1/user/get-mempelai`;
      case DashboardServiceType.MEMPELAI_SUBMIT:
        return `${this.BASE_URL_API}/v1/user/submission-mempelai`;
      case DashboardServiceType.MEMPELAI_SUBMIT_COVER:
        return `${this.BASE_URL_API}/v1/user/submission-cover-mempelai`;
      case DashboardServiceType.MEMPELAI_UPDATE:
        return `${this.BASE_URL_API}/v1/user/update-mempelai`;

      //ACARA
      case DashboardServiceType.ACARA_DATA:
        return `${this.BASE_URL_API}/v1/user/acara`;
      case DashboardServiceType.ACARA_SUBMIT_COUNTDOWN:
        return `${this.BASE_URL_API}/v1/user/submission-countdown`;
      case DashboardServiceType.ACARA_SUBMIT_DYNAMIC:
        return `${this.BASE_URL_API}/v1/user/submission-acara`;
      case DashboardServiceType.ACARA_SUBMIT_UPDATE_COUNTDOWN:
        return `${this.BASE_URL_API}/v1/user/update-countdown/`;
      case DashboardServiceType.ACARA_SUBMIT_UPDATE_DYNAMIC:
        return `${this.BASE_URL_API}/v1/user/update-acara`;
      case DashboardServiceType.ACARA_SUBMIT_DELETE_DYNAMIC:
        return `${this.BASE_URL_API}/v1/user/delete-countdown`;

      //SETTINGS BUNDLE ADMIN
      case DashboardServiceType.ST_BUNDLE_ADMIN:
        return `${this.BASE_URL_API}/v1/admin/paket-undangan`;


      //TESTIMONI ADMIN
      case DashboardServiceType.ADM_TESTI:
        return `${this.BASE_URL_API}/v1/admin/testimoni`;
      case DashboardServiceType.ADM_TESTI_DELETE_ALL:
        return `${this.BASE_URL_API}/v1/admin/testimoni/delete-all`;

      //ADMIN GET USER DATA
      case DashboardServiceType.ADM_IDX_DASHBOARD:
        return `${this.BASE_URL_API}/v1/admin/get-users`;

      //master payment
      case DashboardServiceType.MD_RGS_PAYMENT:
        return `${this.BASE_URL_API}/v1/master-tagihan`;

      //PEMBAYARAN ADMIN

      case DashboardServiceType.ADM_TRIPAY_PAYMENT:
        return `${this.BASE_URL_API}/v1/admin/send-tripay`;
      case DashboardServiceType.ADM_MIDTRANS_PAYMENT:
        return `${this.BASE_URL_API}/v1/admin/send-midtrans`;
      case DashboardServiceType.ADM_ADD_REKENING:
        return `${this.BASE_URL_API}/v1/admin/send-rekening`;
      case DashboardServiceType.RDM_CONFIRM_PAYMENT:
        return `${this.BASE_URL_API}/v1/update/status-bayar`;

      // Kategori
      case DashboardServiceType.ADM_ADD_CATEGORY:
        return `${this.BASE_URL_API}/v1/admin/add-categorys`;
      case DashboardServiceType.ADM_EDIT_CATEGORY:
        return `${this.BASE_URL_API}/v1/admin/update-categorys`;
      case DashboardServiceType.ADM_DELETE_CATEGORY:
        return `${this.BASE_URL_API}/v1/admin/delete-categorys`;
      case DashboardServiceType.ADM_DELETE_ALL_CATEGORY:
        return `${this.BASE_URL_API}/v1/admin/delete-all-categorys`;
      case DashboardServiceType.ADM_GET_CATEGORY:
        return `${this.BASE_URL_API}/v1/admin/categorys`;


      // User Settings
      case DashboardServiceType.USER_SETTINGS_SUBMIT_DOMAIN:
        return `${this.BASE_URL_API}/v1/user/settings/domain`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC:
        return `${this.BASE_URL_API}/v1/user/settings/music`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_SALAM:
        return `${this.BASE_URL_API}/v1/user/settings/salam`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC_DOWNLOAD:
        return `${this.BASE_URL_API}/v1/user/music/download`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC_GET:
        return `${this.BASE_URL_API}/v1/user/music/stream`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_FILTER:
        return `${this.BASE_URL_API}/v1/user/submission-filter`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_FILTER_UPDATE:
        return `${this.BASE_URL_API}/v1/user/submission-filter-update`;
      case DashboardServiceType.USER_SETTINGS_SUBMIT_LIST_FILTER:
        return `${this.BASE_URL_API}/v1/user/list-data-setting`;
      case DashboardServiceType.USER_SETTINGS_DELETE_MUSIC:
        return `${this.BASE_URL_API}/v1/user/music/delete`;

      // wedding viewe
      case DashboardServiceType.WEDDING_VIEW_CORE:
        return `${this.BASE_URL_API}/v1/wedding-profile/public`;
      case DashboardServiceType.WEDDING_VIEW_COUPLE:
        return `${this.BASE_URL_API}/v1/wedding-profile/couple`;
      case DashboardServiceType.ATTENDANCE:
        return `${this.BASE_URL_API}/v1/attendance`;

      // Dashboard Analytics API endpoints
      case DashboardServiceType.DASHBOARD_OVERVIEW:
        return `${this.BASE_URL_API}/v1/dashboard/overview`;
      case DashboardServiceType.DASHBOARD_TRENDS:
        return `${this.BASE_URL_API}/v1/dashboard/trends`;
      case DashboardServiceType.DASHBOARD_MESSAGES:
        return `${this.BASE_URL_API}/v1/dashboard/messages`;

      // Ucapan (Wedding Wishes) API endpoints
      case DashboardServiceType.UCAPAN_INDEX:
        return `${this.BASE_URL_API}/v1/ucapan`;
      case DashboardServiceType.UCAPAN_DELETE:
        return `${this.BASE_URL_API}/v1/ucapan`;
      case DashboardServiceType.UCAPAN_STATISTICS:
        return `${this.BASE_URL_API}/v1/ucapan-statistics`;

      // Profile Management API endpoints
      case DashboardServiceType.PROFILE_GET:
        return `${this.BASE_URL_API}/profile`;
      case DashboardServiceType.PROFILE_UPDATE:
        return `${this.BASE_URL_API}/profile`;
      case DashboardServiceType.PROFILE_PHOTO_UPLOAD:
        return `${this.BASE_URL_API}/profile/photo`;
      case DashboardServiceType.PROFILE_PHOTO_DELETE:
        return `${this.BASE_URL_API}/profile/photo`;
      case DashboardServiceType.PROFILE_CHANGE_PASSWORD:
        return `${this.BASE_URL_API}/profile/change-password`;

      // Admin Profile Management API endpoints
      case DashboardServiceType.ADMIN_PROFILE_GET:
        return `${this.BASE_URL_API}/admin/profile`;
      case DashboardServiceType.ADMIN_PROFILE_UPDATE:
        return `${this.BASE_URL_API}/admin/profile`;
      case DashboardServiceType.ADMIN_PROFILE_PHOTO_UPLOAD:
        return `${this.BASE_URL_API}/admin/profile/photo`;
      case DashboardServiceType.ADMIN_PROFILE_PHOTO_DELETE:
        return `${this.BASE_URL_API}/admin/profile/photo`;
      case DashboardServiceType.ADMIN_PROFILE_CHANGE_PASSWORD:
        return `${this.BASE_URL_API}/admin/profile/change-password`;

      // Theme Management API - Admin Category Management (New API)
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_LIST:
        return `${this.BASE_URL_API}/admin/categories`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_CREATE:
        return `${this.BASE_URL_API}/admin/categories`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_UPDATE:
        return `${this.BASE_URL_API}/admin/categories`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_TOGGLE_ACTIVATION:
        return `${this.BASE_URL_API}/admin/categories`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_SORT_ORDER:
        return `${this.BASE_URL_API}/admin/categories/sort-order`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_STATISTICS:
        return `${this.BASE_URL_API}/admin/categories/statistics/overview`;
      case DashboardServiceType.THEME_ADMIN_CATEGORIES_DELETE:
        return `${this.BASE_URL_API}/admin/categories`;

      // Theme Management API - Admin Theme Management
      case DashboardServiceType.THEME_ADMIN_THEMES_LIST:
        return `${this.BASE_URL_API}/admin/themes`;
      case DashboardServiceType.THEME_ADMIN_THEMES_CREATE:
        return `${this.BASE_URL_API}/admin/themes`;
      case DashboardServiceType.THEME_ADMIN_THEMES_UPDATE:
        return `${this.BASE_URL_API}/admin/themes`;
      case DashboardServiceType.THEME_ADMIN_THEMES_TOGGLE_ACTIVATION:
        return `${this.BASE_URL_API}/admin/themes`;
      case DashboardServiceType.THEME_ADMIN_THEMES_SORT_ORDER:
        return `${this.BASE_URL_API}/admin/themes/sort-order`;
      case DashboardServiceType.THEME_ADMIN_THEMES_CATEGORIES_AVAILABLE:
        return `${this.BASE_URL_API}/admin/themes/categories/available`;
      case DashboardServiceType.THEME_ADMIN_THEMES_DELETE:
        return `${this.BASE_URL_API}/admin/themes`;

      // Theme Management API - Public Theme Browsing
      case DashboardServiceType.THEME_PUBLIC_CATEGORIES_WITH_THEMES:
        return `${this.BASE_URL_API}/themes/categories`;
      case DashboardServiceType.THEME_PUBLIC_THEMES_BY_CATEGORY:
        return `${this.BASE_URL_API}/themes/categories`;
      case DashboardServiceType.THEME_PUBLIC_THEME_DETAILS:
        return `${this.BASE_URL_API}/themes/theme`;
      case DashboardServiceType.THEME_PUBLIC_POPULAR_THEMES:
        return `${this.BASE_URL_API}/themes/popular`;

      // Theme Management API - User Theme Selection
      case DashboardServiceType.THEME_USER_SELECT:
        return `${this.BASE_URL_API}/themes/select`;
      case DashboardServiceType.THEME_USER_SELECTED:
        return `${this.BASE_URL_API}/themes/selected`;

      // Midtrans Payment API endpoints
      case DashboardServiceType.MIDTRANS_CREATE_SNAP_TOKEN:
        return `${this.BASE_URL_API}/v1/midtrans/create-snap-token`;
      case DashboardServiceType.MIDTRANS_CHECK_STATUS:
        return `${this.BASE_URL_API}/v1/midtrans/check-status`;
      case DashboardServiceType.ADM_GET_MIDTRANS_LIST:
        return `${this.BASE_URL_API}/v1/admin/midtrans`;
      case DashboardServiceType.ADM_GET_MIDTRANS_DETAIL:
        return `${this.BASE_URL_API}/v1/admin/midtrans`;
      case DashboardServiceType.USER_TAGIHAN:
        return `${this.BASE_URL_API}/v1/user/tagihan`;

      default:
        return '';

    }
  }

  // === Authentication Methods ===
  // Handles login and token management.
  login(email: string, password: string): Observable<LoginResponse> {
    const body = { email, password };
    return this.httpSvc.post<LoginResponse>(this.getUrl(DashboardServiceType.USER_LOGIN), body).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        if (response.role && response.role.length > 0) {
          localStorage.setItem('user_role', response.role[0]);
        }
      })
    );
  }

  // === Profile Management Methods ===
  // Methods for user and admin profile operations.
  getProfile(): Observable<ProfileResponse> {
    return this.httpSvc.get<ProfileResponse>(this.getUrl(DashboardServiceType.PROFILE_GET));
  }

  /**
   * Update profile data
   */
  updateProfile(data: ProfileUpdateRequest): Observable<ProfileUpdateResponse> {
    return this.httpSvc.put<ProfileUpdateResponse>(this.getUrl(DashboardServiceType.PROFILE_UPDATE), data);
  }

  /**
   * Upload profile photo
   */
  uploadProfilePhoto(file: File): Observable<ProfilePhotoUploadResponse> {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return this.httpSvc.post<ProfilePhotoUploadResponse>(this.getUrl(DashboardServiceType.PROFILE_PHOTO_UPLOAD), formData);
  }

  /**
   * Delete profile photo
   */
  deleteProfilePhoto(): Observable<ProfilePhotoDeleteResponse> {
    return this.httpSvc.delete<ProfilePhotoDeleteResponse>(this.getUrl(DashboardServiceType.PROFILE_PHOTO_DELETE));
  }

  /**
   * Change password
   */
  changePassword(data: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    return this.httpSvc.post<PasswordChangeResponse>(this.getUrl(DashboardServiceType.PROFILE_CHANGE_PASSWORD), data);
  }

  /**
   * Get admin profile data with authentication
   */
  getAdminProfile(): Observable<ProfileResponse> {
    return this.httpSvc.get<ProfileResponse>(this.getUrl(DashboardServiceType.ADMIN_PROFILE_GET));
  }

  /**
   * Get current logged-in user's billing/invoice history
   */
  getBillingHistory(): Observable<any> {
    return this.httpSvc.get<any>(this.getUrl(DashboardServiceType.USER_TAGIHAN));
  }

  /**
   * Update admin profile data
   */
  updateAdminProfile(data: ProfileUpdateRequest): Observable<ProfileUpdateResponse> {
    return this.httpSvc.put<ProfileUpdateResponse>(this.getUrl(DashboardServiceType.ADMIN_PROFILE_UPDATE), data);
  }

  /**
   * Upload admin profile photo
   */
  uploadAdminProfilePhoto(file: File): Observable<ProfilePhotoUploadResponse> {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return this.httpSvc.post<ProfilePhotoUploadResponse>(this.getUrl(DashboardServiceType.ADMIN_PROFILE_PHOTO_UPLOAD), formData);
  }

  /**
   * Delete admin profile photo
   */
  deleteAdminProfilePhoto(): Observable<ProfilePhotoDeleteResponse> {
    return this.httpSvc.delete<ProfilePhotoDeleteResponse>(this.getUrl(DashboardServiceType.ADMIN_PROFILE_PHOTO_DELETE));
  }

  /**
   * Change admin password
   */
  changeAdminPassword(data: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    return this.httpSvc.post<PasswordChangeResponse>(this.getUrl(DashboardServiceType.ADMIN_PROFILE_CHANGE_PASSWORD), data);
  }

  // === Generic HTTP Methods ===
  // Core HTTP methods for API calls.
  create(serviceType: DashboardServiceType, body: any): Observable<any> {
    return this.httpSvc.post(this.getUrl(serviceType), body);
  }

  createParam(serviceType: DashboardServiceType, body: any, param: string = ''): Observable<any> {
    return this.httpSvc.post(`${this.getUrl(serviceType)}${param}`, body);
  }

  delete(serviceType: DashboardServiceType, params?: any): Observable<any> {
    return this.httpSvc.delete(this.getUrl(serviceType), { params });
  }

  deleteV2(serviceType: DashboardServiceType, id?: number, params?: any): Observable<any> {
    const baseUrl = this.getUrl(serviceType); // Get the base URL
    const url = id !== undefined ? `${baseUrl}/${id}` : baseUrl; // Append the ID if provided
    return this.httpSvc.delete(url, { params });
  }



  detail(serviceType: DashboardServiceType, params: string = ''): Observable<any> {
    return this.httpSvc.get(`${this.getUrl(serviceType)}${params}`);
  }

  list(serviceType: DashboardServiceType, params?: any): Observable<any> {
    return this.httpSvc.get(this.getUrl(serviceType), { params });
  }

  update(serviceType: DashboardServiceType, param: string, body: any): Observable<any> {
    return this.httpSvc.put(`${this.getUrl(serviceType)}${param}`, body);
  }

  getParam(serviceType: DashboardServiceType, parameter: string, params?: any): Observable<any> {
    return this.httpSvc.get(`${this.getUrl(serviceType)}${parameter}`, { params });
  }

  pagedList(serviceType: DashboardServiceType, page: Page, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('page', page.pageNumber.toString());
    httpParams = httpParams.append('size', page.pageSize.toString());

    if (params) {
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          httpParams = httpParams.append(key, params[key]);
        }
      }
    }

    return this.httpSvc.get(this.getUrl(serviceType), { params: httpParams });
  }

  pagedListParam(serviceType: DashboardServiceType, page: Page, parameter: string, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('page', page.pageNumber.toString());
    httpParams = httpParams.append('size', page.pageSize.toString());

    if (params) {
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          httpParams = httpParams.append(key, params[key]);
        }
      }
    }

    return this.httpSvc.get(`${this.getUrl(serviceType)}${parameter}`, { params: httpParams });
  }

  /**
   * Upload file with FormData (for profile photo uploads)
   */
  uploadFile(serviceType: DashboardServiceType, formData: FormData): Observable<any> {
    // Don't set Content-Type header, let browser set it automatically for multipart/form-data
    return this.httpSvc.post(this.getUrl(serviceType), formData);
  }

  updateFile(serviceType: DashboardServiceType, formData: FormData): Observable<any> {
    // Don't set Content-Type header, let browser set it automatically for multipart/form-data
    return this.httpSvc.put(this.getUrl(serviceType), formData);
  }

  uploadFileWithId(serviceType: DashboardServiceType, id: number, formData: FormData): Observable<any> {
    // Append ID to URL for PUT requests with file upload
    const baseUrl = this.getUrl(serviceType);
    const url = `${baseUrl}/${id}`;
    // Don't set Content-Type header, let browser set it automatically for multipart/form-data
    return this.httpSvc.post(url, formData); // Use POST with _method=PUT for Laravel method spoofing
  }
}

export class QueryService {
  constructor() { }

  convert(params: any) {
    return '?' + new URLSearchParams(params).toString();
  }
}

export interface Page {
  pageNumber: number;
  pageSize: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string[];
}

// Dashboard Analytics API interfaces - Updated to match actual API response
export interface DashboardMetrics {
  total_pengunjung: {
    count: number;
    label: string;
    change_percentage: number;
    trending: string;
  };
  konfirmasi_kehadiran: {
    count: string | number;
    label: string;
    percentage: number;
    change_percentage: number;
    trending: string;
  };
  doa_ucapan: {
    count: number;
    label: string;
    change_percentage: number;
    trending: string;
  };
  total_hadiah: {
    count: number;
    label: string;
    note?: string;
    change_percentage: number;
    trending: string;
  };
}

export interface DashboardOverviewResponse {
  data: {
    user_id: number;
    wedding_owner: string | null;
    period: {
      from: string;
      to: string;
      days: number;
    };
    metrics: DashboardMetrics;
    breakdown: {
      kehadiran: {
        hadir: string;
        tidak_hadir: string;
        mungkin: string;
      };
      response_rate: {
        hadir_percentage: number;
        tidak_hadir_percentage: number;
        mungkin_percentage: number;
      };
    };
  };
}

export interface DashboardTrendPoint {
  period: string;
  date: string;
  total_visitors: number;
  confirmed_attendance: string | number;
  formatted_date: string;
}

export interface DashboardTrendsResponse {
  data: {
    user_id: number;
    period: {
      from: string;
      to: string;
      group_by: string;
    };
    trends: DashboardTrendPoint[];
    summary: {
      total_data_points: number;
      peak_visitors: number;
      average_daily_visitors: number;
    };
  };
}

export interface DashboardMessage {
  id: number;
  nama: string;
  kehadiran: string;
  kehadiran_label: string;
  pesan: string;
  pesan_preview: string;
  created_at: string;
  created_at_human: string;
}

export interface DashboardMessagesResponse {
  data: {
    user_id: number;
    wedding_owner: string | null;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
    messages: DashboardMessage[];
  };
}

// Ucapan (Wedding Wishes) API interfaces
export interface UcapanItem {
  id: number;
  nama: string;
  kehadiran: 'hadir' | 'tidak_hadir' | 'mungkin';
  kehadiran_label: string;
  pesan: string;
  created_at: string;
  updated_at: string;
}

export interface UcapanMeta {
  total: number;
  hadir_count: number;
  tidak_hadir_count: number;
  mungkin_count: number;
}

export interface UcapanResponse {
  data: UcapanItem[];
  meta: UcapanMeta;
}

export interface UcapanStatisticsResponse {
  data: {
    total_ucapan: number;
    hadir: number;
    tidak_hadir: number;
    mungkin: number;
  };
}

export interface UcapanDeleteResponse {
  message: string;
}

// Riwayat (Visitor History) API interfaces
export interface RiwayatItem {
  id: number;
  nama: string;
  tanggal: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface RiwayatMeta {
  total: number;
  today_count: number;
  this_week_count: number;
  this_month_count: number;
}

export interface RiwayatResponse {
  data: RiwayatItem[];
  meta: RiwayatMeta;
}

export interface RiwayatStatisticsResponse {
  data: {
    total_pengunjung: number;
    hari_ini: number;
    minggu_ini: number;
    bulan_ini: number;
  };
}

export interface RiwayatDeleteResponse {
  message: string;
}

// Testimoni (Testimonials) API interfaces
export interface TestimoniUser {
  id: number;
  name: string;
  email: string;
}

export interface TestimoniItem {
  id: number;
  user_id: number;
  kota: string;
  provinsi: string;
  ulasan: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  user?: TestimoniUser;
}

export interface TestimoniPaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface TestimoniResponse {
  data: TestimoniItem[];
  meta?: TestimoniPaginationMeta;
  links?: any;
}

export interface TestimoniCreateRequest {
  kota: string;
  provinsi: string;
  ulasan: string;
}

export interface TestimoniUpdateStatusRequest {
  status: boolean;
}

export interface TestimoniCreateResponse {
  message: string;
  data?: TestimoniItem;
}

export interface TestimoniDeleteResponse {
  message: string;
}

// Profile Management API interfaces
export interface ProfilePackageInfo {
  id: number;
  name: string;
  jenis_paket: string;
  price: number;
  currency: string;
  payment_status: string;
  is_active: boolean;
}

export interface ProfileDomainInfo {
  domain: string;
  is_active: boolean;
  expires_at: string;
  days_until_expiry: number;
  payment_confirmed_at: string;
}

export interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_photo_url: string | null;
  kode_pemesanan: string;
  package_info: ProfilePackageInfo;
  domain_info: ProfileDomainInfo;
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: ProfileData;
}

export interface ProfileUpdateRequest {
  name: string;
  email: string;
  phone: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  data: ProfileData;
}

export interface ProfilePhotoUploadResponse {
  success: boolean;
  message: string;
  data: {
    profile_photo_url: string;
    updated_at: string;
  };
}

export interface ProfilePhotoDeleteResponse {
  success: boolean;
  message: string;
  data: {
    profile_photo_url: null;
    updated_at: string;
  };
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
  data: {
    updated_at: string;
  };
}

export interface ValidationError {
  message: string;
  errors: {
    [key: string]: string[];
  };
}

// === Theme Management API Interfaces ===
// Interfaces for theme and category management.
export interface ThemeCategory {
  id: number;
  name: string;
  type: 'website' | 'video';
  description: string;
  is_active: boolean;
  sort_order: number;
  themes_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ThemeCategoryResponse {
  status: boolean;
  data: {
    data: ThemeCategory[];
    pagination?: any;
  };
  summary?: {
    total_categories: number;
    active_categories: number;
    website_categories: number;
    video_categories: number;
  };
}

export interface ThemeCategoryCreateRequest {
  name: string;
  type: 'website' | 'video';
  description: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ThemeCategoryUpdateRequest {
  name?: string;
  type?: 'website' | 'video';
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ThemeCategoryToggleRequest {
  is_active: boolean;
}

export interface ThemeCategorySortOrderRequest {
  categories: Array<{
    id: number;
    sort_order: number;
  }>;
}

export interface ThemeCategoryStatisticsResponse {
  status: boolean;
  data: {
    total_categories: number;
    active_categories: number;
    website_categories: number;
    video_categories: number;
  };
}

// Theme Interfaces
export interface Theme {
  id: number;
  category_id: number;
  name: string;
  price: number;
  preview: string;
  url_thema: string;
  demo_url: string;
  is_active: boolean;
  description: string;
  features: string[];
  sort_order: number;
  category?: {
    id: number;
    name: string;
    type: 'website' | 'video';
  };
  created_at?: string;
  updated_at?: string;
}

export interface ThemeResponse {
  status: boolean;
  data: {
    data: Theme[];
    pagination?: any;
  };
  summary?: {
    total_themes: number;
    active_themes: number;
    website_themes: number;
    video_themes: number;
  };
}

export interface ThemeCreateRequest {
  category_id: number;
  name: string;
  price: number;
  preview: string;
  url_thema: string;
  demo_url: string;
  description: string;
  features: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface ThemeUpdateRequest {
  category_id?: number;
  name?: string;
  price?: number;
  preview?: string;
  url_thema?: string;
  demo_url?: string;
  description?: string;
  features?: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface ThemeToggleRequest {
  is_active: boolean;
}

export interface ThemeSortOrderRequest {
  themes: Array<{
    id: number;
    sort_order: number;
  }>;
}

export interface ThemeAvailableCategoriesResponse {
  status: boolean;
  data: ThemeCategory[];
}

// Public Theme Browsing Interfaces
export interface PublicTheme {
  id: number;
  name: string;
  price: number;
  preview: string;
  image: string;
  preview_image: string | null;
  thumbnail_image: string | null;
  demo_url: string;
  features: string[];
  description?: string;
}

export interface PublicCategoryWithThemes {
  id: number;
  name: string;
  type: 'website' | 'video';
  description: string;
  jenis_themas: PublicTheme[];
}

export interface PublicCategoriesResponse {
  status: boolean;
  data: {
    type: 'website' | 'video';
    categories: PublicCategoryWithThemes[];
    total_categories: number;
    total_themes: number;
  };
}

export interface PublicThemesByCategoryResponse {
  status: boolean;
  data: {
    category: {
      id: number;
      name: string;
      type: 'website' | 'video';
    };
    themes: PublicTheme[];
    total_themes: number;
  };
}

export interface PublicThemeDetailsResponse {
  status: boolean;
  data: Theme;
}

export interface PublicPopularThemesResponse {
  status: boolean;
  data: PublicTheme[];
}

// User Theme Selection Interfaces
export interface ThemeSelectionRequest {
  theme_id: number;
}

export interface ThemeSelection {
  id: number;
  user_id: number;
  jenis_id: number;
  selected_at: string;
}

export interface ThemeSelectionResponse {
  status: boolean;
  message: string;
  data: {
    theme: Theme;
    selection: ThemeSelection;
  };
}

export interface UserSelectedThemeResponse {
  status: boolean;
  data: {
    theme: Theme;
    selected_at: string;
  };
}

// Generic API Response Interface
// Standard response format for API calls.
export interface ApiResponse<T = any> {
  status: boolean;
  message?: string;
  data?: T;
  errors?: {
    [key: string]: string[];
  };
}

// === TestimonialService Class ===
// Service for managing testimonials.
// Methods grouped by public and admin operations.

@Injectable({
  providedIn: 'root'
})
export class TestimonialService {
  constructor(private dashboardService: DashboardService) {}

  // === Public Testimonial Methods ===
  // Methods for public-facing testimonial display.
  getPublicTestimonials(params?: { search?: string; limit?: number; page?: number }): Observable<TestimonialResponse> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());

    return this.dashboardService.httpSvc.get<TestimonialResponse>(
      this.dashboardService.getUrl(DashboardServiceType.PUBLIC_TESTIMONI),
      { params: httpParams }
    );
  }

  // === Admin Testimonial Methods ===
  // Methods for admin testimonial management.
  getAdminTestimonials(params?: { search?: string; status?: string; limit?: number; page?: number }): Observable<TestimonialResponse> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());

    return this.dashboardService.httpSvc.get<TestimonialResponse>(
      this.dashboardService.getUrl(DashboardServiceType.TESTIMONI_ADMIN_LIST),
      { params: httpParams }
    );
  }

  /**
   * Update testimonial status
   */
  updateTestimonialStatus(id: number, status: boolean): Observable<any> {
    return this.dashboardService.httpSvc.put(
      `${this.dashboardService.getUrl(DashboardServiceType.TESTIMONI_ADMIN_UPDATE_STATUS)}/${id}/status`,
      { status }
    );
  }

  /**
   * Delete single testimonial
   */
  deleteTestimonial(id: number): Observable<any> {
    return this.dashboardService.httpSvc.delete(
      `${this.dashboardService.getUrl(DashboardServiceType.TESTIMONI_ADMIN_DELETE_BY_ID)}/${id}`
    );
  }

  /**
   * Delete all testimonials
   */
  deleteAllTestimonials(): Observable<any> {
    return this.dashboardService.httpSvc.delete(
      this.dashboardService.getUrl(DashboardServiceType.TESTIMONI_ADMIN_DELETE_ALL)
    );
  }

  /**
   * Bulk update testimonial status
   */
  bulkUpdateStatus(request: TestimonialBulkStatusRequest): Observable<any> {
    return this.dashboardService.httpSvc.put(
      `${this.dashboardService.getUrl(DashboardServiceType.TESTIMONI_ADMIN_UPDATE_STATUS)}/bulk-status`,
      request
    );
  }
}

// === ThemeService Class ===
// Service for theme and category management.
// Methods grouped by admin and public operations.

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor(private dashboardService: DashboardService) {}

  // Admin Category Management
  /**
   * Get all categories with filtering
   */
  getAdminCategories(params?: {
    type?: 'website' | 'video';
    status?: 'active' | 'inactive';
    search?: string;
    per_page?: number;
    page?: number;
  }): Observable<ThemeCategoryResponse> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());

    return this.dashboardService.httpSvc.get<ThemeCategoryResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_LIST),
      { params: httpParams }
    );
  }

  /**
   * Create new category
   */
  createCategory(request: ThemeCategoryCreateRequest): Observable<ApiResponse<ThemeCategory>> {
    return this.dashboardService.httpSvc.post<ApiResponse<ThemeCategory>>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_CREATE),
      request
    );
  }

  /**
   * Update category
   */
  updateCategory(id: number, request: ThemeCategoryUpdateRequest): Observable<ApiResponse<ThemeCategory>> {
    return this.dashboardService.httpSvc.put<ApiResponse<ThemeCategory>>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_UPDATE)}/${id}`,
      request
    );
  }

  /**
   * Toggle category activation
   */
  toggleCategoryActivation(id: number, request: ThemeCategoryToggleRequest): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.patch<ApiResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_TOGGLE_ACTIVATION)}/${id}/toggle-activation`,
      request
    );
  }

  /**
   * Update category sort order
   */
  updateCategorySortOrder(request: ThemeCategorySortOrderRequest): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.patch<ApiResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_SORT_ORDER),
      request
    );
  }

  /**
   * Get category statistics
   */
  getCategoryStatistics(): Observable<ThemeCategoryStatisticsResponse> {
    return this.dashboardService.httpSvc.get<ThemeCategoryStatisticsResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_STATISTICS)
    );
  }

  /**
   * Delete category
   */
  deleteCategory(id: number): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.delete<ApiResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_CATEGORIES_DELETE)}/${id}`
    );
  }

  // Admin Theme Management
  /**
   * Get all themes with filtering
   */
  getAdminThemes(params?: {
    category_id?: number;
    type?: 'website' | 'video';
    status?: 'active' | 'inactive';
    search?: string;
    per_page?: number;
    page?: number;
  }): Observable<ThemeResponse> {
    let httpParams = new HttpParams();
    if (params?.category_id) httpParams = httpParams.set('category_id', params.category_id.toString());
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());

    return this.dashboardService.httpSvc.get<ThemeResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_LIST),
      { params: httpParams }
    );
  }

  /**
   * Create new theme
   */
  createTheme(request: ThemeCreateRequest): Observable<ApiResponse<Theme>> {
    return this.dashboardService.httpSvc.post<ApiResponse<Theme>>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_CREATE),
      request
    );
  }

  /**
   * Update theme
   */
  updateTheme(id: number, request: ThemeUpdateRequest): Observable<ApiResponse<Theme>> {
    return this.dashboardService.httpSvc.put<ApiResponse<Theme>>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_UPDATE)}/${id}`,
      request
    );
  }

  /**
   * Toggle theme activation
   */
  toggleThemeActivation(id: number, request: ThemeToggleRequest): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.patch<ApiResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_TOGGLE_ACTIVATION)}/${id}/toggle-activation`,
      request
    );
  }

  /**
   * Update theme sort order
   */
  updateThemeSortOrder(request: ThemeSortOrderRequest): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.patch<ApiResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_SORT_ORDER),
      request
    );
  }

  /**
   * Get available categories for theme creation
   */
  getAvailableCategories(params?: { type?: 'website' | 'video'; include_inactive?: boolean }): Observable<ThemeAvailableCategoriesResponse> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.include_inactive) httpParams = httpParams.set('include_inactive', params.include_inactive.toString());

    return this.dashboardService.httpSvc.get<ThemeAvailableCategoriesResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_CATEGORIES_AVAILABLE),
      { params: httpParams }
    );
  }

  /**
   * Delete theme
   */
  deleteTheme(id: number): Observable<ApiResponse> {
    return this.dashboardService.httpSvc.delete<ApiResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_ADMIN_THEMES_DELETE)}/${id}`
    );
  }

  // Public Theme Browsing
  /**
   * Get categories with themes (public)
   */
  getPublicCategoriesWithThemes(type: 'website' | 'video' = 'website'): Observable<PublicCategoriesResponse> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('type', type);

    return this.dashboardService.httpSvc.get<PublicCategoriesResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_PUBLIC_CATEGORIES_WITH_THEMES),
      { params: httpParams }
    );
  }

  /**
   * Get themes by category (public)
   */
  getPublicThemesByCategory(categoryId: number): Observable<PublicThemesByCategoryResponse> {
    return this.dashboardService.httpSvc.get<PublicThemesByCategoryResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_PUBLIC_THEMES_BY_CATEGORY)}/${categoryId}`
    );
  }

  /**
   * Get theme details (public)
   */
  getPublicThemeDetails(themeId: number): Observable<PublicThemeDetailsResponse> {
    return this.dashboardService.httpSvc.get<PublicThemeDetailsResponse>(
      `${this.dashboardService.getUrl(DashboardServiceType.THEME_PUBLIC_THEME_DETAILS)}/${themeId}`
    );
  }

  /**
   * Get popular themes (public)
   */
  getPublicPopularThemes(params?: { type?: 'website' | 'video'; limit?: number }): Observable<PublicPopularThemesResponse> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.dashboardService.httpSvc.get<PublicPopularThemesResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_PUBLIC_POPULAR_THEMES),
      { params: httpParams }
    );
  }

  // User Theme Selection
  /**
   * Select a theme (authenticated)
   */
  selectTheme(request: ThemeSelectionRequest): Observable<ThemeSelectionResponse> {
    return this.dashboardService.httpSvc.post<ThemeSelectionResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_USER_SELECT),
      request
    );
  }

  /**
   * Get selected theme (authenticated)
   */
  getSelectedTheme(): Observable<UserSelectedThemeResponse> {
    return this.dashboardService.httpSvc.get<UserSelectedThemeResponse>(
      this.dashboardService.getUrl(DashboardServiceType.THEME_USER_SELECTED)
    );
  }
}

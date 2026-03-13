// User Profile API Response Interfaces
// Endpoint: /api/profile

export interface PackageInfo {
  id: number;
  name: string;
  jenis_paket: string;
  price: string;
  currency: string;
  payment_status: string;
  is_active: boolean;
}

export interface DomainInfo {
  domain: string;
  is_active: boolean;
  expires_at: string;
  days_until_expiry: number;
  payment_confirmed_at: string;
}

export interface UserProfileData {
  id: number;
  name: string | null;
  email: string;
  phone: string;
  profile_photo_url: string | null;
  kode_pemesanan: string;
  package_info: PackageInfo;
  domain_info: DomainInfo;
  created_at: string;
  updated_at: string;
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  data: UserProfileData;
}

export interface AdminContactSetting {
  id: number;
  host_email: string | null;
  email: string | null;
  nama: string | null;
  whatsapp: string | null;
  email_password?: string | null;
  whatsapp_token?: string | null;
  whatsapp_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminContactSettingResponse {
  success: boolean;
  message: string;
  data: AdminContactSetting;
}

export interface UserContactSetting {
  email: string | null;
  nama: string | null;
  whatsapp: string | null;
  whatsapp_message?: string | null;
}

export interface UserContactSettingResponse {
  success: boolean;
  message: string;
  data: UserContactSetting;
}

export interface AdminContactSettingUpdateRequest {
  host_email?: string;
  email?: string;
  nama?: string;
  whatsapp?: string;
  email_password?: string;
  whatsapp_token?: string;
  whatsapp_message?: string;
}

export interface AdminContactSettingDeleteResponse {
  success: boolean;
  message: string;
}

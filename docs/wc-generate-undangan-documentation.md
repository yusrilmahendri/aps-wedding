# Dokumentasi: WC Generate Undangan (Wedding Invitation Generator)

> Dokumentasi ini dibuat untuk referensi perbaikan dan pengembangan fitur ke depannya.

## 📁 Lokasi Folder

**Frontend (Angular):**
- **Primary:** `/aps-wedding/src/app/generate-undangan/`
- **Alternative:** `/sena-digital-main/src/app/generate-undangan/`

**Backend API (Laravel):**
- `/horuzt-app/routes/api.php`
- `/horuzt-app/app/Http/Controllers/InvitationController.php`

---

## 🏗️ Struktur Komponen Frontend

```
generate-undangan/
├── generate-undangan.component.ts/html/scss    # Main container/orchestrator
├── data-registrasi/
│   └── data-registrasi.component.ts            # Step 1: Registrasi akun & pilih paket
├── informasi-mempelai/
│   └── informasi-mempelai.component.ts         # Step 2: Data mempelai & foto
├── regis-cerita/
│   └── regis-cerita.component.ts               # Step 3: Cerita pernikahan
├── regis-pembayaran/
│   └── regis-pembayaran.component.ts           # Step 4: Pembayaran
└── modal-upload-galeri/
    └── modal-upload-galeri.component.ts        # Modal upload galeri foto
```

---

## 🔄 Alur Step-by-Step Membuat Undangan

### Overview
Proses pembuatan undangan menggunakan **4-step wizard** dengan data persistence di localStorage.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Step 1:       │───▶│   Step 2:        │───▶│   Step 3:       │───▶│   Step 4:       │
│   Registrasi    │    │   Mempelai       │    │   Cerita        │    │   Pembayaran   │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
   POST /v1/            POST /v1/              POST /v1/            Midtrans /
   one-step             two-step              for-step             Manual Transfer
```

---

## 📝 Detail Per Step

### STEP 1: Data Registrasi (Account Registration)

**Komponen:** `data-registrasi.component.ts`

**Form Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `paket_undangan_id` | number | Yes | Must exist in paket_undangans |
| `price` | string | No | Auto-filled from package |
| `domain` | string | Yes | Min 3 chars, unique |
| `email` | string | Yes | Email format, unique |
| `password` | string | Yes | Min 6 chars |
| `phone` | string | Yes | Numeric only |
| `kode_pemesanan` | string | No | Optional existing order code |

**API Endpoint:**
```
POST /v1/one-step
```

**Request:**
```typescript
// FormData multipart
{
  paket_undangan_id: number,
  domain: string,
  email: string,
  password: string,
  phone: string,
  kode_pemesanan?: string
}
```

**Response:**
```json
{
  "message": "Step 1 berhasil",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "kode_pemesanan": "ORD-123456"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "invitation": {
    "id": 456,
    "package_price_snapshot": 150000,
    "package_duration_snapshot": 365,
    "status": "step1"
  }
}
```

**What Happens:**
1. Creates new user account
2. Creates invitation record linked to user
3. Generates JWT token
4. Saves token to localStorage as `access_token`
5. Stores form data in localStorage as `formData`
6. Proceeds to Step 2

**Validation Errors:**
- `Domain sudah diambil` - Domain already exists
- `Email sudah diambil` - Email already registered

---

### STEP 2: Informasi Mempelai (Bride & Groom Information)

**Komponen:** `informasi-mempelai.component.ts`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name_lengkap_pria` | string | Yes | Groom's full name |
| `name_panggilan_pria` | string | Yes | Groom's nickname |
| `ayah_pria` | string | Yes | Groom's father name |
| `ibu_pria` | string | Yes | Groom's mother name |
| `name_lengkap_wanita` | string | Yes | Bride's full name |
| `name_panggilan_wanita` | string | Yes | Bride's nickname |
| `ayah_wanita` | string | Yes | Bride's father name |
| `ibu_wanita` | string | Yes | Bride's mother name |
| `user_id` | number | Yes | From Step 1 response |
| `status` | number | No | Default: 1 |
| `photo_pria` | file | No | Max 2MB, PNG/JPG/JPEG |
| `photo_wanita` | file | No | Max 2MB, PNG/JPG/JPEG |
| `cover_photo` | file | No | Max 2MB, PNG/JPG/JPEG |

**API Endpoint:**
```
POST /v1/two-step
Middleware: ['large.files', 'bypass.post.size']
```

**Request:**
```typescript
// FormData with files
const payload = new FormData();
payload.append('user_id', userId);
payload.append('name_lengkap_pria', value);
// ... other fields
// Photos converted from base64 to Blob
payload.append('photo_pria', blob, 'photo_pria.png');
```

**Response:**
```json
{
  "message": "Step 2 berhasil disimpan",
  "mempelai": { /* couple data */ },
  "invitation_status": "step2"
}
```

**What Happens:**
1. Opens modal for gallery upload (`ModalUploadGaleriComponent`)
2. Validates file size (max 2MB) and format (PNG/JPG/JPEG)
3. Converts images to base64 for preview
4. Submits main mempelai data
5. Gallery photos uploaded separately via `/v1/three-step`
6. Stores data in localStorage

---

### STEP 3: Regis Cerita (Wedding Stories)

**Komponen:** `regis-cerita.component.ts`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stories[]` | array | Yes | Array of story objects |
| `stories[].title` | string | Yes | Story title |
| `stories[].lead_cerita` | string | Yes | Story content (max 500 chars) |
| `stories[].tanggal_cerita` | date | Yes | Story date |
| `user_id` | number | Yes | From Step 1 |
| `status` | boolean | No | Show/hide stories publicly |

**API Endpoint:**
```
POST /v1/for-step
```

**Request:**
```typescript
// FormData with array notation
const payload = new FormData();
payload.append('title[0]', 'Pertemuan Pertama');
payload.append('lead_cerita[0]', 'Kami bertemu di...');
payload.append('tanggal_cerita[0]', '2020-01-15');
payload.append('title[1]', 'Lamaran');
payload.append('lead_cerita[1]', 'Di hari yang indah...');
payload.append('tanggal_cerita[1]', '2024-12-25');
payload.append('user_id', userId);
payload.append('status', '1');
```

**Response:**
```json
{
  "message": "Step 4 berhasil disimpan",
  "data": [ /* saved stories */ ]
}
```

**What Happens:**
1. Maximum 2 stories allowed
2. Date picker with Indonesian format
3. Auto-save to localStorage on form changes
4. Stories can be toggled on/off via `status` field
5. Proceeds to Step 4 (Payment)

---

### STEP 4: Pembayaran (Payment)

**Komponen:** `regis-pembayaran.component.ts`

**Payment Methods Available:**
1. **Midtrans** - Online payment (GoPay, OVO, Bank Transfer, etc.)
2. **Manual Transfer** - Bank transfer (displayed from admin config)

**API Endpoints:**
```
GET  /v1/master-tagihan                    # Get payment methods
GET  /v1/list-methode-transaction/all?id_methode_pembayaran={id}
POST /v1/midtrans/create-snap-token         # Create Midtrans token
POST /v1/midtrans/check-status              # Check payment status
GET  /midtrans/webhook                      # Midtrans webhook
```

**Midtrans Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Bayar dengan Midtrans"                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /v1/midtrans/create-snap-token                      │
│    Request: { invitation_id, amount }                       │
│    Response: { snap_token, order_id }                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Save payment state to localStorage                       │
│    - snapToken, orderId, invitationId, amount, timestamp    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Load Snap.js and open popup                              │
│    - Production/Sandbox mode based on config                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Handle callbacks:                                        │
│    - onSuccess → Verify & redirect to dashboard             │
│    - onPending → Start polling every 5s                     │
│    - onError → Show error, allow retry                      │
│    - onClose → Stop polling, keep token for reopen          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Poll payment status until paid                          │
│    GET /v1/midtrans/check-status?order_id={id}             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. On success:                                              │
│    - Clear localStorage (formData, formRegis)               │
│    - Redirect to /dashboard/overview                        │
└─────────────────────────────────────────────────────────────┘
```

**Payment State Persistence:**
- Saved in `localStorage['midtrans_payment_state']`
- Valid for 24 hours (Snap token expiration)
- Restored on component init (survives page refresh)
- Cleared after successful payment

**Payment Status States:**
| State | Description |
|-------|-------------|
| `idle` | Initial state, no payment initiated |
| `pending` | Payment in progress, polling active |
| `paid` | Payment confirmed |
| `failed` | Payment failed or expired |

---

## 🔐 Authentication & Authorization

### Token Management

**Token Storage:**
```typescript
localStorage.setItem('access_token', token);
```

**AuthInterceptor:**
```typescript
// Automatically adds Bearer token to all HTTP requests
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Auth Middleware (Backend):**
- Public routes: No authentication required
- `auth:sanctum`: Laravel Sanctum token authentication
- `role:user`: User role required
- `role:admin`: Admin role required

### Public vs Authenticated Endpoints

**Public (No Auth Required):**
```
GET  /v1/paket-undangan              # List packages
GET  /v1/list-paket-undangan        # Get packages with details
GET  /v1/list-methode-transaction/all
POST /v1/one-step                   # Step 1 registration
POST /v1/two-step                   # Step 2 mempelai
POST /v1/three-step                 # Gallery upload
POST /v1/for-step                   # Step 3 cerita
```

**Authenticated (User Role):**
```
POST /v1/midtrans/create-snap-token
POST /v1/midtrans/check-status
PUT  /v1/update/status-bayar        # Confirm payment
GET  /v1/user/profile
# ... all /v1/user/* endpoints
```

**Authenticated (Admin Role):**
```
# All /v1/admin/* endpoints
PUT  /v1/admin/paket-undangan/{id}
GET  /v1/admin/midtrans
POST /v1/admin/send-midtrans
```

---

## 📊 Data Models

### Invitation Model (Backend)
```php
// /horuzt-app/app/Models/Invitation.php
{
  id: number,
  user_id: number,                    // Foreign key to users
  paket_undangan_id: number,          // Foreign key to packages
  status: string,                     // step1, step2, step3, paid
  order_id: string,                   // Order identifier
  midtrans_transaction_id: string,    // Midtrans transaction ID
  payment_status: string,             // pending, paid, failed, expired
  domain_expires_at: datetime,        // Domain expiration
  payment_confirmed_at: datetime,     // Payment confirmation
  package_price_snapshot: decimal,    // Price at time of purchase
  package_duration_snapshot: integer, // Duration at time of purchase
  package_features_snapshot: json,    // Features at time of purchase
  created_at: datetime,
  updated_at: datetime
}
```

### FormData Interface (Frontend)
```typescript
interface InvitationFormData {
  registrasi: {
    response: {
      user: { id, email, kode_pemesanan },
      invitation: { id, package_price_snapshot },
      token: string
    },
    formData: { /* form fields */ }
  },
  informasiMempelai: {
    updatedData: { /* mempelai fields */ }
  },
  cerita: Array<{
    title: string,
    lead_cerita: string,
    tanggal_cerita: string
  }>,
  pembayaran: any,
  step: number  // 1, 2, 3, 4
}
```

---

## 🗂️ Backend API Routes Summary

### Invitation Creation Flow
| Route | Method | Controller | Auth | Description |
|-------|--------|------------|------|-------------|
| `/v1/one-step` | POST | `InvitationController@storeStepOne` | Public | Create user + invitation |
| `/v1/two-step` | POST | `InvitationController@storeStepTwo` | Public | Save mempelai data |
| `/v1/three-step` | POST | `InvitationController@storeStepThree` | Public | Upload gallery photos |
| `/v1/for-step` | POST | `InvitationController@storeStepFor` | Public | Save wedding stories |

### Package & Payment
| Route | Method | Controller | Auth | Description |
|-------|--------|------------|------|-------------|
| `/v1/paket-undangan` | GET | `SettingControllerAdmin@indexPaket` | Public | List invitation packages |
| `/v1/list-paket-undangan` | GET | `MethodePembayaran@getPaketUndangan` | Public | Get package details |
| `/v1/master-tagihan` | GET | `InvitationController@masterTagihan` | Public | Get payment methods |
| `/v1/list-methode-transaction/all` | GET | `MethodePembayaran@getAllMethodeTransactions` | Public | Get payment method details |

### Midtrans Payment
| Route | Method | Controller | Auth | Description |
|-------|--------|------------|------|-------------|
| `/v1/midtrans/create-snap-token` | POST | `MidtransController@createSnapToken` | User | Create payment token |
| `/v1/midtrans/check-status` | POST | `MidtransController@checkPaymentStatus` | User | Check payment status |
| `/v1/midtrans/webhook` | POST | `MidtransController@handleWebhook` | Public | Midtrans webhook |
| `/v1/update/status-bayar` | PUT | `MempelaiController@updateStatusBayar` | User | Confirm payment |

---

## 🔧 Services Used

### DashboardService
**File:** `/aps-wedding/src/app/dashboard.service.ts`

Key methods for undangan flow:
```typescript
// Package listing
dashboardSvc.list(DashboardServiceType.MNL_MD_PACK_INVITATION)

// Step 1 - Registration
dashboardSvc.create(DashboardServiceType.MNL_STEP_ONE, formData)

// Step 2 - Mempelai
dashboardSvc.create(DashboardServiceType.MNL_STEP_TWO, formData)

// Step 3 - Gallery
dashboardSvc.create(DashboardServiceType.MNL_STEP_THREE, formData)

// Step 4 - Stories
dashboardSvc.create(DashboardServiceType.MNL_STEP_FOUR, formData)

// Payment methods
dashboardSvc.getParam(DashboardServiceType.MNL_MD_METHOD, '')
dashboardSvc.getParam(DashboardServiceType.MNL_MD_METHOD_DETAIL, query)
```

### MidtransPaymentService
**File:** `/aps-wedding/src/app/services/midtrans-payment.service.ts`

Key methods:
```typescript
createSnapToken({ invitation_id, amount })
openSnapPopup(snapToken, clientKey, callbacks, isProduction)
checkPaymentStatus(orderId)
pollPaymentStatus(orderId)  // Returns Observable
```

---

## 💾 LocalStorage Keys

| Key | Purpose | Lifecycle |
|-----|---------|-----------|
| `access_token` | JWT auth token | Until logout |
| `formData` | Multi-step form data | Until payment success |
| `formRegis` | Step 1 registration form | Until payment success |
| `midtrans_payment_state` | Payment recovery state | Until paid/expired (24h) |

---

## 🎨 UI Components Used

- **NgxBootstrap:** Modals, Datepickers, Dropdowns
- **Notyf:** Toast notifications
- **Reactive Forms:** FormBuilder, FormGroup, Validators
- **RxJS:** Observables, Subscriptions for polling

---

## 🐛 Known Issues & Edge Cases

1. **Payment Recovery:** If user closes browser during payment, state is restored on return (within 24h)
2. **Token Expiration:** Snap tokens expire after 24 hours; user must retry payment
3. **Duplicate Payment:** Backend prevents duplicate snap_token creation for same invitation
4. **Webhook Reliability:** Payment confirmation via webhook + client polling for redundancy
5. **File Upload Limits:** 2MB per image with `large.files` middleware bypass

---

## 📝 Files Referenced

### Frontend (Angular)
- `/aps-wedding/src/app/generate-undangan/generate-undangan.component.ts`
- `/aps-wedding/src/app/generate-undangan/data-registrasi/data-registrasi.component.ts`
- `/aps-wedding/src/app/generate-undangan/informasi-mempelai/informasi-mempelai.component.ts`
- `/aps-wedding/src/app/generate-undangan/regis-cerita/regis-cerita.component.ts`
- `/aps-wedding/src/app/generate-undangan/regis-pembayaran/regis-pembayaran.component.ts`
- `/aps-wedding/src/app/dashboard.service.ts`
- `/aps-wedding/src/app/services/midtrans-payment.service.ts`
- `/sena-digital-main/src/app/dashboard.service.ts` (alternative)

### Backend (Laravel)
- `/horuzt-app/routes/api.php`
- `/horuzt-app/app/Http/Controllers/InvitationController.php`
- `/horuzt-app/app/Http/Controllers/MidtransController.php`
- `/horuzt-app/app/Http/Controllers/MethodePembayaran.php`
- `/horuzt-app/app/Http/Controllers/MempelaiController.php`
- `/horuzt-app/app/Models/Invitation.php`
- `/horuzt-app/app/Models/PaketUndangan.php`

---

## 🔄 Post-Payment Flow

After successful payment:
```
1. localStorage cleared (formData, formRegis, payment_state)
2. User redirected to: /dashboard/overview
3. Invitation status updated to 'paid'
4. Domain activated for duration specified in package
5. User can now customize their wedding invitation
```

---

## 📌 Notes untuk Perbaikan

1. **Error Handling:** Beberapa error message ditampilkan dalam Bahasa Indonesia di frontend
2. **Data Persistence:** Semua step data disimpan di localStorage untuk recovery
3. **File Upload:** Photo validation dilakukan di frontend sebelum upload
4. **Payment:** Midtrans Snap popup menggunakan iframe dengan callbacks
5. **API Base URL:** `https://cloud-api.sena-digital.com/api` (environment.production)

---

*Dokumentasi ini dibuat pada: 12 Maret 2026*
*Versi: 1.0*

# Business Process Documentation - Pembuatan Undangan Digital

**Document Version**: 1.0  
**Last Updated**: March 15, 2026  
**Prepared By**: Senior Angular Developer

---

## Executive Summary

This document maps the complete business process for creating digital wedding invitations, tracing frontend components through backend APIs and database operations. The system implements a 5-step registration and payment workflow with robust state management and payment processing via Midtrans.

---

## Architecture Overview

### Frontend Structure
```
aps-wedding/src/app/generate-undangan/
├── generate-undangan.component.ts       (Main orchestrator)
├── data-registrasi/                     (Step 1: Account)
├── informasi-mempelai/                  (Step 2: Couple Info)
├── modal-upload-galeri/                 (Step 3: Gallery Modal)
├── regis-cerita/                        (Step 4: Stories)
└── regis-pembayaran/                    (Step 5: Payment)
```

### Backend Controller
```
horuzt-app/app/Http/Controllers/InvitationController.php
├── masterTagihan()        - Payment methods master data
├── storeStepOne()         - Account registration
├── storeStepTwo()         - Couple information
├── storeStepThree()       - Additional gallery
└── storeStepFor()         - Love stories
```

---

## Complete API Mapping

### Master Data APIs (Public Access)

#### 1. Get Package List
- **Endpoint**: `GET /v1/paket-undangan`
- **Controller**: `SettingControllerAdmin::indexPaket`
- **Purpose**: Retrieve available wedding invitation packages
- **Frontend Usage**: `data-registrasi.component.ts::initMasterDataPaket()`
- **Response**:
  ```typescript
  {
    data: [{
      id: number,
      name_paket: string,
      price: string,
      masa_aktif: number,
      jenis_paket: string,
      // ... other features
    }]
  }
  ```

#### 2. Get Payment Methods
- **Endpoint**: `GET /v1/master-tagihan`
- **Controller**: `InvitationController::masterTagihan`
- **Purpose**: Retrieve payment method options (Midtrans, Manual Transfer)
- **Frontend Usage**: `regis-pembayaran.component.ts::getMasterPayment()`

#### 3. Get Payment Method Details
- **Endpoint**: `GET /v1/list-methode-transaction/all?id_methode_pembayaran={id}`
- **Controller**: `MethodePembayaran::getAllMethodeTransactions`
- **Purpose**: Get detailed configuration (bank accounts, Midtrans credentials)
- **Frontend Usage**: `regis-pembayaran.component.ts::getDetailMethod()`

---

## Registration Workflow (5 Steps)

### **STEP 1: Account Registration**

#### Frontend Component
**File**: `data-registrasi.component.ts`

**Form Fields**:
```typescript
{
  paket_undangan_id: number,     // Required - package selection
  price: string,                 // Auto-filled from package
  domain: string,                // Required - min 3 chars
  email: string,                 // Required - valid email
  password: string,              // Required - min 6 chars
  phone: string,                 // Required - numeric only
  kode_pemesanan: string | null  // Optional - for returning users
}
```

**Key Features**:
- LocalStorage persistence (`formRegis` key)
- Duplicate email validation with server feedback
- Duplicate domain validation with server feedback
- Package price auto-population
- Modal confirmation before submission

#### API Call
- **Endpoint**: `POST /v1/one-step`
- **Controller**: `InvitationController::storeStepOne`
- **Authentication**: None (creates user and token)

#### Backend Business Logic

**Three Execution Paths**:

1. **Returning User (kode_pemesanan provided)**:
   - Finds existing user by `kode_pemesanan`
   - Updates email, password, phone
   - Validates domain/email uniqueness (excluding current user)
   - Updates existing invitation record

2. **Authenticated User Refresh (Sanctum token present)**:
   - Validates user via `Auth::guard('sanctum')->user()`
   - Updates user data
   - Refreshes authentication token
   - Updates invitation status to `step1`

3. **New User Registration**:
   - Creates new user with generated `kode_pemesanan` (10-digit random)
   - Assigns 'user' role
   - Creates Sanctum token
   - Creates Setting record with domain
   - Creates Invitation record

**Database Operations**:
```php
DB::transaction(function () {
    // User creation/update
    User::create([
        'email', 'password', 'phone',
        'kode_pemesanan' => '#' . mt_rand(1000000000, 9999999999)
    ]);
    
    // Domain creation
    Setting::create(['user_id', 'domain']);
    
    // Invitation creation with package snapshot
    Invitation::create([
        'status' => 'step1',
        'paket_undangan_id',
        'kode_pemesanan',
        'payment_status' => 'pending',
        'domain_expires_at' => now()->addDays(3), // 3-day trial
        'package_price_snapshot',
        'package_duration_snapshot',
        'package_features_snapshot' => [
            'jenis_paket', 'name_paket', 'halaman_buku',
            'kirim_wa', 'bebas_pilih_tema', 
            'kirim_hadiah', 'import_data',
            'snapshot_at' => now()->toISOString()
        ]
    ]);
});
```

**Response Structure**:
```typescript
{
  message: string,
  user: User,
  token: string,              // Sanctum auth token
  user_id: number,
  domain: Setting,
  invitation: Invitation
}
```

**Frontend State Management**:
```typescript
// Store in localStorage 'formData'
{
  registrasi: {
    response: {
      user: { id, email, phone, kode_pemesanan },
      user_id,  // Used by subsequent steps
      token,    // Used for authentication
      invitation: { id, package_price_snapshot }
    },
    formData: { /* original form values */ }
  },
  step: 2  // Advance to next step
}
```

---

### **STEP 2: Informasi Mempelai (Couple Information)**

#### Frontend Component
**File**: `informasi-mempelai.component.ts`

**Form Fields**:
```typescript
{
  name_lengkap_pria: string,      // Required
  name_panggilan_pria: string,    // Required
  ayah_pria: string,              // Required
  ibu_pria: string,               // Required
  name_lengkap_wanita: string,    // Required
  name_panggilan_wanita: string,  // Required
  ayah_wanita: string,            // Required
  ibu_wanita: string,             // Required
  user_id: number,                // Required - from Step 1
  status: number,                 // Default: 1
  photo_pria: File | null,        // Optional - max 2MB
  photo_wanita: File | null,      // Optional - max 2MB
  cover_photo: File | null        // Optional - max 2MB
}
```

**Key Features**:
- Auto-restore user_id from localStorage
- Base64 image encoding with preview
- Auto-save with 500ms debounce
- Image validation (PNG/JPG, max 2MB)
- LocalStorage persistence under `informasiMempelai` key

#### API Call
- **Endpoint**: `POST /v1/two-step`
- **Controller**: `InvitationController::storeStepTwo`
- **Authentication**: Required (Sanctum token from Step 1)
- **Middleware**: `large.files`, `bypass.post.size`
- **Content-Type**: `multipart/form-data`

#### Backend Business Logic

**Database Operations** (within transaction):
```php
DB::transaction(function () {
    // 1. Store photos in Gallery table (status = 1 = active)
    foreach (['photo_pria', 'photo_wanita', 'cover_photo'] as $field) {
        if (hasFile($field)) {
            $path = store('photos', 'public');
            
            Galery::create([
                'user_id',
                'photo' => $path,
                'nama_foto' => 'Photo Pria/Wanita/Cover',
                'status' => 1  // Active for public display
            ]);
        }
    }
    
    // 2. Update Mempelai record
    Mempelai::updateOrCreate(
        ['user_id'],
        [
            'name_lengkap_pria', 'name_panggilan_pria',
            'ayah_pria', 'ibu_pria',
            'name_lengkap_wanita', 'name_panggilan_wanita',
            'ayah_wanita', 'ibu_wanita',
            'photo_pria' => $path,
            'photo_wanita' => $path,
            'cover_photo' => $path,
            'status' => 'Menunggu Konfirmasi',
            'kd_status' => 'MK'
        ]
    );
    
    // 3. Update invitation status
    Invitation::where('user_id')->update(['status' => 'step2']);
});
```

**Critical Design Decision**:
Photos are stored in BOTH:
1. **Galery table** - For public display with filtering capability
2. **Mempelai table** - For admin reference and profile display

**Response**:
```typescript
{
  message: string,
  mempelai: Mempelai,
  gallery_photos: { photo_pria, photo_wanita, cover_photo },
  invitation_status: 'step2'
}
```

**Frontend Flow**:
After successful submission, opens `ModalUploadGaleriComponent` for optional additional photos (Step 3).

---

### **STEP 3: Upload Galeri (Optional Additional Photos)**

#### Frontend Component
**File**: `modal-upload-galeri.component.ts`

**Form Fields**:
```typescript
{
  photo: File | null,     // Optional - PNG/JPG max 2MB
  status: number,         // Default: 1 (active)
  user_id: number         // Required - from localStorage
}
```

**Key Features**:
- Modal dialog (BsModal)
- Base64 image encoding
- Can be skipped (optional step)
- Auto-restores user_id from localStorage

#### API Call
- **Endpoint**: `POST /v1/three-step`
- **Controller**: `InvitationController::storeStepThree`
- **Authentication**: Required (inherited from parent)
- **Middleware**: `large.files`, `bypass.post.size`

#### Backend Business Logic

**Database Operations**:
```php
if (hasFile('photo')) {
    $path = store('photos', 'public');
    
    // Create new gallery entry (allows multiple uploads)
    Galery::create([
        'user_id',
        'photo' => $path,
        'nama_foto' => 'Gallery Upload Step 3',
        'status' => 1  // Active by default
    ]);
}

// Update invitation status regardless of photo upload
Invitation::where('user_id')->update(['status' => 'step3']);
```

**Response**:
```typescript
{
  message: string,
  galery: Galery | null,
  invitation_status: 'step3'
}
```

---

### **STEP 4: Cerita Pernikahan (Love Stories)**

#### Frontend Component
**File**: `regis-cerita.component.ts`

**Form Structure**:
```typescript
{
  stories: FormArray([
    {
      title: string,           // Required
      lead_cerita: string,     // Required - max 500 chars
      tanggal_cerita: Date     // Required
    }
    // Maximum 2 stories allowed
  ]),
  user_id: number,             // Required
  status: boolean              // Checkbox: true = disable feature
}
```

**Key Features**:
- Dynamic FormArray (max 2 entries)
- Date picker with format 'DD MMMM YYYY'
- Auto-save to localStorage with ISO date conversion
- Checkbox inverted logic: checked = disable feature (status = '0')

#### API Call
- **Endpoint**: `POST /v1/for-step`
- **Controller**: `InvitationController::storeStepFor`
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`

**Payload Format**:
```typescript
FormData {
  'title[0]': string,
  'lead_cerita[0]': string,
  'tanggal_cerita[0]': 'YYYY-MM-DD',
  'title[1]': string,
  'lead_cerita[1]': string,
  'tanggal_cerita[1]': 'YYYY-MM-DD',
  'user_id': number,
  'status': '0' | '1'  // '0' = disabled, '1' = active
}
```

#### Backend Business Logic

**Array Validation**:
```php
$validated = validate([
    'user_id' => 'required|exists:users,id',
    'title' => 'required|array',
    'lead_cerita' => 'required|array',
    'tanggal_cerita' => 'required|array',
    'status' => 'nullable|string|in:0,1'
]);

// Verify array lengths match
if (count($leadCerita) !== count($title) || 
    count($tglCerita) !== count($title)) {
    return error 400;
}
```

**Database Operations**:
```php
for ($i = 0; $i < count($title); $i++) {
    Cerita::create([
        'user_id',
        'title' => $title[$i],
        'lead_cerita' => $leadCerita[$i],
        'tanggal_cerita' => $tglCerita[$i]
    ]);
}

// Update FilterUndangan settings
// status = '0' (disabled) → halaman_cerita = 0
// status = '1' (active) → halaman_cerita = 1
FilterUndangan::updateOrCreate(
    ['user_id'],
    [
        'halaman_cerita' => ($status === '0') ? 0 : 1,
        // Other page filters default to 1
        'halaman_sampul' => 1,
        'halaman_mempelai' => 1,
        'halaman_acara' => 1,
        // ... etc
    ]
);
```

**Response**:
```typescript
{
  message: 'Step 4 berhasil disimpan',
  data: [
    { title, lead_cerita, tanggal_cerita },
    { title, lead_cerita, tanggal_cerita }
  ]
}
```

---

### **STEP 5: Pembayaran (Payment Processing)**

#### Frontend Component
**File**: `regis-pembayaran.component.ts`

**Dependencies**:
- `MidtransPaymentService` - Snap.js integration
- `DashboardService` - API communication
- `BsModalService` - Manual payment confirmation modal

#### Payment Methods

**1. Midtrans Snap Payment (Automated)**

**Flow Sequence**:
```
1. User clicks "Pay with Midtrans"
2. Frontend → POST /v1/midtrans/create-snap-token
3. Backend creates Snap token, updates payment_status = 'pending'
4. Frontend receives snap_token, saves to localStorage
5. Frontend loads Snap.js library
6. Opens Midtrans popup
7. User completes payment
8. Midtrans callback triggers:
   - onSuccess → verify and redirect
   - onPending → start polling
   - onError → show error
   - onClose → allow reopen
9. Webhook updates database asynchronously
10. Polling fallback checks status every 5s (max 12 attempts)
```

**API: Create Snap Token**
- **Endpoint**: `POST /v1/midtrans/create-snap-token`
- **Controller**: `MidtransController::createSnapToken`
- **Authentication**: `auth:sanctum, role:user`

**Request Payload**:
```typescript
{
  invitation_id: number,
  amount: number,
  customer_details?: {
    first_name: string,
    last_name: string,
    email: string,
    phone: string
  },
  item_details?: [{
    id: string,
    name: string,
    price: number,
    quantity: number
  }]
}
```

**Backend Business Logic**:
```php
DB::transaction(function () {
    $invitation = Invitation::with(['paketUndangan', 'user.settingOne'])
        ->findOrFail($invitation_id);
    
    // Use kode_pemesanan as order_id for invoice matching
    $orderId = $invitation->kode_pemesanan 
        ?? $invitation->user->kode_pemesanan 
        ?? '#INV-' . str_pad($invitation->id, 6, '0', STR_PAD_LEFT);
    
    // Enrich customer details
    $customerDetails = [
        'first_name', 'last_name', 'email', 'phone',
        'kode_pemesanan' => $orderId,
        'domain' => $user->settingOne->domain,
        'nama_paket' => $invitation->paketUndangan->name_paket
    ];
    
    // Create Snap transaction via MidtransService
    $snapToken = $midtransService->createTransaction([
        'transaction_details' => [
            'order_id' => $orderId,
            'gross_amount' => $amount
        ],
        'customer_details' => $customerDetails,
        'item_details' => $itemDetails,
        'callbacks' => [
            'finish' => APP_URL . '/payment/success',
            'error' => APP_URL . '/payment/error',
            'pending' => APP_URL . '/payment/pending'
        ]
    ]);
    
    // Update invitation
    $invitation->update([
        'order_id' => $orderId,
        'payment_status' => 'pending'
    ]);
    
    // Log payment request
    PaymentLog::create([
        'user_id', 'invitation_id', 'order_id',
        'event_type' => 'token_request',
        'transaction_status' => 'pending',
        'gross_amount',
        'request_payload' => json_encode($params),
        'response_payload' => json_encode(['snap_token' => $snapToken]),
        'ip_address', 'user_agent'
    ]);
});
```

**Response**:
```typescript
{
  success: true,
  data: {
    snap_token: string,
    order_id: string,
    gross_amount: number,
    invitation_id: number,
    expires_at: string  // ISO8601 timestamp (24h from now)
  },
  message: 'Snap token created successfully'
}
```

**Frontend State Persistence**:
```typescript
// Saved to localStorage for recovery after page refresh
interface PaymentState {
  snapToken: string,
  orderId: string,
  invitationId: number,
  amount: number,
  timestamp: number  // For expiry check (24h max age)
}
```

**API: Check Payment Status**
- **Endpoint**: `POST /v1/midtrans/check-status`
- **Controller**: `MidtransController::checkPaymentStatus`
- **Purpose**: Verify payment completion, polling fallback

**Request**:
```typescript
{ order_id: string }
```

**Backend Flow**:
```php
// 1. Check database first
$invitation = Invitation::where('order_id', $orderId)->first();

if (in_array($invitation->payment_status, ['paid', 'failed', 'expired'])) {
    return response()->json(['payment_status' => $invitation->payment_status]);
}

// 2. Query Midtrans API
$status = \Midtrans\Transaction::status($orderId);

// 3. Update database if status changed
if (in_array($status->transaction_status, ['capture', 'settlement'])) {
    DB::transaction(function () use ($invitation, $status) {
        $invitation->update([
            'payment_status' => 'paid',
            'midtrans_transaction_id' => $status->transaction_id,
            'payment_confirmed_at' => now(),
            'domain_expires_at' => now()->addDays(
                $invitation->package_duration_snapshot ?? 365
            )
        ]);
        
        // Sync mempelai status
        Mempelai::where('user_id', $invitation->user_id)
            ->update([
                'status' => 'Sudah Bayar',
                'kd_status' => 'SB'
            ]);
    });
}

// 4. Log status check
PaymentLog::create([
    'event_type' => 'status_check',
    'transaction_status' => $status->transaction_status,
    'response_payload' => json_encode($status)
]);
```

**Response**:
```typescript
{
  success: true,
  payment_status: 'paid' | 'pending' | 'failed' | 'expired',
  transaction_status: string,
  data: {
    order_id: string,
    transaction_id: string,
    payment_confirmed_at: string,
    domain_expires_at: string
  }
}
```

**Snap.js Callbacks**:
```typescript
onSuccess(result: SnapResult) {
  // 1. Verify with backend API
  midtransSvc.checkPaymentStatus(result.order_id)
  
  // 2. Clear localStorage state
  localStorage.removeItem('formData')
  localStorage.removeItem('formRegis')
  
  // 3. Redirect to dashboard
  window.location.href = '/dashboard/overview'
}

onPending(result: SnapResult) {
  // Start polling every 5 seconds (max 1 minute)
  midtransSvc.pollPaymentStatus(result.order_id)
    .subscribe(res => {
      if (res.payment_status === 'paid') {
        // Redirect to dashboard
      }
    })
}

onError(result: SnapResult) {
  // Show error notification
  this.midtransPaymentStatus = 'failed'
}

onClose() {
  // User closed popup - allow reopening
  this.isPayingMidtrans = false
  this.midtransPaymentStatus = 'idle'
  // Keep snapToken for retry
}
```

**2. Manual Transfer Payment**

**Flow Sequence**:
```
1. User selects manual payment method
2. Frontend shows bank account details
3. User completes transfer offline
4. User clicks confirmation (optional)
5. Opens PaymentConfirmComponent modal
6. Admin manually confirms payment later
7. Admin → PUT /v1/update/status-bayar
```

**API**:
- **Endpoint**: `PUT /v1/update/status-bayar`
- **Controller**: `MempelaiController::updateStatusBayar`
- **Authentication**: `auth:sanctum, role:admin`

---

## State Management Strategy

### LocalStorage Keys

#### 1. `formData` - Complete Registration State
```typescript
{
  registrasi: {
    response: {
      user: { id, email, phone, kode_pemesanan },
      user_id: number,
      token: string,
      invitation: { 
        id, 
        package_price_snapshot,
        package_features_snapshot 
      }
    },
    formData: { /* Step 1 form values */ }
  },
  informasiMempelai: {
    updatedData: { /* Step 2 form values */ }
  },
  cerita: [
    { title, lead_cerita, tanggal_cerita },
    { title, lead_cerita, tanggal_cerita }
  ],
  status: boolean,  // Story feature toggle
  step: number      // Current step (1-4)
}
```

#### 2. `formRegis` - Step 1 Auto-Save
Separate key for Step 1 form data persistence.

#### 3. `midtrans_payment_state` - Payment Recovery
```typescript
{
  snapToken: string,
  orderId: string,
  invitationId: number,
  amount: number,
  timestamp: number  // For 24h expiry check
}
```

### State Recovery Logic

**On Page Refresh**:
```typescript
ngOnInit() {
  this.restoreState()  // Main component
  this.restorePaymentState()  // Payment component
}

restoreState() {
  const saved = localStorage.getItem('formData')
  if (saved) {
    const parsed = JSON.parse(saved)
    this.formData.step = parsed.step || 1
    this.formData.registrasi = parsed.registrasi
    this.formData.informasiMempelai = parsed.informasiMempelai
    // ... restore other steps
  }
}

restorePaymentState() {
  const state = localStorage.getItem('midtrans_payment_state')
  if (state) {
    const parsed = JSON.parse(state)
    const age = Date.now() - parsed.timestamp
    
    if (age < 24 * 60 * 60 * 1000) {  // 24h expiry
      this.currentSnapToken = parsed.snapToken
      this.currentOrderId = parsed.orderId
      // Allow user to reopen Snap popup
    }
  }
}
```

---

## Database Schema Impact

### Tables Modified

#### 1. `users`
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    kode_pemesanan VARCHAR(50) UNIQUE,  -- Generated: '#' + 10-digit random
    user_aktif TINYINT DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 2. `settings`
```sql
CREATE TABLE settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    domain VARCHAR(255) UNIQUE,
    -- ... other settings
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 3. `invitations`
```sql
CREATE TABLE invitations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    paket_undangan_id BIGINT FOREIGN KEY REFERENCES paket_undangans(id),
    kode_pemesanan VARCHAR(50),
    order_id VARCHAR(255),  -- Midtrans order ID
    status ENUM('step1', 'step2', 'step3', 'completed'),
    payment_status ENUM('pending', 'paid', 'failed', 'expired', 'refunded'),
    midtrans_transaction_id VARCHAR(255),
    payment_confirmed_at TIMESTAMP NULL,
    domain_expires_at TIMESTAMP,  -- Initial 3 days, extended on payment
    package_price_snapshot DECIMAL(15,2),  -- Frozen price from registration
    package_duration_snapshot INT,  -- Frozen duration (days)
    package_features_snapshot JSON,  -- Complete feature snapshot
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 4. `mempelai`
```sql
CREATE TABLE mempelai (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    name_lengkap_pria VARCHAR(255),
    name_panggilan_pria VARCHAR(255),
    ayah_pria VARCHAR(255),
    ibu_pria VARCHAR(255),
    photo_pria VARCHAR(500),
    name_lengkap_wanita VARCHAR(255),
    name_panggilan_wanita VARCHAR(255),
    ayah_wanita VARCHAR(255),
    ibu_wanita VARCHAR(255),
    photo_wanita VARCHAR(500),
    cover_photo VARCHAR(500),
    status VARCHAR(50),  -- 'Menunggu Konfirmasi', 'Sudah Bayar'
    kd_status VARCHAR(10),  -- 'MK', 'SB'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 5. `galery`
```sql
CREATE TABLE galery (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    photo VARCHAR(500),
    nama_foto VARCHAR(255),
    status TINYINT DEFAULT 1,  -- 1 = active, 0 = inactive
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 6. `cerita`
```sql
CREATE TABLE cerita (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    title VARCHAR(255),
    lead_cerita TEXT,
    tanggal_cerita DATE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 7. `filter_undangan`
```sql
CREATE TABLE filter_undangan (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT FOREIGN KEY REFERENCES users(id),
    halaman_sampul TINYINT DEFAULT 1,
    halaman_mempelai TINYINT DEFAULT 1,
    halaman_acara TINYINT DEFAULT 1,
    halaman_ucapan TINYINT DEFAULT 1,
    halaman_galery TINYINT DEFAULT 1,
    halaman_cerita TINYINT DEFAULT 1,  -- Controlled by Step 4 status
    halaman_lokasi TINYINT DEFAULT 1,
    halaman_prokes TINYINT DEFAULT 1,
    halaman_send_gift TINYINT DEFAULT 1,
    halaman_qoute TINYINT DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 8. `payment_logs`
```sql
CREATE TABLE payment_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    invitation_id BIGINT,
    order_id VARCHAR(255),
    midtrans_transaction_id VARCHAR(255),
    event_type VARCHAR(50),  -- 'token_request', 'status_check', 'webhook'
    transaction_status VARCHAR(50),
    gross_amount DECIMAL(15,2),
    request_payload JSON,
    response_payload JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP
);
```

---

## Error Handling Strategy

### Frontend Validation

#### Email Validation
```typescript
// Real-time server validation
onEmailInput() {
  this.emailError = null  // Clear error on input
}

// Server response handling
error: (err) => {
  if (err?.error?.errors?.email?.[0]) {
    this.emailError = 'Email sudah diambil'
  }
}
```

#### Domain Validation
```typescript
onDomainInput() {
  this.domainError = null
}

error: (err) => {
  if (err?.error?.errors?.domain?.[0]) {
    this.domainError = 'Domain sudah diambil'
  }
}
```

#### Image Validation
```typescript
onFileSelected(event, controlName) {
  const file = event.target.files[0]
  
  // Type validation
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    this.notyf.error('Format tidak didukung. Gunakan PNG atau JPG.')
    return
  }
  
  // Size validation
  if (file.size > 2 * 1024 * 1024) {  // 2MB
    this.notyf.error('Ukuran file maksimal 2MB.')
    return
  }
}
```

### Backend Exception Handling

```php
try {
    return DB::transaction(function () {
        // Database operations
    });
} catch (ValidationException $e) {
    return response()->json([
        'message' => 'Validasi gagal',
        'errors' => $e->errors()
    ], 422);
} catch (\Exception $e) {
    Log::error('Error: ' . $e->getMessage());
    return response()->json([
        'message' => 'Gagal menyimpan data',
        'error' => $e->getMessage()
    ], 500);
}
```

### Payment Error Handling

#### Snap Token Creation Errors
```typescript
error: (err) => {
  if (this.isPaymentAlreadyInitiatedError(err)) {
    // Guide user to check existing payment
    this.handleExistingPaymentError()
  } else {
    this.notyf.error(err.message ?? 'Gagal memproses pembayaran.')
  }
}
```

#### Payment Status Check Fallback
```php
try {
    $status = \Midtrans\Transaction::status($orderId);
} catch (\Midtrans\Exceptions\ApiException $e) {
    // Fallback to database status if Midtrans API fails
    return response()->json([
        'success' => true,
        'payment_status' => $invitation->payment_status ?? 'pending',
        'message' => 'Payment status from DB (Midtrans API unavailable)'
    ]);
}
```

---

## Security Considerations

### 1. Authentication Flow
- **Step 1**: Public endpoint, generates token
- **Steps 2-5**: Protected by `auth:sanctum` middleware
- Token stored in localStorage, sent via `Authorization: Bearer {token}` header

### 2. CSRF Protection
- Midtrans webhook bypasses CSRF: `->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class])`
- Webhook authenticated via Midtrans signature verification (implemented in MidtransService)

### 3. Data Validation
- Server-side validation on all endpoints
- Unique constraints on email and domain
- File type and size validation
- Array length matching for stories

### 4. Payment Security
- Package price snapshot prevents price manipulation
- Order ID uses `kode_pemesanan` (server-generated, not user input)
- Payment logs track all transactions with IP and user agent
- Snap token expires after 24 hours

### 5. SQL Injection Prevention
- All queries use Eloquent ORM
- Parameterized queries for raw SQL
- Input validation with Laravel's validation rules

---

## Performance Optimization

### 1. Image Handling
- Frontend converts to base64 before upload
- Backend stores in `storage/app/public/photos`
- Served via symbolic link to `public/storage`
- Max size enforced (2MB) to prevent server overload

### 2. Database Transactions
- All multi-table operations wrapped in `DB::transaction()`
- Automatic rollback on exception
- Reduces database load from failed partial commits

### 3. LocalStorage Caching
- Reduces API calls on page refresh
- Auto-save with 500ms debounce (Step 2)
- Prevents duplicate submissions

### 4. Payment Polling Strategy
- Interval: 5 seconds
- Max attempts: 12 (1 minute total)
- Automatic stop on terminal status
- Prevents server overload from infinite polling

---

## Monitoring & Logging

### Payment Logs
All payment operations logged to `payment_logs` table:
- Token requests
- Status checks
- Webhook notifications
- Complete request/response payloads
- IP address and user agent tracking

### Application Logs
```php
Log::info('Snap token created successfully', [
    'user_id' => $user->id,
    'order_id' => $orderId,
    'invitation_id' => $invitation->id
]);

Log::warning('Delayed payment status check detected', [
    'order_id' => $orderId,
    'seconds_since_creation' => $secondsSinceCreation,
    'current_payment_status' => $invitation->payment_status
]);

Log::error('Error di storeStepTwo: ' . $e->getMessage());
```

---

## Testing Recommendations

### Unit Tests
1. **Data Validation**:
   - Email uniqueness check
   - Domain uniqueness check
   - Image validation (type, size)
   - Array length matching (stories)

2. **Business Logic**:
   - kode_pemesanan generation uniqueness
   - Package snapshot creation
   - Domain expiry calculation
   - Payment status transitions

### Integration Tests
1. **Registration Flow**:
   - Complete 5-step registration
   - State persistence across steps
   - User authentication after Step 1

2. **Payment Processing**:
   - Snap token creation
   - Status polling
   - Webhook handling
   - Database updates on payment success

### E2E Tests
1. **Happy Path**:
   - New user registration → payment → dashboard redirect
   - Returning user (kode_pemesanan) → update → payment

2. **Error Scenarios**:
   - Duplicate email registration
   - Duplicate domain registration
   - Payment timeout
   - Midtrans API failure

---

## Deployment Checklist

### Environment Variables
```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_FRONTEND_FINISH_URL=https://sena-digital.com/payment/success
MIDTRANS_FRONTEND_ERROR_URL=https://sena-digital.com/payment/error
MIDTRANS_FRONTEND_PENDING_URL=https://sena-digital.com/payment/pending

# Application
APP_URL=https://api.sena-digital.com
FRONTEND_URL=https://sena-digital.com
```

### Database Migrations
```bash
php artisan migrate
php artisan db:seed --class=PaketUndanganSeeder
php artisan db:seed --class=RolePermissionSeeder
```

### Storage Setup
```bash
php artisan storage:link
chmod -R 775 storage/app/public/photos
chown -R www-data:www-data storage
```

### Webhook Configuration
Register webhook URL in Midtrans dashboard:
```
https://api.sena-digital.com/api/v1/midtrans/webhook
```

---

## Business Rules Summary

1. **Trial Period**: 3 days free access from registration (Step 1)
2. **Package Snapshot**: Price and features frozen at registration time
3. **Payment Extension**: Domain extended by package duration on successful payment
4. **Photo Storage**: Photos stored in both `mempelai` and `galery` tables
5. **Gallery Status**: All Step 2 photos automatically set to active (status = 1)
6. **Story Limit**: Maximum 2 love stories per invitation
7. **Story Feature Toggle**: Checkbox inverted (checked = disabled)
8. **Order ID Format**: Uses `kode_pemesanan` for invoice matching
9. **Payment Status Sync**: Updates both `invitations.payment_status` and `mempelai.status`
10. **Token Validity**: Snap tokens expire after 24 hours

---

## Conclusion

The invitation creation system implements a robust multi-step workflow with:
- **State persistence** via localStorage for recovery after refresh
- **Package price protection** via snapshot mechanism
- **Dual payment methods** (automated Midtrans Snap + manual transfer)
- **Comprehensive error handling** at both frontend and backend layers
- **Transaction safety** via database transactions
- **Payment verification** via webhook + polling fallback
- **Complete audit trail** via payment logs

The architecture separates concerns effectively, maintains data integrity through transactions, and provides resilience against common failure scenarios (network issues, page refresh, browser close).

---

**Document Prepared By**: Senior Angular Developer  
**Technical Review Status**: Pending  
**Last Updated**: March 15, 2026

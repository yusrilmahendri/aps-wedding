import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { ModalUploadGaleriComponent } from '../modal-upload-galeri/modal-upload-galeri.component';
import { DashboardService, DashboardServiceType } from '../../dashboard.service';
import { Notyf } from 'notyf';
import { debounceTime } from 'rxjs/operators';

const FORM_DATA_KEY = 'formData';
const STEP_DATA_KEY = 'informasiMempelai';

interface StoredFormData {
  registrasi?: {
    response?: {
      user?: {
        id?: string | number;
      };
      user_id?: string | number;
    };
    formData?: {
      user_id?: string | number;
    };
  };
  informasiMempelai?: InformasiMempelaiFieldData | InformasiMempelaiData;
  cerita?: Record<string, any>;
  pembayaran?: Record<string, any>;
  step?: number;
  [key: string]: any;
}

interface InformasiMempelaiFieldData {
  name_lengkap_pria?: string;
  name_panggilan_pria?: string;
  ayah_pria?: string;
  ibu_pria?: string;
  name_lengkap_wanita?: string;
  name_panggilan_wanita?: string;
  ayah_wanita?: string;
  ibu_wanita?: string;
  user_id?: string | number;
  status?: number;
  photo_pria?: string;
  photo_wanita?: string;
  cover_photo?: string;
}

interface InformasiMempelaiData {
  updatedData?: InformasiMempelaiFieldData;
}

@Component({
  selector: 'wc-informasi-mempelai',
  templateUrl: './informasi-mempelai.component.html',
  styleUrls: ['./informasi-mempelai.component.scss']
})
export class InformasiMempelaiComponent implements OnInit {
  @Input() formData: any = {};
  @Output() next = new EventEmitter<any>();
  @Output() prev = new EventEmitter<void>();

  formGroup!: FormGroup;
  modalRef?: BsModalRef;
  private notyf: Notyf;


  imagePreviews: { [key: string]: string | null } = {
    photo_pria: null,
    photo_wanita: null,
    cover_photo: null
  };
  userId: any;

  constructor(
    private fb: FormBuilder,
    private modalSvc: BsModalService,
    private dashboardSvc: DashboardService
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.restoreFormData();
    this.setupAutoSave();
  }

  private initializeForm(): void {
    this.formGroup = this.fb.group({
      name_lengkap_pria: ['', Validators.required],
      name_panggilan_pria: ['', Validators.required],
      ayah_pria: ['', Validators.required],
      ibu_pria: ['', Validators.required],
      name_lengkap_wanita: ['', Validators.required],
      name_panggilan_wanita: ['', Validators.required],
      ayah_wanita: ['', Validators.required],
      ibu_wanita: ['', Validators.required],
      user_id: ['', Validators.required],
      status: [1],
      photo_pria: [null],
      photo_wanita: [null],
      cover_photo: [null]
    });
  }

  private getUserId(): string | null {
    const savedData = localStorage.getItem(FORM_DATA_KEY);
    if (!savedData) {
      console.log('[getUserId] No formData in localStorage');
      return null;
    }

    try {
      const parsed = JSON.parse(savedData);
      console.log('[getUserId] Parsed localStorage structure:', {
        hasRegistrasi: !!parsed?.registrasi,
        hasResponse: !!parsed?.registrasi?.response,
        hasUser: !!parsed?.registrasi?.response?.user,
        userId: parsed?.registrasi?.response?.user?.id,
        responseUserId: parsed?.registrasi?.response?.user_id,
      });

      // Try multiple paths - check ALL possible locations
      // Note: After backend fix, authenticated user response includes user_id at root level
      const userId = parsed?.registrasi?.response?.user_id?.toString()
        || parsed?.registrasi?.response?.user?.id?.toString()
        || parsed?.registrasi?.formData?.user_id?.toString()
        || (parsed as any)['user_id']?.toString()
        || null;

      console.log('[getUserId] Retrieved userId:', userId);
      return userId;
    } catch (error) {
      console.error('[getUserId] Error parsing localStorage:', error);
      return null;
    }
  }

  private restoreFormData(): void {
    const savedData = localStorage.getItem(FORM_DATA_KEY);
    if (!savedData) {
      console.log('[restoreFormData] No savedData found');
      return;
    }

    try {
      const parsed: StoredFormData = JSON.parse(savedData);

      const userId = this.getUserId();
      console.log('[restoreFormData] Retrieved userId:', userId);

      if (userId) {
        this.userId = userId;
        this.formGroup.patchValue({ user_id: userId });
        console.log('[restoreFormData] Patched user_id to form. Value after patch:', this.formGroup.get('user_id')?.value);
        console.log('[restoreFormData] Form valid status:', this.formGroup.valid);
        console.log('[restoreFormData] Form errors:', this.formGroup.errors);
      } else {
        console.warn('[restoreFormData] userId is null or undefined! Form will be invalid.');
      }

      if ((parsed as any)[STEP_DATA_KEY]) {
        const stepData: InformasiMempelaiData = (parsed as any)[STEP_DATA_KEY];
        const dataToRestore: InformasiMempelaiFieldData = stepData.updatedData || (stepData as any);

        this.formGroup.patchValue({
          name_lengkap_pria: dataToRestore.name_lengkap_pria || '',
          name_panggilan_pria: dataToRestore.name_panggilan_pria || '',
          ayah_pria: dataToRestore.ayah_pria || '',
          ibu_pria: dataToRestore.ibu_pria || '',
          name_lengkap_wanita: dataToRestore.name_lengkap_wanita || '',
          name_panggilan_wanita: dataToRestore.name_panggilan_wanita || '',
          ayah_wanita: dataToRestore.ayah_wanita || '',
          ibu_wanita: dataToRestore.ibu_wanita || '',
          status: dataToRestore.status || 1,
          photo_pria: dataToRestore.photo_pria || null,
          photo_wanita: dataToRestore.photo_wanita || null,
          cover_photo: dataToRestore.cover_photo || null
        });

        this.restoreImagePreviews(dataToRestore);
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  }

  private restoreImagePreviews(data: InformasiMempelaiFieldData): void {
    this.imagePreviews = {
      photo_pria: data.photo_pria ? `data:image/jpeg;base64,${data.photo_pria}` : null,
      photo_wanita: data.photo_wanita ? `data:image/jpeg;base64,${data.photo_wanita}` : null,
      cover_photo: data.cover_photo ? `data:image/jpeg;base64,${data.cover_photo}` : null
    };
  }

  private setupAutoSave(): void {
    this.formGroup.valueChanges
      .pipe(debounceTime(500))
      .subscribe(() => {
        this.saveFormData();
      });
  }

  private saveFormData(): void {
    try {
      const savedData = localStorage.getItem(FORM_DATA_KEY);
      const parsed = savedData ? JSON.parse(savedData) : {};

      (parsed as any)[STEP_DATA_KEY] = {
        updatedData: {
          ...this.formGroup.value
        }
      };

      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }

  onFileSelected(event: any, controlName: string) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.notyf.error('Format gambar tidak didukung. Gunakan PNG atau JPG.');
      return;
    }

    if (file.size > maxSize) {
      this.notyf.error('Ukuran file maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      this.imagePreviews[controlName] = base64String;
      this.formGroup.patchValue({ [controlName]: base64String.split(',')[1] });
      this.saveFormData();
    };
    reader.readAsDataURL(file);
  }


  onNext() {
    this.modalRef = this.modalSvc.show(ModalUploadGaleriComponent, {
      initialState: { formData: { ...this.formGroup.value } },
      class: 'modal-lg'
    });

    this.modalRef.content?.formDataChange.subscribe((updatedData: any) => {
      this.formGroup.patchValue(updatedData);
      const data = {
        updatedData: updatedData,
      };
      const existingFormData = JSON.parse(localStorage.getItem('formData') || '{}');
      existingFormData.informasiMempelai = this.formGroup.value;
      existingFormData.step = 3;
      localStorage.setItem('formData', JSON.stringify(existingFormData));
      this.next.emit(data);
    });
  }

  onBack() {
    this.prev.emit();
  }

  onNextClicked() {
    const payload = new FormData();

    Object.keys(this.formGroup.value).forEach((key) => {
      const value = this.formGroup.get(key)?.value;

      if (key.includes('photo') && typeof value === 'string') {
        const byteCharacters = atob(value);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        payload.append(key, blob, `${key}.png`);
      } else {
        payload.append(key, value);
      }
    });

    this.dashboardSvc.create(DashboardServiceType.MNL_STEP_TWO, payload,).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
        // Note: Backend already saves photos to gallery table, no need for dual submission
        setTimeout(() => this.onNext(), 1000);
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
      }
    });
  }
}

import {
  Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef
} from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService, DashboardServiceType } from '../../dashboard.service';
import { Notyf } from 'notyf';

const FORM_DATA_KEY = 'formData';

@Component({
  selector: 'wc-modal-upload-galeri',
  templateUrl: './modal-upload-galeri.component.html',
  styleUrls: ['./modal-upload-galeri.component.scss']
})
export class ModalUploadGaleriComponent implements OnInit {
  @Input() formData: any = {};
  @Output() formDataChange = new EventEmitter<any>();
  @Output() next = new EventEmitter<any>();

  uploadForm!: FormGroup;
  imagePreviews: { [key: string]: string } = {};
  private notyf: Notyf;

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  constructor(
    public bsModalRef: BsModalRef,
    private fb: FormBuilder,
    private dashboardSvc: DashboardService
  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  private getUserId(): string | null {
    const savedData = localStorage.getItem(FORM_DATA_KEY);
    if (!savedData) return null;

    try {
      const parsed = JSON.parse(savedData);

      return parsed?.response?.user?.id?.toString()
        || parsed?.registrasi?.response?.user?.id?.toString()
        || (parsed as any)['user_id']?.toString()
        || null;
    } catch {
      return null;
    }
  }

  ngOnInit(): void {
    const existingFormData = JSON.parse(localStorage.getItem(FORM_DATA_KEY) || '{}');
    const galeriData = existingFormData.informasiMempelai?.updatedData || this.formData;

    this.uploadForm = this.fb.group({
      photo: [galeriData?.photo || ''],
      status: [1],
      user_id: ['', Validators.required]
    });

    if (galeriData?.photo) {
      this.imagePreviews['photo'] = `data:image/png;base64,${galeriData.photo}`;
    }

    const userId = this.getUserId();
    if (userId) {
      this.uploadForm.patchValue({ user_id: userId });
    }
  }

  closeModal(): void {
    this.bsModalRef.hide();
  }

  browseFiles(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any, controlName: string): void {
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
      this.uploadForm.patchValue({ [controlName]: base64String.split(',')[1] });
    };
    reader.readAsDataURL(file);
  }

  onSubmitModal() {
    if (this.uploadForm.valid) {
      const payload = new FormData();

      Object.keys(this.uploadForm.value).forEach((key) => {
        const value = this.uploadForm.get(key)?.value;
        if (key.includes('photo') && typeof value === 'string' && value) {
          const byteCharacters = atob(value);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/png' });
          payload.append(key, blob, `${key}.png`);
        } else if (key === 'status') {
          payload.append(key, value ? '1' : '0');
        } else {
          payload.append(key, value);
        }
      });

      this.dashboardSvc.create(DashboardServiceType.MNL_STEP_THREE, payload).subscribe({
        next: (res) => {
          this.notyf.success(res?.message || 'Data berhasil disimpan.');
          // Note: Backend now saves photo to gallery table automatically
          setTimeout(() => this.nextStep(), 1000);
        },
        error: (err) => {
          this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
        }
      });
    } else {
      this.notyf.error('Harap isi foto terlebih dahulu');
      this.uploadForm.markAllAsTouched();
    }
  }

  removePhoto(controlName: string): void {
    delete this.imagePreviews[controlName];
    this.uploadForm.patchValue({ [controlName]: '' });
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  nextStep(): void {
    const updatedData = {
      ...this.formData,
      ...this.uploadForm.value,
      status: this.uploadForm.value.status ? 1 : 0
    };
    this.closeModal();
    this.next.emit(updatedData);
    this.formDataChange.emit(updatedData);

    const existingFormData = JSON.parse(localStorage.getItem(FORM_DATA_KEY) || '{}');
    existingFormData.informasiMempelai = {
      ...(existingFormData.informasiMempelai || {}),
      ...this.uploadForm.value
    };
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(existingFormData));
  }
}

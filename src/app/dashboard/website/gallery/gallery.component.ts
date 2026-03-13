import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'wc-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit {
  galleryForm: FormGroup;
  uploadStatus: string | null = null;
  isDraggingOver = false;
  uploadedFiles: { name: string; base64: string; status: string }[] = [];
  previewUrl: string | ArrayBuffer | null = null;

  // Table properties
  galleryData: any[] = [];
  columns: any[] = [];
  isLoading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  from = 0;
  to = 0;

  // Math reference for template
  Math = Math;

  private notyf: Notyf;
  private modalRef?: BsModalRef;
  userData: any;

  constructor(
    private dashboardSvc: DashboardService,
    private modalSvc: BsModalService
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

    this.galleryForm = new FormGroup({
      photo: new FormControl(null),
      url_video: new FormControl(''),
    }, { validators: this.atLeastOneFieldValidator });

    // Initialize table columns
    this.columns = [
      { name: 'No', prop: 'number', type: 'number' },
      { name: 'Foto', prop: 'photo_url', type: 'image' },
      { name: 'Video URL', prop: 'url_video' },
      { name: 'Tanggal Upload', prop: 'created_at', type: 'date' },
      { name: 'Status', prop: 'status', type: 'badge' }
    ];
  }

  ngOnInit(): void {
    this.initUserProfile();
  }

  /**
   * Custom validator: requires at least one of photo OR url_video to be filled
   */
  private atLeastOneFieldValidator(control: AbstractControl): ValidationErrors | null {
    const photo = control.get('photo')?.value;
    const urlVideo = control.get('url_video')?.value;

    // At least one field must have a value
    if (!photo && !urlVideo) {
      return { atLeastOneRequired: true };
    }

    return null;
  }

  initUserProfile(): void {
    this.dashboardSvc.list(DashboardServiceType.USER_PROFILE, '').subscribe(
      (res) => {
        this.userData = res.data;
        this.getGalleryData();
      },
      (error) => {
        console.error('Error fetching user profile:', error);
        this.notyf.error('Gagal mengambil data profil pengguna.');
      }
    );
  }


  browseFiles() {
    document.getElementById('fileInput')?.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
    }
  }


  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(event?: DragEvent) {
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver = false;
    if (event.dataTransfer?.files.length) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  handleFiles(files: FileList) {
    // Only allow one file for photo
    const file = files[0];
    if (this.validateFile(file)) {
      this.galleryForm.get('photo')?.setValue(file);
      this.galleryForm.get('photo')?.markAsDirty();
      this.uploadStatus = `File "${file.name}" selected successfully.`;
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result ?? null;
      };
      reader.readAsDataURL(file);
      // Reset file input value to allow re-uploading the same file if needed
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      this.previewUrl = null;
      // Reset file input value on error
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }


  validateFile(file: File): boolean {
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      this.uploadStatus = `Error: File type "${file.type}" not supported.`;
      return false;
    }

    if (file.size > maxFileSize) {
      this.uploadStatus = `Error: File size of "${file.name}" exceeds 5MB.`;
      return false;
    }

    return true;
  }

  handleCancelClicked() {
    this.previewUrl = null;
    this.uploadStatus = null;
    this.galleryForm.reset();
    // Reset file input value
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit() {
    if (this.galleryForm.valid) {
      const initialState = {
        message: 'Apakah anda ingin menyimpan semua data gallery?',
        cancelClicked: () => '',
        submitClicked: () => this.onSubmitForm(),
        submitMessage: 'Simpan',
      };
      this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
      if (this.modalRef?.content) {
        this.modalRef.content.onClose.subscribe((res: any) => {
          if (res?.state === 'delete') {
            // ...existing code...
          } else if (res?.state === 'cancel') {
            this.modalRef?.hide();
          }
          this.modalRef?.hide();
        });
      }
    } else {
      // Show error if form is invalid
      if (this.galleryForm.hasError('atLeastOneRequired')) {
        this.notyf.error('Harap isi minimal satu field: foto atau URL video.');
      }
    }
  }

  onSubmitForm() {
    const formData = new FormData();
    const photoFile = this.galleryForm.get('photo')?.value;
    const urlVideo = this.galleryForm.get('url_video')?.value;

    // Append photo only if provided
    if (photoFile) {
      formData.append('photo', photoFile, photoFile.name);
      formData.append('nama_foto', photoFile.name);
    } else {
      // Send empty values for photo fields when not provided
      formData.append('photo', '');
      formData.append('nama_foto', '');
    }

    // Append video URL (empty string if not provided)
    formData.append('url_video', urlVideo || '');

    this.dashboardSvc.create(DashboardServiceType.GALERY_SUBMIT, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
        this.galleryForm.reset();
        this.uploadStatus = null;
        this.previewUrl = null;
        // Reset file input value after submit
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        this.getGalleryData();
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
        console.error('Error while submitting data:', err);
      }
    });
  }

  // Method to fetch gallery data
  getGalleryData(page: number = this.currentPage, perPage: number = this.pageSize): void {
    // Check if userData is available
    if (!this.userData?.id) {
      console.warn('User data not available, initializing user profile first');
      this.initUserProfile();
      return;
    }

    this.isLoading = true;
    const user_id = this.userData.id;
    const params: any = { page, per_page: perPage, user_id };

    this.dashboardSvc.list(DashboardServiceType.GALERY_DATA, params).subscribe({
      next: (res) => {
        this.galleryData = (res?.data || []).map((item: any) => ({
          id: item.id,
          photo_url: item.photo_url || '',
          photo_name: item.nama_foto || '',
          url_video: item.url_video,
          created_at: item.created_at ? new Date(item.created_at) : null,
          status: item.status === '1' || item.status === 1 ? 'active' : 'inactive',
        }));
        this.totalItems = res?.pagination?.total || this.galleryData.length;
        this.pageSize = res?.pagination?.per_page || this.pageSize;
        this.currentPage = res?.pagination?.current_page || 1;
        this.totalPages = res?.pagination?.last_page || 1;
        this.from = res?.pagination?.from || 0;
        this.to = res?.pagination?.to || 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching gallery data:', err);
        this.galleryData = [];
        this.isLoading = false;
        this.notyf.error('Gagal mengambil data galeri.');
      }
    });
  }

  // Dummy data for demonstration
  private loadDummyData(): void {
    this.galleryData = [
      {
        id: 1,
        photo_url: 'https://via.placeholder.com/300x200/e91e63/white?text=Photo+1',
        photo_name: 'Wedding Photo 1.jpg',
        url_video: '',
        created_at: new Date('2024-01-15'),
        status: 'active'
      },
      {
        id: 2,
        photo_url: '',
        photo_name: '',
        url_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        created_at: new Date('2024-01-16'),
        status: 'active'
      },
      {
        id: 3,
        photo_url: 'https://via.placeholder.com/300x200/007bff/white?text=Photo+2',
        photo_name: 'Wedding Photo 2.jpg',
        url_video: '',
        created_at: new Date('2024-01-17'),
        status: 'active'
      }
    ];
    this.totalPages = Math.ceil(this.galleryData.length / this.pageSize);
  }

  // Get paginated data
  get paginatedData(): any[] {
    return this.galleryData;
  }

  // Page navigation methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getGalleryData(this.currentPage, this.pageSize);
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.getGalleryData(this.currentPage, this.pageSize);
  }

  // Method to delete gallery item
  onDeleteGallery(item: any): void {
    const initialState = {
      message: `Apakah Anda yakin ingin menghapus foto/video ini?`,
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.deleteGalleryItem(item),
      submitMessage: 'Hapus',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private deleteGalleryItem(item: any): void {
    console.log('Deleting gallery item:', item);
    const params = {
      id: item.id
    }
    this.dashboardSvc.delete(DashboardServiceType.GALERY_DELETE, params).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data galeri berhasil dihapus.');
        this.getGalleryData();
        this.modalRef?.hide();
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Gagal menghapus data galeri.');
        this.modalRef?.hide();
      }
    });
  }

  // Method to view/preview gallery item
  onPreviewGallery(item: any): void {
    if (item.photo_url) {
      window.open(item.photo_url, '_blank');
    } else if (item.url_video) {
      window.open(item.url_video, '_blank');
    }
  }

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get file extension
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  // Helper method to check if file is image
  isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(this.getFileExtension(filename));
  }
}

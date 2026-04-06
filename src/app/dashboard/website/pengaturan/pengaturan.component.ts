import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'wc-pengaturan',
  templateUrl: './pengaturan.component.html',
  styleUrls: ['./pengaturan.component.scss'],
})
export class PengaturanComponent implements OnInit {
  domainTokenForm!: FormGroup;
  salamForm!: FormGroup;
  filterForm!: FormGroup;
  formData?: FormData;
  musicForm!: FormGroup;

  currentMusicUrl = '';
  currentMusicName = '';


  isInitialLoading = false;
  isLoadingDomain = false;
  isLoadingMusic = false;
  isLoadingSalam = false;
  isLoadingFilter = false;


  selectedFileName = '';
  uploadProgress = 0;


  private modalRef?: BsModalRef;
  private notyf: Notyf;


  settingData: any;
  filterData: any;
  isFilterExisting = false;

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private modalSvc: BsModalService
  ) {
    this.initializeForms();
    this.notyf = new Notyf({
      duration: 3000,
      position: { x: 'right', y: 'top' }
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private initializeForms(): void {

    this.domainTokenForm = this.fb.group({
      domain: ['', [Validators.required]],
      token: ['']
    });

    this.musicForm = this.fb.group({

    });


    this.salamForm = this.fb.group({
      salam_pembuka: [
        `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Dengan memohon Rahmat dan Ridho Allah SWT, Kami akan menyelenggarakan resepsi pernikahan Putra-Putri kami :`,
        [Validators.required]
      ],
      salam_atas: [
        `Assalamualaikum Wr Wb.
Dengan segala kerendahan hati dan syukur atas Karunia Allah SWT.
Kami bermaksud mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami :`,
        [Validators.required]
      ],
      salam_bawah: [
        `Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima Kasih.`,
        [Validators.required]
      ]
    });


    this.filterForm = this.fb.group({
      halaman_sampul: [false],
      halaman_mempelai: [false],
      halaman_acara: [false],
      halaman_ucapan: [false],
      halaman_galery: [false],
      halaman_cerita: [false],
      halaman_lokasi: [false],
      halaman_prokes: [false],
      halaman_send_gift: [false],
      halaman_qoute: [false]
    });
  }

  private loadInitialData(): void {
    this.isInitialLoading = true;

    this.dashboardSvc.list(DashboardServiceType.SETTINGS_GET_FILTER).subscribe({
      next: (res) => {
        this.settingData = res?.['setting'];
        this.filterData = res?.['filter_undangan'];

        const musikUrl = this.settingData?.musik || '';
        this.musicForm.patchValue({
          musik: musikUrl
        });

        this.currentMusicUrl = musikUrl;
        this.currentMusicName = this.extractFileNameFromUrl(musikUrl);



        this.populateFormsWithData();
        this.isInitialLoading = false;
      },
      error: (err) => {

        this.notyf.error('Gagal memuat data pengaturan');
        this.isInitialLoading = false;
      }
    });
  }

  private populateFormsWithData(): void {
    if (this.settingData) {
      this.domainTokenForm.patchValue({
        domain: this.settingData.domain || '',
        token: this.settingData.token || ''
      });
      this.salamForm.patchValue({
        salam_pembuka: this.settingData.salam_pembuka || this.salamForm.get('salam_pembuka')?.value,
        salam_atas: this.settingData.salam_atas || this.salamForm.get('salam_atas')?.value,
        salam_bawah: this.settingData.salam_bawah || this.salamForm.get('salam_bawah')?.value
      });
    }
    // Patch filterForm with boolean values from backend (0/1 or '0'/'1')
    if (this.filterData) {
      this.isFilterExisting = true;
      const patchObj: any = {};
      Object.keys(this.filterForm.controls).forEach(key => {
        patchObj[key] = this.stringToBoolean(this.filterData[key]);
      });
      this.filterForm.patchValue(patchObj);
    }
  }

  private stringToBoolean(value: string | number | null | undefined): boolean {
    return value === '1' || value === 1 || value === 'true';
  }


  saveDomainToken(): void {
    if (!this.domainTokenForm.valid) {
      this.notyf.error('Mohon lengkapi form dengan benar');
      return;
    }

    const formData = new FormData();
    const formValue = this.domainTokenForm.value;

    formData.append('domain', formValue.domain || '');
    formData.append('token', formValue.token || '');

    const initialState = {
      message: 'Apakah anda ingin menyimpan semua data domain dan token?',
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.submitDomainToken(formData),
      submitMessage: 'Simpan',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private submitDomainToken(formData: FormData): void {
    this.isLoadingDomain = true;

    this.dashboardSvc.create(DashboardServiceType.USER_SETTINGS_SUBMIT_DOMAIN, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data domain dan token berhasil disimpan');
        this.modalRef?.hide();
        this.isLoadingDomain = false;
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Gagal menyimpan data domain dan token');

        this.isLoadingDomain = false;
      }
    });
  }

  uploadMusic(event: any): void {
    const file = event.target.files[0];
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    const maxSizeInBytes = 5 * 1024 * 1024;

    if (!file) {
      this.selectedFileName = '';
      this.formData = undefined;
      this.uploadProgress = 0;
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      this.notyf.error('Jenis file tidak didukung. Hanya file musik (MP3, WAV, OGG) yang diperbolehkan');
      event.target.value = '';
      this.selectedFileName = '';
      this.formData = undefined;
      return;
    }

    if (file.size > maxSizeInBytes) {
      this.notyf.error('Ukuran file terlalu besar. Maksimal 5 MB');
      event.target.value = '';
      this.selectedFileName = '';
      this.formData = undefined;
      return;
    }

    this.selectedFileName = file.name;
    this.formData = new FormData();
    this.formData.append('musik', file);

    this.notyf.success('File musik berhasil dipilih. Klik "Sisipkan" untuk melanjutkan');


    this.uploadProgress = 0;
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);

        setTimeout(() => {
          this.uploadProgress = 0;
        }, 1000);
      }
    }, 100);
  }

  submitMusic(): void {
    if (!this.formData) {
      this.notyf.error('Tidak ada file musik yang dipilih. Silakan pilih file terlebih dahulu');
      return;
    }

    const initialState = {
      message: 'Apakah anda ingin menyimpan file musik ini?',
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.uploadMusicFile(),
      submitMessage: 'Simpan',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private uploadMusicFile(): void {
    this.isLoadingMusic = true;

    this.dashboardSvc.create(DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC, this.formData!).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'File musik berhasil diunggah');
        this.modalRef?.hide();
        this.isLoadingMusic = false;


        const newMusicUrl = res?.data?.musik_url || res?.musik_url || '';
        if (newMusicUrl) {
          this.currentMusicUrl = newMusicUrl;
          this.currentMusicName = this.selectedFileName;
        }

        this.resetMusicForm();


        this.loadInitialData();
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Gagal mengunggah file musik');

        this.isLoadingMusic = false;
      }
    });
  }

  private resetMusicForm(): void {
    this.formData = undefined;
    this.selectedFileName = '';
    this.uploadProgress = 0;
    const fileInput = document.getElementById('music-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private extractFileNameFromUrl(url: string): string {
    if (!url) return '';

    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return decodeURIComponent(fileName);
    } catch (error) {
      return 'musik.mp3';
    }
  }

  playCurrentMusic(): void {
    if (this.currentMusicUrl) {
      const audio = new Audio(this.currentMusicUrl);
      audio.play().catch(err => {

        this.notyf.error('Gagal memutar musik');
      });
    }
  }



  async playCurrentMusics() {
    const params = {
      id: this.settingData?.id || 0
    };
    this.dashboardSvc.list(DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC_GET, params).subscribe({
      next: (res) => {
        const audioUrl = res?.data?.musik_url || '';
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play().catch(err => {

            this.notyf.error('Gagal memutar musik');
          });
        } else {
          this.notyf.error('Tidak ada musik yang tersedia untuk diputar');
        }
      },
      error: (err) => {

        this.notyf.error('Gagal mengambil musik saat ini');
      }
    });

  }

  removeCurrentMusic(): void {
    const initialState = {
      message: 'Apakah Anda yakin ingin menghapus musik saat ini?',
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.deleteMusicFile(),
      submitMessage: 'Hapus',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private deleteMusicFile(): void {
    this.dashboardSvc.delete(DashboardServiceType.USER_SETTINGS_DELETE_MUSIC).subscribe({
      next: (res) => {
        this.currentMusicUrl = '';
        this.currentMusicName = '';
        this.notyf.success('Musik berhasil dihapus');
        this.modalRef?.hide();
      },
      error: (err) => {

        this.notyf.error('Gagal menghapus musik');
      }
    });
  }

  saveSalam(): void {
    if (!this.salamForm.valid) {
      this.notyf.error('Mohon lengkapi semua field salam');
      return;
    }

    const formData = new FormData();
    const formValue = this.salamForm.value;

    formData.append('salam_pembuka', formValue.salam_pembuka || '');
    formData.append('salam_atas', formValue.salam_atas || '');
    formData.append('salam_bawah', formValue.salam_bawah || '');

    const initialState = {
      message: 'Apakah anda ingin menyimpan semua data salam?',
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.submitSalam(formData),
      submitMessage: 'Simpan',
    };

    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private submitSalam(formData: FormData): void {
    this.isLoadingSalam = true;

    this.dashboardSvc.create(DashboardServiceType.USER_SETTINGS_SUBMIT_SALAM, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data salam berhasil disimpan');
        this.modalRef?.hide();
        this.isLoadingSalam = false;
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Gagal menyimpan data salam');

        this.isLoadingSalam = false;
      }
    });
  }

  saveFilter(): void {
    const formValue = this.filterForm.value;
    // Kirim 0/1 ke backend
    const filterData: any = {};
    Object.keys(formValue).forEach(key => {
      filterData[key] = formValue[key] ? 1 : 0;
    });
    const initialState = {
      message: 'Apakah anda ingin menyimpan pengaturan filter undangan?',
      cancelClicked: () => this.modalRef?.hide(),
      submitClicked: () => this.submitFilter(filterData),
      submitMessage: 'Simpan',
    };
    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });
  }

  private submitFilter(filterData: any): void {
    this.isLoadingFilter = true;
    if (this.isFilterExisting) {
      this.dashboardSvc.update(DashboardServiceType.USER_SETTINGS_SUBMIT_FILTER_UPDATE, '', filterData).subscribe(this.filterSubscriber());
    } else {
      this.dashboardSvc.create(DashboardServiceType.USER_SETTINGS_SUBMIT_FILTER, filterData).subscribe(this.filterSubscriber());
    }
  }

  private filterSubscriber() {
    return {
      next: (res: any) => {
        this.notyf.success(res?.message || 'Pengaturan filter berhasil disimpan');
        this.modalRef?.hide();
        this.isLoadingFilter = false;
        this.isFilterExisting = true;
        this.loadInitialData();
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Gagal menyimpan pengaturan filter');
        this.isLoadingFilter = false;
      }
    };
  }


  downloadMusic(settingId: number): void {
    this.dashboardSvc.list(DashboardServiceType.USER_SETTINGS_SUBMIT_MUSIC_DOWNLOAD).subscribe({
      next: (res) => {

        const blob = new Blob([res], { type: 'audio/mpeg' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'music.mp3';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.notyf.error('Gagal mengunduh file musik');

      }
    });
  }


  streamMusic(settingId: number): void {
    const streamUrl = `${DashboardServiceType.SETTINGS_SUBMIT}/music/stream?id=${settingId}`;
    window.open(streamUrl, '_blank');
  }
}

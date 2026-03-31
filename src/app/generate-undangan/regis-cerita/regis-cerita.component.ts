import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from '../../dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'wc-regis-cerita',
  templateUrl: './regis-cerita.component.html',
  styleUrls: ['./regis-cerita.component.scss']
})
export class RegisCeritaComponent implements OnInit {
  @Input() formData: any = { title: [], lead_cerita: [], tanggal_cerita: [], status: false };
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<any>();

  form!: FormGroup;
  isSubmitting = false;

  bsConfig = {
    dateInputFormat: 'DD MMMM YYYY',
    containerClass: 'theme-default',
    showWeekNumbers: false,
    adaptivePosition: true,
    todayBtn: true,
    clearBtn: true
  };

  private notyf: Notyf

  private modalRef?: BsModalRef

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
    const local = this.getLocalStorageData();
    if (Array.isArray(local?.cerita)) {
      this.formData = {
        title: local.cerita.map((c: any) => c.title),
        lead_cerita: local.cerita.map((c: any) => c.lead_cerita),
        tanggal_cerita: local.cerita.map((c: any) => c.tanggal_cerita),
        status: local.status || false
      };
    }
    this.form = this.fb.group({
      stories: this.fb.array([]),
      user_id: ['',Validators.required],
      status: new FormControl(this.formData?.status || false)
    });
    const step1LocalStorage = localStorage.getItem('formData');
    if (step1LocalStorage) {
      const allDataFromSteps = JSON.parse(step1LocalStorage);
      const userID = allDataFromSteps?.registrasi?.response?.user?.id;
      this.form.patchValue({
        user_id: userID
      });
    }
    if (this.formData?.title?.length) {
      for (let i = 0; i < this.formData.title.length; i++) {
        this.addStory({
          title: this.formData.title[i] || '',
          lead_cerita: this.formData.lead_cerita[i] || '',
          tanggal_cerita: this.formData.tanggal_cerita[i] || ''
        });
      }
    } else {
      this.addStory();
    }
    this.form.valueChanges.subscribe(() => {
      this.saveFormToLocalStorage();
    });
  }


  saveFormToLocalStorage() {
    const local = this.getLocalStorageData();

    const rawStories = this.stories.value;
    const storiesMapped = rawStories.map((story: any) => {
      const rawDate = story.tanggal_cerita;
      console.log(rawDate);

      if (!rawDate) {
        return {
          ...story,
          tanggal_cerita: ''
        };
      }
      const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      return {
        ...story,
        tanggal_cerita: isNaN(parsedDate.getTime())
          ? ''
          : parsedDate.toISOString().split('T')[0]
      };
    });


    const updatedData = {
      ...local,
      cerita: storiesMapped,
      status: this.form.get('status')?.value
    };

    this.setLocalStorageData(updatedData);
  }



  getLocalStorageData() {
    const raw = localStorage.getItem('formData');
    return raw ? JSON.parse(raw) : {};
  }

  setLocalStorageData(data: any) {
    localStorage.setItem('formData', JSON.stringify(data));
  }

  get stories(): FormArray {
    return (this.form?.get('stories') as FormArray) || this.fb.array([]);
  }

  addStory(data: any = { title: '', lead_cerita: '', tanggal_cerita: '' }): void {
    if (this.stories.length < 2) {
      const parsedDate = data.tanggal_cerita
        ? new Date(data.tanggal_cerita)
        : null;

      this.stories.push(
        this.fb.group({
          title: [data.title, Validators.required],
          lead_cerita: [data.lead_cerita, [Validators.required, Validators.maxLength(500)]],
          tanggal_cerita: [parsedDate, Validators.required]
        })
      );
    }
  }


  removeStory(index: number): void {
    this.stories.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.notyf.error('Harap isi semua bidang')
      this.form.markAllAsTouched();
      return;
    } else {
      const initialState = {
        message: 'Apakah anda ingin menyimpan data cerita?',
        cancelClicked: () => this.handleCancelClicked(),
        submitClicked: () => this.saveCerita(),
        submitMessage: 'Simpan',
      };

      this.modalRef = this.modalSvc.show(ModalComponent, { initialState });

      if (this.modalRef?.content) {
        this.modalRef.content.onClose.subscribe((res: any) => {
          if (res?.state === 'delete') {
            console.log('Delete action triggered');
          } else if (res?.state === 'cancel') {
            console.log('Action canceled');
          }
          this.modalRef?.hide();
        });
      }
    }

  }

  handleCancelClicked() {

  }

  saveCerita() {
    this.isSubmitting = true;
    const rawStories = this.stories.value;
    const status = this.form.get('status')?.value;
    const userId = this.form.get('user_id')?.value;

    const payload = new FormData();

    rawStories.forEach((item: any, index: number) => {
      payload.append(`title[${index}]`, item.title);
      payload.append(`lead_cerita[${index}]`, item.lead_cerita);

      const date = new Date(item.tanggal_cerita);
      const formattedDate = date.toISOString().split('T')[0];
      payload.append(`tanggal_cerita[${index}]`, formattedDate);
    });

    // Tambahkan user_id dan status
    // Checkbox "Jangan Aktifkan Fitur ini" - checked=true means disable
    // So: checked (true) = send '0' (disabled), unchecked (false) = send '1' (active)
    payload.append('user_id', userId);
    payload.append('status', status ? '0' : '1');

    this.dashboardSvc.create(DashboardServiceType.MNL_STEP_FOUR, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
        this.next.emit(rawStories);

        const local = this.getLocalStorageData();
        const updatedLocal = {
          ...local,
          cerita: rawStories.map((item: any) => ({
            ...item,
            tanggal_cerita: new Date(item.tanggal_cerita).toISOString().split('T')[0]
          })),
          status,
          step: 4
        };
        this.setLocalStorageData(updatedLocal);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
        console.error('Error while submitting data:', err);
      }
    });
  }


}

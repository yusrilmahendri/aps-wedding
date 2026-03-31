import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

interface Acara {
  id: string | null;
  jenis_acara: 'akad' | 'resepsi' | null;
  nama_acara: string;
  tanggal_acara: string | Date | null;
  start_acara: string;
  end_acara: string;
  alamat: string;
  link_maps: string;
  countdown?: Countdown;
}

interface Countdown {
  id: string;
  name_countdown: string;
}

@Component({
  selector: 'wc-acara',
  templateUrl: './acara.component.html',
  styleUrls: ['./acara.component.scss'],
})
export class AcaraComponent implements OnInit {
  staticEventForm!: FormGroup;
  dynamicEventForm!: FormGroup;

  events: ReadonlyArray<{ id: string | null; name: string }> = [];
  bsConfig!: Partial<BsDatepickerConfig>;

  modalRef?: BsModalRef;

  private notyf: Notyf;
  selectedEvent: string | null = null;
  data: Acara[] = [];
  isLoading = false;
  countdownData: Countdown | null = null;
  userID: any;

  // Track edit mode for each event card
  editMode: { [key: number]: boolean } = {};

  constructor(
    private readonly fb: FormBuilder,
    private readonly dashboardSvc: DashboardService,
    private readonly modalSvc: BsModalService
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });
  }

  ngOnInit(): void {
    this.initForms();
    this.fetchInitialData();
  }

  private initForms(): void {
    this.staticEventForm = this.fb.group({
      selectedEvent: [null, Validators.required],
    });

    this.dynamicEventForm = this.fb.group({
      dynamicEvents: this.fb.array([]),
    });

    this.bsConfig = {
      dateInputFormat: 'DD MMMM YYYY',
      showTodayButton: true,
      isAnimated: true,
      containerClass: 'theme-dark-blue',
    };
  }

  get dynamicEvents(): FormArray {
    return this.dynamicEventForm.get('dynamicEvents') as FormArray;
  }

  private createDynamicEventForm(eventData?: Partial<Acara>): FormGroup {
    return this.fb.group({
      id: [eventData?.id ?? null],
      jenis_acara: [eventData?.jenis_acara ?? null, Validators.required],
      nama_acara: [eventData?.nama_acara ?? '', Validators.required],
      tanggal_acara: [
        eventData?.tanggal_acara
          ? new Date(eventData.tanggal_acara)
          : null,
        Validators.required,
      ],
      start_acara: [eventData?.start_acara ?? '', Validators.required],
      end_acara: [eventData?.end_acara ?? '', Validators.required],
      alamat: [eventData?.alamat ?? '', Validators.required],
      link_maps: [eventData?.link_maps ?? '', Validators.required],
    });
  }

  addDynamicEvent(): void {
    this.dynamicEvents.push(this.createDynamicEventForm());
  }

  deleteDynamicEvent(index: number): void {
    if (this.dynamicEvents.length > 1) {
      const eventToDelete = this.dynamicEvents.at(index)?.value as Acara;


      if (eventToDelete?.id) {
        const initialState = {
          message: `Apakah anda ingin menghapus acara "${eventToDelete.nama_acara}"?`,
          cancelClicked: () => '',
          submitClicked: () => this.confirmDeleteDynamicEvent(index, eventToDelete),
          submitMessage: 'Hapus',
        };

        this.showModal(initialState);
      } else {

        this.dynamicEvents.removeAt(index);
      }
    }
  }

  private confirmDeleteDynamicEvent(index: number, eventData: Acara): void {
    if (!eventData.id) {
      this.notyf.error('ID acara tidak ditemukan.');
      return;
    }

    this.isLoading = true;


    const payload = {
      user_id: this.userID,
      nama_acara: eventData.nama_acara
    };


    this.dashboardSvc.delete(DashboardServiceType.ACARA_SUBMIT_DELETE_DYNAMIC, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notyf.success(res?.message ?? 'Acara berhasil dihapus.');


        this.dynamicEvents.removeAt(index);


        this.fetchInitialData();
      },
      error: (err) => {
        this.isLoading = false;
        this.notyf.error(err?.error?.message ?? 'Gagal menghapus acara.');
      }
    });
  }
  fetchInitialData(): void {
    this.isLoading = true;
    this.dashboardSvc.list(DashboardServiceType.ACARA_DATA).subscribe({
      next: (res) => {
        this.isLoading = false;

        // Handle both old (acaras array) and new (events object) API response structure
        const acarasData = res?.data?.acaras as Acara[] ?? [];

        // Also check if data is in events.akad and events.resepsi format
        if (acarasData.length === 0 && res?.data?.events) {
          const events = res.data.events;
          if (events.akad) acarasData.push(events.akad);
          if (events.resepsi) acarasData.push(events.resepsi);
        }

        this.data = acarasData;

        if (this.data.length > 0) {
          this.countdownData = res?.data?.countdown ?? null;
          // Get user_id from API response directly
          this.userID = (res as any)?.data?.events?.akad?.user_id ??
                       (res as any)?.data?.events?.resepsi?.user_id ?? null;
          this.staticEventForm.patchValue({
            selectedEvent: this.countdownData?.name_countdown ?? null,
          });

          while (this.dynamicEvents.length !== 0) {
            this.dynamicEvents.removeAt(0);
          }

          this.data.forEach((acara) => {
            this.dynamicEvents.push(this.createDynamicEventForm(acara));
          });

          // Initialize edit mode for all cards
          this.editMode = {};
          this.data.forEach((_, index) => {
            this.editMode[index] = false;
          });
        } else {
          this.dynamicEvents.push(this.createDynamicEventForm());
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.notyf.error('Gagal memuat data acara');
        if (this.dynamicEvents.length === 0) {
          this.dynamicEvents.push(this.createDynamicEventForm());
        }
      },
    });
  }

  onEventSelect(event: string): void {
    this.selectedEvent = event;
  }

  onStaticSubmitClicked(): void {
    if (this.staticEventForm.valid) {
      const initialState = {
        message: 'Apakah anda ingin mengunggah countdown ini?',
        cancelClicked: () => '',
        submitClicked: () => this.submitStaticEventForm(),
        submitMessage: 'Simpan',
      };

      this.showModal(initialState);
    }
  }

  onDynamicSubmitClicked(): void {
    if (this.dynamicEventForm.valid) {
      const message =
        this.data.length > 0
          ? 'Apakah anda ingin mengubah data acara ini?'
          : 'Apakah anda ingin menyimpan data acara ini?';

      const initialState = {
        message,
        cancelClicked: () => '',
        submitClicked: () => this.submitDynamicEventForm(),
        submitMessage: 'Simpan',
      };

      this.showModal(initialState);
    } else {
      this.notyf.error('Form tidak valid. Harap periksa data acara.');
    }
  }

  onStaticUpdateClicked(): void {
    if (this.staticEventForm.valid) {
      const initialState = {
        message: 'Apakah anda ingin mengubah countdown ini?',
        cancelClicked: () => '',
        submitClicked: () => this.updateStaticEventForm(),
        submitMessage: 'Simpan',
      };

      this.showModal(initialState);
    }
  }

  private showModal(initialState: any): void {
    this.modalRef = this.modalSvc.show(ModalComponent, { initialState });

    if (this.modalRef?.content) {
      this.modalRef.content.onClose.subscribe((res: { state: string }) => {
        if (res?.state === 'delete' || res?.state === 'cancel') {
          this.modalRef?.hide();
        }
        this.modalRef?.hide();
      });
    }
  }

  submitStaticEventForm(): void {
    if (this.staticEventForm.valid) {
      this.isLoading = true;
      const { selectedEvent } = this.staticEventForm.value;
      const payload = { name_countdown: selectedEvent };

      this.dashboardSvc.create(DashboardServiceType.ACARA_SUBMIT_COUNTDOWN, payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.notyf.success(res?.message ?? 'Countdown berhasil disimpan.');
          this.fetchInitialData();
        },
        error: (err) => {
          this.isLoading = false;
          this.notyf.error(err?.error?.message ?? 'Gagal menyimpan countdown.');
        },
      });
    }
  }

  updateStaticEventForm(): void {
    if (this.staticEventForm.valid && this.countdownData?.id) {
      this.isLoading = true;
      const { selectedEvent } = this.staticEventForm.value;
      const payload = { name_countdown: selectedEvent };

      this.dashboardSvc
        .update(DashboardServiceType.ACARA_SUBMIT_UPDATE_COUNTDOWN, this.countdownData.id, payload)
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.notyf.success(res?.message ?? 'Countdown berhasil diperbarui.');
            this.fetchInitialData();
          },
          error: (err) => {
            this.isLoading = false;
            this.notyf.error(err?.error?.message ?? 'Gagal memperbarui countdown.');
          },
        });
    }
  }

submitDynamicEventForm(): void {
  if (this.dynamicEventForm.valid) {
    this.isLoading = true;
    const events = this.dynamicEvents.value as Acara[];


    const eventsToCreate = events.filter(event => !event.id);
    const eventsToUpdate = events.filter(event => !!event.id);

    const promises: any[] = [];


    if (eventsToCreate.length > 0) {
      const createPayload = {
        jenis_acara: eventsToCreate.map(event => event.jenis_acara),
        nama_acara: eventsToCreate.map(event => event.nama_acara),
        tanggal_acara: eventsToCreate.map(event =>
          event.tanggal_acara instanceof Date
            ? event.tanggal_acara.toISOString().split('T')[0]
            : event.tanggal_acara
        ),
        start_acara: eventsToCreate.map(event => event.start_acara),
        end_acara: eventsToCreate.map(event => event.end_acara),
        alamat: eventsToCreate.map(event => event.alamat),
        link_maps: eventsToCreate.map(event => event.link_maps),
      };

      const createPromise = this.dashboardSvc.create(DashboardServiceType.ACARA_SUBMIT_DYNAMIC, createPayload);
      promises.push(createPromise);
    }


    if (eventsToUpdate.length > 0) {
      const updatePayload = eventsToUpdate.map(event => ({
        id: event.id,
        jenis_acara: event.jenis_acara,
        nama_acara: event.nama_acara,
        tanggal_acara: event.tanggal_acara instanceof Date
          ? event.tanggal_acara.toISOString().split('T')[0]
          : event.tanggal_acara,
        start_acara: event.start_acara,
        end_acara: event.end_acara,
        alamat: event.alamat,
        link_maps: event.link_maps,
      }));

      const finalUpdatePayload = {
        data: updatePayload
      };

      const updatePromise = this.dashboardSvc.update(DashboardServiceType.ACARA_SUBMIT_UPDATE_DYNAMIC, '', finalUpdatePayload);
      promises.push(updatePromise);
    }


    if (promises.length > 0) {

      import('rxjs').then(({ forkJoin }) => {
        forkJoin(promises).subscribe({
          next: (responses) => {
            this.isLoading = false;
            let successMessage = '';

            if (eventsToCreate.length > 0 && eventsToUpdate.length > 0) {
              successMessage = 'Data acara berhasil disimpan dan diperbarui.';
            } else if (eventsToCreate.length > 0) {
              successMessage = 'Data acara berhasil disimpan.';
            } else {
              successMessage = 'Data acara berhasil diperbarui.';
            }

            this.notyf.success(successMessage);
            this.fetchInitialData();
          },
          error: (err) => {
            this.isLoading = false;
            this.notyf.error(err?.error?.message ?? 'Gagal menyimpan/memperbarui data acara.');
          }
        });
      });
    } else {
      this.isLoading = false;
      this.notyf.error('Tidak ada data untuk disimpan.');
    }
  } else {
    this.notyf.error('Form tidak valid. Harap periksa data acara.');
  }
}

  formatDate(date: string | Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  hasExistingData(): boolean {
    return this.data.length > 0;
  }

  /**
   * Toggle edit mode for a specific event card
   */
  toggleEditMode(index: number): void {
    const eventForm = this.dynamicEvents.at(index) as FormGroup;
    const hasId = !!eventForm.get('id')?.value;

    if (!hasId) {
      // Use error instead of warning as Notyf doesn't have warning method
      this.notyf.error('Tidak bisa mengedit acara yang belum disimpan');
      return;
    }

    this.editMode[index] = !this.editMode[index];

    if (this.editMode[index]) {
      // Enable form editing
      eventForm.enable();
    } else {
      // Disable form editing
      eventForm.disable();
    }
  }

  /**
   * Check if a specific event card is in edit mode
   */
  isEditMode(index: number): boolean {
    return this.editMode[index] ?? false;
  }

  /**
   * Check if an event has been saved (has an ID)
   */
  isEventSaved(index: number): boolean {
    const eventForm = this.dynamicEvents.at(index) as FormGroup;
    return !!eventForm.get('id')?.value;
  }
}

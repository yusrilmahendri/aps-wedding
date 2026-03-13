import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'wc-cerita-quote',
  templateUrl: './cerita-quote.component.html',
  styleUrls: ['./cerita-quote.component.scss'],
})

export class CeritaQuoteComponent implements OnInit {
  ceritaForm!: FormGroup;
  quoteForm!: FormGroup;
  bsConfig: Partial<BsDatepickerConfig>;
  ceritaData: any[] = [];
  editingCeritaId: number | null = null;
  editCeritaForm: FormGroup | null = null;

  quoteData: any[] = [];
  editingQuoteId: number | null = null;
  editQuoteForm: FormGroup | null = null;

  activeFormTab: 'cerita' | 'quote' = 'cerita';
  activeDataTab: 'cerita' | 'quote' = 'cerita';

  // Loading states for better UX
  isLoadingCeritaData = false;
  isLoadingQuoteData = false;
  isSubmittingCerita = false;
  isSubmittingQuote = false;
  isDeletingCerita = false;
  isDeletingQuote = false;
  isUpdatingCerita = false;
  isUpdatingQuote = false;

  private notyf: Notyf;
  private modalRef? : BsModalRef

  constructor(
    private fb: FormBuilder,
    private dashboardSvc: DashboardService,
    private modalSvc: BsModalService
  ) {
    this.notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });
    this.bsConfig = {
      dateInputFormat: 'DD MMMM YYYY',
      containerClass: 'theme-dark-blue',
      isAnimated: true,
      adaptivePosition: true,
      showTodayButton: true,
      showClearButton: true,
    };
  }

  ngOnInit(): void {
    this.ceritaForm = this.fb.group({
      ceritaList: this.fb.array([this.createCerita()]),
    });

    this.quoteForm = this.fb.group({
      name: ['', Validators.required],
      quote: ['', Validators.required],
    });

    this.fetchCeritaData();
    this.fetchQuoteData();
  }
  fetchQuoteData() {
    this.isLoadingQuoteData = true;
    this.dashboardSvc.list(DashboardServiceType.QUOTE_DATA).subscribe({
      next: (res) => {
        this.quoteData = (res?.data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          quote: item.qoute || item.quote, // handle typo from backend
        }));
        this.isLoadingQuoteData = false;
      },
      error: (err) => {
        this.notyf.error('Gagal memuat data quote.');
        this.quoteData = [];
        this.isLoadingQuoteData = false;
      }
    });
  }

  startEditQuote(quote: any) {
    this.editingQuoteId = quote.id;
    this.editQuoteForm = this.fb.group({
      name: [quote.name, Validators.required],
      quote: [quote.quote, Validators.required],
    });
  }

  cancelEditQuote() {
    this.editingQuoteId = null;
    this.editQuoteForm = null;
  }

  submitEditQuote(quote: any) {
    if (!this.editQuoteForm || this.editQuoteForm.invalid) {
      this.editQuoteForm?.markAllAsTouched();
      return;
    }

    this.isUpdatingQuote = true;
    const payload = {
      id: quote.id,
      name: this.editQuoteForm.value.name,
      qoute: this.editQuoteForm.value.quote,
    };

    this.dashboardSvc.update(DashboardServiceType.QUOTE_UPDATE, '', payload).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Quote berhasil diupdate.');
        this.cancelEditQuote();
        this.fetchQuoteData();
        this.isUpdatingQuote = false;
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Gagal update quote.');
        this.isUpdatingQuote = false;
      }
    });
  }
  fetchCeritaData() {
    this.isLoadingCeritaData = true;
    this.dashboardSvc.list(DashboardServiceType.CERITA_DATA).subscribe({
      next: (res) => {
        this.ceritaData = (res?.data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          lead_cerita: item.lead_cerita,
          tanggal_cerita: item.tanggal_cerita,
        }));
        this.isLoadingCeritaData = false;
      },
      error: (err) => {
        this.notyf.error('Gagal memuat data cerita.');
        this.ceritaData = [];
        this.isLoadingCeritaData = false;
      }
    });
  }

  startEditCerita(cerita: any) {
    this.editingCeritaId = cerita.id;
    this.editCeritaForm = this.fb.group({
      title: [cerita.title, Validators.required],
      lead_cerita: [cerita.lead_cerita, Validators.required],
      tanggal_cerita: [cerita.tanggal_cerita, Validators.required],
    });
  }

  cancelEditCerita() {
    this.editingCeritaId = null;
    this.editCeritaForm = null;
  }

  submitEditCerita(cerita: any) {
    if (!this.editCeritaForm || this.editCeritaForm.invalid) {
      this.editCeritaForm?.markAllAsTouched();
      return;
    }

    this.isUpdatingCerita = true;
    const payload = {
      id: cerita.id,
      title: this.editCeritaForm.value.title,
      lead_cerita: this.editCeritaForm.value.lead_cerita,
      tanggal_cerita: this.formatDate(this.editCeritaForm.value.tanggal_cerita),
    };

    this.dashboardSvc.update(DashboardServiceType.CERITA_UPDATE, '', payload).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Cerita berhasil diupdate.');
        this.cancelEditCerita();
        this.fetchCeritaData();
        this.isUpdatingCerita = false;
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Gagal update cerita.');
        this.isUpdatingCerita = false;
      }
    });
  }

  get ceritaFormArray(): FormArray {
    return this.ceritaForm.get('ceritaList') as FormArray;
  }

  getCeritaFormGroup(index: number): FormGroup {
    return this.ceritaFormArray.at(index) as FormGroup;
  }

  // Helper methods for template tracking
  trackByCeritaId(index: number, item: any): any {
    return item.id || index;
  }

  trackByQuoteId(index: number, item: any): any {
    return item.id || index;
  }

  createCerita(): FormGroup {
    return this.fb.group({
      tanggal: ['', Validators.required],
      judul: ['', Validators.required],
      isiCerita: ['', Validators.required],
    });
  }

  addCerita(): void {
    this.ceritaFormArray.push(this.createCerita());
  }

  removeCerita(index: number): void {
    this.ceritaFormArray.removeAt(index);
  }

  onDateChange(date: Date | null, index: number): void {
    const formattedDate = this.formatDate(date);
    console.log('Date changed for cerita at index', index, ':', formattedDate);
  }

  onSubmitCerita(): void {
    if (this.ceritaForm.valid) {
      this.isSubmittingCerita = true;
      this.SubmitCerita();
    } else {
      this.ceritaForm.markAllAsTouched();
    }
  }

  SubmitCerita() {
    this.isSubmittingCerita = true;
    const formData = new FormData();

    this.ceritaFormArray.controls.forEach((control: AbstractControl, index: number) => {
      const group = control as FormGroup;
      const ceritaData = group.value;

      const formattedDate = this.formatDate(ceritaData.tanggal) || '';

      formData.append(`title[${index}]`, ceritaData.judul);
      formData.append(`lead_cerita[${index}]`, ceritaData.isiCerita);
      formData.append(`tanggal_cerita[${index}]`, formattedDate);
    });

    this.dashboardSvc.create(DashboardServiceType.CERITA_SUBMIT, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
        this.ceritaForm.reset();
        this.fetchCeritaData();
        this.isSubmittingCerita = false;
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
        console.error('Error while submitting data:', err);
        this.isSubmittingCerita = false;
      }
    });
  }

  handleCancelClicked() {
    console.log('Cancel clicked');
  }

  onSubmitQuote(): void {
    if (this.quoteForm.valid) {
      const initialState = {
        message: 'Apakah anda ingin menyimpan quote?',
        cancelClicked: () => this.handleCancelClicked(),
        submitClicked: () => this.SubmitQuote(),
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
    } else {
      this.quoteForm.markAllAsTouched();
    }
  }

  SubmitQuote(){
    this.isSubmittingQuote = true;
    const formData = new FormData();

    const quote = this.quoteForm.value;
    formData.append('name', quote?.name);
    formData.append('qoute', quote?.quote);

    this.dashboardSvc.create(DashboardServiceType.QUOTE_SUBMIT, formData).subscribe({
      next: (res) => {
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
        this.quoteForm.reset();
        this.fetchQuoteData();
        this.isSubmittingQuote = false;
      },
      error: (err) => {
        this.notyf.error(err?.message || 'Ada kesalahan dalam sistem.');
        console.error('Error while submitting data:', err);
        this.isSubmittingQuote = false;
      }
    })
  }

  formatDate(date: string | Date | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
  }

  deleteCerita(cerita: any) {
    if (!cerita?.id) return;

    this.isDeletingCerita = true;
    this.dashboardSvc.delete(DashboardServiceType.CERITA_DELETE, { id: cerita.id }).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Cerita berhasil dihapus.');
        this.fetchCeritaData();
        this.isDeletingCerita = false;
      },
      error: (err: any) => {
        this.notyf.error(err?.message || 'Gagal menghapus cerita.');
        this.isDeletingCerita = false;
      }
    });
  }

  deleteQuote(quote: any) {
    if (!quote?.id) return;

    this.isDeletingQuote = true;
    this.dashboardSvc.delete(DashboardServiceType.QUOTE_DELETE, { id: quote.id }).subscribe({
      next: (res: any) => {
        this.notyf.success(res?.message || 'Quote berhasil dihapus.');
        this.fetchQuoteData();
        this.isDeletingQuote = false;
      },
      error: (err: any) => {
        this.notyf.error(err?.message || 'Gagal menghapus quote.');
        this.isDeletingQuote = false;
      }
    });
  }
}

import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Notyf } from 'notyf';
import { DashboardService, DashboardServiceType } from 'src/app/dashboard.service';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'wc-data-registrasi',
  templateUrl: './data-registrasi.component.html',
  styleUrls: ['./data-registrasi.component.scss']
})
export class DataRegistrasiComponent implements OnInit {

  @Input() formData: any = {};
  @Output() next = new EventEmitter<any>();
  @Output() prev = new EventEmitter<void>();

  formRegis!: FormGroup;
  private notyf: Notyf;
  modalRef?: BsModalRef;
  paketOptions: any;
  selectedPrice: string = '';
  emailError: string | null = null;
  domainError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private modalSvc: BsModalService,
    private dashboardSvc: DashboardService,
    private router: Router

  ) {
    this.notyf = new Notyf({
      duration: 3000,
      position: {
        x: 'right',
        y: 'top'
      }
    });
  }

  ngOnInit(): void {
    this.initMasterDataPaket();

    this.formRegis = this.fb.group({
      paket_undangan_id: ['', Validators.required],
      price: [this.selectedPrice],
      domain: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      kode_pemesanan: [null],
    });

    if (this.formData && Object.keys(this.formData).length > 0) {
      this.formRegis.patchValue(this.formData.formData);
      localStorage.setItem('formData', JSON.stringify(this.formData));
    }
    const savedFormData = localStorage.getItem('formRegis');
    if (savedFormData) {
      this.formRegis.patchValue(JSON.parse(savedFormData));
    }
    this.formRegis.valueChanges.subscribe((value) => {
      localStorage.setItem('formRegis', JSON.stringify(value));
    });
    const savedData = localStorage.getItem('formData');

    if (savedData) {
      this.formData = JSON.parse(savedData);
      this.formRegis.patchValue(this.formData.formData);
      this.formRegis.patchValue({
        kode_pemesanan: JSON.parse(savedData).response.user.kode_pemesanan,
      });
    }

  }


  initMasterDataPaket(): void {
    this.dashboardSvc.list(DashboardServiceType.MNL_MD_PACK_INVITATION).subscribe({
      next: (res) => {
        this.paketOptions = res.data;
      },
    });
  }

  onPaketSelect(event: any): void {
    const selectedPaket = this.paketOptions.find((paket: any) => paket.id === event);
    if (selectedPaket) {
      this.selectedPrice = selectedPaket.price || '';
    } else {
      this.selectedPrice = '';
    }
    this.formRegis.patchValue({
      price: this.selectedPrice
    });
  }

  submit(): void {
    if (this.formRegis.valid) {
      const initialState = {
        message: 'Apakah anda ingin menyimpan data registrasi?',
        cancelClicked: () => this.handleCancelClicked(),
        submitClicked: () => this.saveRegistration(),
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
      this.formRegis.markAllAsTouched();
    }
  }

  saveRegistration(): void {
    const payload = new FormData();
    Object.keys(this.formRegis.value).forEach((key) => {
      payload.append(key, this.formRegis.get(key)?.value);
    });
    localStorage.setItem('formData', JSON.stringify(this.formData));

    this.dashboardSvc.create(DashboardServiceType.MNL_STEP_ONE, payload).subscribe({
      next: (res) => {
        this.modalRef?.hide();
        localStorage.setItem('access_token', res.token);
        this.next.emit({ response: res, formData: this.formRegis.value, step: 2 });
        this.formRegis.patchValue(this.formData);
        this.notyf.success(res?.message || 'Data berhasil disimpan.');
      },
      error: (err) => {
        const validationErrors = err?.error?.errors;

        if (validationErrors) {
          if (validationErrors.domain?.[0]) {
            this.domainError = 'Domain sudah diambil';
          }
          if (validationErrors.email?.[0]) {
            this.emailError = 'Email sudah diambil';
          }
        } else {
          this.notyf.error(err?.error?.message || 'Ada kesalahan dalam sistem.');
        }
      }
    })
  }


  handleCancelClicked(): void {
    this.modalRef?.hide();
  }

  onCancel(){
    this.router.navigate(['/']);
  }

  onEmailInput(): void {
    this.emailError = null;
  }

  onDomainInput(): void {
    this.domainError = null;
  }

}

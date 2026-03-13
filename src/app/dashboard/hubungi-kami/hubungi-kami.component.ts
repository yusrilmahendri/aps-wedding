import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DashboardService } from 'src/app/dashboard.service';
import { UserContactSetting, UserContactSettingResponse } from 'src/app/interfaces/admin-contact-setting.interface';
import { Notyf } from 'notyf';

@Component({
  selector: 'wc-hubungi-kami',
  templateUrl: './hubungi-kami.component.html',
  styleUrls: ['./hubungi-kami.component.scss']
})
export class HubungiKamiComponent implements OnInit {
  contactData: UserContactSetting | null = null;
  isLoading = false;
  private notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    dismissible: true
  });

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadContactInfo();
  }

  loadContactInfo(): void {
    this.isLoading = true;

    this.dashboardService.getUserContactSettings().subscribe({
      next: (response: UserContactSettingResponse) => {
        this.contactData = response.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (error.status === 404) {
          this.isLoading = false;
        } else {
          console.error('Error loading contact info:', error);
          this.notyf.error('Gagal memuat informasi kontak');
          this.isLoading = false;
        }
      }
    });
  }

  openEmail(email: string): void {
    window.location.href = `mailto:${email}`;
  }

  openWhatsApp(phoneNumber: string): void {
    // Remove all non-numeric characters
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    // Open WhatsApp in new tab
    window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardServiceType } from '../dashboard.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'wc-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dashboardService: DashboardService,
    private seoService: SeoService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    });
  }

  ngOnInit(): void {
    this.setSeoTags();
  }

  private setSeoTags(): void {
    // Set SEO meta tags for register page
    this.seoService.setMetaTags({
      title: 'Daftar Gratis - Buat Undangan Digital Pernikahan | Sena Digital',
      description: 'Daftar sekarang dan mulai buat undangan digital pernikahan Anda secara gratis. Proses mudah, cepat, dan tanpa biaya tersembunyi.',
      keywords: 'daftar undangan digital, register wedding invitation, daftar gratis, buat akun sena digital',
      url: 'https://sena-digital.com/register',
      image: 'https://sena-digital.com/assets/images/sena-digital-og-image.jpg',
      type: 'website'
    });
  }

  onRegister() {
    if (this.loginForm.valid) {
      const formData = this.loginForm.value;

      this.dashboardService.create(DashboardServiceType.USER_REGISTER, formData).subscribe(
        (response) => {
          this.errorMessage = '';
          this.router.navigate(['/dashboard']);
        },
        (error) => {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      );
    }
  }

}

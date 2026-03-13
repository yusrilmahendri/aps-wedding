import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../dashboard.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'wc-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private dashboardService: DashboardService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.setSeoTags();
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'];
      }
    });
  }

  private setSeoTags(): void {
    // Set SEO meta tags for login page
    this.seoService.setMetaTags({
      title: 'Login - Sena Digital Wedding Invitation',
      description: 'Login ke akun Sena Digital Anda untuk mengelola undangan digital pernikahan.',
      keywords: 'login sena digital, masuk akun, wedding invitation login',
      url: 'https://sena-digital.com/login',
      image: 'https://sena-digital.com/assets/images/sena-digital-og-image.jpg',
      type: 'website'
    });
  }

  onLogin() {
    this.dashboardService.login(this.email, this.password).subscribe(
      (response: any) => {
        this.errorMessage = '';
        if (response.role.includes('user')) {
          this.router.navigate(['/dashboard']);
        } else if (response.role.includes('admin')) {
          this.router.navigate(['/admin']);
        } else {
          this.errorMessage = 'Unauthorized role. Please contact support.';
        }
      },
      error => {
        this.errorMessage = 'Login failed. Please check your credentials.';
      }
    );
  }
  
}

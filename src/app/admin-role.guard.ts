import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AdminRoleGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      // Redirect non-admins: users go to /dashboard, everyone else to /login
      const token = localStorage.getItem('access_token');
      if (token) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }
      return false;
    }
    return true;
  }
}

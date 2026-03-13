import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import {
  DashboardService,
  DashboardServiceType,
  ProfileData,
  ProfileResponse
} from '../dashboard.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'wc-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss'],
  animations: [
    // Sidebar slide animation
    trigger('sidebarSlide', [
      state('closed', style({
        transform: 'translateX(-100%)'
      })),
      state('open', style({
        transform: 'translateX(0)'
      })),
      transition('closed <=> open', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),

    // Submenu dropdown animation
    trigger('submenuExpand', [
      state('collapsed', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: '1',
        overflow: 'hidden'
      })),
      transition('collapsed <=> expanded', animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),

    // Menu items stagger animation
    trigger('menuItemsStagger', [
      transition('* => *', [
        query('.menu-item', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  currentRouteName: string = '';
  routePath: string = '';
  isWebsiteSubmenuOpen: boolean = false;
  isPengunjungSubmenuOpen: boolean = false;
  isDropdownOpen = false;
  isSidebarOpen = false;
  dataAdmin: ProfileData | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private DashBoardSvc: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

    ngOnInit(): void {
    this.getAdminProfile();
    this.setRouteName();
    this.setRoutePath();

    // Listen for router events
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.setRouteName();
      this.setRoutePath();
      // Refresh profile data when navigating back from profile page
      if (this.router.url.includes('/admin') && !this.router.url.includes('/profile')) {
        this.getAdminProfile();
      }
    });

    // Listen for profile updates from admin profile component
    window.addEventListener('adminProfileUpdated', () => {
      console.log('Admin profile updated event received, refreshing profile data...');
      this.getAdminProfile();
    });
  }

  private initializeSidebarState(): void {
    // Sidebar should be open by default on desktop (>1024px)
    this.isSidebarOpen = window.innerWidth > 1024;
  }

  getAdminProfile(): void {
    console.log('Attempting to fetch admin profile...');
    this.DashBoardSvc.getAdminProfile().subscribe({
      next: (response: ProfileResponse) => {
        this.dataAdmin = response.data;
        console.log('Admin profile data loaded successfully:', this.dataAdmin);
        this.cdr.detectChanges(); // Force change detection
      },
      error: (error) => {
        console.error('Error loading admin profile from new endpoint:', error);
        console.log('Trying fallback endpoint...');
        // Fallback to old method if new admin endpoint fails
        this.DashBoardSvc.list(DashboardServiceType.ADM_IDX_DASHBOARD).subscribe({
          next: (res) => {
            const admin = res?.admin?.data[0] ?? [];
            this.dataAdmin = admin;
            console.log('Admin profile data loaded from fallback:', this.dataAdmin);
            this.cdr.detectChanges();
          },
          error: (fallbackError) => {
            console.error('Error loading admin profile from fallback endpoint:', fallbackError);
            this.dataAdmin = null;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  private setRouteName(): void {
    const route = this.activatedRoute.firstChild?.snapshot.routeConfig?.path;
    this.currentRouteName = route ? this.capitalizeRouteName(route) : 'Dashboard';
  }

  private setRoutePath(): void {
    this.routePath = this.getFullRoutePath(this.activatedRoute);

    // Ambil segmen terakhir dari path
    const segments = this.routePath.split('/');
    this.routePath = `/${segments[segments.length - 1]}`;
  }

  private getFullRoutePath(route: ActivatedRoute | null): string {
    let path = '';
    while (route) {
      if (route.snapshot.routeConfig) {
        path += `/${route.snapshot.routeConfig.path}`;
      }
      route = route.firstChild;
    }
    return path;
  }

  private capitalizeRouteName(route: string): string {
    return route.charAt(0).toUpperCase() + route.slice(1);
  }

  toggleDropdown(event: MouseEvent): void {
    console.log(event);
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    console.log(this.isDropdownOpen);

  }

  logout(): void {
    this.DashBoardSvc.create(DashboardServiceType.USER_LOGOUT, '').subscribe(
      () => {
        localStorage.removeItem('access_token')
        this.router.navigate(['']);
      },
    );
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.includes(route);
  }

  toggleWebsiteSubmenu(): void {
    this.isWebsiteSubmenuOpen = !this.isWebsiteSubmenuOpen;
  }

  togglePengunjungSubmenu(): void {
    this.isPengunjungSubmenuOpen = !this.isPengunjungSubmenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close user dropdown if clicked outside
    if (target && !target.closest('.user-profile')) {
      this.isDropdownOpen = false;
    }

    // Close sidebar if clicked outside on mobile/tablet
    if (target && !target.closest('.sidebar') && !target.closest('.menu-toggle')) {
      if (window.innerWidth <= 1024) {
        this.closeSidebar();
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any): void {
    const windowWidth = event.target.innerWidth;

    if (windowWidth > 1024) {
      // Desktop: sidebar should be open
      this.isSidebarOpen = true;
    } else if (windowWidth <= 768) {
      // Mobile: sidebar should be closed
      this.isSidebarOpen = false;
    }
    // Tablet (769-1024): keep current state
  }

  selectMenu(): void {
    this.isDropdownOpen = false;
    // Close sidebar on mobile after menu selection
    if (window.innerWidth <= 768) {
      this.closeSidebar();
    }
  }

  // Handle menu item click for mobile
  onMenuItemClick(): void {
    if (window.innerWidth <= 768) {
      this.closeSidebar();
    }
  }

  /**
   * Get profile photo URL with proper backend server resolution
   */
  getProfilePhotoUrl(): string {
    if (this.dataAdmin?.profile_photo_url) {
      // If the URL is relative (starts with /storage), prepend the API base URL
      if (this.dataAdmin.profile_photo_url.startsWith('/storage')) {
        return `http://127.0.0.1:8000${this.dataAdmin.profile_photo_url}`;
      }
      // If it's already an absolute URL, return as is
      return this.dataAdmin.profile_photo_url;
    }
    // Default avatar if no profile photo
    return 'assets/wom.png';
  }

  /**
   * Get admin display name
   */
  getAdminDisplayName(): string {
    return this.dataAdmin?.name || this.dataAdmin?.email || 'Admin';
  }

  /**
   * Refresh admin profile data manually
   */
  refreshProfile(): void {
    this.getAdminProfile();
  }

  /**
   * Handle storage changes for profile updates
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'profileUpdated') {
      this.getAdminProfile();
    }
  }

  /**
   * Handle custom profile update events
   */
  private handleProfileUpdate(event: any): void {
    this.getAdminProfile();
  }

  /**
   * Get current year for copyright
   */
  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  ngOnDestroy(): void {
    // Cleanup event listeners
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    window.removeEventListener('profileUpdated', this.handleProfileUpdate.bind(this));
  }
}

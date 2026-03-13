import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import {
  DashboardService,
  DashboardServiceType,
  ProfileData,
  ProfileResponse
} from 'src/app/dashboard.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'wc-dashboard-user',
  templateUrl: './dashboard-user.component.html',
  styleUrls: ['./dashboard-user.component.scss'],
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
export class DashboardUserComponent implements OnInit, OnDestroy {
  currentRouteName: string = '';
  routePath: string = '';
  isWebsiteSubmenuOpen: boolean = false;
  isPengunjungSubmenuOpen: boolean = false;
  isDropdownOpen = false;
  isSidebarOpen = false;
  userData: ProfileData | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private DashBoardSvc: DashboardService
  ) {}

  ngOnInit(): void {
    // Initialize sidebar state based on screen size
    this.initializeSidebarState();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.setRouteName();
      this.setRoutePath();
      // Refresh profile data when navigating back from profile page
      if (this.router.url.includes('/dashboard') && !this.router.url.includes('/profile')) {
        this.getUserProfile();
      }
    });

    this.setRouteName();
    this.setRoutePath();
    this.getUserProfile();

    // Listen for profile updates from other components/tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    window.addEventListener('profileUpdated', this.handleProfileUpdate.bind(this));
  }

  private initializeSidebarState(): void {
    // Sidebar should be open by default on desktop (>1024px)
    this.isSidebarOpen = window.innerWidth > 1024;
  }

  getUserProfile(): void {
    this.DashBoardSvc.getProfile().subscribe({
      next: (response: ProfileResponse) => {
        this.userData = response.data;
        console.log('User profile data:', this.userData);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
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
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
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
    this.router.navigate(['/dashboard/profile']);
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
    if (this.userData?.profile_photo_url) {
      // If the URL is relative (starts with /storage), prepend the API base URL
      if (this.userData.profile_photo_url.startsWith('/storage')) {
        return `http://127.0.0.1:8000${this.userData.profile_photo_url}`;
      }
      // If it's already an absolute URL, return as is
      return this.userData.profile_photo_url;
    }
    // Default avatar if no profile photo
    return 'assets/wom.png';
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    return this.userData?.name || this.userData?.email || 'User';
  }

  /**
   * Refresh profile data manually
   */
  refreshProfile(): void {
    this.getUserProfile();
  }

  /**
   * Handle storage changes for profile updates
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'profileUpdated') {
      this.getUserProfile();
    }
  }

  /**
   * Handle custom profile update events
   */
  private handleProfileUpdate(event: any): void {
    this.getUserProfile();
  }

  onClickBill(): void {
    this.router.navigate(['/dashboard/bill']);
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

import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, interval, from } from 'rxjs';
import { switchMap, take, takeWhile, catchError, finalize } from 'rxjs/operators';
import { DashboardService, DashboardServiceType } from '../dashboard.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SnapTokenPayload {
  invitation_id: number;
  amount: number;
  customer_details?: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
  };
  item_details?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface SnapTokenResponse {
  success: boolean;
  data: {
    snap_token: string;
    order_id: string;
    gross_amount: number;
    invitation_id: number;
    expires_at: string;
  };
  message: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  payment_status: 'paid' | 'pending' | 'failed' | 'unknown';
  transaction_status?: string;
  message: string;
  data?: {
    order_id: string;
    transaction_id?: string;
    payment_confirmed_at?: string;
    domain_expires_at?: string;
  };
}

export interface SnapCallbacks {
  onSuccess: (result: SnapResult) => void;
  onPending: (result: SnapResult) => void;
  onError: (result: SnapResult) => void;
  onClose: () => void;
}

export interface SnapResult {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

// ─── Snap.js window declaration ───────────────────────────────────────────────

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapCallbacks) => void;
      hide: () => void;
    };
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class MidtransPaymentService {
  private snapScriptLoaded = false;
  private readonly SNAP_SANDBOX_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
  private readonly SNAP_PRODUCTION_URL = 'https://app.midtrans.com/snap/snap.js';
  private readonly POLL_INTERVAL_MS = 5000;
  private readonly POLL_MAX_ATTEMPTS = 180; // 15 minutes (180 × 5s) to handle delayed payments

  constructor(
    private dashboardSvc: DashboardService,
    private http: HttpClient,
    private ngZone: NgZone,
  ) {}

  /**
   * Load Snap.js script dynamically with the user's client key.
   * Safe to call multiple times — skips if already loaded.
   */
  loadSnapScript(clientKey: string, isProduction: boolean = false): Promise<void> {
    if (this.snapScriptLoaded && window.snap) {
      return Promise.resolve();
    }

    // If window.snap is already available (e.g., pre-stubbed in tests), skip CDN load
    if (window.snap) {
      this.snapScriptLoaded = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.getElementById('midtrans-snap-script');
      if (existing) {
        existing.remove();
        this.snapScriptLoaded = false;
      }

      const script = document.createElement('script');
      script.id = 'midtrans-snap-script';
      script.src = isProduction ? this.SNAP_PRODUCTION_URL : this.SNAP_SANDBOX_URL;
      script.setAttribute('data-client-key', clientKey);
      script.type = 'text/javascript';

      script.onload = () => {
        this.snapScriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Midtrans Snap.js script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Request a Snap token from the backend.
   * Requires user to be authenticated (Bearer token sent via interceptor).
   */
  createSnapToken(payload: SnapTokenPayload): Observable<SnapTokenResponse> {
    const url = this.dashboardSvc.getUrl(DashboardServiceType.MIDTRANS_CREATE_SNAP_TOKEN);
    return this.http.post<SnapTokenResponse>(url, payload).pipe(
      catchError((err) => {
        const message: string =
          err?.error?.message ?? 'Failed to create payment token. Try again.';
        return throwError(() => new Error(message));
      }),
    );
  }

  /**
   * Poll Midtrans for payment status.
   * Used as fallback when webhook is delayed.
   * Stops polling after 12 attempts (1 minute) or when status is terminal.
   */
  pollPaymentStatus(orderId: string): Observable<PaymentStatusResponse> {
    const url = this.dashboardSvc.getUrl(DashboardServiceType.MIDTRANS_CHECK_STATUS);
    let attempt = 0;

    return interval(this.POLL_INTERVAL_MS).pipe(
      take(this.POLL_MAX_ATTEMPTS),
      switchMap(() => {
        attempt++;
        return this.http.post<PaymentStatusResponse>(url, { order_id: orderId });
      }),
      takeWhile(
        (res) => res.payment_status === 'pending' && attempt < this.POLL_MAX_ATTEMPTS,
        true,
      ),
      catchError((err) => {
        return throwError(() => new Error(err?.error?.message ?? 'Status check failed'));
      }),
    );
  }

  /**
   * Single call to check payment status (no polling loop).
   * Used for immediate payment confirmation after onSuccess callback.
   */
  checkPaymentStatus(orderId: string): Observable<PaymentStatusResponse> {
    const url = this.dashboardSvc.getUrl(DashboardServiceType.MIDTRANS_CHECK_STATUS);
    return this.http.post<PaymentStatusResponse>(url, { order_id: orderId }).pipe(
      catchError((err) => {
        const message = err?.error?.message ?? 'Failed to verify payment status';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Open the Midtrans Snap payment popup.
   * Loads Snap.js first if not yet loaded.
   */
  openSnapPopup(
    snapToken: string,
    clientKey: string,
    callbacks: SnapCallbacks,
    isProduction: boolean = false,
  ): Promise<void> {
    return this.loadSnapScript(clientKey, isProduction).then(() => {
      if (!window.snap) {
        throw new Error('Snap.js is not available after script load');
      }

      this.ngZone.run(() => {
        window.snap!.pay(snapToken, {
          onSuccess: (result) => callbacks.onSuccess(result),
          onPending: (result) => callbacks.onPending(result),
          onError: (result) => callbacks.onError(result),
          onClose: () => callbacks.onClose(),
        });
      });
    });
  }
}

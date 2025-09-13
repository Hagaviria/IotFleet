import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  userState$: Observable<boolean> = this.isLoggedIn.asObservable();

  constructor() {}

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return !!window.localStorage.getItem(this.TOKEN_KEY);
      } catch {
        return false;
      }
    }
    return false;
  }
  initialize(): void {
    this.isLoggedIn.next(this.hasToken());
  }

  login(username: string, password: string): Observable<boolean> {
    return of(username === 'admin' && password === '12345').pipe(
      tap((success) => {
        if (success && isPlatformBrowser(this.platformId)) {
          try {
            window.localStorage.setItem(this.TOKEN_KEY, 'fake_token');
          } catch {}
          this.isLoggedIn.next(true);
        }
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        window.localStorage.removeItem(this.TOKEN_KEY);
      } catch {}
    }
    this.isLoggedIn.next(false);
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn.value;
  }
}

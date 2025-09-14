import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_ROLE_KEY = 'user_role';
  private readonly USER_ID_KEY = 'user_id';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private readonly userRole = new BehaviorSubject<string>(this.getUserRole());
  userState$: Observable<boolean> = this.isLoggedIn.asObservable();
  userRole$: Observable<string> = this.userRole.asObservable();

  private readonly API_BASE_URL = 'https://localhost:7162/api';

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

  getUserRole(): string {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return window.localStorage.getItem(this.USER_ROLE_KEY) || 'User';
      } catch {
        return 'User';
      }
    }
    return 'User';
  }
  initialize(): void {
    this.isLoggedIn.next(this.hasToken());
  }

  login(email: string, password: string): Observable<boolean> {
    const loginData = { Email: email, Password: password };
    
    return this.http.post<any>(`${this.API_BASE_URL}/Login`, loginData).pipe(
      map((response) => {
        if (response && response.success && response.data) {
          const data = response.data;
          
          const token = data.Token;
          const role = data.NombrePerfil || 'user';
          const userId = data.Identificacion || '';
          const email = data.Correo || '';
          const name = data.Nombre || '';
          
          if (token) {
            if (isPlatformBrowser(this.platformId)) {
              try {
                window.localStorage.setItem(this.TOKEN_KEY, token);
                window.localStorage.setItem(this.USER_ROLE_KEY, role);
                window.localStorage.setItem(this.USER_ID_KEY, userId);
                window.localStorage.setItem('user_email', email);
                window.localStorage.setItem('user_name', name);
              } catch (error) {
                console.error('Error guardando en localStorage:', error);
              }
            }
            
            this.isLoggedIn.next(true);
            this.userRole.next(role);
            return true;
          }
        }
        
        return false;
      }),
      catchError((error) => {
        console.error('Error completo en login:', error);
        return of(false);
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        window.localStorage.removeItem(this.TOKEN_KEY);
        window.localStorage.removeItem(this.USER_ROLE_KEY);
        window.localStorage.removeItem(this.USER_ID_KEY);
      } catch {}
    }
    this.isLoggedIn.next(false);
    this.userRole.next('User');
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return window.localStorage.getItem(this.TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn.value;
  }

  isAdmin(): boolean {
    return this.userRole.value?.toLowerCase() === 'admin';
  }

  getUserId(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return window.localStorage.getItem(this.USER_ID_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

}
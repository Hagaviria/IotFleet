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

  // URL base de tu API
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

  private getUserRole(): string {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return window.localStorage.getItem(this.USER_ROLE_KEY) || 'user';
      } catch {
        return 'user';
      }
    }
    return 'user';
  }
  initialize(): void {
    this.isLoggedIn.next(this.hasToken());
  }

  login(email: string, password: string): Observable<boolean> {
    const loginData = { Email: email, Password: password };
    
    console.log('Enviando login request:', {
      url: `${this.API_BASE_URL}/Login`,
      data: loginData
    });
    
    return this.http.post<any>(`${this.API_BASE_URL}/Login`, loginData).pipe(
      map((response) => {
        console.log('Login response completa:', response);
        console.log('Tipo de respuesta:', typeof response);
        console.log('Claves de la respuesta:', Object.keys(response || {}));
        
        // Verificar si la respuesta es exitosa y tiene datos
        if (response && response.success && response.data) {
          const data = response.data;
          console.log('Datos del usuario:', data);
          
          // Extraer el token y datos del usuario
          const token = data.Token;
          const role = data.NombrePerfil || 'user';
          const userId = data.Identificacion || '';
          const email = data.Correo || '';
          const name = data.Nombre || '';
          
          console.log('Token encontrado:', token);
          console.log('Rol encontrado:', role);
          console.log('User ID encontrado:', userId);
          console.log('Email encontrado:', email);
          console.log('Nombre encontrado:', name);
          
          if (token) {
            if (isPlatformBrowser(this.platformId)) {
              try {
                window.localStorage.setItem(this.TOKEN_KEY, token);
                window.localStorage.setItem(this.USER_ROLE_KEY, role);
                window.localStorage.setItem(this.USER_ID_KEY, userId);
                window.localStorage.setItem('user_email', email);
                window.localStorage.setItem('user_name', name);
                console.log('Datos guardados en localStorage');
              } catch (error) {
                console.error('Error guardando en localStorage:', error);
              }
            }
            
            this.isLoggedIn.next(true);
            this.userRole.next(role);
            return true;
          }
        }
        
        console.log('No se encontró token en la respuesta o la respuesta no fue exitosa');
        return false;
      }),
      catchError((error) => {
        console.error('Error completo en login:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Error body:', error.error);
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
    this.userRole.next('user');
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
    return this.userRole.value === 'admin';
  }
}

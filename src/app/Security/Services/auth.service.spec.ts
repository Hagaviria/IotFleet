import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let platformId: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    platformId = TestBed.inject(PLATFORM_ID);
    
    // Limpiar localStorage antes de cada test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', (done) => {
      const mockResponse = {
        success: true,
        data: {
          Token: 'mock-jwt-token',
          NombrePerfil: 'Admin',
          Identificacion: '12345678',
          Correo: 'admin@test.com',
          Nombre: 'Test Admin'
        }
      };

      service.login('admin@test.com', 'password123').subscribe(result => {
        expect(result).toBe(true);
        expect(service.isAuthenticated()).toBe(true);
        expect(service.isAdmin()).toBe(true);
        expect(service.getUserRole()).toBe('Admin');
        expect(service.getToken()).toBe('mock-jwt-token');
        expect(service.getUserId()).toBe('12345678');
        done();
      });

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        Email: 'admin@test.com',
        Password: 'password123'
      });
      
      req.flush(mockResponse);
    });

    it('should fail login with invalid credentials', (done) => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      service.login('invalid@test.com', 'wrongpassword').subscribe(result => {
        expect(result).toBe(false);
        expect(service.isAuthenticated()).toBe(false);
        expect(service.getToken()).toBeNull();
        done();
      });

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.flush(mockResponse);
    });

    it('should handle login error gracefully', (done) => {
      service.login('test@test.com', 'password').subscribe(result => {
        expect(result).toBe(false);
        expect(service.isAuthenticated()).toBe(false);
        done();
      });

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.error(new ErrorEvent('Network error'));
    });

    it('should set user role correctly for different profiles', (done) => {
      const mockResponse = {
        success: true,
        data: {
          Token: 'mock-jwt-token',
          NombrePerfil: 'User',
          Identificacion: '87654321',
          Correo: 'user@test.com',
          Nombre: 'Test User'
        }
      };

      service.login('user@test.com', 'password123').subscribe(result => {
        expect(result).toBe(true);
        expect(service.getUserRole()).toBe('User');
        expect(service.isAdmin()).toBe(false);
        done();
      });

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.flush(mockResponse);
    });
  });

  describe('Logout', () => {
    it('should logout successfully and clear all stored data', () => {
      // Primero hacer login
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user_role', 'Admin');
      localStorage.setItem('user_id', '12345678');
      
      service.initialize();
      expect(service.isAuthenticated()).toBe(true);

      // Luego hacer logout
      service.logout();
      
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getToken()).toBeNull();
      expect(service.getUserRole()).toBe('User');
      expect(service.getUserId()).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should return stored token when available', () => {
      localStorage.setItem('auth_token', 'stored-token');
      service.initialize();
      
      expect(service.getToken()).toBe('stored-token');
    });

    it('should return null when no token is stored', () => {
      service.initialize();
      expect(service.getToken()).toBeNull();
    });

    it('should generate correct auth headers', () => {
      localStorage.setItem('auth_token', 'test-token');
      service.initialize();
      
      const headers = service.getAuthHeaders();
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should generate headers without token when not authenticated', () => {
      service.initialize();
      
      const headers = service.getAuthHeaders();
      expect(headers.get('Authorization')).toBe('');
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('User Role Management', () => {
    it('should return correct user role', () => {
      localStorage.setItem('user_role', 'Admin');
      service.initialize();
      
      expect(service.getUserRole()).toBe('Admin');
    });

    it('should return default role when no role is stored', () => {
      service.initialize();
      expect(service.getUserRole()).toBe('User');
    });

    it('should correctly identify admin users', () => {
      localStorage.setItem('user_role', 'Admin');
      service.initialize();
      
      expect(service.isAdmin()).toBe(true);
    });

    it('should correctly identify non-admin users', () => {
      localStorage.setItem('user_role', 'User');
      service.initialize();
      
      expect(service.isAdmin()).toBe(false);
    });

    it('should handle case-insensitive role comparison', () => {
      localStorage.setItem('user_role', 'admin');
      service.initialize();
      
      expect(service.isAdmin()).toBe(true);
    });
  });

  describe('Authentication State', () => {
    it('should initialize with correct authentication state', () => {
      localStorage.setItem('auth_token', 'test-token');
      service.initialize();
      
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should initialize as not authenticated when no token', () => {
      service.initialize();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should update authentication state after login', (done) => {
      const mockResponse = {
        success: true,
        data: {
          Token: 'mock-jwt-token',
          NombrePerfil: 'Admin',
          Identificacion: '12345678',
          Correo: 'admin@test.com',
          Nombre: 'Test Admin'
        }
      };

      service.login('admin@test.com', 'password123').subscribe(() => {
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.flush(mockResponse);
    });
  });

  describe('User ID Management', () => {
    it('should return stored user ID', () => {
      localStorage.setItem('user_id', '12345678');
      service.initialize();
      
      expect(service.getUserId()).toBe('12345678');
    });

    it('should return null when no user ID is stored', () => {
      service.initialize();
      expect(service.getUserId()).toBeNull();
    });
  });

  describe('Platform Safety', () => {
    it('should handle server-side rendering gracefully', () => {
      // Simular entorno de servidor
      const serverService = new AuthService();
      
      expect(serverService.getToken()).toBeNull();
      expect(serverService.getUserRole()).toBe('User');
      expect(serverService.getUserId()).toBeNull();
      expect(serverService.isAuthenticated()).toBe(false);
    });
  });

  describe('Observable State', () => {
    it('should emit authentication state changes', (done) => {
      let stateChanges = 0;
      
      service.userState$.subscribe(isLoggedIn => {
        stateChanges++;
        if (stateChanges === 1) {
          expect(isLoggedIn).toBe(false); // Estado inicial
        } else if (stateChanges === 2) {
          expect(isLoggedIn).toBe(true); // Después del login
          done();
        }
      });

      const mockResponse = {
        success: true,
        data: {
          Token: 'mock-jwt-token',
          NombrePerfil: 'Admin',
          Identificacion: '12345678',
          Correo: 'admin@test.com',
          Nombre: 'Test Admin'
        }
      };

      service.login('admin@test.com', 'password123').subscribe();

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.flush(mockResponse);
    });

    it('should emit user role changes', (done) => {
      let roleChanges = 0;
      
      service.userRole$.subscribe(role => {
        roleChanges++;
        if (roleChanges === 1) {
          expect(role).toBe('User'); // Estado inicial
        } else if (roleChanges === 2) {
          expect(role).toBe('Admin'); // Después del login
          done();
        }
      });

      const mockResponse = {
        success: true,
        data: {
          Token: 'mock-jwt-token',
          NombrePerfil: 'Admin',
          Identificacion: '12345678',
          Correo: 'admin@test.com',
          Nombre: 'Test Admin'
        }
      };

      service.login('admin@test.com', 'password123').subscribe();

      const req = httpMock.expectOne('https://localhost:7162/api/Login');
      req.flush(mockResponse);
    });
  });
});

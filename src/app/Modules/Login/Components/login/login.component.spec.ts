import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../../Security/Services/auth.service';
import { LoginForm } from '../../Models/loginForm';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jest.Mocked<AuthService>;
  let router: jest.Mocked<Router>;
  let messageService: jest.Mocked<MessageService>;

  beforeEach(async () => {
    const authServiceSpy = {
      login: jest.fn()
    } as jest.Mocked<Pick<AuthService, 'login'>> as jest.Mocked<AuthService>;
    
    const routerSpy = {
      navigate: jest.fn()
    } as jest.Mocked<Pick<Router, 'navigate'>> as jest.Mocked<Router>;
    
    const messageServiceSpy = {
      add: jest.fn()
    } as jest.Mocked<Pick<MessageService, 'add'>> as jest.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Fields', () => {
    it('should have correct form fields configuration', () => {
      expect(component.formFields).toBeDefined();
      expect(component.formFields.length).toBe(2);

      const userField = component.formFields[0];
      expect(userField.key).toBe('user');
      expect(userField.label).toBe('Usuario');
      expect(userField.required).toBe(true);
      expect(userField.controlType).toBe('textbox');
      expect(userField.type).toBe('text');

      const passwordField = component.formFields[1];
      expect(passwordField.key).toBe('password');
      expect(passwordField.label).toBe('Contraseña');
      expect(passwordField.required).toBe(true);
      expect(passwordField.controlType).toBe('textbox');
      expect(passwordField.type).toBe('password');
    });
  });

  describe('onFormSubmit', () => {
    it('should call authService.login with correct credentials', () => {
      const formData = {
        user: 'testuser',
        password: 'testpassword'
      };
      authService.login.mockReturnValue(of(true));

      component.onFormSubmit(formData);

      expect(authService.login).toHaveBeenCalledWith('testuser', 'testpassword');
    });

    it('should handle empty form data', () => {
      const formData = {};
      authService.login.mockReturnValue(of(false));

      component.onFormSubmit(formData);

      expect(authService.login).toHaveBeenCalledWith('', '');
    });

    it('should handle null/undefined form data', () => {
      const formData = {
        user: null,
        password: undefined
      };
      authService.login.mockReturnValue(of(false));

      component.onFormSubmit(formData);

      expect(authService.login).toHaveBeenCalledWith('', '');
    });
  });

  describe('Login Success', () => {
    it('should handle successful login', () => {
      const formData = {
        user: 'testuser',
        password: 'testpassword'
      };
      authService.login.mockReturnValue(of(true));

      component.onFormSubmit(formData);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Sesión iniciada',
        detail: 'Bienvenido testuser'
      });
      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    });
  });

  describe('Login Invalid', () => {
    it('should handle invalid credentials', () => {
      const formData = {
        user: 'testuser',
        password: 'wrongpassword'
      };
      authService.login.mockReturnValue(of(false));

      component.onFormSubmit(formData);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Login Error', () => {
    it('should handle login error', () => {
      const formData = {
        user: 'testuser',
        password: 'testpassword'
      };
      authService.login.mockReturnValue(throwError(() => new Error('Network error')));

      component.onFormSubmit(formData);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error de inicio',
        detail: 'No se pudo iniciar sesión'
      });
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Private Methods', () => {
    it('should call handleLoginSuccess with correct user', () => {
      jest.spyOn(component as any, 'handleLoginSuccess').mockImplementation();
      const formData = {
        user: 'testuser',
        password: 'testpassword'
      };
      authService.login.mockReturnValue(of(true));

      component.onFormSubmit(formData);

      expect((component as any).handleLoginSuccess).toHaveBeenCalledWith('testuser');
    });

    it('should call handleLoginInvalid when login returns false', () => {
      jest.spyOn(component as any, 'handleLoginInvalid').mockImplementation();
      const formData = {
        user: 'testuser',
        password: 'wrongpassword'
      };
      authService.login.mockReturnValue(of(false));

      component.onFormSubmit(formData);

      expect((component as any).handleLoginInvalid).toHaveBeenCalled();
    });

    it('should call handleLoginError when login throws error', () => {
      jest.spyOn(component as any, 'handleLoginError').mockImplementation();
      const formData = {
        user: 'testuser',
        password: 'testpassword'
      };
      authService.login.mockReturnValue(throwError(() => new Error('Network error')));

      component.onFormSubmit(formData);

      expect((component as any).handleLoginError).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full login flow successfully', () => {
      const formData = {
        user: 'admin',
        password: 'admin123'
      };
      authService.login.mockReturnValue(of(true));

      component.onFormSubmit(formData);

      expect(authService.login).toHaveBeenCalledWith('admin', 'admin123');
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Sesión iniciada',
        detail: 'Bienvenido admin'
      });
      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    });

    it('should handle complete login failure flow', () => {
      const formData = {
        user: 'invaliduser',
        password: 'invalidpass'
      };
      authService.login.mockReturnValue(of(false));

      component.onFormSubmit(formData);

      expect(authService.login).toHaveBeenCalledWith('invaliduser', 'invalidpass');
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});

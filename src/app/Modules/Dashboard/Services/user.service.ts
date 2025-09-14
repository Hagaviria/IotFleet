import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { AuthService } from '../../../Security/Services/auth.service';

export interface User {
  id: string;
  identificacion: string;
  nombre_completo: string;
  correo: string;
  id_perfil: number;
  nombre_perfil: string;
  estado: boolean;
  creado_en: Date;
  direccion?: string;
  telefono_fijo?: string;
  telefono_celular?: string;
  fecha_nacimiento?: Date;
  tipo_identificacion?: string;
}

export interface CreateUserRequest {
  identificacion: string;
  nombre_completo: string;
  correo: string;
  contraseña: string;
  id_perfil: number;
  estado: boolean;
  direccion?: string;
  telefono_fijo?: string;
  telefono_celular?: string;
  fecha_nacimiento?: Date;
  tipo_identificacion?: string;
}

export interface UpdateUserRequest {
  identificacion?: string;
  nombre_completo?: string;
  correo?: string;
  id_perfil?: number;
  estado?: boolean;
  direccion?: string;
  telefono_fijo?: string;
  telefono_celular?: string;
  fecha_nacimiento?: Date;
  tipo_identificacion?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserScreenPermissions {
  screenId: string;
  screenName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsers(): Observable<User[]> {
    
    return this.http.get<any>(`${this.API_BASE_URL}/Users`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        
        let usersArray: any[] = [];
        
        if (response && Array.isArray(response)) {
          usersArray = response;
        }
        else if (response && response.success && response.data && Array.isArray(response.data)) {
          usersArray = response.data;
        }
        else if (response && response.data && Array.isArray(response.data)) {
          usersArray = response.data;
        }
        else {
          return [];
        }
        
        const mappedUsers = usersArray.map(apiUser => this.mapApiUserToUser(apiUser));
        return mappedUsers;
      }),
      catchError(error => {
        console.error('❌ Error fetching users:', error);
        return of([]);
      })
    );
  }

  private mapApiUserToUser(apiUser: any): User {
    return {
      id: apiUser.Id,
      identificacion: apiUser.Identificacion,
      nombre_completo: apiUser.Nombre_completo,
      correo: apiUser.Correo,
      id_perfil: apiUser.Id_perfil,
      nombre_perfil: apiUser.Nombre_perfil,
      estado: apiUser.Estado,
      creado_en: new Date(apiUser.Creado_en),
      direccion: apiUser.Direccion,
      telefono_fijo: apiUser.TelefonoFijo,
      telefono_celular: apiUser.TelefonoCelular,
      fecha_nacimiento: apiUser.FechaNacimiento ? new Date(apiUser.FechaNacimiento) : undefined,
      tipo_identificacion: apiUser.TipoIdentificacion
    };
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_BASE_URL}/Users/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.API_BASE_URL}/Users`, user, {
      headers: this.authService.getAuthHeaders()
    });
  }

  updateUser(id: string, user: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.API_BASE_URL}/Users/${id}`, user, {
      headers: this.authService.getAuthHeaders()
    });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/Users/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  changePassword(id: string, passwordData: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/Users/${id}/change-password`, passwordData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getUserScreenPermissions(userId: string): Observable<UserScreenPermissions[]> {
    return this.http.get<UserScreenPermissions[]>(`${this.API_BASE_URL}/Users/${userId}/screen-permissions`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getProfileOptions() {
    return [
      { label: 'Admin', value: 1, description: 'Acceso completo al sistema' },
      { label: 'User', value: 2, description: 'Acceso limitado a funciones básicas' }
    ];
  }

  getIdentificationTypeOptions() {
    return [
      { label: 'Cédula de Ciudadanía', value: 'CC' },
      { label: 'Cédula de Extranjería', value: 'CE' },
      { label: 'Pasaporte', value: 'PA' },
      { label: 'Tarjeta de Identidad', value: 'TI' },
      { label: 'Registro Civil', value: 'RC' }
    ];
  }

  validateEmailUnique(email: string, excludeUserId?: string): Observable<{ isUnique: boolean }> {
    const params: any = { email };
    if (excludeUserId) {
      params.excludeUserId = excludeUserId;
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.API_BASE_URL}/Users/validate-email`, {
      headers: this.authService.getAuthHeaders(),
      params
    });
  }

  validateIdentificationUnique(identificacion: string, excludeUserId?: string): Observable<{ isUnique: boolean }> {
    const params: any = { identificacion };
    if (excludeUserId) {
      params.excludeUserId = excludeUserId;
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.API_BASE_URL}/Users/validate-identification`, {
      headers: this.authService.getAuthHeaders(),
      params
    });
  }
}

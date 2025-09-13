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

// Interface para la respuesta de la API
export interface ApiUser {
  Id: string;
  Identificacion: string;
  Nombre_completo: string;
  Correo: string;
  Id_perfil: number;
  Nombre_perfil: string;
  Estado: boolean;
  Creado_en: string;
  UpdatedAt: string;
  Direccion?: string;
  TelefonoFijo?: string;
  TelefonoCelular?: string;
  FechaNacimiento?: string;
  TipoIdentificacion?: string;
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

  // Obtener todos los usuarios
  getUsers(): Observable<User[]> {
    console.log('🌐 Making API call to:', `${this.API_BASE_URL}/Users`);
    console.log('🔑 Auth headers:', this.authService.getAuthHeaders());
    
    return this.http.get<any>(`${this.API_BASE_URL}/Users`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log('📥 Raw API response:', response);
        
        // Si la respuesta es directamente un array
        if (response && Array.isArray(response)) {
          console.log('✅ Direct array response:', response);
          const mappedUsers = response.map((apiUser: ApiUser) => this.mapApiUserToUser(apiUser));
          console.log('✅ Mapped users:', mappedUsers);
          return mappedUsers;
        }
        
        // Si la respuesta tiene la estructura { success: true, data: [...] }
        if (response && response.success && response.data && Array.isArray(response.data)) {
          console.log('✅ Success response with data array:', response.data);
          const mappedUsers = response.data.map((apiUser: ApiUser) => this.mapApiUserToUser(apiUser));
          console.log('✅ Mapped users from success response:', mappedUsers);
          return mappedUsers;
        }
        
        // Si la respuesta tiene solo la propiedad data
        if (response && response.data && Array.isArray(response.data)) {
          console.log('✅ Data array response:', response.data);
          const mappedUsers = response.data.map((apiUser: ApiUser) => this.mapApiUserToUser(apiUser));
          console.log('✅ Mapped users from data:', mappedUsers);
          return mappedUsers;
        }
        
        console.log('⚠️ No valid data found, returning empty array');
        return [];
      }),
      catchError(error => {
        console.error('❌ Error fetching users:', error);
        return of([]);
      })
    );
  }

  // Mapear usuario de la API al modelo del frontend
  private mapApiUserToUser(apiUser: ApiUser): User {
    console.log('🔄 Mapping API user:', apiUser);
    
    const mappedUser: User = {
      id: apiUser.Id,
      identificacion: apiUser.Identificacion,
      nombre_completo: apiUser.Nombre_completo,
      correo: apiUser.Correo,
      id_perfil: apiUser.Id_perfil,
      nombre_perfil: apiUser.Nombre_perfil,
      estado: apiUser.Estado,
      creado_en: new Date(apiUser.Creado_en),
      direccion: apiUser.Direccion || undefined,
      telefono_fijo: apiUser.TelefonoFijo || undefined,
      telefono_celular: apiUser.TelefonoCelular || undefined,
      fecha_nacimiento: apiUser.FechaNacimiento ? new Date(apiUser.FechaNacimiento) : undefined,
      tipo_identificacion: apiUser.TipoIdentificacion || undefined
    };
    
    console.log('✅ Mapped user result:', mappedUser);
    return mappedUser;
  }

  // Obtener usuario por ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_BASE_URL}/Users/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Crear nuevo usuario
  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.API_BASE_URL}/Users`, user, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Actualizar usuario
  updateUser(id: string, user: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.API_BASE_URL}/Users/${id}`, user, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Eliminar usuario
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/Users/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Cambiar contraseña
  changePassword(id: string, passwordData: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/Users/${id}/change-password`, passwordData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtener permisos de pantalla del usuario
  getUserScreenPermissions(userId: string): Observable<UserScreenPermissions[]> {
    return this.http.get<UserScreenPermissions[]>(`${this.API_BASE_URL}/Users/${userId}/screen-permissions`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtener opciones de perfiles
  getProfileOptions() {
    return [
      { label: 'Admin', value: 1, description: 'Acceso completo al sistema' },
      { label: 'User', value: 2, description: 'Acceso limitado a funciones básicas' }
    ];
  }

  // Obtener opciones de tipos de identificación
  getIdentificationTypeOptions() {
    return [
      { label: 'Cédula de Ciudadanía', value: 'CC' },
      { label: 'Cédula de Extranjería', value: 'CE' },
      { label: 'Pasaporte', value: 'PA' },
      { label: 'Tarjeta de Identidad', value: 'TI' },
      { label: 'Registro Civil', value: 'RC' }
    ];
  }

  // Validar email único
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

  // Validar identificación única
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

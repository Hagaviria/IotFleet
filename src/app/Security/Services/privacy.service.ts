import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  private authService = inject(AuthService);

  /**
   * Enmascara un ID de dispositivo para usuarios no-administradores
   * @param deviceId ID original del dispositivo
   * @returns ID enmascarado o original según el rol del usuario
   */
  maskDeviceId(deviceId: string): string {
    const userRole = this.authService.getUserRole();
    
    // Solo los administradores pueden ver IDs completos
    if (userRole === 'Admin') {
      return deviceId;
    }
    
    // Para usuarios no-admin, enmascarar el ID
    return this.maskId(deviceId);
  }

  /**
   * Enmascara un ID de vehículo para usuarios no-administradores
   * @param vehicleId ID original del vehículo
   * @returns ID enmascarado o original según el rol del usuario
   */
  maskVehicleId(vehicleId: string): string {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'Admin') {
      return vehicleId;
    }
    
    return this.maskId(vehicleId);
  }

  /**
   * Enmascara un ID de usuario para usuarios no-administradores
   * @param userId ID original del usuario
   * @returns ID enmascarado o original según el rol del usuario
   */
  maskUserId(userId: string): string {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'Admin') {
      return userId;
    }
    
    return this.maskId(userId);
  }

  /**
   * Enmascara cualquier ID genérico
   * @param id ID original
   * @returns ID enmascarado en formato DEV-****-XXXX
   */
  private maskId(id: string): string {
    if (!id || id.length < 8) {
      return 'DEV-****-****';
    }

    // Extraer partes del ID (asumiendo formato UUID o similar)
    const parts = id.split('-');
    
    if (parts.length >= 3) {
      // Formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
      // Resultado: DEV-****-XXXX (últimos 4 caracteres)
      const lastPart = parts[parts.length - 1];
      const maskedPart = lastPart.substring(Math.max(0, lastPart.length - 4));
      return `DEV-****-${maskedPart.toUpperCase()}`;
    } else {
      // Para IDs sin formato estándar, tomar últimos 4 caracteres
      const maskedPart = id.substring(Math.max(0, id.length - 4));
      return `DEV-****-${maskedPart.toUpperCase()}`;
    }
  }

  /**
   * Enmascara datos sensibles en un objeto
   * @param data Objeto con datos sensibles
   * @param fieldsToMask Campos que deben ser enmascarados
   * @returns Objeto con IDs enmascarados
   */
  maskSensitiveData<T>(data: T, fieldsToMask: string[]): T {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'Admin') {
      return data; // Los admins ven todo
    }

    const maskedData = { ...data } as any;
    
    fieldsToMask.forEach(field => {
      if (maskedData[field]) {
        maskedData[field] = this.maskId(maskedData[field]);
      }
    });

    return maskedData;
  }

  /**
   * Enmascara una lista de objetos con datos sensibles
   * @param dataList Lista de objetos
   * @param fieldsToMask Campos que deben ser enmascarados
   * @returns Lista con IDs enmascarados
   */
  maskSensitiveDataList<T>(dataList: T[], fieldsToMask: string[]): T[] {
    return dataList.map(item => this.maskSensitiveData(item, fieldsToMask));
  }

  /**
   * Verifica si el usuario actual es administrador
   * @returns true si es admin, false en caso contrario
   */
  isAdmin(): boolean {
    return this.authService.getUserRole() === 'Admin';
  }

  /**
   * Verifica si el usuario actual puede ver datos completos
   * @returns true si puede ver datos completos, false en caso contrario
   */
  canViewFullData(): boolean {
    return this.isAdmin();
  }

  /**
   * Obtiene el nivel de privacidad del usuario actual
   * @returns 'admin' | 'user' | 'guest'
   */
  getPrivacyLevel(): 'admin' | 'user' | 'guest' {
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
      case 'Admin':
        return 'admin';
      case 'User':
        return 'user';
      default:
        return 'guest';
    }
  }

  /**
   * Enmascara información de contacto (email, teléfono)
   * @param contactInfo Información de contacto
   * @returns Información enmascarada
   */
  maskContactInfo(contactInfo: string): string {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'Admin') {
      return contactInfo;
    }

    if (!contactInfo) return '';

    // Enmascarar email
    if (contactInfo.includes('@')) {
      const [localPart, domain] = contactInfo.split('@');
      const maskedLocal = localPart.length > 2 
        ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
        : localPart;
      return `${maskedLocal}@${domain}`;
    }

    // Enmascarar teléfono
    if (contactInfo.match(/\d+/)) {
      const digits = contactInfo.replace(/\D/g, '');
      if (digits.length >= 4) {
        const lastFour = digits.substring(digits.length - 4);
        return `***-***-${lastFour}`;
      }
    }

    // Para otros tipos de información
    if (contactInfo.length > 4) {
      return contactInfo.substring(0, 2) + '*'.repeat(contactInfo.length - 4) + contactInfo.substring(contactInfo.length - 2);
    }

    return contactInfo;
  }

  /**
   * Enmascara coordenadas GPS para usuarios no-admin
   * @param latitude Latitud
   * @param longitude Longitud
   * @returns Coordenadas enmascaradas (aproximadas)
   */
  maskCoordinates(latitude: number, longitude: number): { latitude: number; longitude: number } {
    const userRole = this.authService.getUserRole();
    
    if (userRole === 'Admin') {
      return { latitude, longitude };
    }

    // Redondear a 2 decimales para dar una aproximación (precisión ~1km)
    return {
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100
    };
  }
}

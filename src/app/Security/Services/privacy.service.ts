import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PrivacyService {
  private authService = inject(AuthService);

  maskDeviceId(deviceId: string): string {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return deviceId;
    return this.maskId(deviceId);
  }

  maskVehicleId(vehicleId: string): string {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return vehicleId;
    return this.maskId(vehicleId);
  }

  maskUserId(userId: string): string {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return userId;
    return this.maskId(userId);
  }

  private maskId(id: string): string {
    if (!id || id.length < 8) return 'DEV-****-****';
    const parts = id.split('-');
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const maskedPart = lastPart.substring(Math.max(0, lastPart.length - 4));
      return `DEV-****-${maskedPart.toUpperCase()}`;
    }
    const maskedPart = id.substring(Math.max(0, id.length - 4));
    return `DEV-****-${maskedPart.toUpperCase()}`;
  }

  maskSensitiveData<T>(data: T, fieldsToMask: string[]): T {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return data;
    const maskedData = { ...data } as any;
    fieldsToMask.forEach((field) => {
      if (maskedData[field]) maskedData[field] = this.maskId(maskedData[field]);
    });
    return maskedData;
  }

  maskSensitiveDataList<T>(dataList: T[], fieldsToMask: string[]): T[] {
    return dataList.map((item) => this.maskSensitiveData(item, fieldsToMask));
  }

  isAdmin(): boolean {
    return this.authService.getUserRole() === 'Admin';
  }

  canViewFullData(): boolean {
    return this.isAdmin();
  }

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

  maskContactInfo(contactInfo: string): string {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return contactInfo;
    if (!contactInfo) return '';
    if (contactInfo.includes('@')) {
      const [localPart, domain] = contactInfo.split('@');
      const maskedLocal =
        localPart.length > 2
          ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
          : localPart;
      return `${maskedLocal}@${domain}`;
    }
    if (/\d+/.exec(contactInfo)) {
      const digits = contactInfo.replace(/\D/g, '');
      if (digits.length >= 4) {
        const lastFour = digits.substring(digits.length - 4);
        return `***-***-${lastFour}`;
      }
    }
    if (contactInfo.length > 4) {
      return (
        contactInfo.substring(0, 2) +
        '*'.repeat(contactInfo.length - 4) +
        contactInfo.substring(contactInfo.length - 2)
      );
    }
    return contactInfo;
  }

  maskCoordinates(
    latitude: number,
    longitude: number
  ): { latitude: number; longitude: number } {
    const userRole = this.authService.getUserRole();
    if (userRole === 'Admin') return { latitude, longitude };
    return {
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100,
    };
  }
}


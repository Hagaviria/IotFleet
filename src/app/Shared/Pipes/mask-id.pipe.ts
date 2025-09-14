import { Pipe, PipeTransform, inject } from '@angular/core';
import { PrivacyService } from '../../Security/Services/privacy.service';

@Pipe({
  name: 'maskId',
  standalone: true
})
export class MaskIdPipe implements PipeTransform {
  private privacyService = inject(PrivacyService);

  transform(value: string, type: 'device' | 'vehicle' | 'user' | 'generic' = 'generic'): string {
    if (!value) return '';

    switch (type) {
      case 'device':
        return this.privacyService.maskDeviceId(value);
      case 'vehicle':
        return this.privacyService.maskVehicleId(value);
      case 'user':
        return this.privacyService.maskUserId(value);
      default:
        return this.privacyService.maskDeviceId(value);
    }
  }
}

@Pipe({
  name: 'maskContact',
  standalone: true
})
export class MaskContactPipe implements PipeTransform {
  private privacyService = inject(PrivacyService);

  transform(value: string): string {
    if (!value) return '';
    return this.privacyService.maskContactInfo(value);
  }
}

@Pipe({
  name: 'maskCoordinates',
  standalone: true
})
export class MaskCoordinatesPipe implements PipeTransform {
  private privacyService = inject(PrivacyService);

  transform(coordinates: { latitude: number; longitude: number }): { latitude: number; longitude: number } {
    if (!coordinates) return { latitude: 0, longitude: 0 };
    return this.privacyService.maskCoordinates(coordinates.latitude, coordinates.longitude);
  }
}

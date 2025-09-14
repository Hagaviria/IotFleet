import { TestBed } from '@angular/core/testing';
import { PrivacyService } from './privacy.service';
import { AuthService } from './auth.service';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserRole']);

    TestBed.configureTestingModule({
      providers: [
        PrivacyService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
    
    service = TestBed.inject(PrivacyService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  describe('Device ID Masking', () => {
    it('should return original ID for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const originalId = '12345678-1234-1234-1234-123456789012';
      const result = service.maskDeviceId(originalId);
      
      expect(result).toBe(originalId);
    });

    it('should mask device ID for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const originalId = '12345678-1234-1234-1234-123456789012';
      const result = service.maskDeviceId(originalId);
      
      expect(result).toBe('DEV-****-9012');
      expect(result).not.toBe(originalId);
    });

    it('should handle short IDs gracefully', () => {
      authService.getUserRole.and.returnValue('User');
      
      const shortId = '123';
      const result = service.maskDeviceId(shortId);
      
      expect(result).toBe('DEV-****-****');
    });

    it('should handle empty or null IDs', () => {
      authService.getUserRole.and.returnValue('User');
      
      expect(service.maskDeviceId('')).toBe('DEV-****-****');
      expect(service.maskDeviceId(null as any)).toBe('DEV-****-****');
    });
  });

  describe('Vehicle ID Masking', () => {
    it('should return original vehicle ID for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const originalId = 'vehicle-123-abc';
      const result = service.maskVehicleId(originalId);
      
      expect(result).toBe(originalId);
    });

    it('should mask vehicle ID for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const originalId = 'vehicle-123-abc';
      const result = service.maskVehicleId(originalId);
      
      expect(result).toBe('DEV-****-ABC');
    });
  });

  describe('User ID Masking', () => {
    it('should return original user ID for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const originalId = 'user-456-def';
      const result = service.maskUserId(originalId);
      
      expect(result).toBe(originalId);
    });

    it('should mask user ID for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const originalId = 'user-456-def';
      const result = service.maskUserId(originalId);
      
      expect(result).toBe('DEV-****-DEF');
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask multiple fields in an object for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const data = {
        id: '12345678-1234-1234-1234-123456789012',
        vehicleId: 'vehicle-123-abc',
        name: 'Test Vehicle',
        status: 'active'
      };
      
      const fieldsToMask = ['id', 'vehicleId'];
      const result = service.maskSensitiveData(data, fieldsToMask);
      
      expect(result.id).toBe('DEV-****-9012');
      expect(result.vehicleId).toBe('DEV-****-ABC');
      expect(result.name).toBe('Test Vehicle'); // No enmascarado
      expect(result.status).toBe('active'); // No enmascarado
    });

    it('should return original data for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const data = {
        id: '12345678-1234-1234-1234-123456789012',
        vehicleId: 'vehicle-123-abc',
        name: 'Test Vehicle'
      };
      
      const fieldsToMask = ['id', 'vehicleId'];
      const result = service.maskSensitiveData(data, fieldsToMask);
      
      expect(result).toEqual(data);
    });

    it('should mask data in arrays', () => {
      authService.getUserRole.and.returnValue('User');
      
      const dataList = [
        { id: '12345678-1234-1234-1234-123456789012', name: 'Vehicle 1' },
        { id: '87654321-4321-4321-4321-210987654321', name: 'Vehicle 2' }
      ];
      
      const fieldsToMask = ['id'];
      const result = service.maskSensitiveDataList(dataList, fieldsToMask);
      
      expect(result[0].id).toBe('DEV-****-9012');
      expect(result[1].id).toBe('DEV-****-4321');
      expect(result[0].name).toBe('Vehicle 1');
      expect(result[1].name).toBe('Vehicle 2');
    });
  });

  describe('Contact Information Masking', () => {
    it('should mask email addresses for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const email = 'test@example.com';
      const result = service.maskContactInfo(email);
      
      expect(result).toBe('te**@example.com');
    });

    it('should mask phone numbers for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const phone = '+1234567890';
      const result = service.maskContactInfo(phone);
      
      expect(result).toBe('***-***-7890');
    });

    it('should return original contact info for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const email = 'test@example.com';
      const result = service.maskContactInfo(email);
      
      expect(result).toBe(email);
    });

    it('should handle short email addresses', () => {
      authService.getUserRole.and.returnValue('User');
      
      const shortEmail = 'a@b.com';
      const result = service.maskContactInfo(shortEmail);
      
      expect(result).toBe('a@b.com'); // No se enmascara si es muy corto
    });

    it('should handle other types of contact information', () => {
      authService.getUserRole.and.returnValue('User');
      
      const contact = 'John Doe';
      const result = service.maskContactInfo(contact);
      
      expect(result).toBe('Jo**oe');
    });
  });

  describe('Coordinate Masking', () => {
    it('should return original coordinates for admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      const coords = { latitude: 4.6097, longitude: -74.006 };
      const result = service.maskCoordinates(coords.latitude, coords.longitude);
      
      expect(result.latitude).toBe(4.6097);
      expect(result.longitude).toBe(-74.006);
    });

    it('should mask coordinates for non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      const coords = { latitude: 4.609712345, longitude: -74.00654321 };
      const result = service.maskCoordinates(coords.latitude, coords.longitude);
      
      expect(result.latitude).toBe(4.61); // Redondeado a 2 decimales
      expect(result.longitude).toBe(-74.01); // Redondeado a 2 decimales
    });
  });

  describe('Admin Check Methods', () => {
    it('should correctly identify admin users', () => {
      authService.getUserRole.and.returnValue('Admin');
      
      expect(service.isAdmin()).toBe(true);
      expect(service.canViewFullData()).toBe(true);
      expect(service.getPrivacyLevel()).toBe('admin');
    });

    it('should correctly identify non-admin users', () => {
      authService.getUserRole.and.returnValue('User');
      
      expect(service.isAdmin()).toBe(false);
      expect(service.canViewFullData()).toBe(false);
      expect(service.getPrivacyLevel()).toBe('user');
    });

    it('should handle guest users', () => {
      authService.getUserRole.and.returnValue('Guest');
      
      expect(service.isAdmin()).toBe(false);
      expect(service.canViewFullData()).toBe(false);
      expect(service.getPrivacyLevel()).toBe('guest');
    });

    it('should handle null or undefined roles', () => {
      authService.getUserRole.and.returnValue(null as any);
      
      expect(service.isAdmin()).toBe(false);
      expect(service.canViewFullData()).toBe(false);
      expect(service.getPrivacyLevel()).toBe('guest');
    });
  });

  describe('Edge Cases', () => {
    it('should handle IDs with different formats', () => {
      authService.getUserRole.and.returnValue('User');
      
      const testCases = [
        { input: 'simple-id-123', expected: 'DEV-****-123' },
        { input: 'very-long-id-with-many-parts-xyz', expected: 'DEV-****-XYZ' },
        { input: '123', expected: 'DEV-****-****' },
        { input: 'a', expected: 'DEV-****-****' }
      ];
      
      testCases.forEach(testCase => {
        const result = service.maskDeviceId(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });

    it('should handle case sensitivity in IDs', () => {
      authService.getUserRole.and.returnValue('User');
      
      const lowerCaseId = 'test-id-abc';
      const upperCaseId = 'TEST-ID-ABC';
      
      expect(service.maskDeviceId(lowerCaseId)).toBe('DEV-****-ABC');
      expect(service.maskDeviceId(upperCaseId)).toBe('DEV-****-ABC');
    });

    it('should handle special characters in IDs', () => {
      authService.getUserRole.and.returnValue('User');
      
      const specialId = 'test-id-with-special-chars-!@#';
      const result = service.maskDeviceId(specialId);
      
      expect(result).toBe('DEV-****-!@#');
    });
  });
});

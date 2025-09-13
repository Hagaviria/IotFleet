import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { GenericApiService } from './generic-api.service';

describe('GenericApiService', () => {
  let service: GenericApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GenericApiService]
    });
    service = TestBed.inject(GenericApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('GET Method', () => {
    it('should make GET request and return data', () => {
      const mockData = { id: 1, name: 'Test' };
      const url = '/api/test';

      service.get(url).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('should handle GET request with query parameters', () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const url = '/api/test?page=1&limit=10';

      service.get(url).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('should handle GET request error', () => {
      const url = '/api/test';
      const errorMessage = 'Server Error';

      service.get(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.message).toContain('Error 500');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('POST Method', () => {
    it('should make POST request with body and return data', () => {
      const mockData = { id: 1, name: 'Created' };
      const requestBody = { name: 'Test' };
      const url = '/api/test';

      service.post(url, requestBody).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(requestBody);
      req.flush(mockData);
    });

    it('should handle POST request with empty body', () => {
      const mockData = { success: true };
      const url = '/api/test';

      service.post(url, {}).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockData);
    });

    it('should handle POST request error', () => {
      const requestBody = { name: 'Test' };
      const url = '/api/test';

      service.post(url, requestBody).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.message).toContain('Error 400');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('PUT Method', () => {
    it('should make PUT request with body and return data', () => {
      const mockData = { id: 1, name: 'Updated' };
      const requestBody = { id: 1, name: 'Updated' };
      const url = '/api/test/1';

      service.put(url, requestBody).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(requestBody);
      req.flush(mockData);
    });

    it('should handle PUT request with null body', () => {
      const mockData = { success: true };
      const url = '/api/test/1';

      service.put(url, null).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBeNull();
      req.flush(mockData);
    });

    it('should handle PUT request error', () => {
      const requestBody = { name: 'Test' };
      const url = '/api/test/1';

      service.put(url, requestBody).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.message).toContain('Error 404');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('DELETE Method', () => {
    it('should make DELETE request and return data', () => {
      const mockData = { success: true };
      const url = '/api/test/1';

      service.delete(url).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockData);
    });

    it('should handle DELETE request error', () => {
      const url = '/api/test/1';

      service.delete(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.message).toContain('Error 403');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Error Handling', () => {
    it('should handle client-side error', () => {
      const url = '/api/test';
      const clientError = new ErrorEvent('Network error', {
        message: 'Connection failed'
      });

      service.get(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Error del cliente: Connection failed');
        }
      });

      const req = httpMock.expectOne(url);
      req.error(clientError);
    });

    it('should handle server-side error with status and message', () => {
      const url = '/api/test';

      service.get(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Error 500: Internal Server Error');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    });

    it('should handle 404 error', () => {
      const url = '/api/nonexistent';

      service.get(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.message).toBe('Error 404: Not Found');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 401 unauthorized error', () => {
      const url = '/api/protected';

      service.get(url).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.message).toBe('Error 401: Unauthorized');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 422 validation error', () => {
      const url = '/api/validate';
      const requestBody = { invalid: 'data' };

      service.post(url, requestBody).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(422);
          expect(error.message).toBe('Error 422: Unprocessable Entity');
        }
      });

      const req = httpMock.expectOne(url);
      req.flush('Validation Error', { 
        status: 422, 
        statusText: 'Unprocessable Entity' 
      });
    });
  });

  describe('Generic Type Support', () => {
    it('should work with string type', () => {
      const mockData = 'Hello World';
      const url = '/api/string';

      service.get<string>(url).subscribe(data => {
        expect(data).toBe(mockData);
        expect(typeof data).toBe('string');
      });

      const req = httpMock.expectOne(url);
      req.flush(mockData);
    });

    it('should work with number type', () => {
      const mockData = 42;
      const url = '/api/number';

      service.get<number>(url).subscribe(data => {
        expect(data).toBe(mockData);
        expect(typeof data).toBe('number');
      });

      const req = httpMock.expectOne(url);
      req.flush(mockData);
    });

    it('should work with array type', () => {
      const mockData = [1, 2, 3, 4, 5];
      const url = '/api/array';

      service.get<number[]>(url).subscribe(data => {
        expect(data).toEqual(mockData);
        expect(Array.isArray(data)).toBe(true);
      });

      const req = httpMock.expectOne(url);
      req.flush(mockData);
    });

    it('should work with complex object type', () => {
      interface User {
        id: number;
        name: string;
        email: string;
        active: boolean;
      }

      const mockData: User = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        active: true
      };
      const url = '/api/user';

      service.get<User>(url).subscribe(data => {
        expect(data).toEqual(mockData);
        expect(data.id).toBe(1);
        expect(data.name).toBe('John Doe');
        expect(data.email).toBe('john@example.com');
        expect(data.active).toBe(true);
      });

      const req = httpMock.expectOne(url);
      req.flush(mockData);
    });
  });

  describe('Request Flow', () => {
    it('should handle multiple concurrent requests', () => {
      const url1 = '/api/test1';
      const url2 = '/api/test2';
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };

      service.get(url1).subscribe(data => {
        expect(data).toEqual(mockData1);
      });

      service.get(url2).subscribe(data => {
        expect(data).toEqual(mockData2);
      });

      const req1 = httpMock.expectOne(url1);
      const req2 = httpMock.expectOne(url2);

      req1.flush(mockData1);
      req2.flush(mockData2);
    });

    it('should handle request with custom headers', () => {
      const mockData = { success: true };
      const url = '/api/test';
      const requestBody = { data: 'test' };

      service.post(url, requestBody).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(requestBody);
      req.flush(mockData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', () => {
      const url = '/api/empty';

      service.get(url).subscribe(data => {
        expect(data).toBeNull();
      });

      const req = httpMock.expectOne(url);
      req.flush(null);
    });

    it('should handle very large response', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` }));
      const url = '/api/large';

      service.get(url).subscribe(data => {
        expect(data).toEqual(largeData);
        expect(data.length).toBe(1000);
      });

      const req = httpMock.expectOne(url);
      req.flush(largeData);
    });

    it('should handle special characters in URL', () => {
      const mockData = { success: true };
      const url = '/api/test%20with%20spaces';

      service.get(url).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(url);
      req.flush(mockData);
    });
  });
});

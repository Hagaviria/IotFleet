import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class GenericApiService {
  constructor(private http: HttpClient) {}

  get<T>(url: string): Observable<T> {
    return this.request(this.http.get<T>(url));
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.request(this.http.post<T>(url, body));
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.request(this.http.put<T>(url, body));
  }

  delete<T>(url: string): Observable<T> {
    return this.request(this.http.delete<T>(url));
  }
  private request<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(catchError(this.handleError));
  }
  private handleError(error: HttpErrorResponse) {
    let msg = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      msg = `Error del cliente: ${error.error.message}`;
    } else {
      msg = `Error ${error.status}: ${error.message}`;
    }
    return throwError(() => ({ status: error.status, message: msg }));
  }
}

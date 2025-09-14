import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, map } from 'rxjs';
import { AuthService } from '../../../Security/Services/auth.service';

export interface SimulationStatus {
  isRunning: boolean;
  vehicleCount: number;
  lastUpdate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationControlService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private simulationStatusSubject = new BehaviorSubject<SimulationStatus>({
    isRunning: false,
    vehicleCount: 0,
    lastUpdate: new Date()
  });

  public simulationStatus$ = this.simulationStatusSubject.asObservable();

  constructor() {
    this.checkSimulationStatus();
    setInterval(() => {
      this.checkSimulationStatus();
    }, 5000);
  }

  startSimulation(): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/Simulation/start`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success) {
          this.simulationStatusSubject.next({
            isRunning: true,
            vehicleCount: response.data?.vehicleCount || 0,
            lastUpdate: new Date()
          });
          setTimeout(() => this.checkSimulationStatus(), 2000);
        }
        return response;
      }),
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  stopSimulation(): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/Simulation/stop`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success) {
          this.simulationStatusSubject.next({
            isRunning: false,
            vehicleCount: 0,
            lastUpdate: new Date()
          });
          setTimeout(() => this.checkSimulationStatus(), 2000);
        }
        return response;
      }),
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  getSimulationStatus(): Observable<SimulationStatus> {
    return this.http.get<any>(`${this.API_BASE_URL}/Simulation/status`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return {
            isRunning: response.data.IsRunning || false,
            vehicleCount: response.data.VehicleCount || 0,
            lastUpdate: new Date(response.data.LastUpdate || new Date())
          } as SimulationStatus;
        }
        return {
          isRunning: false,
          vehicleCount: 0,
          lastUpdate: new Date()
        };
      }),
      catchError(error => {
        return of({
          isRunning: false,
          vehicleCount: 0,
          lastUpdate: new Date()
        });
      })
    );
  }

  private checkSimulationStatus(): void {
    this.getSimulationStatus().subscribe({
      next: (status) => {
        this.simulationStatusSubject.next(status);
      },
      error: (error) => {
        if (error.status === 0 || error.status === 404) {
          // No actualizar el estado si el backend no está disponible
        }
      }
    });
  }

  updateSimulationStatus(): void {
    this.checkSimulationStatus();
  }

  get currentStatus(): SimulationStatus {
    return this.simulationStatusSubject.value;
  }
}

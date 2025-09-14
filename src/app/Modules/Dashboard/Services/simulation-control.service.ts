import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, map } from 'rxjs';
import { AuthService } from '../../../Security/Services/auth.service';
import { LocalSimulationService } from './local-simulation.service';

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
  private localSimulationService = inject(LocalSimulationService);

  private simulationStatusSubject = new BehaviorSubject<SimulationStatus>({
    isRunning: false,
    vehicleCount: 0,
    lastUpdate: new Date()
  });

  public simulationStatus$ = this.simulationStatusSubject.asObservable();

  constructor() {
    this.checkSimulationStatus();
    // Verificar el estado cada 5 segundos
    setInterval(() => {
      this.checkSimulationStatus();
    }, 5000);
  }

  /**
   * Inicia la simulación en el backend
   */
  startSimulation(): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/Simulation/start`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log('Start simulation response:', response);
        // Actualizar el estado inmediatamente después de iniciar
        if (response && response.success) {
          // Actualizar el estado local inmediatamente
          this.simulationStatusSubject.next({
            isRunning: true,
            vehicleCount: response.data?.vehicleCount || 0,
            lastUpdate: new Date()
          });
          // Verificar el estado real después de un delay
          setTimeout(() => this.checkSimulationStatus(), 2000);
        }
        return response; // La respuesta ya viene con success: true/false
      }),
        catchError(error => {
          console.error('Error starting simulation:', error);
          return of({ success: false, error: error.message });
        })
    );
  }

  /**
   * Detiene la simulación en el backend
   */
  stopSimulation(): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/Simulation/stop`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log('Stop simulation response:', response);
        // Actualizar el estado inmediatamente después de detener
        if (response && response.success) {
          // Actualizar el estado local inmediatamente
          this.simulationStatusSubject.next({
            isRunning: false,
            vehicleCount: 0,
            lastUpdate: new Date()
          });
          // Verificar el estado real después de un delay
          setTimeout(() => this.checkSimulationStatus(), 2000);
        }
        return response; // La respuesta ya viene con success: true/false
      }),
        catchError(error => {
          console.error('Error stopping simulation:', error);
          return of({ success: false, error: error.message });
        })
    );
  }

  /**
   * Obtiene el estado actual de la simulación
   */
  getSimulationStatus(): Observable<SimulationStatus> {
    return this.http.get<any>(`${this.API_BASE_URL}/Simulation/status`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        console.log('Simulation status response:', response);
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
        console.error('Error getting simulation status:', error);
        return of({
          isRunning: false,
          vehicleCount: 0,
          lastUpdate: new Date()
        });
      })
    );
  }

  /**
   * Verifica el estado de la simulación y actualiza el subject
   */
  private checkSimulationStatus(): void {
    console.log('Checking simulation status...');
    this.getSimulationStatus().subscribe({
      next: (status) => {
        console.log('Received simulation status:', status);
        this.simulationStatusSubject.next(status);
      },
      error: (error) => {
        console.error('Error checking simulation status:', error);
        // Si hay error de conexión, mantener el estado actual
        if (error.status === 0 || error.status === 404) {
          console.log('Backend not available, keeping current state');
          // No actualizar el estado si el backend no está disponible
        }
      }
    });
  }

  /**
   * Actualiza el estado de la simulación
   */
  updateSimulationStatus(): void {
    this.checkSimulationStatus();
  }

  /**
   * Obtiene el estado actual de la simulación
   */
  get currentStatus(): SimulationStatus {
    return this.simulationStatusSubject.value;
  }
}

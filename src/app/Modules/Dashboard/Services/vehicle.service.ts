import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../Security/Services/auth.service';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: 'car' | 'truck' | 'motorcycle';
  status: 'active' | 'inactive' | 'maintenance';
  totalDistance: number;
  averageSpeed: number;
  fuelEfficiency: number;
  fuelCapacity?: number;
  lastMaintenance?: Date;
  brand?: string;
  model?: string;
  fleetId?: string;
  createdAt?: Date;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  model: string;
  brand: string;
  fuelCapacity: number;
  averageConsumption: number;
}

export interface UpdateVehicleRequest {
  model?: string;
  brand?: string;
  fuelCapacity?: number;
  averageConsumption?: number;
  lastMaintenance?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  public vehicles$ = this.vehiclesSubject.asObservable();

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    this.loadVehicles();
  }

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/Dashboard/vehicle-status`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response?.success && response.data) {
          return response.data.map((vehicle: any) => this.mapApiVehicleToVehicle(vehicle));
        }
        return [];
      }),
      tap(vehicles => this.vehiclesSubject.next(vehicles)),
      catchError(error => {
        console.error('Error fetching vehicles:', error);
        return of([]);
      })
    );
  }

  createVehicle(vehicleData: CreateVehicleRequest): Observable<Vehicle> {
    return this.http.post<any>(`${this.API_BASE_URL}/Vehicle`, vehicleData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response?.success && response.data) {
          const newVehicle = this.mapApiVehicleToVehicle(response.data);
          const currentVehicles = this.vehiclesSubject.value;
          this.vehiclesSubject.next([...currentVehicles, newVehicle]);
          return newVehicle;
        }
        throw new Error('Error creating vehicle');
      }),
      catchError(error => {
        console.error('Error creating vehicle:', error);
        throw error;
      })
    );
  }

  updateVehicle(id: string, vehicleData: UpdateVehicleRequest): Observable<Vehicle> {
    return this.http.put<any>(`${this.API_BASE_URL}/Vehicle/${id}`, vehicleData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response?.success && response.data) {
          const updatedVehicle = this.mapApiVehicleToVehicle(response.data);
          const currentVehicles = this.vehiclesSubject.value;
          const index = currentVehicles.findIndex(v => v.id === id);
          if (index !== -1) {
            currentVehicles[index] = updatedVehicle;
            this.vehiclesSubject.next([...currentVehicles]);
          }
          return updatedVehicle;
        }
        throw new Error('Error updating vehicle');
      }),
      catchError(error => {
        console.error('Error updating vehicle:', error);
        throw error;
      })
    );
  }

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<any>(`${this.API_BASE_URL}/Vehicle/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(() => {
        const currentVehicles = this.vehiclesSubject.value;
        const filteredVehicles = currentVehicles.filter(v => v.id !== id);
        this.vehiclesSubject.next(filteredVehicles);
      }),
      catchError(error => {
        console.error('Error deleting vehicle:', error);
        throw error;
      })
    );
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<any>(`${this.API_BASE_URL}/Vehicle/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response?.success && response.data) {
          return this.mapApiVehicleToVehicle(response.data);
        }
        throw new Error('Vehicle not found');
      }),
      catchError(error => {
        console.error('Error fetching vehicle:', error);
        throw error;
      })
    );
  }

  private loadVehicles(): void {
    this.getVehicles().subscribe();
  }

  private mapApiVehicleToVehicle(apiVehicle: any): Vehicle {
    return {
      id: apiVehicle.Id,
      name: `${apiVehicle.Brand} ${apiVehicle.Model}`,
      plate: apiVehicle.LicensePlate,
      type: 'car' as const,
      status: 'active' as const,
      totalDistance: 0,
      averageSpeed: 0,
      fuelEfficiency: apiVehicle.AverageConsumption || 0,
      fuelCapacity: apiVehicle.FuelCapacity,
      lastMaintenance: apiVehicle.LastMaintenance ? new Date(apiVehicle.LastMaintenance) : undefined,
      brand: apiVehicle.Brand,
      model: apiVehicle.Model,
      fleetId: apiVehicle.FleetId,
      createdAt: apiVehicle.CreatedAt ? new Date(apiVehicle.CreatedAt) : undefined
    };
  }

  getCurrentVehicles(): Vehicle[] {
    return this.vehiclesSubject.value;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, switchMap, catchError, of, throwError } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AuthService } from '../../../Security/Services/auth.service';

export interface SensorData {
  id: string;
  vehicleId: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  fuelLevel?: number;
  temperature?: number;
  engineRpm?: number;
  batteryVoltage?: number;
  odometer?: number;
  additionalData?: any;
}

export interface FuelPrediction {
  vehicleId: string;
  currentFuelLevel: number;
  estimatedAutonomyHours: number;
  isLowFuel: boolean;
  alertLevel: 'normal' | 'warning' | 'critical';
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SensorDataService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  private readonly REFRESH_INTERVAL = 15000; // 15 segundos para datos de sensores

  private sensorDataSubject = new BehaviorSubject<SensorData[]>([]);
  private fuelPredictionsSubject = new BehaviorSubject<FuelPrediction[]>([]);

  public sensorData$ = this.sensorDataSubject.asObservable();
  public fuelPredictions$ = this.fuelPredictionsSubject.asObservable();

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates(): void {
    // Actualizar datos de sensores cada 15 segundos
    interval(this.REFRESH_INTERVAL).pipe(
      switchMap(() => this.getRecentSensorData()),
      catchError(error => {
        console.error('Error updating sensor data:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.sensorDataSubject.next(data);
      this.updateFuelPredictions(data);
    });
  }

  // CRUD operations para datos de sensores
  getSensorData(): Observable<SensorData[]> {
    return this.http.get<SensorData[]>(`${this.API_BASE_URL}/SensorData`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(data => this.cacheSensorData(data)),
      catchError(error => {
        console.error('Error fetching sensor data:', error);
        const cachedData = this.getCachedSensorData();
        return cachedData.length > 0 ? of(cachedData) : throwError(error);
      })
    );
  }

  getRecentSensorData(): Observable<SensorData[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/SensorData`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data.map((item: any) => this.mapApiDataToSensorData(item));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching recent sensor data:', error);
        return of([]);
      })
    );
  }

  getSensorDataById(id: string): Observable<SensorData> {
    return this.http.get<SensorData>(`${this.API_BASE_URL}/SensorData/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(data => this.mapApiDataToSensorData(data))
    );
  }

  createSensorData(sensorData: Partial<SensorData>): Observable<SensorData> {
    return this.http.post<SensorData>(`${this.API_BASE_URL}/SensorData`, sensorData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(data => this.mapApiDataToSensorData(data))
    );
  }

  updateSensorData(id: string, sensorData: Partial<SensorData>): Observable<SensorData> {
    return this.http.put<SensorData>(`${this.API_BASE_URL}/SensorData/${id}`, sensorData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(data => this.mapApiDataToSensorData(data))
    );
  }

  deleteSensorData(id: string): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/SensorData/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Métodos para cálculo predictivo de combustible
  private updateFuelPredictions(sensorData: SensorData[]): void {
    const predictions: FuelPrediction[] = [];
    
    // Agrupar datos por vehículo
    const vehicleData = this.groupByVehicle(sensorData);
    
    Object.keys(vehicleData).forEach(vehicleId => {
      const vehicleSensorData = vehicleData[vehicleId];
      const latestData = vehicleSensorData[vehicleSensorData.length - 1];
      
      if (latestData.fuelLevel !== undefined) {
        const prediction = this.calculateFuelPrediction(vehicleId, vehicleSensorData);
        predictions.push(prediction);
      }
    });
    
    this.fuelPredictionsSubject.next(predictions);
    this.cacheFuelPredictions(predictions);
  }

  private calculateFuelPrediction(vehicleId: string, sensorData: SensorData[]): FuelPrediction {
    const latestData = sensorData[sensorData.length - 1];
    const currentFuelLevel = latestData.fuelLevel || 0;
    
    // Calcular consumo promedio basado en datos históricos
    const consumptionRate = this.calculateFuelConsumptionRate(sensorData);
    
    // Estimar autonomía en horas
    const estimatedAutonomyHours = currentFuelLevel / consumptionRate;
    
    // Determinar nivel de alerta
    let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
    let isLowFuel = false;
    
    if (estimatedAutonomyHours < 1) {
      alertLevel = 'critical';
      isLowFuel = true;
    } else if (estimatedAutonomyHours < 2) {
      alertLevel = 'warning';
      isLowFuel = true;
    }
    
    return {
      vehicleId,
      currentFuelLevel,
      estimatedAutonomyHours,
      isLowFuel,
      alertLevel,
      lastUpdated: new Date()
    };
  }

  private calculateFuelConsumptionRate(sensorData: SensorData[]): number {
    if (sensorData.length < 2) return 0.1; // Valor por defecto
    
    // Filtrar datos con nivel de combustible
    const fuelData = sensorData.filter(data => data.fuelLevel !== undefined);
    if (fuelData.length < 2) return 0.1;
    
    // Calcular consumo promedio por hora
    const timeDiff = (fuelData[fuelData.length - 1].timestamp.getTime() - fuelData[0].timestamp.getTime()) / (1000 * 60 * 60); // horas
    const fuelDiff = fuelData[0].fuelLevel! - fuelData[fuelData.length - 1].fuelLevel!;
    
    return timeDiff > 0 ? Math.max(fuelDiff / timeDiff, 0.01) : 0.1; // Mínimo 0.01 L/h
  }

  private groupByVehicle(sensorData: SensorData[]): { [vehicleId: string]: SensorData[] } {
    return sensorData.reduce((acc, data) => {
      if (!acc[data.vehicleId]) {
        acc[data.vehicleId] = [];
      }
      acc[data.vehicleId].push(data);
      return acc;
    }, {} as { [vehicleId: string]: SensorData[] });
  }

  private mapApiDataToSensorData(apiData: any): SensorData {
    return {
      id: apiData.Id,
      vehicleId: apiData.VehicleId,
      timestamp: new Date(apiData.Timestamp),
      latitude: apiData.Latitude,
      longitude: apiData.Longitude,
      speed: apiData.Speed,
      heading: 0, // No disponible en la respuesta
      accuracy: 0, // No disponible en la respuesta
      fuelLevel: apiData.FuelLevel,
      temperature: apiData.EngineTemperature,
      engineRpm: 0, // No disponible en la respuesta
      batteryVoltage: 0, // No disponible en la respuesta
      odometer: 0, // No disponible en la respuesta
      additionalData: {
        altitude: apiData.Altitude,
        fuelConsumption: apiData.FuelConsumption,
        ambientTemperature: apiData.AmbientTemperature,
        vehicleInfo: apiData.Vehicle ? {
          licensePlate: apiData.Vehicle.LicensePlate,
          model: apiData.Vehicle.Model,
          brand: apiData.Vehicle.Brand,
          fuelCapacity: apiData.Vehicle.FuelCapacity,
          averageConsumption: apiData.Vehicle.AverageConsumption,
          fleetId: apiData.Vehicle.FleetId,
          createdAt: new Date(apiData.Vehicle.CreatedAt),
          lastMaintenance: new Date(apiData.Vehicle.LastMaintenance)
        } : null
      }
    };
  }

  // Métodos para funcionalidad offline
  private cacheSensorData(data: SensorData[]): void {
    localStorage.setItem('sensor_data', JSON.stringify(data));
  }

  private getCachedSensorData(): SensorData[] {
    const cached = localStorage.getItem('sensor_data');
    return cached ? JSON.parse(cached) : [];
  }

  private cacheFuelPredictions(predictions: FuelPrediction[]): void {
    localStorage.setItem('fuel_predictions', JSON.stringify(predictions));
  }

  private getCachedFuelPredictions(): FuelPrediction[] {
    const cached = localStorage.getItem('fuel_predictions');
    return cached ? JSON.parse(cached) : [];
  }

  clearCache(): void {
    localStorage.removeItem('sensor_data');
    localStorage.removeItem('fuel_predictions');
  }

  // Método para obtener alertas de combustible
  getFuelAlerts(): FuelPrediction[] {
    return this.fuelPredictionsSubject.value.filter(prediction => prediction.isLowFuel);
  }
}

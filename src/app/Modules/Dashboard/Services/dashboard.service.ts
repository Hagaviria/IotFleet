import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, switchMap, catchError, of, throwError } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { DashboardStats, Vehicle, Location, HistoricalData } from '../Models/dashboard.models';
import { AuthService } from '../../../Security/Services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly API_BASE_URL = 'https://localhost:7162/api'; 
  private readonly REFRESH_INTERVAL = 30000; 

  private statsSubject = new BehaviorSubject<DashboardStats | null>(null);
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  private locationsSubject = new BehaviorSubject<Location[]>([]);
  private historicalDataSubject = new BehaviorSubject<HistoricalData[]>([]);

  public stats$ = this.statsSubject.asObservable();
  public vehicles$ = this.vehiclesSubject.asObservable();
  public locations$ = this.locationsSubject.asObservable();
  public historicalData$ = this.historicalDataSubject.asObservable();

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates(): void {

    interval(this.REFRESH_INTERVAL).pipe(
      switchMap(() => this.getDashboardStats()),
      catchError(error => {
        console.error('Error updating stats:', error);
        return of(null);
      })
    ).subscribe(stats => {
      if (stats) {
        this.statsSubject.next(stats);
      }
    });

    interval(10000).pipe( // Cada 10 segundos
      switchMap(() => this.getCurrentLocations()),
      catchError(error => {
        console.error('Error updating locations:', error);
        return of([]);
      })
    ).subscribe(locations => {
      this.locationsSubject.next(locations || []);
    });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<any>(`${this.API_BASE_URL}/Dashboard/statistics`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const data = response.data;
          return {
            totalVehicles: data.TotalVehicles || 0,
            activeVehicles: data.TotalVehicles || 0, // Asumimos que todos están activos
            alertsCount: 0, // No hay API de alertas
            criticalAlerts: 0,
            averageSpeed: 0,
            totalDistance: 0,
            fuelConsumption: 0
          } as DashboardStats;
        }
        throw new Error('Invalid response format');
      }),
      tap(stats => this.cacheStats(stats)),
      catchError(error => {
        console.error('Error fetching dashboard stats:', error);
        const cachedStats = this.getCachedStats();
        return cachedStats ? of(cachedStats) : throwError(error);
      })
    );
  }

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/Dashboard/vehicle-status`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data.map((vehicle: any) => ({
            id: vehicle.Id,
            name: `${vehicle.Brand} ${vehicle.Model}`,
            plate: vehicle.LicensePlate,
            type: 'car' as const,
            status: 'active' as const,
            totalDistance: 0,
            averageSpeed: 0,
            fuelEfficiency: vehicle.AverageConsumption || 0
          })) as Vehicle[];
        }
        return [];
      }),
      tap(vehicles => this.cacheVehicles(vehicles)),
      catchError(error => {
        console.error('Error fetching vehicles:', error);
        const cachedVehicles = this.getCachedVehicles();
        return cachedVehicles.length > 0 ? of(cachedVehicles) : throwError(error);
      })
    );
  }

  getCurrentLocations(): Observable<Location[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/SensorData`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const allLocations = this.mapSensorDataToLocations(response.data);
          
          // Filtrar para obtener solo la ubicación más reciente por vehículo
          const latestLocations = this.getLatestLocationsPerVehicle(allLocations);
          
          if (latestLocations.length > 0) {
            this.createVehiclesFromLocations(latestLocations);
          }
          
          return latestLocations;
        }
        return [];
      }),
      tap(locations => this.cacheLocations(locations)),
      catchError(error => {
        console.error('Error fetching current locations:', error);
        const cachedLocations = this.getCachedLocations();
        return cachedLocations.length > 0 ? of(cachedLocations) : throwError(error);
      })
    );
  }

  getHistoricalData(vehicleId: string, startDate: Date, endDate: Date): Observable<HistoricalData[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/SensorData`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const filteredData = response.data.filter((item: any) => {
            const itemDate = new Date(item.Timestamp);
            return item.VehicleId === vehicleId && 
                   itemDate >= startDate && 
                   itemDate <= endDate;
          });
          
          return filteredData.map((item: any) => ({
            id: item.Id,
            vehicleId: item.VehicleId,
            date: item.Timestamp,
            speed: item.Speed || 0,
            fuelLevel: item.FuelLevel || 0,
            distance: 0, // No disponible en el backend actual
            efficiency: item.FuelConsumption || 0,
            temperature: item.EngineTemperature || 0,
            latitude: item.Latitude,
            longitude: item.Longitude,
            altitude: item.Altitude || 0,
            fuelConsumption: item.FuelConsumption || 0,
            ambientTemperature: item.AmbientTemperature || 0
          })) as HistoricalData[];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching historical data:', error);
        return of([]);
      })
    );
  }

  private mapSensorDataToLocations(sensorData: any[]): Location[] {
    return sensorData
      .filter(data => data.Latitude && data.Longitude)
      .map(data => ({
        id: data.Id,
        vehicleId: data.VehicleId,
        latitude: data.Latitude,
        longitude: data.Longitude,
        timestamp: new Date(data.Timestamp),
        speed: data.Speed || 0,
        fuelLevel: data.FuelLevel || 0,
        isOnline: true,
        altitude: data.Altitude || 0,
        fuelConsumption: data.FuelConsumption || 0,
        engineTemperature: data.EngineTemperature || 0,
        ambientTemperature: data.AmbientTemperature || 0,
        vehicleInfo: data.Vehicle ? {
          licensePlate: data.Vehicle.LicensePlate,
          model: data.Vehicle.Model,
          brand: data.Vehicle.Brand,
          fuelCapacity: data.Vehicle.FuelCapacity,
          averageConsumption: data.Vehicle.AverageConsumption,
          fleetId: data.Vehicle.FleetId,
          createdAt: new Date(data.Vehicle.CreatedAt),
          lastMaintenance: new Date(data.Vehicle.LastMaintenance)
        } : undefined
      }));
  }

  private getLatestLocationsPerVehicle(locations: Location[]): Location[] {
    const locationMap = new Map<string, Location>();
    
    locations.forEach(location => {
      const existingLocation = locationMap.get(location.vehicleId);
      
      if (!existingLocation || location.timestamp > existingLocation.timestamp) {
        locationMap.set(location.vehicleId, location);
      }
    });
    
    return Array.from(locationMap.values());
  }

  private createVehiclesFromLocations(locations: Location[]): void {
    const vehicles: Vehicle[] = locations.map(location => {
      const vehicleInfo = location.vehicleInfo;
      return {
        id: location.vehicleId,
        name: vehicleInfo ? `${vehicleInfo.brand} ${vehicleInfo.model}` : `Vehículo ${location.vehicleId}`,
        plate: vehicleInfo?.licensePlate || 'N/A',
        type: 'car' as const,
        status: 'active' as const,
        totalDistance: 0,
        averageSpeed: location.speed,
        fuelEfficiency: vehicleInfo?.averageConsumption || 0
      };
    });

    this.vehiclesSubject.next(vehicles);
    this.cacheVehicles(vehicles);
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.API_BASE_URL}/Vehicle/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  updateVehicleStatus(vehicleId: string, status: string): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/Vehicle/${vehicleId}`, { 
      status 
    }, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getFuelConsumption(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/Dashboard/fuel-consumption`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getVehicleStatus(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/Dashboard/vehicle-status`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getCachedStats(): DashboardStats | null {
    const cached = localStorage.getItem('dashboard_stats');
    return cached ? JSON.parse(cached) : null;
  }

  getCachedVehicles(): Vehicle[] {
    const cached = localStorage.getItem('dashboard_vehicles');
    return cached ? JSON.parse(cached) : [];
  }

  getCachedLocations(): Location[] {
    const cached = localStorage.getItem('dashboard_locations');
    return cached ? JSON.parse(cached) : [];
  }

  cacheStats(stats: DashboardStats): void {
    localStorage.setItem('dashboard_stats', JSON.stringify(stats));
  }

  cacheVehicles(vehicles: Vehicle[]): void {
    localStorage.setItem('dashboard_vehicles', JSON.stringify(vehicles));
  }

  cacheLocations(locations: Location[]): void {
    localStorage.setItem('dashboard_locations', JSON.stringify(locations));
  }

  clearCache(): void {
    localStorage.removeItem('dashboard_stats');
    localStorage.removeItem('dashboard_vehicles');
    localStorage.removeItem('dashboard_locations');
  }
}

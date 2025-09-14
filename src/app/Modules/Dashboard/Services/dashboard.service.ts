import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  interval,
  switchMap,
  catchError,
  of,
  throwError,
} from 'rxjs';
import { tap, map } from 'rxjs/operators';
import {
  DashboardStats,
  Vehicle,
  Location,
  HistoricalData,
} from '../Models/dashboard.models';
import { AuthService } from '../../../Security/Services/auth.service';
import { PrivacyService } from '../../../Security/Services/privacy.service';

@Injectable({
  providedIn: 'root',
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
  private privacyService = inject(PrivacyService);

  constructor() {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates(): void {
    interval(this.REFRESH_INTERVAL)
      .pipe(
        switchMap(() => this.getDashboardStats()),
        catchError((error) => {
          console.error('Error updating stats:', error);
          return of(null);
        })
      )
      .subscribe((stats) => {
        if (stats) {
          this.statsSubject.next(stats);
        }
      });

    interval(5000)
      .pipe(
        switchMap(() => this.getRealTimeData()),
        catchError((error) => {
          console.error('Error updating real-time data:', error);
          return of([]);
        })
      )
      .subscribe((locations) => {
        this.locationsSubject.next(locations || []);
      });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http
      .get<any>(`${this.API_BASE_URL}/Dashboard/statistics`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response?.success && response?.data) {
            const data = response.data;
            return {
              totalVehicles: data.TotalVehicles || 0,
              activeVehicles: data.TotalVehicles || 0,
              alertsCount: 0,
              criticalAlerts: 0,
              averageSpeed: 0,
              totalDistance: 0,
              fuelConsumption: 0,
            } as DashboardStats;
          }
          throw new Error('Invalid response format');
        }),
        tap((stats) => this.cacheStats(stats)),
        catchError((error) => {
          console.error('Error fetching dashboard stats:', error);
          const cachedStats = this.getCachedStats();
          return cachedStats ? of(cachedStats) : throwError(() => error);
        })
      );
  }

  getVehicles(): Observable<Vehicle[]> {
    return this.http
      .get<any>(`${this.API_BASE_URL}/Vehicle`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response?.success && Array.isArray(response?.data)) {
            return response.data.map((vehicle: any) => ({
              id: this.privacyService.maskVehicleId(vehicle.Id),
              name: `${vehicle.Brand} ${vehicle.Model}`,
              plate: vehicle.LicensePlate,
              type: 'car' as const,
              status: 'active' as const,
              totalDistance: 0,
              averageSpeed: 0,
              fuelEfficiency: vehicle.AverageConsumption || 0,
            })) as Vehicle[];
          }
          return [];
        }),
        tap((vehicles) => this.cacheVehicles(vehicles)),
        catchError((error) => {
          const cachedVehicles = this.getCachedVehicles();
          return cachedVehicles.length > 0
            ? of(cachedVehicles)
            : throwError(() => error);
        })
      );
  }

  getCurrentLocations(): Observable<Location[]> {
    return this.http
      .get<any>(`${this.API_BASE_URL}/SensorData`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response?.success && Array.isArray(response?.data)) {
            const allLocations = this.mapSensorDataToLocations(response.data);
            const latestLocations =
              this.getLatestLocationsPerVehicle(allLocations);

            if (latestLocations.length > 0) {
              this.createVehiclesFromLocations(latestLocations);
            }

            return latestLocations;
          }
          return [];
        }),
        tap((locations) => this.cacheLocations(locations)),
        catchError((error) => {
          const cachedLocations = this.getCachedLocations();
          return cachedLocations.length > 0
            ? of(cachedLocations)
            : throwError(() => error);
        })
      );
  }

  getRealTimeData(): Observable<Location[]> {
    return this.http
      .get<any>(`${this.API_BASE_URL}/Simulation/realtime-data`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response?.success && Array.isArray(response?.data)) {
            const realTimeLocations = response.data.map((data: any) => ({
              id: this.privacyService.maskDeviceId(data.VehicleId),
              vehicleId: this.privacyService.maskVehicleId(data.VehicleId),
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
              vehicleInfo: {
                licensePlate: data.LicensePlate,
                model: data.Model,
                brand: data.Brand,
                fuelCapacity: 75,
                averageConsumption: data.FuelConsumption || 8.5,
                fleetId: this.privacyService.maskDeviceId(data.VehicleId),
                createdAt: new Date(),
                lastMaintenance: new Date(),
              },
            })) as Location[];

            if (realTimeLocations.length > 0) {
              this.createVehiclesFromLocations(realTimeLocations);
            }

            return realTimeLocations;
          }
          return [];
        }),
        catchError((error) => {
          return this.getCurrentLocations();
        })
      );
  }

  getHistoricalData(
    vehicleId: string,
    startDate: Date,
    endDate: Date
  ): Observable<HistoricalData[]> {
    const params = new URLSearchParams({
      vehicleId: vehicleId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: '1000',
    });

    return this.http
      .get<any>(`${this.API_BASE_URL}/Dashboard/historical-data?${params}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response?.success && response?.data) {
            return response.data.map((item: any) => {
              const maskedCoords = this.privacyService.maskCoordinates(
                item.Latitude,
                item.Longitude
              );

              return {
                id: this.privacyService.maskDeviceId(item.Id),
                vehicleId: this.privacyService.maskVehicleId(item.VehicleId),
                date: item.Timestamp,
                speed: item.Speed || 0,
                fuelLevel: item.FuelLevel || 0,
                distance: 0,
                efficiency: item.FuelConsumption || 0,
                temperature: item.EngineTemperature || 0,
                latitude: maskedCoords.latitude,
                longitude: maskedCoords.longitude,
                altitude: item.Altitude || 0,
                fuelConsumption: item.FuelConsumption || 0,
                ambientTemperature: item.AmbientTemperature || 0,
                vehicle: item.Vehicle
                  ? {
                      ...item.Vehicle,
                      LicensePlate: item.Vehicle.LicensePlate,
                      Model: item.Vehicle.Model,
                      Brand: item.Vehicle.Brand,
                      FuelCapacity: item.Vehicle.FuelCapacity,
                      AverageConsumption: item.Vehicle.AverageConsumption,
                    }
                  : undefined,
              } as HistoricalData;
            });
          }
          return [];
        }),
        tap((data) => this.cacheHistoricalData(vehicleId, data)),
        catchError((error) => {
          console.error('Error fetching historical data:', error);
          const cachedData = this.getCachedHistoricalData(vehicleId);
          return cachedData.length > 0 ? of(cachedData) : of([]);
        })
      );
  }

  getHistoricalStatistics(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string = 'day'
  ): Observable<any[]> {
    const params = new URLSearchParams({
      vehicleId: vehicleId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy: groupBy,
    });

    return this.http
      .get<any>(
        `${this.API_BASE_URL}/Dashboard/historical-statistics?${params}`,
        {
          headers: this.authService.getAuthHeaders(),
        }
      )
      .pipe(
        map((response) => {
          if (response?.success && response?.data) {
            return response.data;
          }
          return [];
        }),
        catchError((error) => {
          console.error('Error fetching historical statistics:', error);
          return of([]);
        })
      );
  }

  private mapSensorDataToLocations(sensorData: any[]): Location[] {
    return sensorData
      .filter((data) => data.Latitude && data.Longitude)
      .map((data) => {
        const maskedCoords = this.privacyService.maskCoordinates(
          data.Latitude,
          data.Longitude
        );

        return {
          id: this.privacyService.maskDeviceId(data.Id),
          vehicleId: this.privacyService.maskVehicleId(data.VehicleId),
          latitude: maskedCoords.latitude,
          longitude: maskedCoords.longitude,
          timestamp: new Date(data.Timestamp),
          speed: data.Speed || 0,
          fuelLevel: data.FuelLevel || 0,
          isOnline: true,
          altitude: data.Altitude || 0,
          fuelConsumption: data.FuelConsumption || 0,
          engineTemperature: data.EngineTemperature || 0,
          ambientTemperature: data.AmbientTemperature || 0,
          vehicleInfo: data.Vehicle
            ? {
                licensePlate: data.Vehicle.LicensePlate,
                model: data.Vehicle.Model,
                brand: data.Vehicle.Brand,
                fuelCapacity: data.Vehicle.FuelCapacity,
                averageConsumption: data.Vehicle.AverageConsumption,
                fleetId: this.privacyService.maskDeviceId(data.Vehicle.FleetId),
                createdAt: new Date(data.Vehicle.CreatedAt),
                lastMaintenance: new Date(data.Vehicle.LastMaintenance),
              }
            : undefined,
        };
      });
  }

  private getLatestLocationsPerVehicle(locations: Location[]): Location[] {
    const locationMap = new Map<string, Location>();

    locations.forEach((location) => {
      const existingLocation = locationMap.get(location.vehicleId);

      if (
        !existingLocation ||
        location.timestamp > existingLocation.timestamp
      ) {
        locationMap.set(location.vehicleId, location);
      }
    });

    return Array.from(locationMap.values());
  }

  private createVehiclesFromLocations(locations: Location[]): void {
    const vehicles: Vehicle[] = locations.map((location) => {
      const vehicleInfo = location.vehicleInfo;
      return {
        id: location.vehicleId,
        name: vehicleInfo
          ? `${vehicleInfo.brand} ${vehicleInfo.model}`
          : `Vehículo ${location.vehicleId}`,
        plate: vehicleInfo?.licensePlate || 'N/A',
        type: 'car' as const,
        status: 'active' as const,
        totalDistance: 0,
        averageSpeed: location.speed,
        fuelEfficiency: vehicleInfo?.averageConsumption || 0,
      };
    });

    this.vehiclesSubject.next(vehicles);
    this.cacheVehicles(vehicles);
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.API_BASE_URL}/Vehicle/${id}`, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  updateVehicleStatus(vehicleId: string, status: string): Observable<any> {
    return this.http.put(
      `${this.API_BASE_URL}/Vehicle/${vehicleId}`,
      {
        status,
      },
      {
        headers: this.authService.getAuthHeaders(),
      }
    );
  }

  getFuelConsumption(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/Dashboard/fuel-consumption`, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  getVehicleStatus(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/Dashboard/vehicle-status`, {
      headers: this.authService.getAuthHeaders(),
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

  cacheHistoricalData(vehicleId: string, data: HistoricalData[]): void {
    const key = `dashboard_historical_${vehicleId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        data: data,
        timestamp: Date.now(),
      })
    );
  }

  getCachedHistoricalData(vehicleId: string): HistoricalData[] {
    const key = `dashboard_historical_${vehicleId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed.data;
      }
    }
    return [];
  }

  clearCache(): void {
    localStorage.removeItem('dashboard_stats');
    localStorage.removeItem('dashboard_vehicles');
    localStorage.removeItem('dashboard_locations');

    // Limpiar caché de datos históricos
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('dashboard_historical_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

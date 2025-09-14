import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../../Security/Services/auth.service';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed: number;
  fuelLevel: number;
  altitude: number;
  heading?: number;
}

export interface HistoricalRoute {
  id: string;
  vehicleId: string;
  startTime: Date;
  endTime: Date;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  totalDuration: number;
  points: RoutePoint[];
  summary: {
    fuelConsumed: number;
    efficiency: number;
    stops: number;
    idleTime: number;
  };
}

export interface RouteSegment {
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  distance: number;
  duration: number;
  averageSpeed: number;
  fuelConsumption: number;
}

@Injectable({
  providedIn: 'root',
})
export class RouteService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private routesSubject = new BehaviorSubject<HistoricalRoute[]>([]);
  private currentRouteSubject = new BehaviorSubject<HistoricalRoute | null>(
    null
  );

  public routes$ = this.routesSubject.asObservable();
  public currentRoute$ = this.currentRouteSubject.asObservable();

  constructor() {}

  getHistoricalRoutes(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ): Observable<HistoricalRoute[]> {
    const params = new URLSearchParams({
      vehicleId: vehicleId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: limit.toString(),
    });

    return this.http
      .get<any>(`${this.API_BASE_URL}/Routes/historical?${params}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            const routes = response.data.map((item: any) => ({
              id: item.Id,
              vehicleId: item.VehicleId,
              startTime: new Date(item.StartTime),
              endTime: new Date(item.EndTime),
              totalDistance: item.TotalDistance,
              averageSpeed: item.AverageSpeed,
              maxSpeed: item.MaxSpeed,
              minSpeed: item.MinSpeed,
              totalDuration: item.TotalDuration,
              points: item.Points.map((point: any) => ({
                latitude: point.Latitude,
                longitude: point.Longitude,
                timestamp: new Date(point.Timestamp),
                speed: point.Speed,
                fuelLevel: point.FuelLevel,
                altitude: point.Altitude,
                heading: point.Heading,
              })),
              summary: {
                fuelConsumed: item.Summary.FuelConsumed,
                efficiency: item.Summary.Efficiency,
                stops: item.Summary.Stops,
                idleTime: item.Summary.IdleTime,
              },
            })) as HistoricalRoute[];

            this.routesSubject.next(routes);
            return routes;
          }
          return [];
        }),
        catchError((error) => {
          console.error('Error loading historical routes:', error);
          return of([]);
        })
      );
  }

  getRouteDetails(routeId: string): Observable<HistoricalRoute | null> {
    return this.http
      .get<any>(`${this.API_BASE_URL}/Routes/${routeId}`, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            const route: HistoricalRoute = {
              id: response.data.Id,
              vehicleId: response.data.VehicleId,
              startTime: new Date(response.data.StartTime),
              endTime: new Date(response.data.EndTime),
              totalDistance: response.data.TotalDistance,
              averageSpeed: response.data.AverageSpeed,
              maxSpeed: response.data.MaxSpeed,
              minSpeed: response.data.MinSpeed,
              totalDuration: response.data.TotalDuration,
              points: response.data.Points.map((point: any) => ({
                latitude: point.Latitude,
                longitude: point.Longitude,
                timestamp: new Date(point.Timestamp),
                speed: point.Speed,
                fuelLevel: point.FuelLevel,
                altitude: point.Altitude,
                heading: point.Heading,
              })),
              summary: {
                fuelConsumed: response.data.Summary.FuelConsumed,
                efficiency: response.data.Summary.Efficiency,
                stops: response.data.Summary.Stops,
                idleTime: response.data.Summary.IdleTime,
              },
            };

            this.currentRouteSubject.next(route);
            return route;
          }
          return null;
        }),
        catchError((error) => {
          console.error('Error loading route details:', error);
          return of(null);
        })
      );
  }

  generateRouteFromSensorData(sensorData: any[]): HistoricalRoute {
    if (sensorData.length === 0) {
      throw new Error('No sensor data provided');
    }

    const sortedData = sensorData.sort(
      (a, b) =>
        new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
    );

    const points: RoutePoint[] = sortedData.map((data) => ({
      latitude: data.Latitude,
      longitude: data.Longitude,
      timestamp: new Date(data.Timestamp),
      speed: data.Speed || 0,
      fuelLevel: data.FuelLevel || 0,
      altitude: data.Altitude || 0,
      heading: data.Heading,
    }));

    const totalDistance = this.calculateTotalDistance(points);
    const totalDuration = this.calculateTotalDuration(points);
    const speeds = points.map((p) => p.speed).filter((s) => s > 0);
    const averageSpeed =
      speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;

    const fuelConsumed = this.calculateFuelConsumption(points);
    const efficiency =
      totalDistance > 0 && fuelConsumed > 0 ? totalDistance / fuelConsumed : 0;

    const stops = this.calculateStops(points);
    const idleTime = this.calculateIdleTime(points);

    const route: HistoricalRoute = {
      id: `route-${Date.now()}`,
      vehicleId: sortedData[0].VehicleId,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      totalDistance,
      averageSpeed,
      maxSpeed,
      minSpeed,
      totalDuration,
      points,
      summary: {
        fuelConsumed,
        efficiency,
        stops,
        idleTime,
      },
    };

    return route;
  }

  splitRouteIntoSegments(
    route: HistoricalRoute,
    maxSegmentDuration: number = 30
  ): RouteSegment[] {
    const segments: RouteSegment[] = [];
    const points = route.points;

    if (points.length < 2) return segments;

    let currentSegmentStart = 0;
    let currentSegmentStartTime = points[0].timestamp;

    for (let i = 1; i < points.length; i++) {
      const currentTime = points[i].timestamp;
      const segmentDuration =
        (currentTime.getTime() - currentSegmentStartTime.getTime()) /
        (1000 * 60);

      if (segmentDuration >= maxSegmentDuration || i === points.length - 1) {
        // Crear segmento
        const startPoint = points[currentSegmentStart];
        const endPoint = points[i];
        const distance = this.calculateDistanceBetweenPoints(
          startPoint,
          endPoint
        );
        const duration =
          (endPoint.timestamp.getTime() - startPoint.timestamp.getTime()) /
          (1000 * 60);
        const averageSpeed = duration > 0 ? (distance / duration) * 60 : 0;
        const fuelConsumption = startPoint.fuelLevel - endPoint.fuelLevel;

        segments.push({
          startPoint,
          endPoint,
          distance,
          duration,
          averageSpeed,
          fuelConsumption,
        });

        currentSegmentStart = i;
        currentSegmentStartTime = currentTime;
      }
    }

    return segments;
  }

  private calculateTotalDistance(points: RoutePoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistanceBetweenPoints(
        points[i - 1],
        points[i]
      );
    }
    return totalDistance;
  }

  private calculateTotalDuration(points: RoutePoint[]): number {
    if (points.length < 2) return 0;
    const startTime = points[0].timestamp;
    const endTime = points[points.length - 1].timestamp;
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  }

  private calculateDistanceBetweenPoints(
    point1: RoutePoint,
    point2: RoutePoint
  ): number {
    return this.calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude
    );
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateFuelConsumption(points: RoutePoint[]): number {
    if (points.length < 2) return 0;
    const startFuel = points[0].fuelLevel;
    const endFuel = points[points.length - 1].fuelLevel;
    return Math.max(0, startFuel - endFuel);
  }

  private calculateStops(points: RoutePoint[]): number {
    let stops = 0;
    let isStopped = false;
    const stopThreshold = 5;

    for (const point of points) {
      if (point.speed <= stopThreshold && !isStopped) {
        stops++;
        isStopped = true;
      } else if (point.speed > stopThreshold && isStopped) {
        isStopped = false;
      }
    }

    return stops;
  }

  private calculateIdleTime(points: RoutePoint[]): number {
    let idleTime = 0;
    const idleThreshold = 5;
    let idleStartTime: Date | null = null;

    for (const point of points) {
      if (point.speed <= idleThreshold) {
        if (!idleStartTime) {
          idleStartTime = point.timestamp;
        }
      } else {
        if (idleStartTime) {
          idleTime +=
            (point.timestamp.getTime() - idleStartTime.getTime()) / (1000 * 60);
          idleStartTime = null;
        }
      }
    }

    return idleTime;
  }

  getRoutesByDateRange(startDate: Date, endDate: Date): HistoricalRoute[] {
    return this.routesSubject.value.filter(
      (route) => route.startTime >= startDate && route.endTime <= endDate
    );
  }

  getRoutesByVehicle(vehicleId: string): HistoricalRoute[] {
    return this.routesSubject.value.filter(
      (route) => route.vehicleId === vehicleId
    );
  }

  getLongestRoutes(limit: number = 10): HistoricalRoute[] {
    return this.routesSubject.value
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .slice(0, limit);
  }

  getFastestRoutes(limit: number = 10): HistoricalRoute[] {
    return this.routesSubject.value
      .sort((a, b) => b.averageSpeed - a.averageSpeed)
      .slice(0, limit);
  }

  clearRoutes(): void {
    this.routesSubject.next([]);
    this.currentRouteSubject.next(null);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../../Security/Services/auth.service';

export interface Geofence {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  type: 'inclusion' | 'exclusion';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  color?: string;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  vehicleId: string;
  eventType: 'enter' | 'exit';
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  vehicleInfo?: {
    licensePlate: string;
    model: string;
    brand: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeofenceService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private geofencesSubject = new BehaviorSubject<Geofence[]>([]);
  private geofenceEventsSubject = new BehaviorSubject<GeofenceEvent[]>([]);

  public geofences$ = this.geofencesSubject.asObservable();
  public geofenceEvents$ = this.geofenceEventsSubject.asObservable();

  constructor() {
    this.loadGeofences();
  }

  /**
   * Cargar todas las geofences
   */
  loadGeofences(): Observable<Geofence[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/Geofences`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const geofences = response.data.map((item: any) => ({
            id: item.Id,
            name: item.Name,
            center: {
              latitude: item.CenterLatitude,
              longitude: item.CenterLongitude
            },
            radius: item.Radius,
            type: item.Type,
            isActive: item.IsActive,
            createdAt: new Date(item.CreatedAt),
            updatedAt: new Date(item.UpdatedAt),
            description: item.Description,
            color: item.Color || this.getDefaultColor(item.Type),
            alertOnEnter: item.AlertOnEnter,
            alertOnExit: item.AlertOnExit
          })) as Geofence[];
          
          this.geofencesSubject.next(geofences);
          return geofences;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error loading geofences:', error);
        return of([]);
      })
    );
  }

  /**
   * Crear una nueva geofence
   */
  createGeofence(geofence: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>): Observable<Geofence> {
    const payload = {
      Name: geofence.name,
      CenterLatitude: geofence.center.latitude,
      CenterLongitude: geofence.center.longitude,
      Radius: geofence.radius,
      Type: geofence.type,
      IsActive: geofence.isActive,
      Description: geofence.description,
      Color: geofence.color,
      AlertOnEnter: geofence.alertOnEnter,
      AlertOnExit: geofence.alertOnExit
    };

    return this.http.post<any>(`${this.API_BASE_URL}/Geofences`, payload, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const newGeofence: Geofence = {
            id: response.data.Id,
            name: response.data.Name,
            center: {
              latitude: response.data.CenterLatitude,
              longitude: response.data.CenterLongitude
            },
            radius: response.data.Radius,
            type: response.data.Type,
            isActive: response.data.IsActive,
            createdAt: new Date(response.data.CreatedAt),
            updatedAt: new Date(response.data.UpdatedAt),
            description: response.data.Description,
            color: response.data.Color,
            alertOnEnter: response.data.AlertOnEnter,
            alertOnExit: response.data.AlertOnExit
          };
          
          // Agregar a la lista local
          const currentGeofences = this.geofencesSubject.value;
          this.geofencesSubject.next([...currentGeofences, newGeofence]);
          
          return newGeofence;
        }
        throw new Error('Failed to create geofence');
      }),
      catchError(error => {
        console.error('Error creating geofence:', error);
        throw error;
      })
    );
  }

  /**
   * Actualizar una geofence existente
   */
  updateGeofence(id: string, geofence: Partial<Geofence>): Observable<Geofence> {
    const payload = {
      Name: geofence.name,
      CenterLatitude: geofence.center?.latitude,
      CenterLongitude: geofence.center?.longitude,
      Radius: geofence.radius,
      Type: geofence.type,
      IsActive: geofence.isActive,
      Description: geofence.description,
      Color: geofence.color,
      AlertOnEnter: geofence.alertOnEnter,
      AlertOnExit: geofence.alertOnExit
    };

    return this.http.put<any>(`${this.API_BASE_URL}/Geofences/${id}`, payload, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const updatedGeofence: Geofence = {
            id: response.data.Id,
            name: response.data.Name,
            center: {
              latitude: response.data.CenterLatitude,
              longitude: response.data.CenterLongitude
            },
            radius: response.data.Radius,
            type: response.data.Type,
            isActive: response.data.IsActive,
            createdAt: new Date(response.data.CreatedAt),
            updatedAt: new Date(response.data.UpdatedAt),
            description: response.data.Description,
            color: response.data.Color,
            alertOnEnter: response.data.AlertOnEnter,
            alertOnExit: response.data.AlertOnExit
          };
          
          // Actualizar en la lista local
          const currentGeofences = this.geofencesSubject.value;
          const index = currentGeofences.findIndex(g => g.id === id);
          if (index !== -1) {
            currentGeofences[index] = updatedGeofence;
            this.geofencesSubject.next([...currentGeofences]);
          }
          
          return updatedGeofence;
        }
        throw new Error('Failed to update geofence');
      }),
      catchError(error => {
        console.error('Error updating geofence:', error);
        throw error;
      })
    );
  }

  /**
   * Eliminar una geofence
   */
  deleteGeofence(id: string): Observable<void> {
    return this.http.delete<any>(`${this.API_BASE_URL}/Geofences/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success) {
          // Remover de la lista local
          const currentGeofences = this.geofencesSubject.value;
          const filteredGeofences = currentGeofences.filter(g => g.id !== id);
          this.geofencesSubject.next(filteredGeofences);
        }
      }),
      catchError(error => {
        console.error('Error deleting geofence:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener eventos de geofence
   */
  getGeofenceEvents(geofenceId?: string, vehicleId?: string, hours: number = 24): Observable<GeofenceEvent[]> {
    const params = new URLSearchParams();
    if (geofenceId) params.append('geofenceId', geofenceId);
    if (vehicleId) params.append('vehicleId', vehicleId);
    params.append('hours', hours.toString());

    return this.http.get<any>(`${this.API_BASE_URL}/Geofences/events?${params}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const events = response.data.map((item: any) => ({
            id: item.Id,
            geofenceId: item.GeofenceId,
            vehicleId: item.VehicleId,
            eventType: item.EventType,
            timestamp: new Date(item.Timestamp),
            location: {
              latitude: item.Latitude,
              longitude: item.Longitude
            },
            vehicleInfo: item.VehicleInfo ? {
              licensePlate: item.VehicleInfo.LicensePlate,
              model: item.VehicleInfo.Model,
              brand: item.VehicleInfo.Brand
            } : undefined
          })) as GeofenceEvent[];
          
          this.geofenceEventsSubject.next(events);
          return events;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error loading geofence events:', error);
        return of([]);
      })
    );
  }

  /**
   * Verificar si un punto está dentro de una geofence
   */
  isPointInGeofence(
    point: { latitude: number; longitude: number },
    geofence: Geofence
  ): boolean {
    const distance = this.calculateDistance(
      point.latitude,
      point.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );
    
    return distance <= geofence.radius;
  }

  /**
   * Calcular distancia entre dos puntos en metros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  }

  /**
   * Obtener color por defecto según el tipo de geofence
   */
  private getDefaultColor(type: string): string {
    switch (type) {
      case 'inclusion':
        return '#10b981'; // Verde
      case 'exclusion':
        return '#ef4444'; // Rojo
      default:
        return '#6b7280'; // Gris
    }
  }

  /**
   * Obtener geofences activas
   */
  getActiveGeofences(): Geofence[] {
    return this.geofencesSubject.value.filter(g => g.isActive);
  }

  /**
   * Obtener geofences por tipo
   */
  getGeofencesByType(type: 'inclusion' | 'exclusion'): Geofence[] {
    return this.geofencesSubject.value.filter(g => g.type === type);
  }

  /**
   * Buscar geofences por nombre
   */
  searchGeofences(query: string): Geofence[] {
    const lowerQuery = query.toLowerCase();
    return this.geofencesSubject.value.filter(g => 
      g.name.toLowerCase().includes(lowerQuery) ||
      (g.description && g.description.toLowerCase().includes(lowerQuery))
    );
  }
}

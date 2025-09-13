import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Location, Vehicle, Geofence } from '../Models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  
  private mapInstance: any = null;
  private markersSubject = new BehaviorSubject<any[]>([]);
  private geofencesSubject = new BehaviorSubject<Geofence[]>([]);

  public markers$ = this.markersSubject.asObservable();
  public geofences$ = this.geofencesSubject.asObservable();

  constructor(private http: HttpClient) {}

  initializeMap(containerId: string, center: [number, number] = [-74.006, 40.7128]): Promise<any> {
    return new Promise((resolve, reject) => {
      const container = document.getElementById(containerId);
      
      if (!container) {
        const error = new Error(`Container '${containerId}' not found`);
        reject(error);
        return;
      }
      
      if (typeof window !== 'undefined' && (window as any).maplibregl) {
        try {
          const map = new (window as any).maplibregl.Map({
            container: containerId,
            style: {
              version: 8,
              sources: {
                'osm': {
                  type: 'raster',
                  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                  attribution: '© OpenStreetMap contributors'
                }
              },
              layers: [
                {
                  id: 'osm',
                  type: 'raster',
                  source: 'osm'
                }
              ]
            },
            center: center,
            zoom: 10
          });

          map.on('load', () => {
            this.mapInstance = map;
            
            setTimeout(() => {
              map.resize();
            }, 100);
            
            resolve(map);
          });

          map.on('error', (error: any) => {
            console.error('Map error:', error);
            reject(error);
          });
        } catch (error) {
          console.error('Error creating map:', error);
          reject(error);
        }
      } else {
        const error = new Error('MapLibre GL JS not loaded');
        reject(error);
      }
    });
  }

  addVehicleMarker(vehicle: Vehicle, location: Location): void {
    if (!this.mapInstance) return;

    const marker = new (window as any).maplibregl.Marker({
      color: this.getVehicleColor(vehicle.status)
    })
      .setLngLat([location.longitude, location.latitude])
      .setPopup(
        new (window as any).maplibregl.Popup({ offset: 25 })
          .setHTML(this.createVehiclePopup(vehicle, location))
      )
      .addTo(this.mapInstance);

    this.markersSubject.next([...this.markersSubject.value, marker]);
  }

  updateVehicleMarker(vehicleId: string, location: Location): void {
    const markers = this.markersSubject.value;
    const markerIndex = markers.findIndex(m => m.vehicleId === vehicleId);
    
    if (markerIndex !== -1) {
      markers[markerIndex].setLngLat([location.longitude, location.latitude]);
    }
  }

  removeVehicleMarker(vehicleId: string): void {
    const markers = this.markersSubject.value;
    const markerIndex = markers.findIndex(m => m.vehicleId === vehicleId);
    
    if (markerIndex !== -1) {
      markers[markerIndex].remove();
      markers.splice(markerIndex, 1);
      this.markersSubject.next(markers);
    }
  }

  addGeofence(geofence: Geofence): void {
    if (!this.mapInstance) return;

    const circle = this.mapInstance.addSource(`geofence-${geofence.id}`, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [geofence.center.longitude, geofence.center.latitude]
        }
      }
    });

    this.mapInstance.addLayer({
      id: `geofence-${geofence.id}`,
      type: 'circle',
      source: `geofence-${geofence.id}`,
      paint: {
        'circle-radius': geofence.radius,
        'circle-color': geofence.type === 'inclusion' ? '#00ff00' : '#ff0000',
        'circle-opacity': 0.3,
        'circle-stroke-color': geofence.type === 'inclusion' ? '#00ff00' : '#ff0000',
        'circle-stroke-width': 2
      }
    });
  }

  removeGeofence(geofenceId: string): void {
    if (!this.mapInstance) return;

    if (this.mapInstance.getLayer(`geofence-${geofenceId}`)) {
      this.mapInstance.removeLayer(`geofence-${geofenceId}`);
    }
    if (this.mapInstance.getSource(`geofence-${geofenceId}`)) {
      this.mapInstance.removeSource(`geofence-${geofenceId}`);
    }
  }

  getGeofences(): Observable<Geofence[]> {
    return of([]);
  }

  createGeofence(geofence: Omit<Geofence, 'id'>): Observable<Geofence> {
    return throwError(() => new Error('Geofences API not available'));
  }

  updateGeofence(id: string, geofence: Partial<Geofence>): Observable<Geofence> {
    return throwError(() => new Error('Geofences API not available'));
  }

  deleteGeofence(id: string): Observable<void> {
    return throwError(() => new Error('Geofences API not available'));
  }

  private getVehicleColor(status: string): string {
    switch (status) {
      case 'active': return '#00ff00';
      case 'inactive': return '#ff0000';
      case 'maintenance': return '#ffaa00';
      default: return '#666666';
    }
  }

  private createVehiclePopup(vehicle: Vehicle, location: Location): string {
    return `
      <div class="p-3">
        <h3 class="font-bold text-lg">${vehicle.name}</h3>
        <p class="text-sm text-gray-600">${vehicle.plate}</p>
        <div class="mt-2 space-y-1">
          <p class="text-sm"><strong>Velocidad:</strong> ${location.speed} km/h</p>
          <p class="text-sm"><strong>Combustible:</strong> ${location.fuelLevel}%</p>
          <p class="text-sm"><strong>Estado:</strong> ${vehicle.status}</p>
          <p class="text-sm"><strong>Última actualización:</strong> ${new Date(location.timestamp).toLocaleString()}</p>
        </div>
      </div>
    `;
  }

  destroyMap(): void {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
    this.markersSubject.next([]);
  }
}

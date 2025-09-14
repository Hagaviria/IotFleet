import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  signal,
  computed,
  AfterViewInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

// Services
import { MapService } from '../../Services/map.service';
import { OfflineService } from '../../Services/offline.service';
import { GeofenceService, Geofence } from '../../Services/geofence.service';
import { RouteService, HistoricalRoute } from '../../Services/route.service';

// Models
import { Vehicle, Location } from '../../Models/dashboard.models';

declare global {
  interface Window {
    maplibregl: any;
  }
}

@Component({
  selector: 'app-map',
  standalone: false,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  providers: [MessageService],
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() vehicles = signal<Vehicle[]>([]);
  @Input() locations = signal<Location[]>([]);
  @Input() isOnline = signal<boolean>(true);

  private destroy$ = new Subject<void>();
  private mapInstance: any = null;
  private markers: Map<string, any> = new Map();
  private geofenceLayers: Map<string, any> = new Map();
  private routeLayers: Map<string, any> = new Map();

  // Signals
  isLoading = signal<boolean>(true);
  selectedVehicle = signal<Vehicle | null>(null);
  showGeofenceDialog = signal<boolean>(false);
  showRouteDialog = signal<boolean>(false);
  geofences = signal<Geofence[]>([]);
  historicalRoutes = signal<HistoricalRoute[]>([]);
  selectedRoute = signal<HistoricalRoute | null>(null);

  // Computed
  filteredVehicles = computed(() => {
    const selected = this.selectedVehicle();
    return selected ? [selected] : this.vehicles();
  });

  filteredLocations = computed(() => {
    const selected = this.selectedVehicle();
    if (selected) {
      return this.locations().filter((loc) => loc.vehicleId === selected.id);
    }
    return this.locations();
  });

  // Geofence form
  newGeofence: Partial<Geofence> = {
    name: '',
    center: { latitude: 0, longitude: 0 },
    radius: 100,
    type: 'inclusion',
    isActive: true,
  };

  constructor(
    private mapService: MapService,
    private offlineService: OfflineService,
    private geofenceService: GeofenceService,
    private routeService: RouteService,
    private messageService: MessageService
  ) {
    effect(() => {
      const vehicles = this.vehicles();
      const locations = this.locations();
      if (this.mapInstance && vehicles.length > 0) {
        this.updateMapMarkers(vehicles, locations);
      }
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadGeofences();
    this.loadHistoricalRoutes();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.loadMapLibreScript();
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.mapInstance) {
      this.mapService.destroyMap();
    }
  }

  private loadMapLibreScript(): void {
    const mapContainer = document.getElementById('map-container');

    if (!mapContainer) {
      setTimeout(() => this.loadMapLibreScript(), 500);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).maplibregl) {
      this.initializeMap();
    } else if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
      script.onload = () => {
        this.initializeMap();
      };
      script.onerror = (error) => {
        console.error('Error loading MapLibre GL JS:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el mapa',
        });
      };
      document.head.appendChild(script);

      if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }
    }
  }

  private async initializeMap(): Promise<void> {
    try {
      this.isLoading.set(true);

      if (!(window as any).maplibregl) {
        throw new Error('MapLibre GL JS not available');
      }

      const center: [number, number] = [-74.006, 4.6097];

      this.mapInstance = await this.mapService.initializeMap(
        'map-container',
        center
      );

      this.setupMapEvents();

      this.isLoading.set(false);

      setTimeout(() => {
        if (this.mapInstance) {
          this.mapInstance.resize();
          const vehicles = this.vehicles();
          const locations = this.locations();
          if (vehicles.length > 0) {
            this.updateMapMarkers(vehicles, locations);
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error initializing map:', error);
      this.isLoading.set(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo inicializar el mapa',
      });
    }
  }

  private setupMapEvents(): void {
    if (!this.mapInstance) return;

    this.mapInstance.on('click', (e: any) => {
      if (this.showGeofenceDialog()) {
        this.newGeofence.center = {
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        };
      }
    });
  }

  private setupSubscriptions(): void {
    /* intentionally left blank: effects handle subscriptions */
  }

  private updateMapMarkers(vehicles: Vehicle[], locations: Location[]): void {
    if (!this.mapInstance) return;

    // Actualizar marcadores existentes o crear nuevos
    vehicles.forEach((vehicle) => {
      const location = locations.find((loc) => loc.vehicleId === vehicle.id);
      if (location) {
        const existingMarker = this.markers.get(vehicle.id);
        if (existingMarker) {
          this.updateVehicleMarker(vehicle, location, existingMarker);
        } else {
          this.addVehicleMarker(vehicle, location);
        }
      }
    });

    const currentVehicleIds = new Set(vehicles.map((v) => v.id));
    this.markers.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        marker.remove();
        this.markers.delete(vehicleId);
      }
    });
  }

  private addVehicleMarker(vehicle: Vehicle, location: Location): void {
    if (!this.mapInstance) {
      return;
    }

    try {
      const marker = new window.maplibregl.Marker({
        color: this.getVehicleColor(vehicle.status),
        scale: 1.2,
      })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new window.maplibregl.Popup({ offset: 25 }).setHTML(
            this.createVehiclePopup(vehicle, location)
          )
        )
        .addTo(this.mapInstance);

      const element = marker.getElement();
      if (element) {
        element.classList.add('new-marker');
        setTimeout(() => {
          element.classList.remove('new-marker');
        }, 500);
      }

      this.markers.set(vehicle.id, marker);
    } catch (error) {
      console.error(`Error adding marker for vehicle ${vehicle.id}:`, error);
    }
  }

  private updateVehicleMarker(
    vehicle: Vehicle,
    location: Location,
    existingMarker: any
  ): void {
    if (!this.mapInstance || !existingMarker) {
      return;
    }

    try {
      const currentLngLat = existingMarker.getLngLat();
      const newLngLat = [location.longitude, location.latitude];

      const distance = this.calculateDistance(
        currentLngLat.lat,
        currentLngLat.lng,
        location.latitude,
        location.longitude
      );

      if (distance > 0.0001) {
        const element = existingMarker.getElement();
        if (element) {
          element.classList.add('moving');
        }

        existingMarker.setLngLat(newLngLat);
        existingMarker.setPopup(
          new window.maplibregl.Popup({ offset: 25 }).setHTML(
            this.createVehiclePopup(vehicle, location)
          )
        );

        const newColor = this.getVehicleColor(vehicle.status);
        if (element) {
          element.style.backgroundColor = newColor;
          setTimeout(() => {
            element.classList.remove('moving');
          }, 600);
        }
      }
    } catch (error) {
      console.error(`Error updating marker for vehicle ${vehicle.id}:`, error);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      marker.remove();
    });
    this.markers.clear();
  }

  private getVehicleColor(status: string): string {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#ef4444';
      case 'maintenance':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  }

  private createVehiclePopup(vehicle: Vehicle, location: Location): string {
    return `
      <div class="p-4 min-w-64">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-lg text-gray-900">${vehicle.name}</h3>
          <span class="px-2 py-1 text-xs rounded-full ${this.getStatusBadgeClass(
            vehicle.status
          )}">
            ${vehicle.status}
          </span>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Placa:</span>
            <span class="font-medium">${vehicle.plate}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Velocidad:</span>
            <span class="font-medium">${location.speed} km/h</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Combustible:</span>
            <span class="font-medium">${location.fuelLevel}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Distancia:</span>
            <span class="font-medium">${vehicle.totalDistance.toLocaleString()} km</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Última actualización:</span>
            <span class="font-medium text-xs">${new Date(
              location.timestamp
            ).toLocaleString()}</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="flex justify-between text-xs text-gray-500">
            <span>Eficiencia: ${vehicle.fuelEfficiency} km/L</span>
            <span>Vel. Prom: ${vehicle.averageSpeed} km/h</span>
          </div>
        </div>
      </div>
    `;
  }

  private getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  onVehicleSelect(vehicle: Vehicle | null): void {
    this.selectedVehicle.set(vehicle);

    if (vehicle && this.mapInstance) {
      const location = this.locations().find(
        (loc) => loc.vehicleId === vehicle.id
      );
      if (location) {
        this.mapInstance.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 15,
        });
      }
    }

    setTimeout(() => {
      const vehicles = this.vehicles();
      const locations = this.locations();
      if (this.mapInstance && vehicles.length > 0) {
        this.updateMapMarkers(vehicles, locations);
      }
    }, 100);
  }

  onShowAllVehicles(): void {
    this.selectedVehicle.set(null);

    if (this.mapInstance && this.locations().length > 0) {
      const bounds = new window.maplibregl.LngLatBounds();
      this.locations().forEach((location) => {
        bounds.extend([location.longitude, location.latitude]);
      });

      this.mapInstance.fitBounds(bounds, { padding: 50 });
    }
  }

  onToggleGeofenceDialog(): void {
    this.showGeofenceDialog.set(!this.showGeofenceDialog());
  }

  onCreateGeofence(): void {
    if (!this.newGeofence.name || !this.newGeofence.center) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos',
      });
      return;
    }

    if (this.isOnline()) {
      this.mapService
        .createGeofence(this.newGeofence as Omit<Geofence, 'id'>)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (geofence) => {
            this.geofences.set([...this.geofences(), geofence]);
            this.mapService.addGeofence(geofence);
            this.showGeofenceDialog.set(false);
            this.resetGeofenceForm();

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Geofence creada correctamente',
            });
          },
          error: (error) => {
            console.error('Error creating geofence:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo crear la geofence',
            });
          },
        });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Modo Offline',
        detail: 'No se pueden crear geofences sin conexión',
      });
    }
  }

  private resetGeofenceForm(): void {
    this.newGeofence = {
      name: '',
      center: { latitude: 0, longitude: 0 },
      radius: 100,
      type: 'inclusion',
      isActive: true,
    };
  }

  onGeofenceClick(geofence: Geofence): void {
    if (this.mapInstance) {
      this.mapInstance.flyTo({
        center: [geofence.center.longitude, geofence.center.latitude],
        zoom: 12,
      });
    }
  }

  // Métodos para geofences
  private loadGeofences(): void {
    this.geofenceService
      .loadGeofences()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (geofences) => {
          this.geofences.set(geofences);
          if (this.mapInstance) {
            this.updateGeofenceLayers(geofences);
          }
        },
        error: (error) => {
          console.error('Error loading geofences:', error);
        },
      });
  }

  private updateGeofenceLayers(geofences: Geofence[]): void {
    if (!this.mapInstance) return;

    this.clearGeofenceLayers();

    geofences.forEach((geofence) => {
      if (geofence.isActive) {
        this.addGeofenceLayer(geofence);
      }
    });
  }

  private addGeofenceLayer(geofence: Geofence): void {
    if (!this.mapInstance) return;

    const sourceId = `geofence-${geofence.id}`;
    const layerId = `geofence-layer-${geofence.id}`;

    const circle = this.createCircle(
      geofence.center.latitude,
      geofence.center.longitude,
      geofence.radius
    );

    this.mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: circle,
    });

    this.mapInstance.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': geofence.color || this.getGeofenceColor(geofence.type),
        'fill-opacity': 0.2,
      },
    });

    this.mapInstance.addLayer({
      id: `${layerId}-border`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': geofence.color || this.getGeofenceColor(geofence.type),
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    this.mapInstance.addLayer({
      id: `${layerId}-label`,
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': geofence.name,
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 0],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    });

    this.geofenceLayers.set(geofence.id, { sourceId, layerId });
  }

  private createCircle(lat: number, lng: number, radius: number): any {
    const points = 64;
    const coords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i * 360) / points;
      const dx = radius * Math.cos((angle * Math.PI) / 180);
      const dy = radius * Math.sin((angle * Math.PI) / 180);

      const newLat = lat + dy / 111320; // Aproximación: 1 grado ≈ 111320 metros
      const newLng = lng + dx / (111320 * Math.cos((lat * Math.PI) / 180));

      coords.push([newLng, newLat]);
    }

    coords.push(coords[0]); // Cerrar el polígono

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }

  private getGeofenceColor(type: string): string {
    switch (type) {
      case 'inclusion':
        return '#10b981';
      case 'exclusion':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }

  private clearGeofenceLayers(): void {
    this.geofenceLayers.forEach((layers, geofenceId) => {
      if (this.mapInstance.getLayer(layers.layerId)) {
        this.mapInstance.removeLayer(layers.layerId);
      }
      if (this.mapInstance.getLayer(`${layers.layerId}-border`)) {
        this.mapInstance.removeLayer(`${layers.layerId}-border`);
      }
      if (this.mapInstance.getLayer(`${layers.layerId}-label`)) {
        this.mapInstance.removeLayer(`${layers.layerId}-label`);
      }
      if (this.mapInstance.getSource(layers.sourceId)) {
        this.mapInstance.removeSource(layers.sourceId);
      }
    });
    this.geofenceLayers.clear();
  }

  // Métodos para rutas históricas
  private loadHistoricalRoutes(): void {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    this.routeService
      .getHistoricalRoutes('', startDate, endDate, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routes) => {
          this.historicalRoutes.set(routes);
        },
        error: (error) => {
          console.error('Error loading historical routes:', error);
        },
      });
  }

  onShowRouteDialog(): void {
    this.showRouteDialog.set(true);
  }

  onSelectRoute(route: HistoricalRoute): void {
    this.selectedRoute.set(route);
    this.showRouteDialog.set(false);
    this.displayRouteOnMap(route);
  }

  private displayRouteOnMap(route: HistoricalRoute): void {
    if (!this.mapInstance || !route.points.length) return;

    this.clearRouteLayers();

    const routeId = `route-${route.id}`;
    const sourceId = `route-source-${route.id}`;

    const routeGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.points.map((point) => [
          point.longitude,
          point.latitude,
        ]),
      },
      properties: {
        routeId: route.id,
        vehicleId: route.vehicleId,
        totalDistance: route.totalDistance,
        averageSpeed: route.averageSpeed,
      },
    };

    this.mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: routeGeoJSON,
    });

    this.mapInstance.addLayer({
      id: routeId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    this.addRouteMarkers(route, sourceId);

    this.fitRouteBounds(route);

    this.routeLayers.set(route.id, { sourceId, routeId });
  }

  private addRouteMarkers(route: HistoricalRoute, sourceId: string): void {
    if (!this.mapInstance || route.points.length < 2) return;

    const startPoint = route.points[0];
    const endPoint = route.points[route.points.length - 1];

    const startMarker = new window.maplibregl.Marker({
      color: '#10b981',
      scale: 1.2,
    })
      .setLngLat([startPoint.longitude, startPoint.latitude])
      .setPopup(
        new window.maplibregl.Popup().setHTML(`
        <div class="p-2">
          <h4 class="font-bold text-green-600">Inicio de Ruta</h4>
          <p class="text-sm">${startPoint.timestamp.toLocaleString()}</p>
          <p class="text-sm">Velocidad: ${startPoint.speed} km/h</p>
          <p class="text-sm">Combustible: ${startPoint.fuelLevel}%</p>
        </div>
      `)
      )
      .addTo(this.mapInstance);

    const endMarker = new window.maplibregl.Marker({
      color: '#ef4444',
      scale: 1.2,
    })
      .setLngLat([endPoint.longitude, endPoint.latitude])
      .setPopup(
        new window.maplibregl.Popup().setHTML(`
        <div class="p-2">
          <h4 class="font-bold text-red-600">Fin de Ruta</h4>
          <p class="text-sm">${endPoint.timestamp.toLocaleString()}</p>
          <p class="text-sm">Velocidad: ${endPoint.speed} km/h</p>
          <p class="text-sm">Combustible: ${endPoint.fuelLevel}%</p>
          <p class="text-sm">Distancia Total: ${route.totalDistance.toFixed(
            2
          )} km</p>
        </div>
      `)
      )
      .addTo(this.mapInstance);

    this.routeLayers.set(`${route.id}-start`, startMarker);
    this.routeLayers.set(`${route.id}-end`, endMarker);
  }

  private fitRouteBounds(route: HistoricalRoute): void {
    if (!this.mapInstance || route.points.length < 2) return;

    const bounds = new window.maplibregl.LngLatBounds();
    route.points.forEach((point) => {
      bounds.extend([point.longitude, point.latitude]);
    });

    this.mapInstance.fitBounds(bounds, { padding: 50 });
  }

  private clearRouteLayers(): void {
    this.routeLayers.forEach((layer, routeId) => {
      if (typeof layer === 'object' && layer.remove) {
        // Es un marcador
        layer.remove();
      } else if (this.mapInstance.getLayer(routeId)) {
        // Es una capa
        this.mapInstance.removeLayer(routeId);
      }
      if (this.mapInstance.getSource(`route-source-${routeId}`)) {
        this.mapInstance.removeSource(`route-source-${routeId}`);
      }
    });
    this.routeLayers.clear();
  }

  onClearRoute(): void {
    this.selectedRoute.set(null);
    this.clearRouteLayers();
  }
}

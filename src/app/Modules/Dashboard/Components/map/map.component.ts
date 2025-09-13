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

// Models
import { Vehicle, Location, Geofence } from '../../Models/dashboard.models';

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

  // Signals
  isLoading = signal<boolean>(true);
  selectedVehicle = signal<Vehicle | null>(null);
  showGeofenceDialog = signal<boolean>(false);
  geofences = signal<Geofence[]>([]);

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
    private messageService: MessageService
  ) {
    effect(() => {
      const vehicles = this.vehicles();
      const locations = this.locations();
      this.updateMapMarkers(vehicles, locations);
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    // Esperar a que el DOM esté completamente renderizado
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

    // Evento de clic en el mapa para crear geofences
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
    // Las suscripciones ya están configuradas en el constructor con effect()
  }

  private updateMapMarkers(vehicles: Vehicle[], locations: Location[]): void {
    if (!this.mapInstance) {
      return;
    }

    this.clearMarkers();

    vehicles.forEach((vehicle) => {
      const location = locations.find((loc) => loc.vehicleId === vehicle.id);
      if (location) {
        this.addVehicleMarker(vehicle, location);
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

      this.markers.set(vehicle.id, marker);
    } catch (error) {
      console.error(`Error adding marker for vehicle ${vehicle.id}:`, error);
    }
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

  private loadGeofences(): void {
    // API de geofences no disponible
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
  }

  onShowAllVehicles(): void {
    this.selectedVehicle.set(null);

    if (this.mapInstance && this.locations().length > 0) {
      // Calcular bounds para mostrar todos los vehículos
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
}

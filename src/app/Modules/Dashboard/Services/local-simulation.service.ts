import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, interval, map } from 'rxjs';
import { Vehicle } from './vehicle.service';
import { Location } from '../Models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class LocalSimulationService {
  private isRunning = signal<boolean>(false);
  private vehicles = signal<Vehicle[]>([]);
  private locations = signal<Location[]>([]);
  private simulationInterval: any = null;

  // Subject para notificar cambios
  private locationsSubject = new BehaviorSubject<Location[]>([]);
  public locations$ = this.locationsSubject.asObservable();

  constructor() {
    // Crear algunos vehículos de prueba
    this.createTestVehicles();
  }

  private createTestVehicles(): void {
    const testVehicles: Vehicle[] = [
      {
        id: 'vehicle-1',
        name: 'Toyota Corolla',
        plate: 'ABC-123',
        type: 'car',
        status: 'active',
        totalDistance: 0,
        averageSpeed: 0,
        fuelEfficiency: 8.5,
        fuelCapacity: 50,
        brand: 'Toyota',
        model: 'Corolla'
      },
      {
        id: 'vehicle-2',
        name: 'Ford Ranger',
        plate: 'DEF-456',
        type: 'truck',
        status: 'active',
        totalDistance: 0,
        averageSpeed: 0,
        fuelEfficiency: 12.0,
        fuelCapacity: 80,
        brand: 'Ford',
        model: 'Ranger'
      },
      {
        id: 'vehicle-3',
        name: 'Honda Civic',
        plate: 'GHI-789',
        type: 'car',
        status: 'active',
        totalDistance: 0,
        averageSpeed: 0,
        fuelEfficiency: 7.8,
        fuelCapacity: 45,
        brand: 'Honda',
        model: 'Civic'
      }
    ];

    this.vehicles.set(testVehicles);
  }

  startSimulation(): Observable<any> {
    if (this.isRunning()) {
      return new Observable(observer => {
        observer.next({ success: true, message: 'Simulación ya está ejecutándose' });
        observer.complete();
      });
    }

    this.isRunning.set(true);
    console.log('Starting local simulation...');

    // Inicializar ubicaciones
    this.initializeLocations();

    // Iniciar simulación cada 3 segundos
    this.simulationInterval = setInterval(() => {
      this.updateVehicleLocations();
    }, 3000);

    return new Observable(observer => {
      observer.next({ success: true, message: 'Simulación local iniciada' });
      observer.complete();
    });
  }

  stopSimulation(): Observable<any> {
    if (!this.isRunning()) {
      return new Observable(observer => {
        observer.next({ success: true, message: 'Simulación ya está detenida' });
        observer.complete();
      });
    }

    this.isRunning.set(false);
    console.log('Stopping local simulation...');

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    return new Observable(observer => {
      observer.next({ success: true, message: 'Simulación local detenida' });
      observer.complete();
    });
  }

  getSimulationStatus(): Observable<any> {
    return new Observable(observer => {
      observer.next({
        success: true,
        data: {
          IsRunning: this.isRunning(),
          VehicleCount: this.vehicles().length,
          LastUpdate: new Date().toISOString()
        }
      });
      observer.complete();
    });
  }

  private initializeLocations(): void {
    const vehicles = this.vehicles();
    const initialLocations: Location[] = vehicles.map(vehicle => ({
      id: `loc-${vehicle.id}`,
      vehicleId: vehicle.id,
      latitude: 4.6097 + (Math.random() - 0.5) * 0.1,
      longitude: -74.0817 + (Math.random() - 0.5) * 0.1,
      timestamp: new Date(),
      speed: Math.random() * 40 + 20, // 20-60 km/h
      fuelLevel: Math.random() * 50 + 30, // 30-80%
      isOnline: true,
      altitude: 2600 + (Math.random() - 0.5) * 20,
      fuelConsumption: 8.5 + (Math.random() - 0.5) * 0.3,
      engineTemperature: 85 + (Math.random() - 0.5) * 3,
      ambientTemperature: 22 + (Math.random() - 0.5) * 2,
      vehicleInfo: {
        licensePlate: vehicle.plate,
        model: vehicle.model || '',
        brand: vehicle.brand || '',
        fuelCapacity: vehicle.fuelCapacity || 50,
        averageConsumption: vehicle.fuelEfficiency || 8.5,
        fleetId: `fleet-${vehicle.id}`,
        createdAt: new Date(),
        lastMaintenance: new Date()
      }
    }));

    this.locations.set(initialLocations);
    this.locationsSubject.next(initialLocations);
  }

  private updateVehicleLocations(): void {
    const currentLocations = this.locations();
    const updatedLocations = currentLocations.map(location => {
      // Mover el vehículo en una dirección aleatoria
      const moveDistance = 0.001; // Aproximadamente 100 metros
      const angle = Math.random() * 2 * Math.PI;
      
      const newLatitude = location.latitude + Math.cos(angle) * moveDistance;
      const newLongitude = location.longitude + Math.sin(angle) * moveDistance;
      
      // Simular cambios en otros datos
      const newSpeed = Math.max(0, location.speed + (Math.random() - 0.5) * 10);
      const newFuelLevel = Math.max(0, location.fuelLevel - Math.random() * 0.5);

      return {
        ...location,
        latitude: newLatitude,
        longitude: newLongitude,
        speed: newSpeed,
        fuelLevel: newFuelLevel,
        timestamp: new Date(),
        engineTemperature: 85 + (Math.random() - 0.5) * 3,
        ambientTemperature: 22 + (Math.random() - 0.5) * 2
      };
    });

    this.locations.set(updatedLocations);
    this.locationsSubject.next(updatedLocations);
    console.log('Updated vehicle locations:', updatedLocations.length);
  }

  getVehicles(): Vehicle[] {
    return this.vehicles();
  }

  getLocations(): Location[] {
    return this.locations();
  }

  getLocationsObservable(): Observable<Location[]> {
    return this.locations$;
  }
}

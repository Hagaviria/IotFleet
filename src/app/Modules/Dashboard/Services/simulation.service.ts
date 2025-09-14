import { Injectable, signal } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { Vehicle } from '../Models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private isSimulating = signal<boolean>(false);
  private simulationInterval: any = null;
  private vehiclePositions = new Map<string, {
    latitude: number;
    longitude: number;
    speed: number;
    direction: number;
    fuelLevel: number;
    lastUpdate: Date;
    route?: {
      waypoints: { lat: number, lng: number }[];
    };
    currentWaypointIndex?: number;
    waypointProgress?: number;
    routeDirection?: number;
    behavior?: {
      type: 'aggressive' | 'normal' | 'cautious';
      speedMultiplier: number;
      laneChangeProbability: number;
      stopProbability: number;
    };
  }>();

  constructor(private webSocketService: WebSocketService) {}

  get isSimulatingSignal() {
    return this.isSimulating.asReadonly();
  }

  startSimulation(vehicles: Vehicle[]): void {
    if (this.isSimulating()) {
      return;
    }

    this.isSimulating.set(true);
    this.initializeVehiclePositions(vehicles);

    // Enviar actualizaciones cada 2 segundos
    this.simulationInterval = setInterval(() => {
      this.simulateVehicleMovements(vehicles);
    }, 2000);
  }

  stopSimulation(): void {
    this.isSimulating.set(false);
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private initializeVehiclePositions(vehicles: Vehicle[]): void {
    // Rutas principales reales de Bogotá con coordenadas precisas que siguen las calles
    const routes = [
      // Carrera 7 (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6097100, lng: -74.0817500 }, // Centro (Plaza de Bolívar)
          { lat: 4.6112000, lng: -74.0815000 }, // Calle 19
          { lat: 4.6127000, lng: -74.0812500 }, // Calle 26
          { lat: 4.6142000, lng: -74.0810000 }, // Calle 32
          { lat: 4.6157000, lng: -74.0807500 }, // Calle 39
          { lat: 4.6172000, lng: -74.0805000 }, // Calle 45
          { lat: 4.6187000, lng: -74.0802500 }, // Calle 53
          { lat: 4.6202000, lng: -74.0800000 }, // Calle 63
        ]
      },
      // Calle 80 (Este-Oeste) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6000000, lng: -74.0900000 }, // Oeste (Suba)
          { lat: 4.6010000, lng: -74.0880000 }, // Carrera 50
          { lat: 4.6020000, lng: -74.0860000 }, // Carrera 30
          { lat: 4.6030000, lng: -74.0840000 }, // Carrera 15
          { lat: 4.6040000, lng: -74.0820000 }, // Carrera 7
          { lat: 4.6050000, lng: -74.0800000 }, // Carrera 1
          { lat: 4.6060000, lng: -74.0780000 }, // Este
        ]
      },
      // Avenida Caracas (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6080000, lng: -74.0880000 }, // Sur (Kennedy)
          { lat: 4.6100000, lng: -74.0860000 }, // Calle 26
          { lat: 4.6120000, lng: -74.0840000 }, // Calle 32
          { lat: 4.6140000, lng: -74.0820000 }, // Calle 39
          { lat: 4.6160000, lng: -74.0800000 }, // Calle 45
          { lat: 4.6180000, lng: -74.0780000 }, // Calle 53
          { lat: 4.6200000, lng: -74.0760000 }, // Norte
        ]
      },
      // Calle 100 (Este-Oeste) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6180000, lng: -74.0920000 }, // Oeste (Suba)
          { lat: 4.6190000, lng: -74.0900000 }, // Carrera 50
          { lat: 4.6200000, lng: -74.0880000 }, // Carrera 30
          { lat: 4.6210000, lng: -74.0860000 }, // Carrera 15
          { lat: 4.6220000, lng: -74.0840000 }, // Carrera 7
          { lat: 4.6230000, lng: -74.0820000 }, // Carrera 1
          { lat: 4.6240000, lng: -74.0800000 }, // Este
        ]
      },
      // Diagonal 26 (Diagonal) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6050000, lng: -74.0850000 }, // Sur-oeste
          { lat: 4.6070000, lng: -74.0830000 }, // Centro-oeste
          { lat: 4.6090000, lng: -74.0810000 }, // Centro
          { lat: 4.6110000, lng: -74.0790000 }, // Centro-este
          { lat: 4.6130000, lng: -74.0770000 }, // Norte-este
          { lat: 4.6150000, lng: -74.0750000 }, // Más al norte-este
        ]
      },
      // Carrera 15 (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6000000, lng: -74.0820000 }, // Sur
          { lat: 4.6020000, lng: -74.0815000 }, // Calle 19
          { lat: 4.6040000, lng: -74.0810000 }, // Calle 26
          { lat: 4.6060000, lng: -74.0805000 }, // Calle 32
          { lat: 4.6080000, lng: -74.0800000 }, // Calle 39
          { lat: 4.6100000, lng: -74.0795000 }, // Calle 45
          { lat: 4.6120000, lng: -74.0790000 }, // Calle 53
        ]
      }
    ];

    vehicles.forEach((vehicle, index) => {
      const route = routes[index % routes.length];
      const waypointIndex = Math.floor(Math.random() * (route.waypoints.length - 1));
      const progress = Math.random(); // Progreso entre waypoints
      
      // Calcular posición inicial entre dos waypoints
      const currentWaypoint = route.waypoints[waypointIndex];
      const nextWaypoint = route.waypoints[waypointIndex + 1];
      
      const lat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * progress;
      const lng = currentWaypoint.lng + (nextWaypoint.lng - currentWaypoint.lng) * progress;
      
      this.vehiclePositions.set(vehicle.id, {
        latitude: lat,
        longitude: lng,
        speed: Math.random() * 25 + 20, // 20-45 km/h inicial (más realista para ciudad)
        direction: this.calculateDirection(currentWaypoint, nextWaypoint),
        fuelLevel: Math.random() * 50 + 30, // 30-80% combustible
        lastUpdate: new Date(),
        route: { waypoints: route.waypoints },
        currentWaypointIndex: waypointIndex,
        waypointProgress: progress,
        routeDirection: Math.random() > 0.5 ? 1 : -1, // 1 = hacia adelante, -1 = hacia atrás
        behavior: this.getRandomBehavior() // Comportamiento del conductor
      });
    });
  }

  private simulateVehicleMovements(vehicles: Vehicle[]): void {
    vehicles.forEach(vehicle => {
      const position = this.vehiclePositions.get(vehicle.id);
      if (!position || !position.route || !position.behavior || 
          position.currentWaypointIndex === undefined || 
          position.waypointProgress === undefined || 
          position.routeDirection === undefined) return;

      const now = new Date();
      const timeDiff = (now.getTime() - position.lastUpdate.getTime()) / 1000; // segundos

      // Simular comportamiento realista del conductor
      let newSpeed = this.calculateRealisticSpeed(position, timeDiff);
      
      // Simular paradas ocasionales (semáforos, tráfico, etc.)
      if (Math.random() < position.behavior.stopProbability) {
        newSpeed = Math.max(0, newSpeed - 15); // Reducir velocidad significativamente
      }
      
      // Simular aceleración gradual después de parar
      if (position.speed < 5 && newSpeed > 5) {
        newSpeed = Math.min(newSpeed, position.speed + 8); // Aceleración gradual
      }

      // Calcular progreso hacia el siguiente waypoint
      const currentWaypoint = position.route.waypoints[position.currentWaypointIndex];
      const nextWaypointIndex = position.currentWaypointIndex + position.routeDirection;
      
      // Verificar si necesitamos cambiar de waypoint
      if (nextWaypointIndex < 0 || nextWaypointIndex >= position.route.waypoints.length) {
        // Llegamos al final de la ruta, cambiar dirección
        position.routeDirection *= -1;
        position.currentWaypointIndex = Math.max(0, Math.min(position.route.waypoints.length - 2, 
          position.currentWaypointIndex + position.routeDirection));
        position.waypointProgress = 0;
        
        // Ocasionalmente cambiar de ruta completamente (5% de probabilidad)
        if (Math.random() < 0.05) {
          this.assignNewRoute(vehicle.id, position);
          return;
        }
      } else {
        const nextWaypoint = position.route.waypoints[nextWaypointIndex];
        const segmentDistance = this.calculateDistance(currentWaypoint, nextWaypoint);
        
        // Calcular progreso en el segmento actual
        const distanceKm = (newSpeed * timeDiff) / 3600; // distancia en km
        const progressChange = distanceKm / segmentDistance;
        
        position.waypointProgress += progressChange;
        
        // Si completamos el segmento, avanzar al siguiente waypoint
        if (position.waypointProgress >= 1) {
          position.currentWaypointIndex = nextWaypointIndex;
          position.waypointProgress = 0;
        }
      }
      
      // Calcular nueva posición basada en el progreso actual
      const finalCurrentWaypoint = position.route.waypoints[position.currentWaypointIndex];
      const finalNextWaypointIndex = position.currentWaypointIndex + position.routeDirection;
      
      if (finalNextWaypointIndex >= 0 && finalNextWaypointIndex < position.route.waypoints.length) {
        const finalNextWaypoint = position.route.waypoints[finalNextWaypointIndex];
        
        const newLat = finalCurrentWaypoint.lat + (finalNextWaypoint.lat - finalCurrentWaypoint.lat) * position.waypointProgress;
        const newLng = finalCurrentWaypoint.lng + (finalNextWaypoint.lng - finalCurrentWaypoint.lng) * position.waypointProgress;
        
        // Actualizar dirección basada en el movimiento
        position.direction = this.calculateDirection(
          { lat: position.latitude, lng: position.longitude },
          { lat: newLat, lng: newLng }
        );

        // Simular consumo de combustible realista
        const fuelConsumption = (newSpeed * timeDiff) / 3600 * 0.1; // 0.1L por km
        const newFuelLevel = Math.max(0, position.fuelLevel - fuelConsumption);

        // Actualizar posición
        position.latitude = newLat;
        position.longitude = newLng;
        position.speed = newSpeed;
        position.fuelLevel = newFuelLevel;
        position.lastUpdate = now;

        // Enviar actualización via WebSocket
        this.sendLocationUpdate(vehicle.id, {
          latitude: newLat,
          longitude: newLng,
          speed: newSpeed,
          fuelLevel: newFuelLevel,
          altitude: 2600 + (Math.random() - 0.5) * 20,
          fuelConsumption: 8.5 + (Math.random() - 0.5) * 0.3,
          engineTemperature: 85 + (Math.random() - 0.5) * 3,
          ambientTemperature: 22 + (Math.random() - 0.5) * 2
        });
      }
    });
  }

  private sendLocationUpdate(vehicleId: string, locationData: any): void {
    // Enviar directamente al WebSocket service usando el método público
    this.webSocketService.sendLocationUpdate(vehicleId, locationData);
  }

  private calculateDirection(start: { lat: number, lng: number }, end: { lat: number, lng: number }): number {
    const deltaLng = end.lng - start.lng;
    const deltaLat = end.lat - start.lat;
    return Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
  }

  private calculateDistance(start: { lat: number, lng: number }, end: { lat: number, lng: number }): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getRandomBehavior(): { type: 'aggressive' | 'normal' | 'cautious', speedMultiplier: number, laneChangeProbability: number, stopProbability: number } {
    const behaviors = [
      { type: 'aggressive' as const, speedMultiplier: 1.3, laneChangeProbability: 0.3, stopProbability: 0.05 },
      { type: 'normal' as const, speedMultiplier: 1.0, laneChangeProbability: 0.1, stopProbability: 0.15 },
      { type: 'cautious' as const, speedMultiplier: 0.7, laneChangeProbability: 0.05, stopProbability: 0.25 }
    ];
    
    return behaviors[Math.floor(Math.random() * behaviors.length)];
  }

  private calculateRealisticSpeed(position: any, timeDiff: number): number {
    const baseSpeed = 35; // Velocidad base en km/h
    const behavior = position.behavior;
    
    // Aplicar multiplicador de comportamiento
    let targetSpeed = baseSpeed * behavior.speedMultiplier;
    
    // Simular variaciones naturales de velocidad
    const speedVariation = (Math.random() - 0.5) * 8; // ±4 km/h
    targetSpeed += speedVariation;
    
    // Simular aceleración/desaceleración gradual
    const speedDifference = targetSpeed - position.speed;
    const maxAcceleration = 5; // km/h por segundo
    const acceleration = Math.sign(speedDifference) * Math.min(Math.abs(speedDifference), maxAcceleration * timeDiff);
    
    const newSpeed = position.speed + acceleration;
    
    // Límites de velocidad realistas para ciudad
    return Math.max(0, Math.min(60, newSpeed));
  }

  private assignNewRoute(vehicleId: string, position: any): void {
    const routes = [
      // Carrera 7 (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6097100, lng: -74.0817500 }, // Centro (Plaza de Bolívar)
          { lat: 4.6112000, lng: -74.0815000 }, // Calle 19
          { lat: 4.6127000, lng: -74.0812500 }, // Calle 26
          { lat: 4.6142000, lng: -74.0810000 }, // Calle 32
          { lat: 4.6157000, lng: -74.0807500 }, // Calle 39
          { lat: 4.6172000, lng: -74.0805000 }, // Calle 45
          { lat: 4.6187000, lng: -74.0802500 }, // Calle 53
          { lat: 4.6202000, lng: -74.0800000 }, // Calle 63
        ]
      },
      // Calle 80 (Este-Oeste) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6000000, lng: -74.0900000 }, // Oeste (Suba)
          { lat: 4.6010000, lng: -74.0880000 }, // Carrera 50
          { lat: 4.6020000, lng: -74.0860000 }, // Carrera 30
          { lat: 4.6030000, lng: -74.0840000 }, // Carrera 15
          { lat: 4.6040000, lng: -74.0820000 }, // Carrera 7
          { lat: 4.6050000, lng: -74.0800000 }, // Carrera 1
          { lat: 4.6060000, lng: -74.0780000 }, // Este
        ]
      },
      // Avenida Caracas (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6080000, lng: -74.0880000 }, // Sur (Kennedy)
          { lat: 4.6100000, lng: -74.0860000 }, // Calle 26
          { lat: 4.6120000, lng: -74.0840000 }, // Calle 32
          { lat: 4.6140000, lng: -74.0820000 }, // Calle 39
          { lat: 4.6160000, lng: -74.0800000 }, // Calle 45
          { lat: 4.6180000, lng: -74.0780000 }, // Calle 53
          { lat: 4.6200000, lng: -74.0760000 }, // Norte
        ]
      },
      // Calle 100 (Este-Oeste) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6180000, lng: -74.0920000 }, // Oeste (Suba)
          { lat: 4.6190000, lng: -74.0900000 }, // Carrera 50
          { lat: 4.6200000, lng: -74.0880000 }, // Carrera 30
          { lat: 4.6210000, lng: -74.0860000 }, // Carrera 15
          { lat: 4.6220000, lng: -74.0840000 }, // Carrera 7
          { lat: 4.6230000, lng: -74.0820000 }, // Carrera 1
          { lat: 4.6240000, lng: -74.0800000 }, // Este
        ]
      },
      // Diagonal 26 (Diagonal) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6050000, lng: -74.0850000 }, // Sur-oeste
          { lat: 4.6070000, lng: -74.0830000 }, // Centro-oeste
          { lat: 4.6090000, lng: -74.0810000 }, // Centro
          { lat: 4.6110000, lng: -74.0790000 }, // Centro-este
          { lat: 4.6130000, lng: -74.0770000 }, // Norte-este
          { lat: 4.6150000, lng: -74.0750000 }, // Más al norte-este
        ]
      },
      // Carrera 15 (Norte-Sur) - Coordenadas reales
      {
        waypoints: [
          { lat: 4.6000000, lng: -74.0820000 }, // Sur
          { lat: 4.6020000, lng: -74.0815000 }, // Calle 19
          { lat: 4.6040000, lng: -74.0810000 }, // Calle 26
          { lat: 4.6060000, lng: -74.0805000 }, // Calle 32
          { lat: 4.6080000, lng: -74.0800000 }, // Calle 39
          { lat: 4.6100000, lng: -74.0795000 }, // Calle 45
          { lat: 4.6120000, lng: -74.0790000 }, // Calle 53
        ]
      }
    ];
    
    const newRoute = routes[Math.floor(Math.random() * routes.length)];
    position.route = { waypoints: newRoute.waypoints };
    position.currentWaypointIndex = Math.floor(Math.random() * (newRoute.waypoints.length - 1));
    position.waypointProgress = Math.random();
    position.routeDirection = Math.random() > 0.5 ? 1 : -1;
    
    const currentWaypoint = newRoute.waypoints[position.currentWaypointIndex];
    const nextWaypoint = newRoute.waypoints[position.currentWaypointIndex + 1];
    position.direction = this.calculateDirection(currentWaypoint, nextWaypoint);
  }
}

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DashboardService } from '../../Services/dashboard.service';
import { AlertsService } from '../../Services/alerts.service';
import { OfflineService } from '../../Services/offline.service';
import { AuthService } from '../../../../Security/Services/auth.service';
import { SensorDataService } from '../../Services/sensor-data.service';
import { WebSocketService } from '../../Services/websocket.service';
import { DashboardStats, Vehicle, Location, Alert } from '../../Models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [MessageService]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

 
  stats = signal<DashboardStats | null>(null);
  vehicles = signal<Vehicle[]>([]);
  locations = signal<Location[]>([]);
  alerts = signal<Alert[]>([]);
  isLoading = signal<boolean>(true);
  isOnline = signal<boolean>(true);
  isAdmin = signal<boolean>(false);
  webSocketStatus = signal<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  
  activeVehiclesCount = computed(() => this.vehicles().filter(v => v.status === 'active').length);
  criticalAlertsCount = computed(() => this.alerts().filter(a => a.severity === 'critical' && !a.isRead).length);
  averageSpeed = computed(() => {
    const activeVehicles = this.vehicles().filter(v => v.status === 'active');
    if (activeVehicles.length === 0) return 0;
    return activeVehicles.reduce((sum, v) => sum + v.averageSpeed, 0) / activeVehicles.length;
  });

  constructor(
    private dashboardService: DashboardService,
    private alertsService: AlertsService,
    private offlineService: OfflineService,
    private authService: AuthService,
    private messageService: MessageService,
    private sensorDataService: SensorDataService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDashboard(): void {

    this.isAdmin.set(this.authService.isAdmin());
    this.offlineService.isOnline$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isOnline => {
      this.isOnline.set(isOnline);
      
      if (isOnline) {
        this.loadOnlineData();
      } else {
        this.loadOfflineData();
      }
    });
  }

  private setupSubscriptions(): void {
  
    combineLatest([
      this.dashboardService.stats$,
      this.dashboardService.vehicles$,
      this.dashboardService.locations$,
      this.alertsService.alerts$,
      this.sensorDataService.sensorData$,
      this.sensorDataService.fuelPredictions$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([stats, vehicles, locations, alerts, sensorData, fuelPredictions]) => {
      this.stats.set(stats);
      this.vehicles.set(vehicles);
      this.locations.set(locations);
      this.alerts.set(alerts);
      this.isLoading.set(false);

     
      if (stats) this.dashboardService.cacheStats(stats);
      if (vehicles.length > 0) this.dashboardService.cacheVehicles(vehicles);
      if (locations.length > 0) this.dashboardService.cacheLocations(locations);
      if (alerts.length > 0) this.alertsService.cacheAlerts(alerts);
    });

 
    this.setupWebSocketSubscriptions();
  }

  private setupWebSocketSubscriptions(): void {
    // Suscribirse al estado de conexión del WebSocket
    this.webSocketService.connectionStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.webSocketStatus.set(status);
      
      if (status === 'connected') {
        this.messageService.add({
          severity: 'success',
          summary: 'WebSocket Conectado',
          detail: 'Actualizaciones en tiempo real activas',
          life: 3000
        });
      } else if (status === 'error') {
        this.messageService.add({
          severity: 'warn',
          summary: 'WebSocket Desconectado',
          detail: 'Funcionando en modo offline',
          life: 5000
        });
      }
    });

    // Conectar WebSocket
    this.webSocketService.connect();

    // Suscribirse a actualizaciones de ubicación
    this.webSocketService.getLocationUpdates().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: update => {
        if (update.location) {
          this.updateVehicleLocation(update.vehicleId, update.location);
        }
      },
      error: error => {
        console.log('WebSocket location updates not available');
      }
    });

    // Suscribirse a actualizaciones de sensores
    this.webSocketService.getSensorDataUpdates().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: update => {
        if (update.sensorData) {
          this.updateVehicleSensorData(update.vehicleId, update.sensorData);
        }
      },
      error: error => {
        console.log('WebSocket sensor updates not available');
      }
    });

    // Suscribirse a alertas en tiempo real
    this.webSocketService.getAlertUpdates().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: update => {
        if (update.alert) {
          this.showAlertNotification(update.alert);
        }
      },
      error: error => {
        console.log('WebSocket alert updates not available');
      }
    });
  }

  private loadOnlineData(): void {
    this.isLoading.set(true);
    
  
    this.dashboardService.getDashboardStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => this.stats.set(stats),
      error: (error) => {
        console.error('Error loading stats:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las estadísticas'
        });
      }
    });

    this.dashboardService.getVehicles().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (vehicles) => this.vehicles.set(vehicles),
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los vehículos'
        });
      }
    });

    this.alertsService.getAlerts().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (alerts) => this.alerts.set(alerts),
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las alertas'
        });
      }
    });
  }

  private loadOfflineData(): void {
    this.isLoading.set(true);
    

    const cachedStats = this.dashboardService.getCachedStats();
    const cachedVehicles = this.dashboardService.getCachedVehicles();
    const cachedLocations = this.dashboardService.getCachedLocations();
    const cachedAlerts = this.alertsService.getCachedAlerts();

    if (cachedStats) this.stats.set(cachedStats);
    if (cachedVehicles.length > 0) this.vehicles.set(cachedVehicles);
    if (cachedLocations.length > 0) this.locations.set(cachedLocations);
    if (cachedAlerts.length > 0) this.alerts.set(cachedAlerts);

    this.isLoading.set(false);

    this.messageService.add({
      severity: 'warn',
      summary: 'Modo Offline',
      detail: 'Mostrando datos en caché. Algunas funciones pueden estar limitadas.'
    });
  }

  onVehicleStatusChange(vehicleId: string, status: string): void {
    this.dashboardService.updateVehicleStatus(vehicleId, status).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado del vehículo actualizado'
        });
      },
      error: (error) => {
        console.error('Error updating vehicle status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado del vehículo'
        });
      }
    });
  }

  onAlertAction(alertId: string, action: 'read' | 'delete'): void {
    if (action === 'read') {
      this.alertsService.markAlertAsRead(alertId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Alerta marcada como leída'
          });
        },
        error: (error) => {
          console.error('Error marking alert as read:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo marcar la alerta como leída'
          });
        }
      });
    } else if (action === 'delete') {
      this.alertsService.deleteAlert(alertId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Alerta eliminada'
          });
        },
        error: (error) => {
          console.error('Error deleting alert:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la alerta'
          });
        }
      });
    }
  }


  private updateVehicleLocation(vehicleId: string, location: any): void {
    const currentLocations = this.locations();
    const updatedLocations = currentLocations.map(loc =>
      loc.vehicleId === vehicleId
        ? { ...loc, ...location, timestamp: new Date() }
        : loc
    );
    this.locations.set(updatedLocations);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Ubicación Actualizada',
      detail: `Vehículo ${vehicleId} actualizado en tiempo real`,
      life: 3000
    });
  }

  private updateVehicleSensorData(vehicleId: string, sensorData: any): void {
    const currentVehicles = this.vehicles();
    const updatedVehicles = currentVehicles.map(vehicle => 
      vehicle.id === vehicleId 
        ? { ...vehicle, fuelLevel: sensorData.fuelLevel, lastUpdate: new Date() }
        : vehicle
    );
    this.vehicles.set(updatedVehicles);
  }

  private showAlertNotification(alert: any): void {
    const severity = this.mapAlertSeverityToToastSeverity(alert.severity);
    
    this.messageService.add({
      severity: severity,
      summary: 'Nueva Alerta',
      detail: alert.message,
      life: 5000
    });
  }

  private mapAlertSeverityToToastSeverity(severity: string): 'success' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warn';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'info';
    }
  }

  refreshData(): void {
    this.isLoading.set(true);
    
 
    this.dashboardService.getDashboardStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Datos actualizados correctamente'
        });
      },
      error: (error) => {
        console.error('Error refreshing data:', error);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron actualizar los datos'
        });
      }
    });
  }

}

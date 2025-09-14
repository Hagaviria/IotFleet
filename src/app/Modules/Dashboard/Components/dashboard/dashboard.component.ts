import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DashboardService } from '../../Services/dashboard.service';
import { AlertsService } from '../../Services/alerts.service';
import { OfflineService } from '../../Services/offline.service';
import { AuthService } from '../../../../Security/Services/auth.service';
import { SensorDataService } from '../../Services/sensor-data.service';
import { WebSocketService } from '../../Services/websocket.service';
import { SimulationControlService, SimulationStatus } from '../../Services/simulation-control.service';
import { LocalSimulationService } from '../../Services/local-simulation.service';
import {
  DashboardStats,
  Vehicle,
  Location,
  Alert,
} from '../../Models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [MessageService, ConfirmationService],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>()
  private realTimeInterval: any = null;

  stats = signal<DashboardStats | null>(null);
  vehicles = signal<Vehicle[]>([]);
  locations = signal<Location[]>([]);
  alerts = signal<Alert[]>([]);
  isLoading = signal<boolean>(true);
  isOnline = signal<boolean>(true);
  isAdmin = signal<boolean>(false);
  webSocketStatus = signal<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  simulationStatus = signal<SimulationStatus>({
    isRunning: false,
    vehicleCount: 0,
    lastUpdate: new Date()
  });
  

  activeVehiclesCount = computed(
    () => (this.vehicles() || []).filter((v) => v.status === 'active').length
  );
  criticalAlertsCount = computed(
    () =>
      (this.alerts() || []).filter((a) => a.severity === 'critical' && !a.isRead).length
  );
  averageSpeed = computed(() => {
    const activeVehicles = (this.vehicles() || []).filter((v) => v.status === 'active');
    if (activeVehicles.length === 0) return 0;
    return (
      activeVehicles.reduce((sum, v) => sum + v.averageSpeed, 0) /
      activeVehicles.length
    );
  });

  currentUser = computed(() => {
    const userId = this.authService.getUserId();
    const userRole = this.authService.getUserRole();
    return {
      id: userId,
      role: userRole,
      isAdmin: userRole === 'Admin'
    };
  });

  constructor(
    private dashboardService: DashboardService,
    private alertsService: AlertsService,
    private offlineService: OfflineService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private sensorDataService: SensorDataService,
    private webSocketService: WebSocketService,
    private simulationControlService: SimulationControlService,
    private localSimulationService: LocalSimulationService
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupSubscriptions();
  }


  private initializeDashboard(): void {
    this.isAdmin.set(this.authService.isAdmin());
    this.offlineService.isOnline$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOnline) => {
        this.isOnline.set(isOnline);

        if (isOnline) {
          this.loadOnlineData();
        } else {
          this.loadOfflineData();
        }
      });
  }

  private setupSubscriptions(): void {
    // Suscribirse al estado de la simulación
    this.simulationControlService.simulationStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.simulationStatus.set(status);
        
        // Si la simulación está activa, actualizar datos cada 3 segundos
        if (status.isRunning) {
          this.startRealTimeUpdates();
        } else {
          this.stopRealTimeUpdates();
        }
      });

    combineLatest([
      this.dashboardService.stats$,
      this.dashboardService.vehicles$,
      this.dashboardService.locations$,
      this.alertsService.alerts$,
      this.sensorDataService.sensorData$,
      this.sensorDataService.fuelPredictions$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([stats, vehicles, locations, alerts, sensorData, fuelPredictions]) => {
          this.stats.set(stats);
          this.vehicles.set(vehicles);
          this.locations.set(locations);
          this.alerts.set(alerts);
          this.isLoading.set(false);

          if (stats) this.dashboardService.cacheStats(stats);
          if (vehicles.length > 0)
            this.dashboardService.cacheVehicles(vehicles);
          if (locations.length > 0)
            this.dashboardService.cacheLocations(locations);
          if (alerts.length > 0) this.alertsService.cacheAlerts(alerts);
        }
      );

    this.setupWebSocketSubscriptions();
  }

  private setupWebSocketSubscriptions(): void {
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.webSocketStatus.set(status);

        if (status === 'connected') {
          this.messageService.add({
            severity: 'success',
            summary: 'WebSocket Conectado',
            detail: 'Actualizaciones en tiempo real activas',
            life: 3000,
          });
        } else if (status === 'error') {
          this.messageService.add({
            severity: 'warn',
            summary: 'WebSocket Desconectado',
            detail: 'Funcionando en modo offline',
            life: 5000,
          });
        }
      });

    this.webSocketService.connect();

    this.webSocketService
      .getLocationUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          if (update.location) {
            this.updateVehicleLocation(update.vehicleId, update.location);
          }
        },
        error: (error) => {
          console.error('❌ WebSocket Location Update Error:', error);
        },
      });

    this.webSocketService
      .getSensorDataUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          if (update.sensorData) {
            this.updateVehicleSensorData(update.vehicleId, update.sensorData);
          }
        },
        error: (error) => {
        },
      });

    this.webSocketService
      .getAlertUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          if (update.alert) {
            this.showAlertNotification(update.alert);
          }
        },
        error: (error) => {
        },
      });
  }

  private loadOnlineData(): void {
    this.isLoading.set(true);

    this.dashboardService
      .getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: (error) => {
          console.error('Error loading stats:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las estadísticas',
          });
        },
      });

    this.dashboardService
      .getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => this.vehicles.set(vehicles),
        error: (error) => {
          console.error('Error loading vehicles:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los vehículos',
          });
        },
      });

    this.alertsService
      .getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => this.alerts.set(alerts),
        error: (error) => {
          console.error('Error loading alerts:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las alertas',
          });
        },
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
      detail:
        'Mostrando datos en caché. Algunas funciones pueden estar limitadas.',
    });
  }

  onVehicleStatusChange(vehicleId: string, status: string): void {
    this.dashboardService
      .updateVehicleStatus(vehicleId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Estado del vehículo actualizado',
          });
        },
        error: (error) => {
          console.error('Error updating vehicle status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado del vehículo',
          });
        },
      });
  }

  onAlertAction(alertId: string, action: 'read' | 'delete'): void {
    if (action === 'read') {
      this.alertsService
        .markAlertAsRead(alertId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Alerta marcada como leída',
            });
          },
          error: (error) => {
            console.error('Error marking alert as read:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo marcar la alerta como leída',
            });
          },
        });
    } else if (action === 'delete') {
      this.alertsService
        .deleteAlert(alertId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Alerta eliminada',
            });
          },
          error: (error) => {
            console.error('Error deleting alert:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la alerta',
            });
          },
        });
    }
  }


  private updateVehicleLocation(vehicleId: string, location: any): void {
    const currentLocations = this.locations();
    const existingLocationIndex = currentLocations.findIndex(loc => loc.vehicleId === vehicleId);
    
    if (existingLocationIndex >= 0) {
      // Actualizar ubicación existente
      const updatedLocations = [...currentLocations];
      updatedLocations[existingLocationIndex] = { 
        ...updatedLocations[existingLocationIndex], 
        ...location, 
        timestamp: new Date() 
      };
      this.locations.set(updatedLocations);
    } else {
      // Agregar nueva ubicación
      const newLocation = {
        id: `${vehicleId}-${Date.now()}`,
        vehicleId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date(),
        speed: location.speed || 0,
        fuelLevel: location.fuelLevel || 0,
        isOnline: true,
        altitude: location.altitude || 0,
        fuelConsumption: location.fuelConsumption || 0,
        engineTemperature: location.engineTemperature || 0,
        ambientTemperature: location.ambientTemperature || 0
      };
      this.locations.set([...currentLocations, newLocation]);
    }
  }

  private updateVehicleSensorData(vehicleId: string, sensorData: any): void {
    const currentVehicles = this.vehicles();
    const updatedVehicles = currentVehicles.map((vehicle) =>
      vehicle.id === vehicleId
        ? {
            ...vehicle,
            fuelLevel: sensorData.fuelLevel,
            lastUpdate: new Date(),
          }
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
      life: 5000,
    });
  }

  private mapAlertSeverityToToastSeverity(
    severity: string
  ): 'success' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warn';
      case 'high':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'info';
    }
  }

  refreshData(): void {
    this.isLoading.set(true);

    this.dashboardService
      .getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Datos actualizados correctamente',
          });
        },
        error: (error) => {
          console.error('Error refreshing data:', error);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron actualizar los datos',
          });
        },
      });

    // Actualizar estado de simulación
    this.simulationControlService.updateSimulationStatus();
  }

  logout(): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea cerrar sesión?',
      header: 'Confirmar Cierre de Sesión',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Cerrar Sesión',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.authService.logout();
        this.messageService.add({
          severity: 'info',
          summary: 'Sesión Cerrada',
          detail: 'Ha cerrado sesión correctamente'
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    });
  }

  // Métodos para controlar la simulación
  startSimulation(): void {
    console.log('Starting simulation...');
    this.simulationControlService.startSimulation().subscribe({
      next: (response) => {
        console.log('Start simulation response:', response);
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Simulación Iniciada',
            detail: 'La simulación de vehículos ha comenzado'
          });
          console.log('Updating simulation status...');
          this.simulationControlService.updateSimulationStatus();
          
          // Forzar actualización después de un pequeño delay
          setTimeout(() => {
            console.log('Force updating simulation status after delay...');
            this.simulationControlService.updateSimulationStatus();
          }, 1000);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo iniciar la simulación'
          });
        }
      },
      error: (error) => {
        console.error('Error starting simulation:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al iniciar la simulación'
        });
      }
    });
  }

  stopSimulation(): void {
    this.simulationControlService.stopSimulation().subscribe({
      next: (response) => {
        if (response.success) {
          this.messageService.add({
            severity: 'info',
            summary: 'Simulación Detenida',
            detail: 'La simulación de vehículos se ha detenido'
          });
          this.simulationControlService.updateSimulationStatus();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo detener la simulación'
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al detener la simulación'
        });
      }
    });
  }

  private startRealTimeUpdates(): void {
    // Limpiar intervalo anterior si existe
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
    }
    
    // Obtener datos del backend cada 3 segundos
    this.realTimeInterval = setInterval(() => {
      console.log('Updating real-time data from backend...');
      this.dashboardService.getRealTimeData().subscribe({
        next: (locations) => {
          if (locations.length > 0) {
            this.locations.set(locations);
            console.log('Updated locations from backend:', locations.length);
          } else {
            console.log('No locations received from backend');
          }
        },
        error: (error) => {
          console.error('Error getting real-time data from backend:', error);
          // Fallback a simulación local solo si el backend no está disponible
          if (error.status === 0 || error.status === 404) {
            console.log('Backend not available, trying local simulation...');
            this.localSimulationService.getLocationsObservable().subscribe({
              next: (locations) => {
                if (locations.length > 0) {
                  this.locations.set(locations);
                  console.log('Updated locations from local simulation:', locations.length);
                }
              },
              error: (localError) => {
                console.error('Error updating local simulation data:', localError);
              }
            });
          }
        }
      });
    }, 3000);
  }

  private stopRealTimeUpdates(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
      console.log('Stopped real-time updates');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRealTimeUpdates();
  }

}

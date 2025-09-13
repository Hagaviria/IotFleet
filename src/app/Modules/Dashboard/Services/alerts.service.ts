import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, switchMap, catchError, of, throwError, merge } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Alert } from '../Models/dashboard.models';
import { AuthService } from '../../../Security/Services/auth.service';
import { SensorDataService, FuelPrediction } from './sensor-data.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private readonly API_BASE_URL = 'https://localhost:7162/api';
  private readonly REFRESH_INTERVAL = 15000;

  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private fuelAlertsSubject = new BehaviorSubject<Alert[]>([]);

  public alerts$ = this.alertsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public fuelAlerts$ = this.fuelAlertsSubject.asObservable();

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private sensorDataService = inject(SensorDataService);
  private webSocketService = inject(WebSocketService);

  constructor() {
    this.startRealTimeUpdates();
    this.setupWebSocketAlerts();
    this.setupFuelPredictions();
  }

  private startRealTimeUpdates(): void {
    interval(this.REFRESH_INTERVAL).pipe(
      switchMap(() => this.getAlerts()),
      catchError(error => {
        console.error('Error updating alerts:', error);
        return of([]);
      })
    ).subscribe(alerts => {
      this.alertsSubject.next(alerts);
      this.updateUnreadCount(alerts);
    });
  }

  getAlerts(): Observable<Alert[]> {
    // Como no hay API de alertas, generamos alertas simuladas basadas en datos de sensores
    return this.sensorDataService.sensorData$.pipe(
      map(sensorData => this.generateSimulatedAlerts(sensorData)),
      tap(alerts => this.cacheAlerts(alerts)),
      catchError(error => {
        console.error('Error generating alerts:', error);
        const cachedAlerts = this.getCachedAlerts();
        return cachedAlerts.length > 0 ? of(cachedAlerts) : of([]);
      })
    );
  }

  private generateSimulatedAlerts(sensorData: any[]): Alert[] {
    const alerts: Alert[] = [];
    
    // Generar alertas basadas en datos de sensores
    sensorData.forEach(data => {
      const vehiclePlate = data.additionalData?.vehicleInfo?.licensePlate || data.vehicleId;
      const vehicleInfo = data.additionalData?.vehicleInfo;
      
      // Alerta de combustible bajo
      if (data.fuelLevel && data.fuelLevel < 20) {
        alerts.push({
          id: `fuel_${data.vehicleId}_${Date.now()}`,
          type: 'fuel',
          severity: data.fuelLevel < 10 ? 'high' : 'medium',
          title: 'Nivel de Combustible Bajo',
          message: `Vehículo ${vehiclePlate} tiene ${data.fuelLevel}% de combustible (Capacidad: ${vehicleInfo?.fuelCapacity || 'N/A'}L)`,
          vehicleId: data.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: false
        });
      }
      
      // Alerta de temperatura alta
      if (data.temperature && data.temperature > 80) {
        alerts.push({
          id: `temp_${data.vehicleId}_${Date.now()}`,
          type: 'temperature',
          severity: data.temperature > 90 ? 'high' : 'medium',
          title: 'Temperatura del Motor Alta',
          message: `Vehículo ${vehiclePlate} tiene temperatura alta: ${data.temperature}°C (Ambiente: ${data.additionalData?.ambientTemperature || 'N/A'}°C)`,
          vehicleId: data.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: false
        });
      }
      
      // Alerta de velocidad alta
      if (data.speed && data.speed > 100) {
        alerts.push({
          id: `speed_${data.vehicleId}_${Date.now()}`,
          type: 'speed',
          severity: data.speed > 120 ? 'high' : 'medium',
          title: 'Velocidad Excesiva',
          message: `Vehículo ${vehiclePlate} circula a ${data.speed} km/h (Consumo: ${data.additionalData?.fuelConsumption || 'N/A'} L/100km)`,
          vehicleId: data.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: false
        });
      }
      
      // Alerta de consumo de combustible alto
      if (data.additionalData?.fuelConsumption && data.additionalData.fuelConsumption > 15) {
        alerts.push({
          id: `consumption_${data.vehicleId}_${Date.now()}`,
          type: 'fuel',
          severity: data.additionalData.fuelConsumption > 20 ? 'high' : 'medium',
          title: 'Consumo de Combustible Alto',
          message: `Vehículo ${vehiclePlate} tiene consumo alto: ${data.additionalData.fuelConsumption} L/100km (Promedio: ${vehicleInfo?.averageConsumption || 'N/A'} L/100km)`,
          vehicleId: data.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: false
        });
      }
      
      // Alerta de mantenimiento próximo
      if (vehicleInfo?.lastMaintenance) {
        const daysSinceMaintenance = Math.floor((Date.now() - vehicleInfo.lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceMaintenance > 180) { // 6 meses
          alerts.push({
            id: `maintenance_${data.vehicleId}_${Date.now()}`,
            type: 'maintenance',
            severity: daysSinceMaintenance > 365 ? 'high' : 'medium',
            title: 'Mantenimiento Requerido',
            message: `Vehículo ${vehiclePlate} requiere mantenimiento (Último: ${daysSinceMaintenance} días)`,
            vehicleId: data.vehicleId,
            timestamp: new Date(),
            isRead: false,
            isPredictive: true
          });
        }
      }
    });
    
    return alerts;
  }

  getPredictiveAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API_BASE_URL}/alerts/predictive`);
  }

  getAlertsByVehicle(vehicleId: string): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API_BASE_URL}/alerts/vehicle/${vehicleId}`);
  }

  markAlertAsRead(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.API_BASE_URL}/alerts/${alertId}/read`, {});
  }

  markAllAlertsAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.API_BASE_URL}/alerts/read-all`, {});
  }

  deleteAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/alerts/${alertId}`);
  }

  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'isRead'>): Observable<Alert> {
    return this.http.post<Alert>(`${this.API_BASE_URL}/alerts`, alert);
  }

  // Métodos para alertas predictivas
  generatePredictiveAlerts(): Observable<Alert[]> {
    return this.http.post<Alert[]>(`${this.API_BASE_URL}/alerts/predictive/generate`, {});
  }

  getMaintenancePredictions(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API_BASE_URL}/alerts/predictive/maintenance`);
  }

  getFuelPredictions(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API_BASE_URL}/alerts/predictive/fuel`);
  }

  getSpeedViolationPredictions(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.API_BASE_URL}/alerts/predictive/speed`);
  }

  private setupWebSocketAlerts(): void {
    // Escuchar alertas en tiempo real desde WebSocket
    this.webSocketService.getAlertUpdates().subscribe(update => {
      if (update.alert) {
        const alert: Alert = {
          id: `ws_${Date.now()}`,
          type: update.alert.type,
          severity: update.alert.severity,
          title: this.getAlertTitle(update.alert.type),
          message: update.alert.message,
          vehicleId: update.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: false
        };
        
        this.addAlert(alert);
      }
    });

    // Escuchar alertas de combustible específicamente
    this.webSocketService.getFuelAlerts().subscribe(update => {
      if (update.alert) {
        const fuelAlert: Alert = {
          id: `fuel_${Date.now()}`,
          type: 'fuel',
          severity: update.alert.severity,
          title: 'Alerta de Combustible',
          message: update.alert.message,
          vehicleId: update.vehicleId,
          timestamp: new Date(),
          isRead: false,
          isPredictive: true
        };
        
        this.addFuelAlert(fuelAlert);
      }
    });
  }

  private setupFuelPredictions(): void {
    // Escuchar predicciones de combustible del servicio de sensores
    this.sensorDataService.fuelPredictions$.subscribe(predictions => {
      const fuelAlerts: Alert[] = [];
      
      predictions.forEach(prediction => {
        if (prediction.isLowFuel) {
          const alert: Alert = {
            id: `fuel_pred_${prediction.vehicleId}_${Date.now()}`,
            type: 'fuel',
            severity: prediction.alertLevel === 'critical' ? 'high' : 'medium',
            title: 'Predicción de Combustible',
            message: this.generateFuelAlertMessage(prediction),
            vehicleId: prediction.vehicleId,
            timestamp: prediction.lastUpdated,
            isRead: false,
            isPredictive: true
          };
          
          fuelAlerts.push(alert);
        }
      });
      
      if (fuelAlerts.length > 0) {
        this.fuelAlertsSubject.next(fuelAlerts);
        this.addAlerts(fuelAlerts);
      }
    });
  }

  private generateFuelAlertMessage(prediction: FuelPrediction): string {
    const hours = Math.round(prediction.estimatedAutonomyHours * 10) / 10;
    
    if (prediction.alertLevel === 'critical') {
      return `CRÍTICO: Vehículo con menos de 1 hora de autonomía (${hours}h). Nivel de combustible: ${prediction.currentFuelLevel}%`;
    } else if (prediction.alertLevel === 'warning') {
      return `ADVERTENCIA: Vehículo con baja autonomía (${hours}h). Nivel de combustible: ${prediction.currentFuelLevel}%`;
    } else {
      return `Nivel de combustible bajo: ${prediction.currentFuelLevel}%. Autonomía estimada: ${hours}h`;
    }
  }

  private addAlert(alert: Alert): void {
    const currentAlerts = this.alertsSubject.value;
    const updatedAlerts = [alert, ...currentAlerts];
    this.alertsSubject.next(updatedAlerts);
    this.updateUnreadCount(updatedAlerts);
    this.cacheAlerts(updatedAlerts);
  }

  private addAlerts(alerts: Alert[]): void {
    const currentAlerts = this.alertsSubject.value;
    const updatedAlerts = [...alerts, ...currentAlerts];
    this.alertsSubject.next(updatedAlerts);
    this.updateUnreadCount(updatedAlerts);
    this.cacheAlerts(updatedAlerts);
  }

  private addFuelAlert(alert: Alert): void {
    const currentFuelAlerts = this.fuelAlertsSubject.value;
    const updatedFuelAlerts = [alert, ...currentFuelAlerts];
    this.fuelAlertsSubject.next(updatedFuelAlerts);
  }

  private updateUnreadCount(alerts: Alert[]): void {
    const unreadCount = alerts.filter(alert => !alert.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Métodos para funcionalidad offline
  getCachedAlerts(): Alert[] {
    const cached = localStorage.getItem('dashboard_alerts');
    return cached ? JSON.parse(cached) : [];
  }

  cacheAlerts(alerts: Alert[]): void {
    localStorage.setItem('dashboard_alerts', JSON.stringify(alerts));
  }

  clearAlertsCache(): void {
    localStorage.removeItem('dashboard_alerts');
  }

  // Métodos de utilidad
  getAlertIcon(type: string): string {
    switch (type) {
      case 'speed': return 'pi pi-tachometer';
      case 'fuel': return 'pi pi-car';
      case 'maintenance': return 'pi pi-wrench';
      case 'geofence': return 'pi pi-map';
      case 'predictive': return 'pi pi-chart-line';
      default: return 'pi pi-exclamation-triangle';
    }
  }

  getAlertSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return 'danger';
      default: return 'info';
    }
  }

  getAlertSeverityIcon(severity: string): string {
    switch (severity) {
      case 'low': return 'pi pi-info-circle';
      case 'medium': return 'pi pi-exclamation-triangle';
      case 'high': return 'pi pi-times-circle';
      case 'critical': return 'pi pi-ban';
      default: return 'pi pi-info-circle';
    }
  }

  private getAlertTitle(type: string): string {
    switch (type) {
      case 'speed': return 'Alerta de Velocidad';
      case 'fuel': return 'Alerta de Combustible';
      case 'maintenance': return 'Alerta de Mantenimiento';
      case 'geofence': return 'Alerta de Geofence';
      case 'temperature': return 'Alerta de Temperatura';
      case 'predictive': return 'Alerta Predictiva';
      default: return 'Alerta del Sistema';
    }
  }
}

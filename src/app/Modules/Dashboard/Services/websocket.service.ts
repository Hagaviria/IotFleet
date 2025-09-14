import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, merge } from 'rxjs';
import { filter, map, retry, delay, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../Security/Services/auth.service';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface RealTimeUpdate {
  vehicleId: string;
  location?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
  };
  sensorData?: {
    fuelLevel: number;
    temperature: number;
    engineRpm: number;
    batteryVoltage: number;
  };
  alert?: {
    type: 'fuel' | 'temperature' | 'speed' | 'maintenance';
    severity: 'low' | 'medium' | 'high';
    message: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private readonly WS_URL = 'wss://localhost:7162/RealTime'; // WebSocket real del backend
  private readonly RECONNECT_DELAY = 5000; // 5 segundos
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  
  private reconnectAttempts = 0;
  private isConnecting = false;
  private destroy$ = new Subject<void>();

  private connectionStatusSubject = new BehaviorSubject<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  private messageSubject = new Subject<WebSocketMessage>();
  private realTimeUpdateSubject = new Subject<RealTimeUpdate>();

  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public messages$ = this.messageSubject.asObservable();
  public realTimeUpdates$ = this.realTimeUpdateSubject.asObservable();

  private authService = inject(AuthService);

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.connectionStatusSubject.next('connecting');

    try {
      const token = this.authService.getToken();
      const wsUrl = token ? `${this.WS_URL}?token=${token}` : this.WS_URL;
      
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connectionStatusSubject.next('error');
      this.isConnecting = false;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.connectionStatusSubject.next('connected');
      
      this.joinFleetGroup();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        message.timestamp = new Date();
        
        this.messageSubject.next(message);
        this.handleRealTimeUpdate(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionStatusSubject.next('error');
      this.isConnecting = false;
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.connectionStatusSubject.next('disconnected');
      
      if (event.code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleReconnect();
      }
    };
  }

  private joinFleetGroup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const joinMessage = {
      type: 'JoinFleetGroup',
      fleetId: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    };

    this.ws.send(JSON.stringify(joinMessage));
  }

  private handleRealTimeUpdate(message: WebSocketMessage): void {
    switch (message.type) {
      case 'location_update':
        this.realTimeUpdateSubject.next({
          vehicleId: message.data.vehicleId,
          location: message.data.location
        });
        break;
        
      case 'sensor_data':
        this.realTimeUpdateSubject.next({
          vehicleId: message.data.vehicleId,
          sensorData: message.data.sensorData
        });
        break;
        
      case 'alert':
        this.realTimeUpdateSubject.next({
          vehicleId: message.data.vehicleId,
          alert: message.data.alert
        });
        break;
        
      case 'fuel_alert':
        this.realTimeUpdateSubject.next({
          vehicleId: message.data.vehicleId,
          alert: {
            type: 'fuel',
            severity: message.data.severity,
            message: message.data.message
          }
        });
        break;
    }
  }

  // Método para manejar eventos directos del backend
  public setupBackendEventHandlers(): void {
    if (this.ws) {
      // Escuchar eventos de actualización de ubicación del backend
      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'LocationUpdate') {
            this.realTimeUpdateSubject.next({
              vehicleId: data.vehicleId,
              location: data.location
            });
          } else if (data.type === 'SensorDataUpdate') {
            this.realTimeUpdateSubject.next({
              vehicleId: data.vehicleId,
              sensorData: data.sensorData
            });
          } else if (data.type === 'AlertUpdate') {
            this.realTimeUpdateSubject.next({
              vehicleId: data.vehicleId,
              alert: data.alert
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.initializeConnection();
    }, this.RECONNECT_DELAY);
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.initializeConnection();
  }

  disconnect(): void {
    this.destroy$.next();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connectionStatusSubject.next('disconnected');
  }

  sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }

  subscribeToVehicle(vehicleId: string): void {
    this.sendMessage({
      type: 'subscribe',
      data: { vehicleId }
    });
  }

  unsubscribeFromVehicle(vehicleId: string): void {
    this.sendMessage({
      type: 'unsubscribe',
      data: { vehicleId }
    });
  }

  subscribeToAllVehicles(): void {
    this.sendMessage({
      type: 'subscribe_all'
    });
  }

  requestLocationUpdate(vehicleId: string): void {
    this.sendMessage({
      type: 'request_location',
      data: { vehicleId }
    });
  }

  requestSensorData(vehicleId: string): void {
    this.sendMessage({
      type: 'request_sensor_data',
      data: { vehicleId }
    });
  }

  getLocationUpdates(): Observable<RealTimeUpdate> {
    return this.realTimeUpdates$.pipe(
      filter(update => !!update.location)
    );
  }

  getSensorDataUpdates(): Observable<RealTimeUpdate> {
    return this.realTimeUpdates$.pipe(
      filter(update => !!update.sensorData)
    );
  }

  getAlertUpdates(): Observable<RealTimeUpdate> {
    return this.realTimeUpdates$.pipe(
      filter(update => !!update.alert)
    );
  }

  getFuelAlerts(): Observable<RealTimeUpdate> {
    return this.realTimeUpdates$.pipe(
      filter(update => update.alert?.type === 'fuel')
    );
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Método para enviar actualizaciones de ubicación directamente (para simulación)
  // NOTA: Este método ya no se usa, los datos vienen del backend
  sendLocationUpdate(vehicleId: string, location: any): void {
    this.realTimeUpdateSubject.next({
      vehicleId: vehicleId,
      location: location
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}

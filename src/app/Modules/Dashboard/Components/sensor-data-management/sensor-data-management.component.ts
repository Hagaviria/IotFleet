import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// Shared Components
import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';

// Services
import { VehicleService, Vehicle } from '../../Services/vehicle.service';
import { AuthService } from '../../../../Security/Services/auth.service';

export interface SensorDataRequest {
  vehicleId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  fuelLevel: number;
  fuelConsumption: number;
  engineTemperature: number;
  ambientTemperature: number;
}

@Component({
  selector: 'app-sensor-data-management',
  standalone: false,
  templateUrl: './sensor-data-management.component.html',
  styleUrls: ['./sensor-data-management.component.css'],
})
export class SensorDataManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals
  vehicles = signal<Vehicle[]>([]);
  showCreateDialog = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSimulating = signal<boolean>(false);

  // Forms
  sensorDataFields: FormFieldBase<string>[] = [];

  // Computed
  isAdmin = computed(() => this.authService.isAdmin());

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private messageService: MessageService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initializeFormFields();
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFormFields(): void {
    console.log('🔧 Initializing sensor data form fields...');
    this.sensorDataFields = [
      new FormFieldBase({ key: 'vehicleId', label: 'Vehículo', required: true, controlType: 'dropdown', order: 1 }),
      new FormFieldBase({ key: 'latitude', label: 'Latitud', required: true, controlType: 'textbox', type: 'number', value: '4.6097100', order: 2 }),
      new FormFieldBase({ key: 'longitude', label: 'Longitud', required: true, controlType: 'textbox', type: 'number', value: '-74.0817500', order: 3 }),
      new FormFieldBase({ key: 'altitude', label: 'Altitud (m)', required: true, controlType: 'textbox', type: 'number', value: '2600.0', order: 4 }),
      new FormFieldBase({ key: 'speed', label: 'Velocidad (km/h)', required: true, controlType: 'textbox', type: 'number', value: '0', order: 5 }),
      new FormFieldBase({ key: 'fuelLevel', label: 'Nivel de Combustible (%)', required: true, controlType: 'textbox', type: 'number', value: '100', order: 6 }),
      new FormFieldBase({ key: 'fuelConsumption', label: 'Consumo de Combustible (L/100km)', required: true, controlType: 'textbox', type: 'number', value: '8.5', order: 7 }),
      new FormFieldBase({ key: 'engineTemperature', label: 'Temperatura del Motor (°C)', required: true, controlType: 'textbox', type: 'number', value: '85', order: 8 }),
      new FormFieldBase({ key: 'ambientTemperature', label: 'Temperatura Ambiente (°C)', required: true, controlType: 'textbox', type: 'number', value: '22', order: 9 })
    ];
    console.log('✅ Sensor data form fields initialized successfully');
  }

  // Cargar vehículos
  loadVehicles(): void {
    this.vehicleService.getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => {
          this.vehicles.set(vehicles);
          this.updateVehicleOptions();
        },
        error: (error) => console.error('Error loading vehicles:', error)
      });
  }

  private updateVehicleOptions(): void {
    const vehicleOptions = this.vehicles().map(v => ({
      key: v.id,
      value: `${v.plate} - ${v.brand} ${v.model}`
    }));
    
    // Actualizar las opciones del dropdown de vehículos
    const vehicleField = this.sensorDataFields.find(field => field.key === 'vehicleId');
    if (vehicleField) {
      vehicleField.options = vehicleOptions;
    }
  }

  // Mostrar dialog para crear sensor data
  showCreateSensorDataDialog(): void {
    this.showCreateDialog.set(true);
  }

  // Crear sensor data
  onCreateSensorDataSubmit(formData: Record<string, any>): void {
    console.log('📝 Create sensor data form submitted:', formData);
    this.isLoading.set(true);
    const sensorData: SensorDataRequest = {
      vehicleId: formData['vehicleId'],
      latitude: parseFloat(formData['latitude']),
      longitude: parseFloat(formData['longitude']),
      altitude: parseFloat(formData['altitude']),
      speed: parseFloat(formData['speed']),
      fuelLevel: parseFloat(formData['fuelLevel']),
      fuelConsumption: parseFloat(formData['fuelConsumption']),
      engineTemperature: parseFloat(formData['engineTemperature']),
      ambientTemperature: parseFloat(formData['ambientTemperature'])
    };

    // Simular envío al backend
    this.sendSensorDataToBackend(sensorData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Datos de sensor enviados correctamente'
        });
        this.showCreateDialog.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error sending sensor data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron enviar los datos del sensor'
        });
        this.isLoading.set(false);
      }
    });
  }

  // Enviar datos al backend
  private sendSensorDataToBackend(sensorData: SensorDataRequest) {
    const API_BASE_URL = 'https://localhost:7162/api';
    
    return this.http.post<any>(`${API_BASE_URL}/SensorData`, sensorData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Simular datos automáticamente
  startSimulation(): void {
    if (this.vehicles().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay vehículos disponibles para simular'
      });
      return;
    }

    this.isSimulating.set(true);
    this.messageService.add({
      severity: 'info',
      summary: 'Simulación Iniciada',
      detail: 'Generando datos de sensores cada 5 segundos'
    });

    // Simular datos cada 5 segundos
    const interval = setInterval(() => {
      if (!this.isSimulating()) {
        clearInterval(interval);
        return;
      }

      const randomVehicle = this.vehicles()[Math.floor(Math.random() * this.vehicles().length)];
      const simulatedData: SensorDataRequest = {
        vehicleId: randomVehicle.id,
        latitude: 4.6097100 + (Math.random() - 0.5) * 0.01,
        longitude: -74.0817500 + (Math.random() - 0.5) * 0.01,
        altitude: 2600 + (Math.random() - 0.5) * 100,
        speed: Math.random() * 80 + 20,
        fuelLevel: Math.random() * 100,
        fuelConsumption: 8.5 + (Math.random() - 0.5) * 2,
        engineTemperature: 85 + (Math.random() - 0.5) * 20,
        ambientTemperature: 22 + (Math.random() - 0.5) * 10
      };

      this.sendSensorDataToBackend(simulatedData).subscribe({
        next: () => {
          console.log('Datos simulados enviados:', simulatedData);
        },
        error: (error) => {
          console.error('Error enviando datos simulados:', error);
        }
      });
    }, 5000);
  }

  // Detener simulación
  stopSimulation(): void {
    this.isSimulating.set(false);
    this.messageService.add({
      severity: 'info',
      summary: 'Simulación Detenida',
      detail: 'Se ha detenido la generación automática de datos'
    });
  }

  // Cancelar operación
  cancelCreate(): void {
    this.showCreateDialog.set(false);
  }


  // Obtener nombre del vehículo
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles().find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Vehículo no encontrado';
  }
}

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

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
  sensorDataForm: FormGroup;

  // Computed
  isAdmin = computed(() => this.authService.isAdmin());

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private http: HttpClient
  ) {
    // Formulario para crear sensor data
    this.sensorDataForm = this.fb.group({
      vehicleId: ['', [Validators.required]],
      latitude: [4.6097100, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [-74.0817500, [Validators.required, Validators.min(-180), Validators.max(180)]],
      altitude: [2600.0, [Validators.required, Validators.min(0)]],
      speed: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
      fuelLevel: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
      fuelConsumption: [8.5, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      engineTemperature: [85, [Validators.required, Validators.min(-40), Validators.max(150)]],
      ambientTemperature: [22, [Validators.required, Validators.min(-40), Validators.max(60)]]
    });
  }

  ngOnInit(): void {
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Cargar vehículos
  loadVehicles(): void {
    this.vehicleService.getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => this.vehicles.set(vehicles),
        error: (error) => console.error('Error loading vehicles:', error)
      });
  }

  // Mostrar dialog para crear sensor data
  showCreateSensorDataDialog(): void {
    this.sensorDataForm.reset({
      latitude: 4.6097100,
      longitude: -74.0817500,
      altitude: 2600.0,
      speed: 0,
      fuelLevel: 100,
      fuelConsumption: 8.5,
      engineTemperature: 85,
      ambientTemperature: 22
    });
    this.showCreateDialog.set(true);
  }

  // Crear sensor data
  onCreateSensorData(): void {
    if (this.sensorDataForm.valid) {
      this.isLoading.set(true);
      const sensorData: SensorDataRequest = this.sensorDataForm.value;

      // Simular envío al backend
      this.sendSensorDataToBackend(sensorData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Datos de sensor enviados correctamente'
          });
          this.showCreateDialog.set(false);
          this.sensorDataForm.reset();
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
    } else {
      this.markFormGroupTouched(this.sensorDataForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
    }
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
    this.sensorDataForm.reset();
  }

  // Marcar todos los campos del formulario como tocados
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Obtener mensaje de error para un campo
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    }
    return '';
  }

  // Obtener nombre del vehículo
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles().find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Vehículo no encontrado';
  }
}

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';

import { VehicleService, Vehicle } from '../../Services/vehicle.service';
import { AuthService } from '../../../../Security/Services/auth.service';
import {
  SimulationControlService,
  SimulationStatus,
} from '../../Services/simulation-control.service';

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

  vehicles = signal<Vehicle[]>([]);
  showCreateDialog = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  simulationStatus = signal<SimulationStatus>({
    isRunning: false,
    vehicleCount: 0,
    lastUpdate: new Date(),
  });

  sensorDataFields: FormFieldBase<string>[] = [];

  isAdmin = computed(() => this.authService.isAdmin());

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private messageService: MessageService,
    private http: HttpClient,
    private simulationControlService: SimulationControlService
  ) {}

  ngOnInit(): void {
    this.initializeFormFields();
    this.loadVehicles();
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.simulationControlService.simulationStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.simulationStatus.set(status);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFormFields(): void {
    this.sensorDataFields = [
      new FormFieldBase({
        key: 'vehicleId',
        label: 'Vehículo',
        required: true,
        controlType: 'dropdown',
        order: 1,
      }),
      new FormFieldBase({
        key: 'latitude',
        label: 'Latitud',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '4.6097100',
        order: 2,
      }),
      new FormFieldBase({
        key: 'longitude',
        label: 'Longitud',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '-74.0817500',
        order: 3,
      }),
      new FormFieldBase({
        key: 'altitude',
        label: 'Altitud (m)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '2600.0',
        order: 4,
      }),
      new FormFieldBase({
        key: 'speed',
        label: 'Velocidad (km/h)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '0',
        order: 5,
      }),
      new FormFieldBase({
        key: 'fuelLevel',
        label: 'Nivel de Combustible (%)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '100',
        order: 6,
      }),
      new FormFieldBase({
        key: 'fuelConsumption',
        label: 'Consumo de Combustible (L/100km)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '8.5',
        order: 7,
      }),
      new FormFieldBase({
        key: 'engineTemperature',
        label: 'Temperatura del Motor (°C)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '85',
        order: 8,
      }),
      new FormFieldBase({
        key: 'ambientTemperature',
        label: 'Temperatura Ambiente (°C)',
        required: true,
        controlType: 'textbox',
        type: 'number',
        value: '22',
        order: 9,
      }),
    ];
  }

  loadVehicles(): void {
    this.vehicleService
      .getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => {
          this.vehicles.set(vehicles);
          this.updateVehicleOptions();
        },
        error: (error) => console.error('Error loading vehicles:', error),
      });
  }

  private updateVehicleOptions(): void {
    const vehicleOptions = this.vehicles().map((v) => ({
      key: v.id,
      value: `${v.plate} - ${v.brand} ${v.model}`,
    }));

    const vehicleField = this.sensorDataFields.find(
      (field) => field.key === 'vehicleId'
    );
    if (vehicleField) {
      vehicleField.options = vehicleOptions;
    }
  }

  showCreateSensorDataDialog(): void {
    this.showCreateDialog.set(true);
  }

  onCreateSensorDataSubmit(formData: Record<string, any>): void {
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
      ambientTemperature: parseFloat(formData['ambientTemperature']),
    };

    this.sendSensorDataToBackend(sensorData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Datos de sensor enviados correctamente',
        });
        this.showCreateDialog.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error sending sensor data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron enviar los datos del sensor',
        });
        this.isLoading.set(false);
      },
    });
  }

  private sendSensorDataToBackend(sensorData: SensorDataRequest) {
    const API_BASE_URL = 'https://localhost:7162/api';

    return this.http.post<any>(`${API_BASE_URL}/SensorData`, sensorData, {
      headers: this.authService.getAuthHeaders(),
    });
  }

  cancelCreate(): void {
    this.showCreateDialog.set(false);
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles().find((v) => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Vehículo no encontrado';
  }
}

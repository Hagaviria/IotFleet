import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// Shared Components
import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';

// Services
import { VehicleService, Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from '../../Services/vehicle.service';
import { AuthService } from '../../../../Security/Services/auth.service';

@Component({
  selector: 'app-vehicle-management',
  standalone: false,
  templateUrl: './vehicle-management.component.html',
  styleUrls: ['./vehicle-management.component.css'],
})
export class VehicleManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals
  vehicles = signal<Vehicle[]>([]);
  selectedVehicle = signal<Vehicle | null>(null);
  showCreateDialog = signal<boolean>(false);
  showEditDialog = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  // Forms
  createVehicleFields: FormFieldBase<string>[] = [];
  editVehicleFields: FormFieldBase<string>[] = [];

  // Computed
  isAdmin = computed(() => this.authService.isAdmin());
  filteredVehicles = computed(() => {
    const vehicles = this.vehicles();
    return Array.isArray(vehicles) ? vehicles : [];
  });

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
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
    console.log('🔧 Initializing vehicle form fields...');
    this.createVehicleFields = [
      new FormFieldBase({ key: 'licensePlate', label: 'Placa del Vehículo', required: true, controlType: 'textbox', order: 1 }),
      new FormFieldBase({ key: 'brand', label: 'Marca', required: true, controlType: 'textbox', order: 2 }),
      new FormFieldBase({ key: 'model', label: 'Modelo', required: true, controlType: 'textbox', order: 3 }),
      new FormFieldBase({ key: 'fuelCapacity', label: 'Capacidad de Combustible (L)', required: true, controlType: 'textbox', type: 'number', order: 4 }),
      new FormFieldBase({ key: 'averageConsumption', label: 'Consumo Promedio (L/100km)', required: true, controlType: 'textbox', type: 'number', order: 5 })
    ];
    console.log('✅ Vehicle form fields initialized successfully');
  }

  // Cargar vehículos
  loadVehicles(): void {
    this.isLoading.set(true);
    this.vehicleService.getVehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => {
          this.vehicles.set(Array.isArray(vehicles) ? vehicles : []);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading vehicles:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los vehículos'
          });
          this.isLoading.set(false);
        }
      });
  }

  // Mostrar dialog para crear vehículo
  showCreateVehicleDialog(): void {
    this.showCreateDialog.set(true);
  }

  // Crear nuevo vehículo
  onCreateVehicleSubmit(formData: Record<string, any>): void {
    console.log('📝 Create vehicle form submitted:', formData);
    this.isLoading.set(true);
    const vehicleData: CreateVehicleRequest = {
      licensePlate: formData['licensePlate'],
      brand: formData['brand'],
      model: formData['model'],
      fuelCapacity: parseFloat(formData['fuelCapacity']),
      averageConsumption: parseFloat(formData['averageConsumption'])
    };

    this.vehicleService.createVehicle(vehicleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newVehicle) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Vehículo ${newVehicle.plate} creado correctamente`
          });
          this.showCreateDialog.set(false);
          this.loadVehicles();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error creating vehicle:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el vehículo. Verifique que la placa no esté duplicada.'
          });
          this.isLoading.set(false);
        }
      });
  }

  // Mostrar dialog para editar vehículo
  showEditVehicleDialog(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    this.editVehicleFields = [
      new FormFieldBase({ key: 'brand', label: 'Marca', required: true, controlType: 'textbox', value: vehicle.brand, order: 1 }),
      new FormFieldBase({ key: 'model', label: 'Modelo', required: true, controlType: 'textbox', value: vehicle.model, order: 2 }),
      new FormFieldBase({ key: 'fuelCapacity', label: 'Capacidad de Combustible (L)', required: true, controlType: 'textbox', type: 'number', value: (vehicle.fuelCapacity || 0).toString(), order: 3 }),
      new FormFieldBase({ key: 'averageConsumption', label: 'Consumo Promedio (L/100km)', required: true, controlType: 'textbox', type: 'number', value: (vehicle.fuelEfficiency || 0).toString(), order: 4 })
    ];
    this.showEditDialog.set(true);
  }

  // Actualizar vehículo
  onUpdateVehicleSubmit(formData: Record<string, any>): void {
    console.log('📝 Update vehicle form submitted:', formData);
    if (this.selectedVehicle()) {
      this.isLoading.set(true);
      const vehicleData: UpdateVehicleRequest = {
        brand: formData['brand'],
        model: formData['model'],
        fuelCapacity: parseFloat(formData['fuelCapacity']),
        averageConsumption: parseFloat(formData['averageConsumption'])
      };

      this.vehicleService.updateVehicle(this.selectedVehicle()!.id, vehicleData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedVehicle) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Vehículo ${updatedVehicle.plate} actualizado correctamente`
            });
            this.showEditDialog.set(false);
            this.selectedVehicle.set(null);
            this.loadVehicles();
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error updating vehicle:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo actualizar el vehículo'
            });
            this.isLoading.set(false);
          }
        });
    }
  }

  // Eliminar vehículo
  deleteVehicle(vehicle: Vehicle): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el vehículo ${vehicle.plate}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.isLoading.set(true);
        this.vehicleService.deleteVehicle(vehicle.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Vehículo ${vehicle.plate} eliminado correctamente`
              });
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error('Error deleting vehicle:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo eliminar el vehículo'
              });
              this.isLoading.set(false);
            }
          });
      }
    });
  }

  // Cancelar operaciones
  cancelCreate(): void {
    this.showCreateDialog.set(false);
  }

  cancelEdit(): void {
    this.showEditDialog.set(false);
    this.selectedVehicle.set(null);
  }

  // Obtener severidad del estado
  getStatusSeverity(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'danger';
      case 'maintenance': return 'warning';
      default: return 'info';
    }
  }

  // Obtener etiqueta del estado
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  }

}

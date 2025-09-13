import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

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
  createVehicleForm: FormGroup;
  editVehicleForm: FormGroup;

  // Computed
  isAdmin = computed(() => this.authService.isAdmin());
  filteredVehicles = computed(() => {
    const vehicles = this.vehicles();
    return Array.isArray(vehicles) ? vehicles : [];
  });

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Formulario para crear vehículo
    this.createVehicleForm = this.fb.group({
      licensePlate: ['', [
        Validators.required, 
        Validators.pattern(/^[A-Z]{3}-\d{3}$/),
        Validators.maxLength(7)
      ]],
      brand: ['', [Validators.required, Validators.maxLength(100)]],
      model: ['', [Validators.required, Validators.maxLength(100)]],
      fuelCapacity: [0, [Validators.required, Validators.min(1), Validators.max(200)]],
      averageConsumption: [0, [Validators.required, Validators.min(0.1), Validators.max(50)]]
    });

    // Formulario para editar vehículo
    this.editVehicleForm = this.fb.group({
      brand: ['', [Validators.required, Validators.maxLength(100)]],
      model: ['', [Validators.required, Validators.maxLength(100)]],
      fuelCapacity: [0, [Validators.required, Validators.min(1), Validators.max(200)]],
      averageConsumption: [0, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      lastMaintenance: [null]
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
    if (this.createVehicleForm) {
      this.createVehicleForm.reset();
    }
    this.showCreateDialog.set(true);
  }

  // Crear nuevo vehículo
  onCreateVehicle(): void {
    if (this.createVehicleForm && this.createVehicleForm.valid) {
      this.isLoading.set(true);
      const vehicleData: CreateVehicleRequest = this.createVehicleForm.value;

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
            this.createVehicleForm.reset();
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
    } else {
      this.markFormGroupTouched(this.createVehicleForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
    }
  }

  // Mostrar dialog para editar vehículo
  showEditVehicleDialog(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    if (this.editVehicleForm) {
      this.editVehicleForm.patchValue({
        brand: vehicle.brand,
        model: vehicle.model,
        fuelCapacity: vehicle.fuelCapacity,
        averageConsumption: vehicle.fuelEfficiency,
        lastMaintenance: vehicle.lastMaintenance
      });
    }
    this.showEditDialog.set(true);
  }

  // Actualizar vehículo
  onUpdateVehicle(): void {
    if (this.editVehicleForm && this.editVehicleForm.valid && this.selectedVehicle()) {
      this.isLoading.set(true);
      const vehicleData: UpdateVehicleRequest = this.editVehicleForm.value;

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
    } else {
      this.markFormGroupTouched(this.editVehicleForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
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
    if (this.createVehicleForm) {
      this.createVehicleForm.reset();
    }
  }

  cancelEdit(): void {
    this.showEditDialog.set(false);
    this.selectedVehicle.set(null);
    if (this.editVehicleForm) {
      this.editVehicleForm.reset();
    }
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

  // Marcar todos los campos del formulario como tocados
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Obtener mensaje de error para un campo
  getFieldError(form: FormGroup, fieldName: string): string {
    if (!form) return '';
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }
}

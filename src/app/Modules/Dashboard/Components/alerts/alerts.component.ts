import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';

import { Subject, takeUntil } from 'rxjs';

import { MessageService, ConfirmationService } from 'primeng/api';

import { AlertsService } from '../../Services/alerts.service';
import { OfflineService } from '../../Services/offline.service';

import { Alert, Vehicle } from '../../Models/dashboard.models';

interface AlertActionEvent {
  alertId: string;
  action: 'read' | 'delete';
}

@Component({
  selector: 'app-alerts',
  standalone: false,
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class AlertsComponent implements OnInit, OnDestroy {
  @Input() alerts = signal<Alert[]>([]);
  @Input() vehicles = signal<Vehicle[]>([]);
  @Input() isOnline = signal<boolean>(true);
  @Input() isAdmin = signal<boolean>(false);

  @Output() alertAction = new EventEmitter<AlertActionEvent>();

  private destroy$ = new Subject<void>();


  filteredAlerts = signal<Alert[]>([]);
  selectedSeverity = signal<string>('all');
  selectedType = signal<string>('all');
  selectedVehicle = signal<string>('all');
  showPredictiveDialog = signal<boolean>(false);
  isLoading = signal<boolean>(false);


  unreadCount = computed(() => this.filteredAlerts().filter(a => !a.isRead).length);
  criticalCount = computed(() => this.filteredAlerts().filter(a => a.severity === 'critical').length);
  predictiveCount = computed(() => this.filteredAlerts().filter(a => a.isPredictive).length);

 
  severityOptions = [
    { label: 'Todas', value: 'all' },
    { label: 'Críticas', value: 'critical' },
    { label: 'Altas', value: 'high' },
    { label: 'Medias', value: 'medium' },
    { label: 'Bajas', value: 'low' }
  ];

  typeOptions = [
    { label: 'Todas', value: 'all' },
    { label: 'Velocidad', value: 'speed' },
    { label: 'Combustible', value: 'fuel' },
    { label: 'Mantenimiento', value: 'maintenance' },
    { label: 'Geofence', value: 'geofence' },
    { label: 'Predictivas', value: 'predictive' }
  ];

  vehicleOptions = computed(() => {
    const vehicles = this.vehicles();
    return [
      { label: 'Todos los vehículos', value: 'all' },
      ...vehicles.map(v => ({ label: `${v.name} (${v.plate})`, value: v.id }))
    ];
  });

  constructor(
    private alertsService: AlertsService,
    private offlineService: OfflineService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
 
    effect(() => {
      this.alerts();
 
      setTimeout(() => this.applyFilters(), 0);
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSubscriptions(): void {

  }

  private applyFilters(): void {
    const alerts = this.alerts();
    let filtered = Array.isArray(alerts) ? [...alerts] : [];

 
    if (this.selectedSeverity() !== 'all') {
      filtered = filtered.filter(a => a.severity === this.selectedSeverity());
    }

   
    if (this.selectedType() !== 'all') {
      filtered = filtered.filter(a => a.type === this.selectedType());
    }

    if (this.selectedVehicle() !== 'all') {
      filtered = filtered.filter(a => a.vehicleId === this.selectedVehicle());
    }


    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      
      // Si alguna fecha es inválida, ponerla al final
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });

    this.filteredAlerts.set(filtered);
  }

  onSeverityChange(): void {
    this.applyFilters();
  }

  onTypeChange(): void {
    this.applyFilters();
  }

  onVehicleChange(): void {
    this.applyFilters();
  }

  onMarkAsRead(alert: Alert): void {
    if (this.isOnline()) {
      this.alertsService.markAlertAsRead(alert.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Alerta marcada como leída'
          });
          this.alertAction.emit({ alertId: alert.id, action: 'read' });
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
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Modo Offline',
        detail: 'No se pueden marcar alertas como leídas sin conexión'
      });
    }
  }

  onDeleteAlert(alert: Alert): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar la alerta "${alert.title}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        if (this.isOnline()) {
          this.alertsService.deleteAlert(alert.id).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Alerta eliminada correctamente'
              });
              this.alertAction.emit({ alertId: alert.id, action: 'delete' });
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
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Modo Offline',
            detail: 'No se pueden eliminar alertas sin conexión'
          });
        }
      }
    });
  }

  onMarkAllAsRead(): void {
    if (this.isOnline()) {
      this.alertsService.markAllAlertsAsRead().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Todas las alertas marcadas como leídas'
          });
        },
        error: (error) => {
          console.error('Error marking all alerts as read:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron marcar todas las alertas como leídas'
          });
        }
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Modo Offline',
        detail: 'No se pueden marcar alertas como leídas sin conexión'
      });
    }
  }

  onGeneratePredictiveAlerts(): void {
    if (!this.isAdmin()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso denegado',
        detail: 'Solo los administradores pueden generar alertas predictivas'
      });
      return;
    }

    this.isLoading.set(true);
    this.alertsService.generatePredictiveAlerts().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (alerts) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${alerts.length} alertas predictivas generadas`
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error generating predictive alerts:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron generar las alertas predictivas'
        });
        this.isLoading.set(false);
      }
    });
  }

  onShowPredictiveDialog(): void {
    this.showPredictiveDialog.set(true);
  }

  onHidePredictiveDialog(): void {
    this.showPredictiveDialog.set(false);
  }

  getAlertIcon(type: string): string {
    return this.alertsService.getAlertIcon(type);
  }

  getAlertSeverityColor(severity: string): string {
    return this.alertsService.getAlertSeverityColor(severity);
  }

  getAlertSeverityIcon(severity: string): string {
    return this.alertsService.getAlertSeverityIcon(severity);
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles().find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.plate})` : 'Vehículo desconocido';
  }

  getFormattedDate(timestamp: Date | string): string {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  getTimeAgo(timestamp: Date | string): string {
    try {
      const now = new Date();
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
      if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
      return 'hace un momento';
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  getConfidenceColor(confidence: number | undefined): string {
    if (!confidence) return 'info';
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'danger';
  }

  getConfidenceText(confidence: number | undefined): string {
    if (!confidence) return 'N/A';
    return `${confidence}%`;
  }
}

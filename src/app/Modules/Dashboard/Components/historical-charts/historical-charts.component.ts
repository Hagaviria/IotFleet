import { Component, OnInit, OnDestroy, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';

// Services
import { DashboardService } from '../../Services/dashboard.service';
import { OfflineService } from '../../Services/offline.service';

// Models
import { Vehicle, HistoricalData, ChartData } from '../../Models/dashboard.models';

@Component({
  selector: 'app-historical-charts',
  standalone: false,
  templateUrl: './historical-charts.component.html',
  styleUrls: ['./historical-charts.component.css'],
  providers: [MessageService]
})
export class HistoricalChartsComponent implements OnInit, OnDestroy {
  @Input() vehicles = signal<Vehicle[]>([]);
  @Input() isOnline = signal<boolean>(true);

  private destroy$ = new Subject<void>();

  // Signals
  selectedVehicle = signal<Vehicle | null>(null);
  dateRange = signal<{ start: Date | null; end: Date | null }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
    end: new Date()
  });
  isLoading = signal<boolean>(false);
  historicalData = signal<HistoricalData[]>([]);

  // Chart data
  speedChartData = signal<ChartData | null>(null);
  fuelChartData = signal<ChartData | null>(null);
  distanceChartData = signal<ChartData | null>(null);
  efficiencyChartData = signal<ChartData | null>(null);

  // Chart options
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Fecha'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Computed
  filteredVehicles = computed(() => {
    return this.vehicles().filter(v => v.status === 'active');
  });

  constructor(
    private dashboardService: DashboardService,
    private offlineService: OfflineService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeCharts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeCharts(): void {
    // Configurar fechas por defecto
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    this.dateRange.set({ start: startDate, end: endDate });
    
    // Seleccionar el primer vehículo activo por defecto
    const activeVehicles = this.filteredVehicles();
    if (activeVehicles.length > 0) {
      this.selectedVehicle.set(activeVehicles[0]);
    }
  }

  onVehicleChange(vehicle: Vehicle | null): void {
    this.selectedVehicle.set(vehicle);
    if (vehicle) {
      this.loadHistoricalData();
    }
  }

  onDateRangeChange(): void {
    if (this.selectedVehicle()) {
      this.loadHistoricalData();
    }
  }

  private loadHistoricalData(): void {
    const vehicle = this.selectedVehicle();
    const dateRange = this.dateRange();
    
    if (!vehicle || !dateRange.start || !dateRange.end) {
      return;
    }

    this.isLoading.set(true);

    if (this.isOnline()) {
      this.dashboardService.getHistoricalData(vehicle.id, dateRange.start, dateRange.end).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (data) => {
          this.historicalData.set(data);
          this.updateCharts(data);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading historical data:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos históricos'
          });
          this.isLoading.set(false);
        }
      });
    } else {
      // Cargar datos desde caché offline
      this.loadOfflineHistoricalData(vehicle.id);
    }
  }

  private async loadOfflineHistoricalData(vehicleId: string): Promise<void> {
    try {
      const data = await this.offlineService.getStoredLocations(vehicleId);
      this.historicalData.set(data);
      this.updateCharts(data);
      this.isLoading.set(false);
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Modo Offline',
        detail: 'Mostrando datos históricos en caché'
      });
    } catch (error) {
      console.error('Error loading offline data:', error);
      this.isLoading.set(false);
    }
  }

  private updateCharts(data: HistoricalData[]): void {
    if (data.length === 0) {
      this.clearCharts();
      return;
    }

    // Ordenar datos por fecha
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Preparar labels (fechas)
    const labels = sortedData.map(d => new Date(d.date).toLocaleDateString());
    
    // Gráfico de velocidad
    this.speedChartData.set({
      labels: labels,
      datasets: [{
        label: 'Velocidad (km/h)',
        data: sortedData.map(d => d.speed),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      }]
    });

    // Gráfico de combustible
    this.fuelChartData.set({
      labels: labels,
      datasets: [{
        label: 'Nivel de Combustible (%)',
        data: sortedData.map(d => d.fuelLevel),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      }]
    });

    // Gráfico de distancia
    this.distanceChartData.set({
      labels: labels,
      datasets: [{
        label: 'Distancia (km)',
        data: sortedData.map(d => d.distance),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
      }]
    });

    // Gráfico de eficiencia (calculado)
    const efficiencyData = this.calculateEfficiencyData(sortedData);
    this.efficiencyChartData.set({
      labels: labels,
      datasets: [{
        label: 'Eficiencia (km/L)',
        data: efficiencyData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
      }]
    });
  }

  private calculateEfficiencyData(data: HistoricalData[]): number[] {
    // Calcular eficiencia basada en distancia y combustible
    return data.map((d, index) => {
      if (index === 0) return 0;
      
      const prevData = data[index - 1];
      const distanceDiff = d.distance - prevData.distance;
      const fuelDiff = prevData.fuelLevel - d.fuelLevel;
      
      if (fuelDiff <= 0 || distanceDiff <= 0) return 0;
      
      // Asumiendo un tanque de 50L
      const fuelConsumed = (fuelDiff / 100) * 50;
      return fuelConsumed > 0 ? distanceDiff / fuelConsumed : 0;
    });
  }

  private clearCharts(): void {
    this.speedChartData.set(null);
    this.fuelChartData.set(null);
    this.distanceChartData.set(null);
    this.efficiencyChartData.set(null);
  }

  onExportData(): void {
    const data = this.historicalData();
    if (data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    // Convertir a CSV
    const csvContent = this.convertToCSV(data);
    this.downloadCSV(csvContent, `datos_historicos_${this.selectedVehicle()?.name || 'vehiculo'}.csv`);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Datos exportados correctamente'
    });
  }

  private convertToCSV(data: HistoricalData[]): string {
    const headers = ['Fecha', 'Velocidad (km/h)', 'Combustible (%)', 'Distancia (km)', 'Vehículo'];
    const rows = data.map(d => [
      new Date(d.date).toLocaleString(),
      d.speed.toString(),
      d.fuelLevel.toString(),
      d.distance.toString(),
      d.vehicleId
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  onRefreshData(): void {
    this.loadHistoricalData();
  }

  // Métodos para obtener estadísticas
  getAverageSpeed(): number {
    const data = this.historicalData();
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.speed, 0) / data.length;
  }

  getAverageFuelLevel(): number {
    const data = this.historicalData();
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.fuelLevel, 0) / data.length;
  }

  getTotalDistance(): number {
    const data = this.historicalData();
    if (data.length === 0) return 0;
    return data[data.length - 1]?.distance - data[0]?.distance || 0;
  }

  getAverageEfficiency(): number {
    const data = this.historicalData();
    if (data.length < 2) return 0;
    
    const efficiencyData = this.calculateEfficiencyData(data);
    const validEfficiency = efficiencyData.filter(e => e > 0);
    
    if (validEfficiency.length === 0) return 0;
    return validEfficiency.reduce((sum, e) => sum + e, 0) / validEfficiency.length;
  }
}

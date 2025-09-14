import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  signal,
  computed,
  effect,
} from '@angular/core';

import { Subject, takeUntil } from 'rxjs';

import { MessageService } from 'primeng/api';

import { DashboardService } from '../../Services/dashboard.service';
import { OfflineService } from '../../Services/offline.service';

import {
  Vehicle,
  HistoricalData,
  ChartData,
} from '../../Models/dashboard.models';

@Component({
  selector: 'app-historical-charts',
  standalone: false,
  templateUrl: './historical-charts.component.html',
  styleUrls: ['./historical-charts.component.css'],
  providers: [MessageService],
})
export class HistoricalChartsComponent implements OnInit, OnDestroy {
  @Input() vehicles = signal<Vehicle[]>([]);
  @Input() isOnline = signal<boolean>(true);

  private destroy$ = new Subject<void>();

  selectedVehicle = signal<Vehicle | null>(null);
  dateRange = signal<{ start: Date | null; end: Date | null }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  isLoading = signal<boolean>(false);
  historicalData = signal<HistoricalData[]>([]);

  speedChartData = signal<ChartData | null>(null);
  fuelChartData = signal<ChartData | null>(null);
  distanceChartData = signal<ChartData | null>(null);
  efficiencyChartData = signal<ChartData | null>(null);

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Fecha',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  filteredVehicles = computed(() => {
    return this.vehicles().filter((v) => v.status === 'active');
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    this.dateRange.set({ start: startDate, end: endDate });

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
      this.dashboardService
        .getHistoricalData(vehicle.id, dateRange.start, dateRange.end)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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
              detail: 'No se pudieron cargar los datos históricos',
            });
            this.isLoading.set(false);
          },
        });
    } else {
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
        detail: 'Mostrando datos históricos en caché',
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

    const sortedData = data.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const labels = sortedData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    const distanceData = this.calculateDistanceData(sortedData);

    this.speedChartData.set({
      labels: labels,
      datasets: [
        {
          label: 'Velocidad (km/h)',
          data: sortedData.map((d) => d.speed),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
        },
        {
          label: 'Velocidad Promedio',
          data: new Array(sortedData.length).fill(this.getAverageSpeed()),
          borderColor: '#1e40af',
          backgroundColor: 'transparent',
          fill: false,
        },
      ],
    });

    this.fuelChartData.set({
      labels: labels,
      datasets: [
        {
          label: 'Nivel de Combustible (%)',
          data: sortedData.map((d) => d.fuelLevel),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
        },
        {
          label: 'Alerta Bajo Combustible (20%)',
          data: new Array(sortedData.length).fill(20),
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          fill: false,
        },
        {
          label: 'Alerta Crítico (5%)',
          data: new Array(sortedData.length).fill(5),
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          fill: false,
        },
      ],
    });

    this.distanceChartData.set({
      labels: labels,
      datasets: [
        {
          label: 'Distancia Acumulada (km)',
          data: distanceData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
        },
      ],
    });

    const efficiencyData = this.calculateEfficiencyData(sortedData);
    this.efficiencyChartData.set({
      labels: labels,
      datasets: [
        {
          label: 'Eficiencia (km/L)',
          data: efficiencyData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
        },
      ],
    });
  }

  private calculateDistanceData(data: HistoricalData[]): number[] {
    let totalDistance = 0;
    return data.map((d, index) => {
      if (index === 0) return 0;

      const prevData = data[index - 1];
      const distance = this.calculateDistanceBetweenPoints(
        prevData.latitude || 0,
        prevData.longitude || 0,
        d.latitude || 0,
        d.longitude || 0
      );

      totalDistance += distance;
      return Math.round(totalDistance * 100) / 100;
    });
  }

  private calculateDistanceBetweenPoints(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateEfficiencyData(data: HistoricalData[]): number[] {
    return data.map((d, index) => {
      if (index === 0) return 0;

      const prevData = data[index - 1];
      const distanceDiff = this.calculateDistanceBetweenPoints(
        prevData.latitude || 0,
        prevData.longitude || 0,
        d.latitude || 0,
        d.longitude || 0
      );
      const fuelDiff = prevData.fuelLevel - d.fuelLevel;

      if (fuelDiff <= 0 || distanceDiff <= 0) return 0;

      const fuelConsumed = (fuelDiff / 100) * 50;
      return fuelConsumed > 0
        ? Math.round((distanceDiff / fuelConsumed) * 100) / 100
        : 0;
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
        detail: 'No hay datos para exportar',
      });
      return;
    }

    const csvContent = this.convertToCSV(data);
    this.downloadCSV(
      csvContent,
      `datos_historicos_${this.selectedVehicle()?.name || 'vehiculo'}.csv`
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Datos exportados correctamente',
    });
  }

  private convertToCSV(data: HistoricalData[]): string {
    const headers = [
      'Fecha',
      'Velocidad (km/h)',
      'Combustible (%)',
      'Distancia (km)',
      'Vehículo',
    ];
    const rows = data.map((d) => [
      new Date(d.date).toLocaleString(),
      d.speed.toString(),
      d.fuelLevel.toString(),
      d.distance.toString(),
      d.vehicleId,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
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
    if (data.length < 2) return 0;

    const distanceData = this.calculateDistanceData(data);
    return distanceData[distanceData.length - 1] || 0;
  }

  getAverageEfficiency(): number {
    const data = this.historicalData();
    if (data.length < 2) return 0;

    const efficiencyData = this.calculateEfficiencyData(data);
    const validEfficiency = efficiencyData.filter((e) => e > 0);

    if (validEfficiency.length === 0) return 0;
    return (
      validEfficiency.reduce((sum, e) => sum + e, 0) / validEfficiency.length
    );
  }
}

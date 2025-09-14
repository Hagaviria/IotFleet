import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HistoricalChartsComponent } from './historical-charts.component';
import { DashboardService } from '../../Services/dashboard.service';
import { OfflineService } from '../../Services/offline.service';
import { signal } from '@angular/core';

describe('HistoricalChartsComponent', () => {
  let component: HistoricalChartsComponent;
  let fixture: ComponentFixture<HistoricalChartsComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let offlineService: jasmine.SpyObj<OfflineService>;
  let messageService: jasmine.SpyObj<MessageService>;

  const mockHistoricalData = [
    {
      id: '1',
      vehicleId: 'vehicle-1',
      date: '2024-01-01T10:00:00Z',
      speed: 60,
      fuelLevel: 80,
      distance: 0,
      efficiency: 12,
      temperature: 85,
      latitude: 4.6097,
      longitude: -74.006,
      altitude: 2600,
      fuelConsumption: 5,
      ambientTemperature: 25
    },
    {
      id: '2',
      vehicleId: 'vehicle-1',
      date: '2024-01-01T11:00:00Z',
      speed: 70,
      fuelLevel: 75,
      distance: 0,
      efficiency: 11,
      temperature: 87,
      latitude: 4.6100,
      longitude: -74.010,
      altitude: 2605,
      fuelConsumption: 5.5,
      ambientTemperature: 26
    }
  ];

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', ['getHistoricalData']);
    const offlineServiceSpy = jasmine.createSpyObj('OfflineService', ['getStoredLocations']);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [HistoricalChartsComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: OfflineService, useValue: offlineServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalChartsComponent);
    component = fixture.componentInstance;
    dashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    offlineService = TestBed.inject(OfflineService) as jasmine.SpyObj<OfflineService>;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;

    // Configurar signals de entrada
    component.vehicles = signal([
      {
        id: 'vehicle-1',
        name: 'Test Vehicle',
        plate: 'ABC123',
        type: 'car',
        status: 'active',
        totalDistance: 1000,
        averageSpeed: 65,
        fuelEfficiency: 12
      }
    ]);
    component.isOnline = signal(true);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Chart Data Calculation', () => {
    beforeEach(() => {
      component.historicalData.set(mockHistoricalData);
    });

    it('should calculate average speed correctly', () => {
      const averageSpeed = component.getAverageSpeed();
      expect(averageSpeed).toBe(65); // (60 + 70) / 2
    });

    it('should calculate average fuel level correctly', () => {
      const averageFuelLevel = component.getAverageFuelLevel();
      expect(averageFuelLevel).toBe(77.5); // (80 + 75) / 2
    });

    it('should calculate total distance correctly', () => {
      const totalDistance = component.getTotalDistance();
      expect(totalDistance).toBeGreaterThan(0);
    });

    it('should calculate average efficiency correctly', () => {
      const averageEfficiency = component.getAverageEfficiency();
      expect(averageEfficiency).toBeGreaterThan(0);
    });

    it('should return 0 for empty data', () => {
      component.historicalData.set([]);
      
      expect(component.getAverageSpeed()).toBe(0);
      expect(component.getAverageFuelLevel()).toBe(0);
      expect(component.getTotalDistance()).toBe(0);
      expect(component.getAverageEfficiency()).toBe(0);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two points correctly', () => {
      const lat1 = 4.6097;
      const lon1 = -74.006;
      const lat2 = 4.6100;
      const lon2 = -74.010;

      // Usar reflexión para acceder al método privado
      const distance = (component as any).calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Debería ser menos de 1 km
    });

    it('should handle same coordinates', () => {
      const lat = 4.6097;
      const lon = -74.006;

      const distance = (component as any).calculateDistanceBetweenPoints(lat, lon, lat, lon);
      
      expect(distance).toBe(0);
    });
  });

  describe('Data Loading', () => {
    it('should load historical data when online', () => {
      dashboardService.getHistoricalData.and.returnValue(of(mockHistoricalData));
      
      component.onVehicleChange(component.vehicles()[0]);
      
      expect(dashboardService.getHistoricalData).toHaveBeenCalled();
      expect(component.historicalData()).toEqual(mockHistoricalData);
    });

    it('should load offline data when not online', async () => {
      component.isOnline.set(false);
      offlineService.getStoredLocations.and.returnValue(Promise.resolve(mockHistoricalData));
      
      component.onVehicleChange(component.vehicles()[0]);
      
      // Esperar a que se complete la operación asíncrona
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(offlineService.getStoredLocations).toHaveBeenCalled();
    });

    it('should handle loading errors gracefully', () => {
      dashboardService.getHistoricalData.and.returnValue(throwError(() => new Error('Network error')));
      
      component.onVehicleChange(component.vehicles()[0]);
      
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los datos históricos'
      });
    });

    it('should not load data without selected vehicle', () => {
      component.onVehicleChange(null);
      
      expect(dashboardService.getHistoricalData).not.toHaveBeenCalled();
    });

    it('should not load data without valid date range', () => {
      component.dateRange.set({ start: null, end: null });
      
      component.onVehicleChange(component.vehicles()[0]);
      
      expect(dashboardService.getHistoricalData).not.toHaveBeenCalled();
    });
  });

  describe('Chart Updates', () => {
    it('should update charts when data changes', () => {
      component.historicalData.set(mockHistoricalData);
      
      // Verificar que los datos del gráfico se actualizaron
      expect(component.speedChartData()).toBeTruthy();
      expect(component.fuelChartData()).toBeTruthy();
      expect(component.distanceChartData()).toBeTruthy();
      expect(component.efficiencyChartData()).toBeTruthy();
    });

    it('should clear charts when no data', () => {
      component.historicalData.set([]);
      
      expect(component.speedChartData()).toBeNull();
      expect(component.fuelChartData()).toBeNull();
      expect(component.distanceChartData()).toBeNull();
      expect(component.efficiencyChartData()).toBeNull();
    });

    it('should include fuel alert lines in fuel chart', () => {
      component.historicalData.set(mockHistoricalData);
      
      const fuelChartData = component.fuelChartData();
      expect(fuelChartData).toBeTruthy();
      expect(fuelChartData?.datasets.length).toBeGreaterThan(1); // Debería incluir líneas de alerta
    });

    it('should include average speed line in speed chart', () => {
      component.historicalData.set(mockHistoricalData);
      
      const speedChartData = component.speedChartData();
      expect(speedChartData).toBeTruthy();
      expect(speedChartData?.datasets.length).toBeGreaterThan(1); // Debería incluir línea de promedio
    });
  });

  describe('Date Range Handling', () => {
    it('should update charts when date range changes', () => {
      dashboardService.getHistoricalData.and.returnValue(of(mockHistoricalData));
      component.selectedVehicle.set(component.vehicles()[0]);
      
      const newDateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02')
      };
      component.dateRange.set(newDateRange);
      
      component.onDateRangeChange();
      
      expect(dashboardService.getHistoricalData).toHaveBeenCalled();
    });
  });

  describe('Data Export', () => {
    it('should export data to CSV when data is available', () => {
      component.historicalData.set(mockHistoricalData);
      component.selectedVehicle.set(component.vehicles()[0]);
      
      // Mock del método downloadCSV
      spyOn(component as any, 'downloadCSV');
      
      component.onExportData();
      
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Datos exportados correctamente'
      });
    });

    it('should show warning when no data to export', () => {
      component.historicalData.set([]);
      
      component.onExportData();
      
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay datos para exportar'
      });
    });

    it('should convert data to CSV format correctly', () => {
      component.historicalData.set(mockHistoricalData);
      
      const csvContent = (component as any).convertToCSV(mockHistoricalData);
      
      expect(csvContent).toContain('Fecha');
      expect(csvContent).toContain('Velocidad (km/h)');
      expect(csvContent).toContain('Combustible (%)');
      expect(csvContent).toContain('60');
      expect(csvContent).toContain('80');
    });
  });

  describe('Vehicle Selection', () => {
    it('should filter vehicles correctly', () => {
      const filteredVehicles = component.filteredVehicles();
      
      expect(filteredVehicles.length).toBe(1);
      expect(filteredVehicles[0].status).toBe('active');
    });

    it('should handle vehicle selection', () => {
      dashboardService.getHistoricalData.and.returnValue(of(mockHistoricalData));
      
      component.onVehicleChange(component.vehicles()[0]);
      
      expect(component.selectedVehicle()).toBe(component.vehicles()[0]);
      expect(dashboardService.getHistoricalData).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should set loading state during data fetch', () => {
      dashboardService.getHistoricalData.and.returnValue(of(mockHistoricalData));
      
      component.onVehicleChange(component.vehicles()[0]);
      
      // El estado de loading debería cambiar durante la operación
      expect(component.isLoading()).toBe(false); // Debería ser false después de completar
    });
  });

  describe('Chart Options', () => {
    it('should have correct chart options configuration', () => {
      const chartOptions = component.chartOptions;
      
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
      expect(chartOptions.plugins.legend.position).toBe('top');
      expect(chartOptions.scales.x.display).toBe(true);
      expect(chartOptions.scales.y.display).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize charts on init', () => {
      spyOn(component as any, 'initializeCharts');
      
      component.ngOnInit();
      
      expect((component as any).initializeCharts).toHaveBeenCalled();
    });

    it('should clean up on destroy', () => {
      spyOn(component as any, 'destroy$');
      
      component.ngOnDestroy();
      
      expect((component as any).destroy$).toHaveBeenCalled();
    });
  });
});


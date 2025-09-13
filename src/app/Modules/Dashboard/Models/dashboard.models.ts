export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  vehicleId: string;
  speed: number;
  fuelLevel: number;
  isOnline: boolean;
  // Datos adicionales
  altitude?: number;
  fuelConsumption?: number;
  engineTemperature?: number;
  ambientTemperature?: number;
  vehicleInfo?: {
    licensePlate: string;
    model: string;
    brand: string;
    fuelCapacity: number;
    averageConsumption: number;
    fleetId: string;
    createdAt: Date;
    lastMaintenance: Date;
  };
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: 'car' | 'truck' | 'motorcycle';
  status: 'active' | 'inactive' | 'maintenance';
  lastLocation?: Location;
  totalDistance: number;
  averageSpeed: number;
  fuelEfficiency: number;
}

export interface HistoricalData {
  id: string;
  date: Date;
  speed: number;
  fuelLevel: number;
  distance: number;
  vehicleId: string;
  efficiency?: number;
  temperature?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  fuelConsumption?: number;
  ambientTemperature?: number;
}

export interface Alert {
  id: string;
  type: 'speed' | 'fuel' | 'maintenance' | 'geofence' | 'predictive' | 'temperature';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  vehicleId: string;
  timestamp: Date;
  isRead: boolean;
  isPredictive: boolean;
  predictedDate?: Date;
  confidence?: number;
  additionalData?: any;
}

export interface Geofence {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  type: 'inclusion' | 'exclusion';
  isActive: boolean;
}

export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDistance: number;
  averageSpeed: number;
  fuelConsumption: number;
  alertsCount: number;
  criticalAlerts: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

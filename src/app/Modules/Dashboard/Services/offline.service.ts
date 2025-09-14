import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AppDB extends DBSchema {
  locations: {
    key: string;
    value: any;
    indexes: { 'by-vehicle': string; 'by-timestamp': Date };
  };
  alerts: {
    key: string;
    value: any;
    indexes: { 'by-vehicle': string; 'by-timestamp': Date };
  };
  vehicles: {
    key: string;
    value: any;
  };
  stats: {
    key: string;
    value: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private db: IDBPDatabase<AppDB> | null = null;
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  private syncQueueSubject = new BehaviorSubject<any[]>([]);

  public isOnline$ = this.isOnlineSubject.asObservable();
  public syncQueue$ = this.syncQueueSubject.asObservable();

  constructor() {
    this.initializeDatabase();
    this.setupOnlineStatusListener();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await openDB<AppDB>('dashboard-offline', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('locations')) {
            const locationStore = db.createObjectStore('locations', { keyPath: 'id' });
            locationStore.createIndex('by-vehicle', 'vehicleId');
            locationStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('alerts')) {
            const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
            alertStore.createIndex('by-vehicle', 'vehicleId');
            alertStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('vehicles')) {
            db.createObjectStore('vehicles', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('stats')) {
            db.createObjectStore('stats', { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      console.error('Error initializing IndexedDB:', error);
    }
  }

  private setupOnlineStatusListener(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$)
      .pipe(startWith(navigator.onLine))
      .subscribe(isOnline => {
        this.isOnlineSubject.next(isOnline);
        if (isOnline) {
          this.syncPendingData();
        }
      });
  }

  async storeLocation(location: any): Promise<void> {
    if (this.db) {
      await this.db.add('locations', location);
    } else {
      const locations = this.getCachedLocations();
      locations.push(location);
      localStorage.setItem('offline_locations', JSON.stringify(locations));
    }
  }

  async storeAlert(alert: any): Promise<void> {
    if (this.db) {
      await this.db.add('alerts', alert);
    } else {
      const alerts = this.getCachedAlerts();
      alerts.push(alert);
      localStorage.setItem('offline_alerts', JSON.stringify(alerts));
    }
  }

  async storeVehicle(vehicle: any): Promise<void> {
    if (this.db) {
      await this.db.put('vehicles', vehicle);
    } else {
      const vehicles = this.getCachedVehicles();
      const index = vehicles.findIndex(v => v.id === vehicle.id);
      if (index !== -1) {
        vehicles[index] = vehicle;
      } else {
        vehicles.push(vehicle);
      }
      localStorage.setItem('offline_vehicles', JSON.stringify(vehicles));
    }
  }

  async storeStats(stats: any): Promise<void> {
    if (this.db) {
      await this.db.put('stats', { id: 'current', ...stats });
    } else {
      localStorage.setItem('offline_stats', JSON.stringify(stats));
    }
  }

  async getStoredLocations(vehicleId?: string): Promise<any[]> {
    if (this.db) {
      if (vehicleId) {
        return await this.db.getAllFromIndex('locations', 'by-vehicle', vehicleId);
      }
      return await this.db.getAll('locations');
    } else {
      const locations = this.getCachedLocations();
      return vehicleId ? locations.filter(l => l.vehicleId === vehicleId) : locations;
    }
  }

  async getStoredAlerts(vehicleId?: string): Promise<any[]> {
    if (this.db) {
      if (vehicleId) {
        return await this.db.getAllFromIndex('alerts', 'by-vehicle', vehicleId);
      }
      return await this.db.getAll('alerts');
    } else {
      const alerts = this.getCachedAlerts();
      return vehicleId ? alerts.filter(a => a.vehicleId === vehicleId) : alerts;
    }
  }

  async getStoredVehicles(): Promise<any[]> {
    if (this.db) {
      return await this.db.getAll('vehicles');
    } else {
      return this.getCachedVehicles();
    }
  }

  async getStoredStats(): Promise<any> {
    if (this.db) {
      return await this.db.get('stats', 'current');
    } else {
      const cached = localStorage.getItem('offline_stats');
      return cached ? JSON.parse(cached) : null;
    }
  }

  private async syncPendingData(): Promise<void> {
    if (!this.isOnlineSubject.value) return;

    try {
      
      const pendingLocations = await this.getStoredLocations();
      const pendingAlerts = await this.getStoredAlerts();
      
      
      await this.clearSyncedData();
      
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  private async clearSyncedData(): Promise<void> {
    if (this.db) {
      await this.db.clear('locations');
      await this.db.clear('alerts');
    } else {
      localStorage.removeItem('offline_locations');
      localStorage.removeItem('offline_alerts');
    }
  }

  private getCachedLocations(): any[] {
    const cached = localStorage.getItem('offline_locations');
    return cached ? JSON.parse(cached) : [];
  }

  private getCachedAlerts(): any[] {
    const cached = localStorage.getItem('offline_alerts');
    return cached ? JSON.parse(cached) : [];
  }

  private getCachedVehicles(): any[] {
    const cached = localStorage.getItem('offline_vehicles');
    return cached ? JSON.parse(cached) : [];
  }

  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  async clearAllOfflineData(): Promise<void> {
    if (this.db) {
      await this.db.clear('locations');
      await this.db.clear('alerts');
      await this.db.clear('vehicles');
      await this.db.clear('stats');
    } else {
      localStorage.removeItem('offline_locations');
      localStorage.removeItem('offline_alerts');
      localStorage.removeItem('offline_vehicles');
      localStorage.removeItem('offline_stats');
    }
  }

  async getOfflineDataSize(): Promise<number> {
    if (this.db) {
      const locations = await this.db.count('locations');
      const alerts = await this.db.count('alerts');
      const vehicles = await this.db.count('vehicles');
      return locations + alerts + vehicles;
    } else {
      const locations = this.getCachedLocations().length;
      const alerts = this.getCachedAlerts().length;
      const vehicles = this.getCachedVehicles().length;
      return locations + alerts + vehicles;
    }
  }
}

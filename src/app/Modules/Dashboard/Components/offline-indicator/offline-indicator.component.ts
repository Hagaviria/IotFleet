import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline-indicator',
  standalone: false,
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.css']
})
export class OfflineIndicatorComponent {
  @Input() isOnline = signal<boolean>(true);

  statusText = computed(() => (this.isOnline() ? 'En línea' : 'Sin conexión'));
  statusColor = computed(() =>
    this.isOnline() ? 'text-green-600' : 'text-red-600'
  );
  statusBgColor = computed(() =>
    this.isOnline() ? 'bg-green-100' : 'bg-red-100'
  );
  statusIcon = computed(() => (this.isOnline() ? 'pi-wifi' : 'pi-wifi-slash'));
}

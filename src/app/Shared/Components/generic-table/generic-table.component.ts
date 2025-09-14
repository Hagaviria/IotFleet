import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'tag' | 'action' | 'custom';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  customTemplate?: string;
}

export interface TableAction {
  label: string;
  icon: string;
  severity?: string;
  tooltip?: string;
  condition?: (item: any) => boolean;
}

export interface TableConfig {
  columns: TableColumn[];
  actions?: TableAction[];
  paginator?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  showCurrentPageReport?: boolean;
  currentPageReportTemplate?: string;
  styleClass?: string;
  emptyMessage?: string;
  emptyIcon?: string;
}

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule],
  template: `
    <p-table 
      [value]="data" 
      [paginator]="config.paginator ?? true"
      [rows]="config.rows ?? 10"
      [loading]="loading"
      [showCurrentPageReport]="config.showCurrentPageReport ?? true"
      [currentPageReportTemplate]="config.currentPageReportTemplate ?? 'Mostrando {first} a {last} de {totalRecords} registros'"
      [rowsPerPageOptions]="config.rowsPerPageOptions ?? [5, 10, 25]"
      [styleClass]="config.styleClass ?? 'p-datatable-sm'">
      
      <ng-template pTemplate="header">
        <tr>
          @for (column of config.columns; track column.key) {
            <th [style.width]="column.width" [style.text-align]="column.align ?? 'left'">
              {{ column.label }}
            </th>
          }
          @if (config.actions && config.actions.length > 0) {
            <th style="width: 120px; text-align: center;">Acciones</th>
          }
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-item>
        <tr>
          @for (column of config.columns; track column.key) {
            <td [style.text-align]="column.align ?? 'left'">
              @switch (column.type) {
                @case ('date') {
                  {{ item[column.key] | date : 'short' }}
                }
                @case ('number') {
                  {{ item[column.key] | number : '1.1-1' }}
                }
                @case ('tag') {
                  <p-tag [value]="getTagValue(item, column.key)" [severity]="getTagSeverity(item, column.key)"></p-tag>
                }
                @case ('action') {
                  <ng-container [ngSwitch]="column.customTemplate">
                    @switch (column.customTemplate) {
                      @case ('user-actions') {
                        <div class="flex gap-2 justify-content-center">
                          <p-button 
                            icon="pi pi-pencil" 
                            [text]="true" 
                            severity="info" 
                            size="small"
                            pTooltip="Editar usuario"
                            (onClick)="onActionClick('edit', item)">
                          </p-button>
                          <p-button 
                            icon="pi pi-trash" 
                            [text]="true" 
                            severity="danger" 
                            size="small"
                            pTooltip="Eliminar usuario"
                            (onClick)="onActionClick('delete', item)">
                          </p-button>
                        </div>
                      }
                      @case ('vehicle-actions') {
                        <div class="flex gap-2 justify-content-center">
                          <p-button 
                            icon="pi pi-pencil" 
                            [text]="true" 
                            severity="info" 
                            size="small"
                            pTooltip="Editar vehículo"
                            (onClick)="onActionClick('edit', item)">
                          </p-button>
                          <p-button 
                            icon="pi pi-trash" 
                            [text]="true" 
                            severity="danger" 
                            size="small"
                            pTooltip="Eliminar vehículo"
                            (onClick)="onActionClick('delete', item)">
                          </p-button>
                        </div>
                      }
                      @default {
                        {{ item[column.key] }}
                      }
                    }
                  </ng-container>
                }
                @default {
                  {{ item[column.key] || 'N/A' }}
                }
              }
            </td>
          }
          @if (config.actions && config.actions.length > 0) {
            <td style="text-align: center;">
              <div class="flex gap-2 justify-content-center">
                @for (action of config.actions; track action.label) {
                  @if (!action.condition || action.condition(item)) {
                    <p-button 
                      [icon]="action.icon" 
                      [text]="true" 
                      [severity]="getButtonSeverity(action.severity)" 
                      size="small"
                      [pTooltip]="action.tooltip"
                      (onClick)="onActionClick(action.label.toLowerCase(), item)">
                    </p-button>
                  }
                }
              </div>
            </td>
          }
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td [attr.colspan]="getTotalColumns()" class="text-center py-4">
            <div class="flex flex-column align-items-center gap-3">
              <i [class]="config.emptyIcon ?? 'pi pi-inbox'" class="text-4xl text-gray-400"></i>
              <span class="text-gray-500">{{ config.emptyMessage ?? 'No hay datos disponibles' }}</span>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.75rem;
    }
    
    .p-datatable .p-datatable-thead > tr > th {
      padding: 0.75rem;
      font-weight: 600;
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
    }
  `]
})
export class GenericTableComponent {
  @Input() data!: any[];
  @Input() config!: TableConfig;
  @Input() loading!: boolean;
  
  @Output() actionClick = new EventEmitter<{ action: string; item: any }>();

  onActionClick(action: string, item: any): void {
    this.actionClick.emit({ action, item });
  }

  getTotalColumns(): number {
    return this.config.columns.length + (this.config.actions?.length ? 1 : 0);
  }

  getTagValue(item: any, key: string): string {
    // Lógica para obtener el valor del tag basado en el tipo de dato
    const value = item[key];
    if (typeof value === 'boolean') {
      return value ? 'Activo' : 'Inactivo';
    }
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'active': return 'Activo';
        case 'inactive': return 'Inactivo';
        case 'maintenance': return 'Mantenimiento';
        case 'admin': return 'Admin';
        case 'user': return 'Usuario';
        default: return value;
      }
    }
    return value?.toString() || 'N/A';
  }

  getTagSeverity(item: any, key: string): string {
    // Lógica para obtener la severidad del tag basado en el valor
    const value = item[key];
    if (typeof value === 'boolean') {
      return value ? 'success' : 'danger';
    }
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'active': return 'success';
        case 'inactive': return 'danger';
        case 'maintenance': return 'warning';
        case 'admin': return 'info';
        case 'user': return 'info';
        default: return 'info';
      }
    }
    return 'info';
  }

  getButtonSeverity(severity?: string): any {
    return severity ?? 'primary';
  }
}

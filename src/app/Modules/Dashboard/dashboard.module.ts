import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardRoutingModule } from './dashboard-routing.module';

import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { PanelModule } from 'primeng/panel';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { MessageService, ConfirmationService } from 'primeng/api';

import { DashboardComponent } from './Components/dashboard/dashboard.component';
import { MapComponent } from './Components/map/map.component';
import { HistoricalChartsComponent } from './Components/historical-charts/historical-charts.component';
import { AlertsComponent } from './Components/alerts/alerts.component';
import { OfflineIndicatorComponent } from './Components/offline-indicator/offline-indicator.component';
import { VehicleManagementComponent } from './Components/vehicle-management/vehicle-management.component';
import { SensorDataManagementComponent } from './Components/sensor-data-management/sensor-data-management.component';
import { UserManagementComponent } from './Components/user-management/user-management.component';

import { GenericFormComponent } from '../../Shared/Components/generic-form/generic-form.component';
import { FormFieldComponent } from '../../Shared/Components/form-field/form-field.component';
import { GenericTableComponent } from '../../Shared/Components/generic-table/generic-table.component';

import { DashboardService } from './Services/dashboard.service';
import { MapService } from './Services/map.service';
import { AlertsService } from './Services/alerts.service';
import { OfflineService } from './Services/offline.service';

@NgModule({
  declarations: [
    DashboardComponent,
    MapComponent,
    HistoricalChartsComponent,
    AlertsComponent,
    OfflineIndicatorComponent,
    VehicleManagementComponent,
    SensorDataManagementComponent,
    UserManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DashboardRoutingModule,
    CardModule,
    ChartModule,
    ButtonModule,
    TabViewModule,
    PanelModule,
    BadgeModule,
    ProgressBarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    PasswordModule,
    GenericFormComponent,
    FormFieldComponent,
    GenericTableComponent
  ],
  providers: [
    DashboardService,
    MapService,
    AlertsService,
    OfflineService,
    MessageService,
    ConfirmationService
  ]
})
export class DashboardModule { }

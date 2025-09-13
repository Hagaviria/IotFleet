import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './Components/dashboard/dashboard.component';
import { VehicleManagementComponent } from './Components/vehicle-management/vehicle-management.component';
import { UserManagementComponent } from './Components/user-management/user-management.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'vehicles', component: VehicleManagementComponent },
  { path: 'users', component: UserManagementComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }

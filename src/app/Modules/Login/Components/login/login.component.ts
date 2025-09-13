
import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { LoginForm } from '../../Models/loginForm';
import { AuthService } from '../../../../Security/Services/auth.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MadebyFooterComponent } from '../../../../Shared/Components/madeby-footer/madeby-footer.component';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    GenericFormComponent,
    ButtonModule,
    ToastModule,
    MadebyFooterComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  formFields: FormFieldBase<string>[] = [
    new FormFieldBase({
      key: 'email',
      label: 'Email',
      required: true,
      controlType: 'textbox',
      type: 'email',
    }),
    new FormFieldBase({
      key: 'password',
      label: 'Contraseña',
      required: true,
      controlType: 'textbox',
      type: 'password',
    }),
  ];
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  onFormSubmit(formData: Record<string, any>) {
    const email = (formData['email'] ?? '') as string;
    const password = (formData['password'] ?? '') as string;
    
    this.authService.login(email, password).subscribe({
      next: (success) =>
        success
          ? this.handleLoginSuccess(email)
          : this.handleLoginInvalid(),
      error: () => this.handleLoginError(),
    });
  }

  private handleLoginSuccess(email: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Sesión iniciada',
      detail: `Bienvenido ${email}`,
    });
    this.router.navigate(['/dashboard']);
  }

  private handleLoginInvalid() {
    this.messageService.add({
      severity: 'warn',
      summary: 'Credenciales inválidas',
      detail: 'Email o contraseña incorrectos',
    });
  }

  private handleLoginError() {
    this.messageService.add({
      severity: 'error',
      summary: 'Error de inicio',
      detail: 'No se pudo iniciar sesión',
    });
  }
}

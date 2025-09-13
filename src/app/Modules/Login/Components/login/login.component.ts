
import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';
import { ButtonModule } from 'primeng/button';
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
    MadebyFooterComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  formFields: FormFieldBase<string>[] = [
    new FormFieldBase({
      key: 'user',
      label: 'Usuario',
      required: true,
      controlType: 'textbox',
      type: 'text',
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
    const loginForm: LoginForm = {
      user: (formData['user'] ?? '') as string,
      password: (formData['password'] ?? '') as string,
    };
    this.authService.login(loginForm.user, loginForm.password).subscribe({
      next: (success) =>
        success
          ? this.handleLoginSuccess(loginForm.user)
          : this.handleLoginInvalid(),
      error: () => this.handleLoginError(),
    });
  }

  private handleLoginSuccess(user: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Sesión iniciada',
      detail: `Bienvenido ${user}`,
    });
    this.router.navigate(['/projects']);
  }

  private handleLoginInvalid() {
    this.messageService.add({
      severity: 'warn',
      summary: 'Credenciales inválidas',
      detail: 'Usuario o contraseña incorrectos',
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

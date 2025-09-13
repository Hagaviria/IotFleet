import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// Shared Components
import { GenericFormComponent } from '../../../../Shared/Components/generic-form/generic-form.component';
import { FormFieldBase } from '../../../../Shared/Models/forms/form-field-base';

// Services
import { UserService, User, CreateUserRequest, UpdateUserRequest, ChangePasswordRequest } from '../../Services/user.service';
import { AuthService } from '../../../../Security/Services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: false,
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals
  users = signal<User[]>([]);
  showCreateDialog = signal<boolean>(false);
  showEditDialog = signal<boolean>(false);
  showPasswordDialog = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  selectedUser = signal<User | null>(null);

  // Forms
  passwordForm: FormGroup;
  createUserFields: FormFieldBase<string>[] = [];
  editUserFields: FormFieldBase<string>[] = [];

  // Options
  profileOptions: any[] = [];
  identificationTypeOptions: any[] = [];

  // Computed
  isAdmin = computed(() => this.authService.isAdmin());
  filteredUsers = computed(() => {
    const users = this.users();
    return Array.isArray(users) ? users : [];
  });

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Formulario para cambiar contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.profileOptions = this.userService.getProfileOptions();
    this.identificationTypeOptions = this.userService.getIdentificationTypeOptions();
    this.initializeFormFields();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFormFields(): void {
    console.log('🔧 Initializing user form fields...');
    this.createUserFields = [
      new FormFieldBase({ key: 'identificacion', label: 'Identificación', required: true, controlType: 'textbox', order: 1 }),
      new FormFieldBase({ key: 'tipo_identificacion', label: 'Tipo de Identificación', required: true, controlType: 'dropdown', options: this.identificationTypeOptions.map(opt => ({ key: opt.value, value: opt.label })), order: 2 }),
      new FormFieldBase({ key: 'nombre_completo', label: 'Nombre Completo', required: true, controlType: 'textbox', order: 3 }),
      new FormFieldBase({ key: 'correo', label: 'Email', required: true, controlType: 'textbox', order: 4 }),
      new FormFieldBase({ key: 'contraseña', label: 'Contraseña', required: true, controlType: 'textbox', type: 'password', order: 5 }),
      new FormFieldBase({ key: 'id_perfil', label: 'Perfil', required: true, controlType: 'dropdown', options: this.profileOptions.map(opt => ({ key: opt.value, value: opt.label })), value: '2', order: 6 }),
      new FormFieldBase({ key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', required: false, controlType: 'textbox', type: 'date', order: 7 }),
      new FormFieldBase({ key: 'direccion', label: 'Dirección', required: false, controlType: 'textbox', order: 8 }),
      new FormFieldBase({ key: 'telefono_fijo', label: 'Teléfono Fijo', required: false, controlType: 'textbox', order: 9 }),
      new FormFieldBase({ key: 'telefono_celular', label: 'Teléfono Celular', required: false, controlType: 'textbox', order: 10 }),
      new FormFieldBase({ key: 'estado', label: 'Usuario Activo', required: false, controlType: 'checkbox', value: 'true', order: 11 })
    ];
    console.log('✅ User form fields initialized successfully');
  }


  // Cargar usuarios
  loadUsers(): void {
    console.log('🔄 Loading users...');
    this.isLoading.set(true);
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          console.log('✅ Users loaded:', users);
          this.users.set(Array.isArray(users) ? users : []);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('❌ Error loading users:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los usuarios'
          });
          this.isLoading.set(false);
        }
      });
  }

  // Mostrar dialog para crear usuario
  showCreateUserDialog(): void {
    this.showCreateDialog.set(true);
  }

  // Mostrar dialog para editar usuario
  showEditUserDialog(user: User): void {
    this.selectedUser.set(user);
    this.editUserFields = [
      new FormFieldBase({ key: 'identificacion', label: 'Identificación', required: true, controlType: 'textbox', value: user.identificacion, order: 1 }),
      new FormFieldBase({ key: 'tipo_identificacion', label: 'Tipo de Identificación', required: true, controlType: 'dropdown', options: this.identificationTypeOptions.map(opt => ({ key: opt.value, value: opt.label })), value: user.tipo_identificacion || 'CC', order: 2 }),
      new FormFieldBase({ key: 'nombre_completo', label: 'Nombre Completo', required: true, controlType: 'textbox', value: user.nombre_completo, order: 3 }),
      new FormFieldBase({ key: 'correo', label: 'Email', required: true, controlType: 'textbox', value: user.correo, order: 4 }),
      new FormFieldBase({ key: 'id_perfil', label: 'Perfil', required: true, controlType: 'dropdown', options: this.profileOptions.map(opt => ({ key: opt.value, value: opt.label })), value: user.id_perfil.toString(), order: 5 }),
      new FormFieldBase({ key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', required: false, controlType: 'textbox', type: 'date', value: user.fecha_nacimiento ? new Date(user.fecha_nacimiento).toISOString().split('T')[0] : '', order: 6 }),
      new FormFieldBase({ key: 'direccion', label: 'Dirección', required: false, controlType: 'textbox', value: user.direccion || '', order: 7 }),
      new FormFieldBase({ key: 'telefono_fijo', label: 'Teléfono Fijo', required: false, controlType: 'textbox', value: user.telefono_fijo || '', order: 8 }),
      new FormFieldBase({ key: 'telefono_celular', label: 'Teléfono Celular', required: false, controlType: 'textbox', value: user.telefono_celular || '', order: 9 }),
      new FormFieldBase({ key: 'estado', label: 'Usuario Activo', required: false, controlType: 'checkbox', value: user.estado ? 'true' : 'false', order: 10 })
    ];
    this.showEditDialog.set(true);
  }

  // Mostrar dialog para cambiar contraseña
  showChangePasswordDialog(user: User): void {
    this.selectedUser.set(user);
    if (this.passwordForm) {
      this.passwordForm.reset();
    }
    this.showPasswordDialog.set(true);
  }

  // Crear usuario
  onCreateUserSubmit(formData: Record<string, any>): void {
    console.log('📝 Create user form submitted:', formData);
    this.isLoading.set(true);
    const userData: CreateUserRequest = {
      identificacion: formData['identificacion'],
      tipo_identificacion: formData['tipo_identificacion'],
      nombre_completo: formData['nombre_completo'],
      correo: formData['correo'],
      contraseña: formData['contraseña'],
      id_perfil: parseInt(formData['id_perfil']),
      estado: formData['estado'] === 'true' || formData['estado'] === true,
      direccion: formData['direccion'] || '',
      telefono_fijo: formData['telefono_fijo'] || '',
      telefono_celular: formData['telefono_celular'] || '',
      fecha_nacimiento: formData['fecha_nacimiento'] || null
    };

    this.userService.createUser(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario creado correctamente'
          });
          this.showCreateDialog.set(false);
          this.loadUsers();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el usuario'
          });
          this.isLoading.set(false);
        }
      });
  }

  // Actualizar usuario
  onUpdateUserSubmit(formData: Record<string, any>): void {
    console.log('📝 Update user form submitted:', formData);
    if (this.selectedUser()) {
      this.isLoading.set(true);
      const userData: UpdateUserRequest = {
        identificacion: formData['identificacion'],
        tipo_identificacion: formData['tipo_identificacion'],
        nombre_completo: formData['nombre_completo'],
        correo: formData['correo'],
        id_perfil: parseInt(formData['id_perfil']),
        estado: formData['estado'] === 'true' || formData['estado'] === true,
        direccion: formData['direccion'] || '',
        telefono_fijo: formData['telefono_fijo'] || '',
        telefono_celular: formData['telefono_celular'] || '',
        fecha_nacimiento: formData['fecha_nacimiento'] || null
      };

      this.userService.updateUser(this.selectedUser()!.id, userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Usuario actualizado correctamente'
            });
            this.showEditDialog.set(false);
            this.selectedUser.set(null);
            this.loadUsers();
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo actualizar el usuario'
            });
            this.isLoading.set(false);
          }
        });
    }
  }

  // Cambiar contraseña
  onChangePassword(): void {
    if (this.passwordForm && this.passwordForm.valid && this.selectedUser()) {
      this.isLoading.set(true);
      const passwordData: ChangePasswordRequest = this.passwordForm.value;

      this.userService.changePassword(this.selectedUser()!.id, passwordData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Contraseña cambiada correctamente'
            });
            this.showPasswordDialog.set(false);
            this.selectedUser.set(null);
            this.passwordForm.reset();
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error changing password:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo cambiar la contraseña'
            });
            this.isLoading.set(false);
          }
        });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
    }
  }

  // Eliminar usuario
  onDeleteUser(user: User): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar al usuario "${user.nombre_completo}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.isLoading.set(true);
        this.userService.deleteUser(user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Usuario eliminado correctamente'
              });
              this.loadUsers();
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error('Error deleting user:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo eliminar el usuario'
              });
              this.isLoading.set(false);
            }
          });
      }
    });
  }

  // Cancelar operaciones
  cancelCreate(): void {
    this.showCreateDialog.set(false);
  }

  cancelEdit(): void {
    this.showEditDialog.set(false);
    this.selectedUser.set(null);
  }

  cancelPasswordChange(): void {
    this.showPasswordDialog.set(false);
    this.selectedUser.set(null);
    if (this.passwordForm) {
      this.passwordForm.reset();
    }
  }

  // Validadores
  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    
    return null;
  }


  // Obtener mensaje de error para un campo
  getFieldError(form: FormGroup, fieldName: string): string {
    if (!form) return '';
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  // Obtener nombre del perfil
  getProfileName(profileId: number): string {
    console.log('🔍 Getting profile name for ID:', profileId);
    console.log('📋 Available profile options:', this.profileOptions);
    const profile = this.profileOptions.find(p => p.value === profileId);
    console.log('✅ Found profile:', profile);
    return profile ? profile.label : 'Desconocido';
  }

  // Obtener color del estado
  getStatusColor(status: boolean): string {
    return status ? 'success' : 'danger';
  }

  // Obtener texto del estado
  getStatusText(status: boolean): string {
    console.log('🔍 Getting status text for:', status);
    return status ? 'Activo' : 'Inactivo';
  }

  // Formatear fecha
  formatDate(date: Date | string): string {
    console.log('🔍 Formatting date:', date);
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.log('❌ Invalid date:', date);
        return 'Fecha inválida';
      }
      const formatted = d.toLocaleDateString('es-ES');
      console.log('✅ Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.log('❌ Error formatting date:', error);
      return 'Fecha inválida';
    }
  }

  // Obtener fecha actual para el calendario
  getCurrentDate(): Date {
    return new Date();
  }
}

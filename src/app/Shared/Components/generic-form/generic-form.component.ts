import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormFieldBase } from '../../Models/forms/form-field-base';
import { FormControlService } from '../../Services/form-control/form-control.service';
import { FormFieldComponent } from '../form-field/form-field.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './generic-form.component.html',
  styleUrls: ['./generic-form.component.css'],
})
export class GenericFormComponent<
  T extends Record<string, any> = Record<string, any>
> implements OnInit
{
  @Input() formFields: FormFieldBase<string>[] = [];
  @Output() formSubmit = new EventEmitter<T>();
  @Output() cancel = new EventEmitter<void>();
  @Input() labelSubmit: string = 'Guardar';
  @Input() styleClass: string = '';
  @Input() loading: boolean = false;
  @Input() showCancel = false;

  formGroup!: FormGroup;

  constructor(
    private readonly formControlService: FormControlService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    this.formGroup = this.formControlService.toFormGroup(this.formFields);
  }

  onSubmit() {
    if (this.formGroup.valid) {
      this.formSubmit.emit(this.formGroup.value as T);
      return;
    }

    Object.values(this.formGroup.controls).forEach((ctrl) =>
      ctrl.markAsTouched()
    );

    const faltantes = this.getMissingRequiredFields();
    const detail = faltantes.length
      ? `Completa los campos: ${faltantes.join(', ')}`
      : 'Por favor completa los campos requeridos.';

    this.messageService.clear();
    this.messageService.add({
      severity: 'error',
      summary: 'Campos requeridos',
      detail,
      life: 5000,
    });
  }

  private getMissingRequiredFields(): string[] {
    return this.formFields
      .filter((f) => f.required && this.formGroup.get(f.key)?.invalid)
      .map((f) => f.label || f.key);
  }
  onCancel() {
    this.cancel.emit();
  }
}

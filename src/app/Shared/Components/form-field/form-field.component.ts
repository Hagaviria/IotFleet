import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormFieldBase } from '../../Models/forms/form-field-base';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    TextareaModule,
  ],
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.css'],
})
export class FormFieldComponent {
  field = input.required<FormFieldBase<string>>();
  form = input.required<FormGroup>();

  get isValid() {
    return this.form().controls[this.field().key].valid;
  }
}

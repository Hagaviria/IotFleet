import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormFieldBase } from '../../Models/forms/form-field-base';

@Injectable({
  providedIn: 'root',
})
export class FormControlService {
  toFormGroup(fields: FormFieldBase<string>[]) {
    const group: any = {};

    fields.forEach((f) => {
      const validators = [];
      if (f.required) {
        validators.push(Validators.required);
      }
      if (f.validators && f.validators.length > 0) {
        validators.push(...f.validators);
      }

      group[f.key] = new FormControl(f.value || '', validators);
    });

    return new FormGroup(group);
  }
}

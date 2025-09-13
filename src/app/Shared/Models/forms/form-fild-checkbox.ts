import { FormFieldBase } from './form-field-base';

export class FormFieldCheckbox extends FormFieldBase<boolean> {
  override controlType = 'checkbox';
}

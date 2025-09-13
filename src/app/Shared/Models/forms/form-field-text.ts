import { FormFieldBase } from './form-field-base';

export class FormFieldText extends FormFieldBase<string> {
  override controlType = 'textbox';
  override type = 'text';
}

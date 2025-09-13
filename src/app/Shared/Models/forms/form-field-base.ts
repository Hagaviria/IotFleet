import { ValidatorFn } from '@angular/forms';
export class FormFieldBase<T> {
  value?: T;
  key: string;
  label: string;
  required: boolean;
  order: number;
  controlType: string;
  type?: string;
  rows?: number;
  validators?: ValidatorFn[];
  options?: { key: string; value: string }[];

  constructor(options: Partial<FormFieldBase<T>> = {}) {
    this.value = options.value;
    this.key = options.key ?? '';
    this.label = options.label ?? '';
    this.required = !!options.required;
    this.order = options.order ?? 1;
    this.controlType = options.controlType ?? '';
    this.type = options.type;
    this.options = options.options ?? [];
    this.rows = options.rows ?? 3;
    this.validators = options.validators ?? [];
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { FormFieldComponent } from './form-field.component';
import { FormFieldBase } from '../../Models/forms/form-field-base';

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;
  let debugElement: DebugElement;

  const createTestField = (overrides: Partial<FormFieldBase<string>> = {}): FormFieldBase<string> => {
    return new FormFieldBase({
      key: 'testField',
      label: 'Test Field',
      required: false,
      controlType: 'textbox',
      type: 'text',
      ...overrides
    });
  };

  const createTestFormGroup = (field: FormFieldBase<string>): FormGroup => {
    const validators = field.required ? [Validators.required] : [];
    return new FormGroup({
      [field.key]: new FormControl('', validators)
    });
  };

  const setupComponent = (field: FormFieldBase<string>, formGroup?: FormGroup) => {
    const form = formGroup || createTestFormGroup(field);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return form;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent, ReactiveFormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      const field = createTestField();
      setupComponent(field);
      
      expect(component).toBeTruthy();
    });
  });

  describe('Textbox Field Rendering', () => {
    it('should render textbox input for textbox controlType', () => {
      const field = createTestField({ controlType: 'textbox', type: 'text' });
      setupComponent(field);

      const input = debugElement.query(By.css('input[pInputText]'));
      expect(input).toBeTruthy();
      expect(input.nativeElement.type).toBe('text');
      expect(input.nativeElement.id).toBe('testField');
    });

    it('should render password input when type is password', () => {
      const field = createTestField({ controlType: 'textbox', type: 'password' });
      setupComponent(field);

      const input = debugElement.query(By.css('input[pInputText]'));
      expect(input.nativeElement.type).toBe('password');
    });

    it('should render email input when type is email', () => {
      const field = createTestField({ controlType: 'textbox', type: 'email' });
      setupComponent(field);

      const input = debugElement.query(By.css('input[pInputText]'));
      expect(input.nativeElement.type).toBe('email');
    });
  });

  describe('Textarea Field Rendering', () => {
    it('should render textarea for textarea controlType', () => {
      const field = createTestField({ controlType: 'textarea', rows: 5 });
      setupComponent(field);

      const textarea = debugElement.query(By.css('textarea[pTextarea]'));
      expect(textarea).toBeTruthy();
      expect(textarea.nativeElement.rows).toBe(5);
      expect(textarea.nativeElement.id).toBe('testField');
    });

    it('should use default rows when not specified', () => {
      const field = createTestField({ controlType: 'textarea' });
      setupComponent(field);

      const textarea = debugElement.query(By.css('textarea[pTextarea]'));
      expect(textarea.nativeElement.rows).toBe(3);
    });
  });

  describe('Checkbox Field Rendering', () => {
    it('should render checkbox for checkbox controlType', () => {
      const field = createTestField({ controlType: 'checkbox' });
      setupComponent(field);

      const checkbox = debugElement.query(By.css('p-checkbox'));
      expect(checkbox).toBeTruthy();
      // Check that the checkbox component is rendered with the correct inputId
      expect(checkbox.componentInstance.inputId).toBe('testField');
    });
  });

  describe('Label Rendering', () => {
    it('should render field label', () => {
      const field = createTestField({ label: 'Test Label' });
      setupComponent(field);

      const label = debugElement.query(By.css('.form-label'));
      expect(label).toBeTruthy();
      expect(label.nativeElement.textContent.trim()).toBe('Test Label');
      expect(label.nativeElement.getAttribute('for')).toBe('testField');
    });
  });

  describe('Form Validation', () => {
    it('should show required error when field is required and empty', () => {
      const field = createTestField({ required: true });
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;
      
      // Mark as touched and dirty to trigger validation display
      control.markAsTouched();
      control.markAsDirty();
      fixture.detectChanges();

      const errorMessage = debugElement.query(By.css('.required-label'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toBe('Test Field es obligatorio');
    });

    it('should show minLengthCustom error when present', () => {
      const field = createTestField({ required: true });
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;
      
      // Simulate minLengthCustom error
      control.setErrors({ minLengthCustom: { requiredLength: 5 } });
      control.markAsTouched();
      control.markAsDirty();
      fixture.detectChanges();

      const errorMessage = debugElement.query(By.css('.required-label'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toBe('El título debe tener al menos 5 caracteres');
    });

    it('should show projectNameExists error when present', () => {
      const field = createTestField({ required: true });
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;
      
      // Simulate projectNameExists error
      control.setErrors({ projectNameExists: true });
      control.markAsTouched();
      control.markAsDirty();
      fixture.detectChanges();

      const errorMessage = debugElement.query(By.css('.required-label'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toBe('Ya existe un proyecto con este nombre');
    });

    it('should not show errors when field is valid', () => {
      const field = createTestField({ required: true });
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;
      
      control.setValue('valid value');
      control.markAsTouched();
      control.markAsDirty();
      fixture.detectChanges();

      const errorMessage = debugElement.query(By.css('.required-label'));
      expect(errorMessage).toBeFalsy();
    });

    it('should not show errors when field is pristine and untouched', () => {
      const field = createTestField({ required: true });
      setupComponent(field);

      const errorMessage = debugElement.query(By.css('.required-label'));
      expect(errorMessage).toBeFalsy();
    });
  });

  describe('isValid Getter', () => {
    it('should return true when field is valid', () => {
      const field = createTestField({ required: true });
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;
      
      control.setValue('valid value');
      
      expect(component.isValid).toBe(true);
    });

    it('should return false when field is invalid', () => {
      const field = createTestField({ required: true });
      setupComponent(field);
      
      expect(component.isValid).toBe(false);
    });
  });

  describe('Form Control Integration', () => {
    it('should bind form control correctly', () => {
      const field = createTestField();
      setupComponent(field);

      const input = debugElement.query(By.css('input[pInputText]'));
      expect(input.nativeElement.getAttribute('ng-reflect-name')).toBe('testField');
    });

    it('should update form control value when input changes', () => {
      const field = createTestField();
      const formGroup = setupComponent(field);
      const control = formGroup.get('testField')!;

      const input = debugElement.query(By.css('input[pInputText]'));
      input.nativeElement.value = 'new value';
      input.nativeElement.dispatchEvent(new Event('input'));
      
      expect(control.value).toBe('new value');
    });
  });

  describe('CSS Classes', () => {
    it('should have form-field class on container', () => {
      const field = createTestField();
      setupComponent(field);

      const container = debugElement.query(By.css('.form-field'));
      expect(container).toBeTruthy();
    });

    it('should have form-label class on label', () => {
      const field = createTestField();
      setupComponent(field);

      const label = debugElement.query(By.css('.form-label'));
      expect(label.nativeElement.classList.contains('form-label')).toBe(true);
    });
  });
});

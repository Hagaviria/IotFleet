import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';

import { GenericFormComponent } from './generic-form.component';
import { FormFieldBase } from '../../Models/forms/form-field-base';
import { FormControlService } from '../../Services/form-control/form-control.service';

describe('GenericFormComponent', () => {
  let component: GenericFormComponent;
  let fixture: ComponentFixture<GenericFormComponent>;
  let debugElement: DebugElement;
  let mockMessageService: any;
  let formControlService: FormControlService;

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

  beforeEach(async () => {
    const messageServiceSpy = {
      add: jest.fn(),
      clear: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GenericFormComponent, ReactiveFormsModule],
      providers: [
        FormControlService,
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenericFormComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    mockMessageService = TestBed.inject(MessageService) as any;
    formControlService = TestBed.inject(FormControlService);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize form group on ngOnInit', () => {
      const fields = [createTestField()];
      component.formFields = fields;
      
      component.ngOnInit();
      
      expect(component.formGroup).toBeInstanceOf(FormGroup);
      expect(component.formGroup.get('testField')).toBeTruthy();
    });
  });

  describe('Form Fields Rendering', () => {
    it('should render form fields', () => {
      const fields = [
        createTestField({ key: 'field1', label: 'Field 1' }),
        createTestField({ key: 'field2', label: 'Field 2' })
      ];
      component.formFields = fields;
      fixture.detectChanges();

      const formFields = debugElement.queryAll(By.css('app-form-field'));
      expect(formFields.length).toBe(2);
    });

    it('should pass field and form to form-field components', () => {
      const fields = [createTestField()];
      component.formFields = fields;
      fixture.detectChanges();

      const formFieldComponent = debugElement.query(By.css('app-form-field'));
      expect(formFieldComponent).toBeTruthy();
    });
  });

  describe('Submit Button', () => {
    it('should render submit button with default label', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();

      const submitButton = debugElement.query(By.css('p-button[type="submit"]'));
      expect(submitButton).toBeTruthy();
      expect(submitButton.componentInstance.label).toBe('Guardar');
    });

    it('should render submit button with custom label', () => {
      component.formFields = [createTestField()];
      component.labelSubmit = 'Custom Submit';
      fixture.detectChanges();

      const submitButton = debugElement.query(By.css('p-button[type="submit"]'));
      expect(submitButton.componentInstance.label).toBe('Custom Submit');
    });
  });

  describe('Cancel Button', () => {
    it('should not show cancel button by default', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();

      const cancelButton = debugElement.query(By.css('p-button[type="button"]'));
      expect(cancelButton).toBeFalsy();
    });

    it('should show cancel button when showCancel is true', () => {
      component.formFields = [createTestField()];
      component.showCancel = true;
      fixture.detectChanges();

      const cancelButton = debugElement.query(By.css('p-button[type="button"]'));
      expect(cancelButton).toBeTruthy();
      expect(cancelButton.nativeElement.getAttribute('label')).toBe('Cancelar');
    });

    it('should emit cancel event when cancel button is clicked', () => {
      jest.spyOn(component.cancel, 'emit');
      component.formFields = [createTestField()];
      component.showCancel = true;
      fixture.detectChanges();

      const cancelButton = debugElement.query(By.css('p-button[type="button"]'));
      cancelButton.triggerEventHandler('click', null);

      expect(component.cancel.emit).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should emit formSubmit when form is valid', () => {
      jest.spyOn(component.formSubmit, 'emit');
      const fields = [createTestField({ required: false, value: 'valid value' })]; // Set initial value
      component.formFields = fields;
      component.ngOnInit();
      
      // The form should be valid with the initial value
      fixture.detectChanges();

      // Call onSubmit directly
      component.onSubmit();

      expect(component.formSubmit.emit).toHaveBeenCalledWith({ testField: 'valid value' });
    });

    it('should not emit formSubmit when form is invalid', () => {
      jest.spyOn(component.formSubmit, 'emit');
      const fields = [createTestField({ required: true })];
      component.formFields = fields;
      component.ngOnInit();
      fixture.detectChanges();

      const form = debugElement.query(By.css('form'));
      form.triggerEventHandler('ngSubmit', null);

      expect(component.formSubmit.emit).not.toHaveBeenCalled();
    });

    it('should mark all controls as touched when form is invalid', () => {
      const fields = [createTestField({ required: true, value: '' })]; // Start with empty value
      component.formFields = fields;
      component.ngOnInit();
      const control = component.formGroup.get('testField')!;
      
      // Ensure the form is invalid
      control.setValue('');
      const markAsTouchedSpy = jest.spyOn(control, 'markAsTouched');
      fixture.detectChanges();

      // Call onSubmit directly
      component.onSubmit();

      expect(markAsTouchedSpy).toHaveBeenCalled();
    });

    it('should show error message when form is invalid', () => {
      const fields = [createTestField({ required: true, label: 'Test Field' })];
      component.formFields = fields;
      component.ngOnInit();
      fixture.detectChanges();

      const form = debugElement.query(By.css('form'));
      form.triggerEventHandler('ngSubmit', null);

      expect(mockMessageService.clear).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Campos requeridos',
        detail: 'Completa los campos: Test Field',
        life: 5000,
      });
    });

    it('should show generic error message when no specific fields are missing', () => {
      const fields = [createTestField({ required: false, value: '' })];
      component.formFields = fields;
      component.ngOnInit();
      
      // Make the form invalid by adding a custom validator
      const control = component.formGroup.get('testField')!;
      control.setErrors({ customError: true });
      control.markAsTouched();
      fixture.detectChanges();

      // Call onSubmit directly
      component.onSubmit();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Campos requeridos',
        detail: 'Por favor completa los campos requeridos.',
        life: 5000,
      });
    });

    it('should show generic error message when form is invalid but no required fields are missing', () => {
      const fields = [
        createTestField({ key: 'field1', label: 'Field 1', required: true, value: 'valid value' }),
        createTestField({ key: 'field2', label: 'Field 2', required: false, value: '' })
      ];
      component.formFields = fields;
      component.ngOnInit();
      
      // Make field2 invalid with custom validator (not required field)
      const control = component.formGroup.get('field2')!;
      control.setErrors({ customError: true });
      control.markAsTouched();
      fixture.detectChanges();

      // Call onSubmit directly
      component.onSubmit();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Campos requeridos',
        detail: 'Por favor completa los campos requeridos.',
        life: 5000,
      });
    });
  });

  describe('getMissingRequiredFields', () => {
    it('should return labels of missing required fields', () => {
      const fields = [
        createTestField({ key: 'field1', label: 'Field 1', required: true }),
        createTestField({ key: 'field2', label: 'Field 2', required: true }),
        createTestField({ key: 'field3', label: 'Field 3', required: false })
      ];
      component.formFields = fields;
      component.ngOnInit();

      // Make field1 invalid
      component.formGroup.get('field1')?.setErrors({ required: true });
      component.formGroup.get('field2')?.setValue('valid value');

      const missingFields = (component as any).getMissingRequiredFields();
      expect(missingFields).toEqual(['Field 1']);
    });

    it('should return key when label is not available', () => {
      const fields = [
        createTestField({ key: 'field1', label: '', required: true })
      ];
      component.formFields = fields;
      component.ngOnInit();

      component.formGroup.get('field1')?.setErrors({ required: true });

      const missingFields = (component as any).getMissingRequiredFields();
      expect(missingFields).toEqual(['field1']);
    });

    it('should return empty array when no required fields are missing', () => {
      const fields = [
        createTestField({ key: 'field1', label: 'Field 1', required: true })
      ];
      component.formFields = fields;
      component.ngOnInit();

      component.formGroup.get('field1')?.setValue('valid value');

      const missingFields = (component as any).getMissingRequiredFields();
      expect(missingFields).toEqual([]);
    });
  });

  describe('Form Validation', () => {
    it('should create form with required validators', () => {
      const fields = [createTestField({ required: true })];
      component.formFields = fields;
      component.ngOnInit();

      const control = component.formGroup.get('testField');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should create form without validators when not required', () => {
      const fields = [createTestField({ required: false })];
      component.formFields = fields;
      component.ngOnInit();

      const control = component.formGroup.get('testField');
      expect(control?.hasError('required')).toBe(false);
    });

    it('should apply custom validators', () => {
      const customValidator = Validators.minLength(3);
      const fields = [createTestField({ validators: [customValidator] })];
      component.formFields = fields;
      component.ngOnInit();

      const control = component.formGroup.get('testField');
      control?.setValue('ab'); // Less than 3 characters
      expect(control?.hasError('minlength')).toBe(true);
    });
  });

  describe('Input Properties', () => {
    it('should accept formFields input', () => {
      const fields = [createTestField()];
      component.formFields = fields;
      expect(component.formFields).toEqual(fields);
    });

    it('should accept labelSubmit input', () => {
      component.labelSubmit = 'Custom Label';
      expect(component.labelSubmit).toBe('Custom Label');
    });

    it('should accept styleClass input', () => {
      component.styleClass = 'custom-class';
      expect(component.styleClass).toBe('custom-class');
    });

    it('should accept showCancel input', () => {
      component.showCancel = true;
      expect(component.showCancel).toBe(true);
    });
  });

  describe('Output Events', () => {
    it('should emit formSubmit event', () => {
      jest.spyOn(component.formSubmit, 'emit');
      const testData = { testField: 'test value' };
      
      component.formSubmit.emit(testData);
      
      expect(component.formSubmit.emit).toHaveBeenCalledWith(testData);
    });

    it('should emit cancel event', () => {
      jest.spyOn(component.cancel, 'emit');
      
      component.cancel.emit();
      
      expect(component.cancel.emit).toHaveBeenCalled();
    });
  });

  describe('Form Structure', () => {
    it('should render form element', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();

      const form = debugElement.query(By.css('form'));
      expect(form).toBeTruthy();
    });

    it('should render actions div', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();

      const actions = debugElement.query(By.css('.actions'));
      expect(actions).toBeTruthy();
    });

    it('should have proper form structure', () => {
      component.formFields = [createTestField()];
      fixture.detectChanges();

      const form = debugElement.query(By.css('form'));
      const actions = form.query(By.css('.actions'));
      const submitButton = actions.query(By.css('p-button[type="submit"]'));

      expect(form).toBeTruthy();
      expect(actions).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });
  });

  describe('Integration with FormControlService', () => {
    it('should use FormControlService to create form group', () => {
      jest.spyOn(formControlService, 'toFormGroup').mockReturnValue(new FormGroup({}));
      const fields = [createTestField()];
      component.formFields = fields;
      
      component.ngOnInit();
      
      expect(formControlService.toFormGroup).toHaveBeenCalledWith(fields);
    });
  });
});

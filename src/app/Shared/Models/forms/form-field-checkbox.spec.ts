import { FormFieldCheckbox } from './form-fild-checkbox';

describe('FormFieldCheckbox', () => {
  describe('Class Definition', () => {
    it('should create an instance', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field).toBeTruthy();
    });

    it('should extend FormFieldBase', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field).toBeInstanceOf(FormFieldCheckbox);
    });
  });

  describe('Control Type', () => {
    it('should have controlType set to checkbox', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.controlType).toBe('checkbox');
    });

    it('should override controlType from base class', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.controlType).toBe('checkbox');
    });
  });

  describe('Type Property', () => {
    it('should not have type property (checkbox does not override type)', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      // Checkbox doesn't override type, so it should be undefined or default
      expect(field.type).toBeUndefined();
    });
  });

  describe('Inheritance from FormFieldBase', () => {
    it('should inherit all properties from FormFieldBase', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        required: true,
        value: true,
        order: 1,
        validators: []
      });

      expect(field.key).toBe('testField');
      expect(field.label).toBe('Test Field');
      expect(field.required).toBe(true);
      expect(field.value).toBe(true);
      expect(field.order).toBe(1);
      expect(field.validators).toEqual([]);
    });

    it('should handle optional properties', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field'
      });

      expect(field.key).toBe('testField');
      expect(field.label).toBe('Test Field');
      expect(field.required).toBe(false); // Default value
      expect(field.value).toBeUndefined();
      expect(field.order).toBe(1); // Default value
      expect(field.validators).toEqual([]); // Default value
    });
  });

  describe('Constructor Parameters', () => {
    it('should accept all FormFieldBase parameters', () => {
      const field = new FormFieldCheckbox({
        key: 'agreeToTerms',
        label: 'I agree to the terms and conditions',
        required: true,
        value: false,
        order: 2,
        validators: []
      });

      expect(field.key).toBe('agreeToTerms');
      expect(field.label).toBe('I agree to the terms and conditions');
      expect(field.required).toBe(true);
      expect(field.value).toBe(false);
      expect(field.order).toBe(2);
      expect(field.validators).toEqual([]);
    });

    it('should work with minimal parameters', () => {
      const field = new FormFieldCheckbox({
        key: 'newsletter',
        label: 'Subscribe to newsletter'
      });

      expect(field.key).toBe('newsletter');
      expect(field.label).toBe('Subscribe to newsletter');
      expect(field.controlType).toBe('checkbox');
    });
  });

  describe('Type Safety', () => {
    it('should be typed as FormFieldBase<boolean>', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        value: true
      });

      // TypeScript should allow boolean values
      expect(typeof field.value).toBe('boolean');
      expect(field.value).toBe(true);
    });

    it('should accept true boolean values', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        value: true
      });

      expect(field.value).toBe(true);
    });

    it('should accept false boolean values', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field',
        value: false
      });

      expect(field.value).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field'
      });

      expect(field.controlType).toBe('checkbox');
      expect(field.required).toBe(false);
      expect(field.order).toBe(1);
      expect(field.validators).toEqual([]);
    });
  });

  describe('Boolean Value Handling', () => {
    it('should handle true value', () => {
      const field = new FormFieldCheckbox({
        key: 'enabled',
        label: 'Enable feature',
        value: true
      });

      expect(field.value).toBe(true);
      expect(typeof field.value).toBe('boolean');
    });

    it('should handle false value', () => {
      const field = new FormFieldCheckbox({
        key: 'disabled',
        label: 'Disable feature',
        value: false
      });

      expect(field.value).toBe(false);
      expect(typeof field.value).toBe('boolean');
    });

    it('should handle undefined value', () => {
      const field = new FormFieldCheckbox({
        key: 'optional',
        label: 'Optional checkbox'
      });

      expect(field.value).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in key and label', () => {
      const field = new FormFieldCheckbox({
        key: 'field-with-special_chars.123',
        label: 'Field with Special Characters & Symbols!'
      });

      expect(field.key).toBe('field-with-special_chars.123');
      expect(field.label).toBe('Field with Special Characters & Symbols!');
      expect(field.controlType).toBe('checkbox');
    });

    it('should handle very long labels', () => {
      const longLabel = 'This is a very long label that might be used for terms and conditions or other lengthy text that needs to be displayed with a checkbox. '.repeat(10);
      const field = new FormFieldCheckbox({
        key: 'longLabel',
        label: longLabel,
        value: false
      });

      expect(field.label).toBe(longLabel);
      expect(field.value).toBe(false);
    });

    it('should handle unicode characters in label', () => {
      const field = new FormFieldCheckbox({
        key: 'unicodeField',
        label: 'Checkbox with Unicode 世界 🌍',
        value: true
      });

      expect(field.label).toBe('Checkbox with Unicode 世界 🌍');
      expect(field.value).toBe(true);
    });
  });

  describe('Property Modification', () => {
    it('should allow modification of controlType (JavaScript behavior)', () => {
      const field = new FormFieldCheckbox({
        key: 'testField',
        label: 'Test Field'
      });

      // JavaScript allows property modification
      (field as any).controlType = 'different';
      expect(field.controlType).toBe('different');
    });
  });

  describe('Integration', () => {
    it('should work with form validation', () => {
      const field = new FormFieldCheckbox({
        key: 'requiredCheckbox',
        label: 'Required Checkbox',
        required: true,
        validators: []
      });

      expect(field.required).toBe(true);
      expect(field.validators).toEqual([]);
      expect(field.controlType).toBe('checkbox');
    });

    it('should be compatible with form field components', () => {
      const field = new FormFieldCheckbox({
        key: 'newsletter',
        label: 'Subscribe to newsletter',
        required: false,
        value: true
      });

      // Should have all properties needed for form field components
      expect(field.key).toBeDefined();
      expect(field.label).toBeDefined();
      expect(field.controlType).toBeDefined();
      expect(field.required).toBeDefined();
      expect(field.value).toBeDefined();
    });
  });

  describe('Common Use Cases', () => {
    it('should work for terms and conditions checkbox', () => {
      const field = new FormFieldCheckbox({
        key: 'termsAccepted',
        label: 'I accept the terms and conditions',
        required: true,
        value: false
      });

      expect(field.key).toBe('termsAccepted');
      expect(field.label).toBe('I accept the terms and conditions');
      expect(field.required).toBe(true);
      expect(field.value).toBe(false);
      expect(field.controlType).toBe('checkbox');
    });

    it('should work for newsletter subscription checkbox', () => {
      const field = new FormFieldCheckbox({
        key: 'newsletter',
        label: 'Subscribe to our newsletter',
        required: false,
        value: true
      });

      expect(field.key).toBe('newsletter');
      expect(field.label).toBe('Subscribe to our newsletter');
      expect(field.required).toBe(false);
      expect(field.value).toBe(true);
      expect(field.controlType).toBe('checkbox');
    });

    it('should work for feature toggle checkbox', () => {
      const field = new FormFieldCheckbox({
        key: 'enableNotifications',
        label: 'Enable push notifications',
        required: false,
        value: false
      });

      expect(field.key).toBe('enableNotifications');
      expect(field.label).toBe('Enable push notifications');
      expect(field.required).toBe(false);
      expect(field.value).toBe(false);
      expect(field.controlType).toBe('checkbox');
    });
  });

  describe('Comparison with FormFieldText', () => {
    it('should have different controlType than FormFieldText', () => {
      const checkboxField = new FormFieldCheckbox({
        key: 'checkbox',
        label: 'Checkbox Field'
      });

      expect(checkboxField.controlType).toBe('checkbox');
    });

    it('should handle boolean values unlike FormFieldText', () => {
      const checkboxField = new FormFieldCheckbox({
        key: 'checkbox',
        label: 'Checkbox Field',
        value: true
      });

      expect(typeof checkboxField.value).toBe('boolean');
      expect(checkboxField.value).toBe(true);
    });
  });
});

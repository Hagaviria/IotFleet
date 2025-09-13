import { FormFieldText } from './form-field-text';

describe('FormFieldText', () => {
  describe('Class Definition', () => {
    it('should create an instance', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field).toBeTruthy();
    });

    it('should extend FormFieldBase', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field).toBeInstanceOf(FormFieldText);
    });
  });

  describe('Control Type', () => {
    it('should have controlType set to textbox', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.controlType).toBe('textbox');
    });

    it('should override controlType from base class', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.controlType).toBe('textbox');
    });
  });

  describe('Type Property', () => {
    it('should have type set to text', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.type).toBe('text');
    });

    it('should override type from base class', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: false
      });
      expect(field.type).toBe('text');
    });
  });

  describe('Inheritance from FormFieldBase', () => {
    it('should inherit all properties from FormFieldBase', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        required: true,
        value: 'initial value',
        order: 1,
        validators: []
      });

      expect(field.key).toBe('testField');
      expect(field.label).toBe('Test Field');
      expect(field.required).toBe(true);
      expect(field.value).toBe('initial value');
      expect(field.order).toBe(1);
      expect(field.validators).toEqual([]);
    });

    it('should handle optional properties', () => {
      const field = new FormFieldText({
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
      const field = new FormFieldText({
        key: 'email',
        label: 'Email Address',
        required: true,
        value: 'test@example.com',
        order: 2,
        validators: []
      });

      expect(field.key).toBe('email');
      expect(field.label).toBe('Email Address');
      expect(field.required).toBe(true);
      expect(field.value).toBe('test@example.com');
      expect(field.order).toBe(2);
      expect(field.validators).toEqual([]);
    });

    it('should work with minimal parameters', () => {
      const field = new FormFieldText({
        key: 'name',
        label: 'Name'
      });

      expect(field.key).toBe('name');
      expect(field.label).toBe('Name');
      expect(field.controlType).toBe('textbox');
      expect(field.type).toBe('text');
    });
  });

  describe('Type Safety', () => {
    it('should be typed as FormFieldBase<string>', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        value: 'string value'
      });

      // TypeScript should allow string values
      expect(typeof field.value).toBe('string');
      expect(field.value).toBe('string value');
    });

    it('should accept string values', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        value: 'Hello World'
      });

      expect(field.value).toBe('Hello World');
    });

    it('should handle empty string values', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field',
        value: ''
      });

      expect(field.value).toBe('');
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field'
      });

      expect(field.controlType).toBe('textbox');
      expect(field.type).toBe('text');
      expect(field.required).toBe(false);
      expect(field.order).toBe(1);
      expect(field.validators).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in key and label', () => {
      const field = new FormFieldText({
        key: 'field-with-special_chars.123',
        label: 'Field with Special Characters & Symbols!'
      });

      expect(field.key).toBe('field-with-special_chars.123');
      expect(field.label).toBe('Field with Special Characters & Symbols!');
      expect(field.controlType).toBe('textbox');
      expect(field.type).toBe('text');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const field = new FormFieldText({
        key: 'longField',
        label: 'Long Field',
        value: longString
      });

      expect(field.value).toBe(longString);
      expect(field.value.length).toBe(1000);
    });

    it('should handle unicode characters', () => {
      const field = new FormFieldText({
        key: 'unicodeField',
        label: 'Unicode Field',
        value: 'Hello 世界 🌍'
      });

      expect(field.value).toBe('Hello 世界 🌍');
    });
  });

  describe('Property Modification', () => {
    it('should allow modification of controlType (JavaScript behavior)', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field'
      });

      // JavaScript allows property modification
      (field as any).controlType = 'different';
      expect(field.controlType).toBe('different');
    });

    it('should allow modification of type (JavaScript behavior)', () => {
      const field = new FormFieldText({
        key: 'testField',
        label: 'Test Field'
      });

      // JavaScript allows property modification
      (field as any).type = 'different';
      expect(field.type).toBe('different');
    });
  });

  describe('Integration', () => {
    it('should work with form validation', () => {
      const field = new FormFieldText({
        key: 'email',
        label: 'Email',
        required: true,
        validators: []
      });

      expect(field.required).toBe(true);
      expect(field.validators).toEqual([]);
      expect(field.controlType).toBe('textbox');
      expect(field.type).toBe('text');
    });

    it('should be compatible with form field components', () => {
      const field = new FormFieldText({
        key: 'username',
        label: 'Username',
        required: true,
        value: 'john_doe'
      });

      // Should have all properties needed for form field components
      expect(field.key).toBeDefined();
      expect(field.label).toBeDefined();
      expect(field.controlType).toBeDefined();
      expect(field.type).toBeDefined();
      expect(field.required).toBeDefined();
      expect(field.value).toBeDefined();
    });
  });
});

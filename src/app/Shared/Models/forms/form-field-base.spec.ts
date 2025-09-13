import { ValidatorFn, Validators } from '@angular/forms';
import { FormFieldBase } from './form-field-base';

describe('FormFieldBase', () => {
  describe('Class Definition', () => {
    it('should create an instance with default values', () => {
      const field = new FormFieldBase();
      expect(field).toBeTruthy();
    });

    it('should create an instance with empty options', () => {
      const field = new FormFieldBase({});
      expect(field).toBeTruthy();
    });
  });

  describe('Default Values', () => {
    it('should have correct default values when no options provided', () => {
      const field = new FormFieldBase();
      
      expect(field.value).toBeUndefined();
      expect(field.key).toBe('');
      expect(field.label).toBe('');
      expect(field.required).toBe(false);
      expect(field.order).toBe(1);
      expect(field.controlType).toBe('');
      expect(field.type).toBeUndefined();
      expect(field.rows).toBe(3);
      expect(field.validators).toEqual([]);
      expect(field.options).toEqual([]);
    });

    it('should have correct default values when empty options provided', () => {
      const field = new FormFieldBase({});
      
      expect(field.value).toBeUndefined();
      expect(field.key).toBe('');
      expect(field.label).toBe('');
      expect(field.required).toBe(false);
      expect(field.order).toBe(1);
      expect(field.controlType).toBe('');
      expect(field.type).toBeUndefined();
      expect(field.rows).toBe(3);
      expect(field.validators).toEqual([]);
      expect(field.options).toEqual([]);
    });
  });

  describe('Constructor with Options', () => {
    it('should set all properties when provided', () => {
      const validators: ValidatorFn[] = [Validators.required, Validators.minLength(3)];
      const options = [
        { key: 'option1', value: 'Option 1' },
        { key: 'option2', value: 'Option 2' }
      ];

      const field = new FormFieldBase({
        value: 'test value',
        key: 'testKey',
        label: 'Test Label',
        required: true,
        order: 5,
        controlType: 'textbox',
        type: 'text',
        rows: 5,
        validators: validators,
        options: options
      });

      expect(field.value).toBe('test value');
      expect(field.key).toBe('testKey');
      expect(field.label).toBe('Test Label');
      expect(field.required).toBe(true);
      expect(field.order).toBe(5);
      expect(field.controlType).toBe('textbox');
      expect(field.type).toBe('text');
      expect(field.rows).toBe(5);
      expect(field.validators).toEqual(validators);
      expect(field.options).toEqual(options);
    });

    it('should handle partial options', () => {
      const field = new FormFieldBase({
        key: 'partialKey',
        label: 'Partial Label'
      });

      expect(field.key).toBe('partialKey');
      expect(field.label).toBe('Partial Label');
      expect(field.value).toBeUndefined();
      expect(field.required).toBe(false);
      expect(field.order).toBe(1);
      expect(field.controlType).toBe('');
      expect(field.type).toBeUndefined();
      expect(field.rows).toBe(3);
      expect(field.validators).toEqual([]);
      expect(field.options).toEqual([]);
    });
  });

  describe('Required Property', () => {
    it('should set required to true when provided as true', () => {
      const field = new FormFieldBase({ required: true });
      expect(field.required).toBe(true);
    });

    it('should set required to false when provided as false', () => {
      const field = new FormFieldBase({ required: false });
      expect(field.required).toBe(false);
    });

    it('should set required to false when provided as undefined', () => {
      const field = new FormFieldBase({ required: undefined });
      expect(field.required).toBe(false);
    });

    it('should set required to false when provided as null', () => {
      const field = new FormFieldBase({ required: null as any });
      expect(field.required).toBe(false);
    });

    it('should set required to true when provided as truthy value', () => {
      const field = new FormFieldBase({ required: 'truthy' as any });
      expect(field.required).toBe(true);
    });

    it('should set required to false when provided as falsy value', () => {
      const field = new FormFieldBase({ required: 0 as any });
      expect(field.required).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should work with string type', () => {
      const field = new FormFieldBase<string>({
        value: 'string value',
        key: 'stringKey'
      });

      expect(field.value).toBe('string value');
      expect(typeof field.value).toBe('string');
    });

    it('should work with number type', () => {
      const field = new FormFieldBase<number>({
        value: 42,
        key: 'numberKey'
      });

      expect(field.value).toBe(42);
      expect(typeof field.value).toBe('number');
    });

    it('should work with boolean type', () => {
      const field = new FormFieldBase<boolean>({
        value: true,
        key: 'booleanKey'
      });

      expect(field.value).toBe(true);
      expect(typeof field.value).toBe('boolean');
    });

    it('should work with object type', () => {
      const objValue = { name: 'test', id: 1 };
      const field = new FormFieldBase<{ name: string; id: number }>({
        value: objValue,
        key: 'objectKey'
      });

      expect(field.value).toEqual(objValue);
      expect(typeof field.value).toBe('object');
    });

    it('should work with array type', () => {
      const arrayValue = [1, 2, 3];
      const field = new FormFieldBase<number[]>({
        value: arrayValue,
        key: 'arrayKey'
      });

      expect(field.value).toEqual(arrayValue);
      expect(Array.isArray(field.value)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const field = new FormFieldBase({
        key: '',
        label: '',
        value: ''
      });

      expect(field.key).toBe('');
      expect(field.label).toBe('');
      expect(field.value).toBe('');
    });

    it('should handle zero values', () => {
      const field = new FormFieldBase({
        order: 0,
        rows: 0
      });

      expect(field.order).toBe(0);
      expect(field.rows).toBe(0);
    });

    it('should handle negative values', () => {
      const field = new FormFieldBase({
        order: -1,
        rows: -5
      });

      expect(field.order).toBe(-1);
      expect(field.rows).toBe(-5);
    });

    it('should handle very large numbers', () => {
      const field = new FormFieldBase({
        order: Number.MAX_SAFE_INTEGER,
        rows: Number.MAX_SAFE_INTEGER
      });

      expect(field.order).toBe(Number.MAX_SAFE_INTEGER);
      expect(field.rows).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle special characters in strings', () => {
      const field = new FormFieldBase({
        key: 'key-with_special.chars@123',
        label: 'Label with Special Characters & Symbols!',
        controlType: 'type@#$%'
      });

      expect(field.key).toBe('key-with_special.chars@123');
      expect(field.label).toBe('Label with Special Characters & Symbols!');
      expect(field.controlType).toBe('type@#$%');
    });

    it('should handle unicode characters', () => {
      const field = new FormFieldBase({
        key: 'unicodeKey世界',
        label: 'Unicode Label 🌍',
        value: 'Unicode Value 世界'
      });

      expect(field.key).toBe('unicodeKey世界');
      expect(field.label).toBe('Unicode Label 🌍');
      expect(field.value).toBe('Unicode Value 世界');
    });
  });

  describe('Validators Property', () => {
    it('should handle empty validators array', () => {
      const field = new FormFieldBase({
        validators: []
      });

      expect(field.validators).toEqual([]);
    });

    it('should handle single validator', () => {
      const validator = Validators.required;
      const field = new FormFieldBase({
        validators: [validator]
      });

      expect(field.validators).toEqual([validator]);
    });

    it('should handle multiple validators', () => {
      const validators = [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(10)
      ];
      const field = new FormFieldBase({
        validators: validators
      });

      expect(field.validators).toEqual(validators);
    });

    it('should default to empty array when validators not provided', () => {
      const field = new FormFieldBase();
      expect(field.validators).toEqual([]);
    });
  });

  describe('Options Property', () => {
    it('should handle empty options array', () => {
      const field = new FormFieldBase({
        options: []
      });

      expect(field.options).toEqual([]);
    });

    it('should handle single option', () => {
      const option = { key: 'key1', value: 'Value 1' };
      const field = new FormFieldBase({
        options: [option]
      });

      expect(field.options).toEqual([option]);
    });

    it('should handle multiple options', () => {
      const options = [
        { key: 'key1', value: 'Value 1' },
        { key: 'key2', value: 'Value 2' },
        { key: 'key3', value: 'Value 3' }
      ];
      const field = new FormFieldBase({
        options: options
      });

      expect(field.options).toEqual(options);
    });

    it('should default to empty array when options not provided', () => {
      const field = new FormFieldBase();
      expect(field.options).toEqual([]);
    });
  });

  describe('Type Property', () => {
    it('should handle undefined type', () => {
      const field = new FormFieldBase();
      expect(field.type).toBeUndefined();
    });

    it('should handle null type', () => {
      const field = new FormFieldBase({ type: null as any });
      expect(field.type).toBeNull();
    });

    it('should handle empty string type', () => {
      const field = new FormFieldBase({ type: '' });
      expect(field.type).toBe('');
    });

    it('should handle valid type values', () => {
      const types = ['text', 'email', 'password', 'number', 'tel', 'url'];
      
      types.forEach(type => {
        const field = new FormFieldBase({ type });
        expect(field.type).toBe(type);
      });
    });
  });

  describe('Value Property', () => {
    it('should handle undefined value', () => {
      const field = new FormFieldBase();
      expect(field.value).toBeUndefined();
    });

    it('should handle null value', () => {
      const field = new FormFieldBase({ value: null as any });
      expect(field.value).toBeNull();
    });

    it('should handle empty string value', () => {
      const field = new FormFieldBase({ value: '' });
      expect(field.value).toBe('');
    });

    it('should handle zero value', () => {
      const field = new FormFieldBase({ value: 0 });
      expect(field.value).toBe(0);
    });

    it('should handle false value', () => {
      const field = new FormFieldBase({ value: false });
      expect(field.value).toBe(false);
    });
  });

  describe('Order Property', () => {
    it('should default to 1 when not provided', () => {
      const field = new FormFieldBase();
      expect(field.order).toBe(1);
    });

    it('should handle zero order', () => {
      const field = new FormFieldBase({ order: 0 });
      expect(field.order).toBe(0);
    });

    it('should handle negative order', () => {
      const field = new FormFieldBase({ order: -5 });
      expect(field.order).toBe(-5);
    });

    it('should handle large order numbers', () => {
      const field = new FormFieldBase({ order: 999999 });
      expect(field.order).toBe(999999);
    });
  });

  describe('Rows Property', () => {
    it('should default to 3 when not provided', () => {
      const field = new FormFieldBase();
      expect(field.rows).toBe(3);
    });

    it('should handle zero rows', () => {
      const field = new FormFieldBase({ rows: 0 });
      expect(field.rows).toBe(0);
    });

    it('should handle negative rows', () => {
      const field = new FormFieldBase({ rows: -2 });
      expect(field.rows).toBe(-2);
    });

    it('should handle large row numbers', () => {
      const field = new FormFieldBase({ rows: 100 });
      expect(field.rows).toBe(100);
    });
  });

  describe('ControlType Property', () => {
    it('should default to empty string when not provided', () => {
      const field = new FormFieldBase();
      expect(field.controlType).toBe('');
    });

    it('should handle empty string controlType', () => {
      const field = new FormFieldBase({ controlType: '' });
      expect(field.controlType).toBe('');
    });

    it('should handle valid controlType values', () => {
      const controlTypes = ['textbox', 'dropdown', 'checkbox', 'textarea', 'radio'];
      
      controlTypes.forEach(controlType => {
        const field = new FormFieldBase({ controlType });
        expect(field.controlType).toBe(controlType);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all properties with complex values', () => {
      const complexValidators = [
        Validators.required,
        Validators.minLength(5),
        Validators.pattern(/^[A-Za-z]+$/)
      ];
      const complexOptions = [
        { key: 'option1', value: 'Complex Option 1' },
        { key: 'option2', value: 'Complex Option 2' },
        { key: 'option3', value: 'Complex Option 3' }
      ];

      const field = new FormFieldBase({
        value: { complex: 'object', with: 'nested', data: [1, 2, 3] },
        key: 'complexKey123',
        label: 'Complex Label with Special Characters!',
        required: true,
        order: 42,
        controlType: 'complexControl',
        type: 'complexType',
        rows: 10,
        validators: complexValidators,
        options: complexOptions
      });

      expect(field.value).toEqual({ complex: 'object', with: 'nested', data: [1, 2, 3] });
      expect(field.key).toBe('complexKey123');
      expect(field.label).toBe('Complex Label with Special Characters!');
      expect(field.required).toBe(true);
      expect(field.order).toBe(42);
      expect(field.controlType).toBe('complexControl');
      expect(field.type).toBe('complexType');
      expect(field.rows).toBe(10);
      expect(field.validators).toEqual(complexValidators);
      expect(field.options).toEqual(complexOptions);
    });

    it('should handle mixed truthy/falsy values', () => {
      const field = new FormFieldBase({
        value: 0, // falsy but valid
        key: '', // empty but valid
        label: 'Valid Label',
        required: false, // explicit false
        order: 0, // falsy but valid
        controlType: '', // empty but valid
        type: undefined, // undefined
        rows: 0, // falsy but valid
        validators: [], // empty array
        options: [] // empty array
      });

      expect(field.value).toBe(0);
      expect(field.key).toBe('');
      expect(field.label).toBe('Valid Label');
      expect(field.required).toBe(false);
      expect(field.order).toBe(0);
      expect(field.controlType).toBe('');
      expect(field.type).toBeUndefined();
      expect(field.rows).toBe(0);
      expect(field.validators).toEqual([]);
      expect(field.options).toEqual([]);
    });
  });

  describe('Inheritance and Extensibility', () => {
    it('should be extensible by subclasses', () => {
      class ExtendedFormField extends FormFieldBase<string> {
        customProperty: string;
        
        constructor(options: Partial<FormFieldBase<string>> & { customProperty?: string } = {}) {
          super(options);
          this.customProperty = options.customProperty ?? 'default';
        }
      }

      const extendedField = new ExtendedFormField({
        key: 'extended',
        label: 'Extended Field',
        customProperty: 'custom value'
      });

      expect(extendedField.key).toBe('extended');
      expect(extendedField.label).toBe('Extended Field');
      expect(extendedField.customProperty).toBe('custom value');
    });
  });
});

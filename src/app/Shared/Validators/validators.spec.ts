import { AbstractControl, FormControl } from '@angular/forms';
import { minLengthCustom, uniqueProjectNameValidator } from './validators';
import { ProjectsService } from '../../Modules/Projects/Services/projects.service';
import { Project } from '../../Modules/Projects/Models/project';

describe('Validators', () => {
  describe('minLengthCustom', () => {
    let validator: (control: AbstractControl) => any;
    let control: FormControl;

    beforeEach(() => {
      control = new FormControl();
    });

    describe('when minimum length is 5', () => {
      beforeEach(() => {
        validator = minLengthCustom(5);
      });

      it('should return null when control value is null', () => {
        control.setValue(null);
        expect(validator(control)).toBeNull();
      });

      it('should return null when control value is undefined', () => {
        control.setValue(undefined);
        expect(validator(control)).toBeNull();
      });

      it('should return null when control value is empty string', () => {
        control.setValue('');
        expect(validator(control)).toBeNull();
      });

      it('should return null when control value meets minimum length', () => {
        control.setValue('hello');
        expect(validator(control)).toBeNull();
      });

      it('should return null when control value exceeds minimum length', () => {
        control.setValue('hello world');
        expect(validator(control)).toBeNull();
      });

      it('should return error when control value is shorter than minimum length', () => {
        control.setValue('hi');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 5,
            actualLength: 2,
          },
        });
      });

      it('should return error when control value with spaces is shorter than minimum length', () => {
        control.setValue('  hi  ');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 5,
            actualLength: 6, // The validator returns the original length, not trimmed
          },
        });
      });

      it('should return null when control value with spaces meets minimum length', () => {
        control.setValue('  hello  ');
        expect(validator(control)).toBeNull();
      });

      it('should handle whitespace-only values correctly', () => {
        control.setValue('   ');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 5,
            actualLength: 3, // The validator returns the original length, not trimmed
          },
        });
      });
    });

    describe('when minimum length is 3', () => {
      beforeEach(() => {
        validator = minLengthCustom(3);
      });

      it('should return null for valid 3-character string', () => {
        control.setValue('abc');
        expect(validator(control)).toBeNull();
      });

      it('should return error for 2-character string', () => {
        control.setValue('ab');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 3,
            actualLength: 2,
          },
        });
      });

      it('should return null for 4-character string', () => {
        control.setValue('abcd');
        expect(validator(control)).toBeNull();
      });
    });

    describe('when minimum length is 1', () => {
      beforeEach(() => {
        validator = minLengthCustom(1);
      });

      it('should return null for single character', () => {
        control.setValue('a');
        expect(validator(control)).toBeNull();
      });

      it('should return null for empty string (validator returns null for empty values)', () => {
        control.setValue('');
        const result = validator(control);
        expect(result).toBeNull(); // The validator returns null for empty values
      });
    });

    describe('when minimum length is 0', () => {
      beforeEach(() => {
        validator = minLengthCustom(0);
      });

      it('should return null for empty string', () => {
        control.setValue('');
        expect(validator(control)).toBeNull();
      });

      it('should return null for any non-empty string', () => {
        control.setValue('a');
        expect(validator(control)).toBeNull();
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        validator = minLengthCustom(5);
      });

      it('should handle special characters correctly', () => {
        control.setValue('@#$%');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 5,
            actualLength: 4,
          },
        });
      });

      it('should handle numbers as strings correctly', () => {
        control.setValue('1234');
        const result = validator(control);
        expect(result).toEqual({
          minLengthCustom: {
            requiredLength: 5,
            actualLength: 4,
          },
        });
      });

      it('should handle unicode characters correctly', () => {
        control.setValue('ñáéíó');
        expect(validator(control)).toBeNull();
      });

      it('should handle mixed content correctly', () => {
        control.setValue('a1@#b');
        expect(validator(control)).toBeNull();
      });
    });
  });

  describe('uniqueProjectNameValidator', () => {
    let mockProjectsService: jest.Mocked<ProjectsService>;
    let validator: (control: AbstractControl) => any;
    let control: FormControl;

    const mockProjects: Project[] = [
      { id: 1, title: 'Project Alpha', description: 'First project', status: 'active' },
      { id: 2, title: 'Project Beta', description: 'Second project', status: 'completed' },
      { id: 3, title: 'PROJECT GAMMA', description: 'Third project', status: 'pending' },
      { id: 4, title: 'project delta', description: 'Fourth project', status: 'active' },
    ];

    beforeEach(() => {
      mockProjectsService = {
        projects: jest.fn().mockReturnValue(mockProjects),
      } as any;

      validator = uniqueProjectNameValidator(mockProjectsService);
      control = new FormControl();
    });

    it('should return null when control value is null', () => {
      control.setValue(null);
      expect(validator(control)).toBeNull();
    });

    it('should return null when control value is undefined', () => {
      control.setValue(undefined);
      expect(validator(control)).toBeNull();
    });

    it('should return null when control value is empty string', () => {
      control.setValue('');
      expect(validator(control)).toBeNull();
    });

    it('should return null when project name does not exist', () => {
      control.setValue('New Project');
      expect(validator(control)).toBeNull();
    });

    it('should return null when project name does not exist (case insensitive)', () => {
      control.setValue('NEW PROJECT');
      expect(validator(control)).toBeNull();
    });

    it('should return error when project name exists (exact match)', () => {
      control.setValue('Project Alpha');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should return error when project name exists (case insensitive)', () => {
      control.setValue('project alpha');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should return error when project name exists (uppercase)', () => {
      control.setValue('PROJECT ALPHA');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should return error when project name exists (mixed case)', () => {
      control.setValue('PrOjEcT aLpHa');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should return error for existing project with different case', () => {
      control.setValue('project gamma');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should return error for existing project with lowercase', () => {
      control.setValue('PROJECT DELTA');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should call projects service to get project list', () => {
      control.setValue('Test Project');
      validator(control);
      expect(mockProjectsService.projects).toHaveBeenCalled();
    });

    it('should handle projects service returning empty array', () => {
      mockProjectsService.projects.mockReturnValue([]);
      control.setValue('Any Project');
      expect(validator(control)).toBeNull();
    });

    it('should handle projects service returning undefined', () => {
      mockProjectsService.projects.mockReturnValue(undefined as any);
      control.setValue('Any Project');
      // This will throw an error because the validator doesn't handle undefined
      expect(() => validator(control)).toThrow();
    });

    it('should handle projects with special characters', () => {
      const specialProjects: Project[] = [
        { id: 1, title: 'Project-Name', description: 'With dash', status: 'active' },
        { id: 2, title: 'Project_Name', description: 'With underscore', status: 'active' },
        { id: 3, title: 'Project.Name', description: 'With dot', status: 'active' },
      ];
      mockProjectsService.projects.mockReturnValue(specialProjects);

      control.setValue('project-name');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should handle projects with numbers in names', () => {
      const numberedProjects: Project[] = [
        { id: 1, title: 'Project 1', description: 'First', status: 'active' },
        { id: 2, title: 'Project 2.0', description: 'Second', status: 'active' },
      ];
      mockProjectsService.projects.mockReturnValue(numberedProjects);

      control.setValue('project 1');
      const result = validator(control);
      expect(result).toEqual({ projectNameExists: true });
    });

    it('should handle whitespace in project names', () => {
      const spacedProjects: Project[] = [
        { id: 1, title: '  Project Alpha  ', description: 'With spaces', status: 'active' },
      ];
      mockProjectsService.projects.mockReturnValue(spacedProjects);

      control.setValue('project alpha');
      const result = validator(control);
      // The validator doesn't trim the project titles, so this won't match
      expect(result).toBeNull();
    });

    it('should handle multiple calls to the same validator', () => {
      control.setValue('Project Alpha');
      validator(control);
      validator(control);
      expect(mockProjectsService.projects).toHaveBeenCalledTimes(2);
    });

    it('should handle different control values in sequence', () => {
      control.setValue('Project Alpha');
      validator(control);
      control.setValue('New Project');
      validator(control);
      expect(mockProjectsService.projects).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration tests', () => {
    it('should work with FormControl validation', () => {
      const control = new FormControl('hi', [minLengthCustom(5)]);
      expect(control.valid).toBe(false);
      expect(control.errors).toEqual({
        minLengthCustom: {
          requiredLength: 5,
          actualLength: 2,
        },
      });
    });

    it('should work with multiple validators', () => {
      const mockProjectsService = {
        projects: jest.fn().mockReturnValue([
          { id: 1, title: 'Existing Project', description: 'Test', status: 'active' }
        ]),
      } as any;

      const control = new FormControl('Existing Project', [
        minLengthCustom(5),
        uniqueProjectNameValidator(mockProjectsService)
      ]);

      expect(control.valid).toBe(false);
      expect(control.errors).toEqual({
        projectNameExists: true,
      });
    });

    it('should pass validation with valid input and multiple validators', () => {
      const mockProjectsService = {
        projects: jest.fn().mockReturnValue([
          { id: 1, title: 'Existing Project', description: 'Test', status: 'active' }
        ]),
      } as any;

      const control = new FormControl('New Valid Project', [
        minLengthCustom(5),
        uniqueProjectNameValidator(mockProjectsService)
      ]);

      expect(control.valid).toBe(true);
      expect(control.errors).toBeNull();
    });
  });
});

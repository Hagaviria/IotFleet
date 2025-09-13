import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ProjectsService } from '../../Modules/Projects/Services/projects.service';

export function minLengthCustom(length: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return control.value.trim().length < length
      ? {
          minLengthCustom: {
            requiredLength: length,
            actualLength: control.value.length,
          },
        }
      : null;
  };
}

export function uniqueProjectNameValidator(
  projectsService: ProjectsService
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const exists = projectsService
      .projects()
      .some((p) => p.title.toLowerCase() === control.value.toLowerCase());
    return exists ? { projectNameExists: true } : null;
  };
}

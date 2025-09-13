import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { MadebyFooterComponent } from './madeby-footer.component';

describe('MadebyFooterComponent', () => {
  let component: MadebyFooterComponent;
  let fixture: ComponentFixture<MadebyFooterComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MadebyFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MadebyFooterComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Properties', () => {
    it('should have author name defined', () => {
      expect(component.authorName).toBeDefined();
      expect(component.authorName).toBe('Harold Gaviria');
      expect(component.authorName.length).toBeGreaterThan(0);
    });

    it('should have project name defined', () => {
      expect(component.projectName).toBeDefined();
      expect(component.projectName).toBe('Angular 19');
      expect(component.projectName.length).toBeGreaterThan(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render the footer element', () => {
      const footerElement = debugElement.query(By.css('.madeby-footer'));
      expect(footerElement).toBeTruthy();
    });

    it('should render footer content', () => {
      const footerContent = debugElement.query(By.css('.footer-content'));
      expect(footerContent).toBeTruthy();
    });

    it('should render footer text section', () => {
      const footerText = debugElement.query(By.css('.footer-text'));
      expect(footerText).toBeTruthy();
    });

    it('should render footer details section', () => {
      const footerDetails = debugElement.query(By.css('.footer-details'));
      expect(footerDetails).toBeTruthy();
    });

    it('should display madeby text', () => {
      const madebyText = debugElement.query(By.css('.madeby-text'));
      expect(madebyText).toBeTruthy();
      expect(madebyText.nativeElement.textContent.trim()).toBe('@ made by');
    });

    it('should display author name in template', () => {
      const authorNameElement = debugElement.query(By.css('.author-name'));
      expect(authorNameElement).toBeTruthy();
      expect(authorNameElement.nativeElement.textContent.trim()).toBe('Harold Gaviria');
    });

    it('should display project name in template', () => {
      const projectNameElement = debugElement.query(By.css('.project-name'));
      expect(projectNameElement).toBeTruthy();
      expect(projectNameElement.nativeElement.textContent.trim()).toBe('Angular 19');
    });
  });

  describe('CSS Classes', () => {
    it('should have correct CSS classes applied', () => {
      const footerElement = debugElement.query(By.css('.madeby-footer'));
      expect(footerElement.nativeElement.classList.contains('madeby-footer')).toBe(true);
    });

    it('should have footer-content class', () => {
      const footerContent = debugElement.query(By.css('.footer-content'));
      expect(footerContent.nativeElement.classList.contains('footer-content')).toBe(true);
    });

    it('should have footer-text class', () => {
      const footerText = debugElement.query(By.css('.footer-text'));
      expect(footerText.nativeElement.classList.contains('footer-text')).toBe(true);
    });

    it('should have footer-details class', () => {
      const footerDetails = debugElement.query(By.css('.footer-details'));
      expect(footerDetails.nativeElement.classList.contains('footer-details')).toBe(true);
    });

    it('should have madeby-text class', () => {
      const madebyText = debugElement.query(By.css('.madeby-text'));
      expect(madebyText.nativeElement.classList.contains('madeby-text')).toBe(true);
    });

    it('should have author-name class', () => {
      const authorName = debugElement.query(By.css('.author-name'));
      expect(authorName.nativeElement.classList.contains('author-name')).toBe(true);
    });

    it('should have project-name class', () => {
      const projectName = debugElement.query(By.css('.project-name'));
      expect(projectName.nativeElement.classList.contains('project-name')).toBe(true);
    });
  });

  describe('Component Structure', () => {
    it('should have proper DOM structure', () => {
      const footer = debugElement.query(By.css('.madeby-footer'));
      const content = footer.query(By.css('.footer-content'));
      const text = content.query(By.css('.footer-text'));
      const details = content.query(By.css('.footer-details'));

      expect(footer).toBeTruthy();
      expect(content).toBeTruthy();
      expect(text).toBeTruthy();
      expect(details).toBeTruthy();
    });

    it('should have madeby text and author name in footer-text', () => {
      const footerText = debugElement.query(By.css('.footer-text'));
      const madebyText = footerText.query(By.css('.madeby-text'));
      const authorName = footerText.query(By.css('.author-name'));

      expect(madebyText).toBeTruthy();
      expect(authorName).toBeTruthy();
    });

    it('should have project name in footer-details', () => {
      const footerDetails = debugElement.query(By.css('.footer-details'));
      const projectName = footerDetails.query(By.css('.project-name'));

      expect(projectName).toBeTruthy();
    });
  });

  describe('Data Binding', () => {
    it('should bind author name correctly', () => {
      component.authorName = 'Test Author';
      fixture.detectChanges();
      
      const authorNameElement = debugElement.query(By.css('.author-name'));
      expect(authorNameElement.nativeElement.textContent.trim()).toBe('Test Author');
    });

    it('should bind project name correctly', () => {
      component.projectName = 'Test Project';
      fixture.detectChanges();
      
      const projectNameElement = debugElement.query(By.css('.project-name'));
      expect(projectNameElement.nativeElement.textContent.trim()).toBe('Test Project');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const footerElement = debugElement.query(By.css('footer'));
      expect(footerElement).toBeTruthy();
    });

    it('should have readable text content', () => {
      const footerElement = debugElement.query(By.css('.madeby-footer'));
      const textContent = footerElement.nativeElement.textContent;
      
      expect(textContent).toContain('@ made by');
      expect(textContent).toContain('Harold Gaviria');
      expect(textContent).toContain('Angular 19');
    });
  });
});

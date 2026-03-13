import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureFooterSectionComponent } from './feature-footer-section.component';

describe('FeatureFooterSectionComponent', () => {
  let component: FeatureFooterSectionComponent;
  let fixture: ComponentFixture<FeatureFooterSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FeatureFooterSectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureFooterSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

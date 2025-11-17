import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestGeneratorComponentsComponent } from './guest-generator-components.component';

describe('GuestGeneratorComponentsComponent', () => {
  let component: GuestGeneratorComponentsComponent;
  let fixture: ComponentFixture<GuestGeneratorComponentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GuestGeneratorComponentsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GuestGeneratorComponentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

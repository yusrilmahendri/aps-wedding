import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterHeroComponent } from './footer-hero.component';

describe('FooterHeroComponent', () => {
  let component: FooterHeroComponent;
  let fixture: ComponentFixture<FooterHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FooterHeroComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FooterHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestemonialFooterComponent } from './testemonial-footer.component';

describe('TestemonialFooterComponent', () => {
  let component: TestemonialFooterComponent;
  let fixture: ComponentFixture<TestemonialFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestemonialFooterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestemonialFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

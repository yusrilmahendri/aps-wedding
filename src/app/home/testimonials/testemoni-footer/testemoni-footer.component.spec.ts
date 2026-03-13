import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestemoniFooterComponent } from './testemoni-footer.component';

describe('TestemoniFooterComponent', () => {
  let component: TestemoniFooterComponent;
  let fixture: ComponentFixture<TestemoniFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestemoniFooterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestemoniFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

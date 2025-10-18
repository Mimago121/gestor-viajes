import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Trips } from './trips';

describe('Trips', () => {
  let component: Trips;
  let fixture: ComponentFixture<Trips>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trips]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Trips);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

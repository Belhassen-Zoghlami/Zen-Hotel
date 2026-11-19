import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Hotels } from './hotels';
import { HotelService } from '../../core/services/hotel';

describe('Hotels', () => {
  let component: Hotels;
  let fixture: ComponentFixture<Hotels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hotels],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: HotelService, useValue: { getHotels: () => of({ items: [], total: 0, pages: 1, page: 1 }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Hotels);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

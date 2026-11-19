import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { HotelDetail } from './hotel-detail';
import { HotelService } from '../../core/services/hotel';
import { BookingService } from '../../core/services/booking';
import { AuthService } from '../../core/services/auth';

describe('HotelDetail', () => {
  let component: HotelDetail;
  let fixture: ComponentFixture<HotelDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotelDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
            queryParams: of({}),
          },
        },
        { provide: HotelService, useValue: { getHotel: () => of(null), getRooms: () => of([]) } },
        { provide: BookingService, useValue: { getRoomBookedDates: () => of([]), createBooking: () => of({}) } },
        { provide: AuthService, useValue: { currentUser: null } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HotelDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

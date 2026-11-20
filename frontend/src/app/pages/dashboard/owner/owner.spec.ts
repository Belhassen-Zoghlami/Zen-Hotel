import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Owner } from './owner';
import { HotelService } from '../../../core/services/hotel';
import { BookingService } from '../../../core/services/booking';

describe('Owner', () => {
  let component: Owner;
  let fixture: ComponentFixture<Owner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Owner],
      providers: [
        provideRouter([]),
        {
          provide: HotelService,
          useValue: {
            getHotels: () => of([]),
            getTags: () => of([]),
            createHotel: () => of({}),
            updateHotel: () => of({}),
            deleteHotel: () => of({}),
            getRooms: () => of([]),
            getHotel: () => of({}),
            createTag: () => of({}),
          },
        },
        {
          provide: BookingService,
          useValue: {
            getHotelBookings: () => of([]),
            confirmBooking: () => of({}),
            completeBooking: () => of({}),
            cancelBooking: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Owner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Client } from './client';
import { BookingService } from '../../../core/services/booking';

describe('Client', () => {
  let component: Client;
  let fixture: ComponentFixture<Client>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Client],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        {
          provide: BookingService,
          useValue: {
            getMyBookings: () => of([]),
            verifyStripeSession: () => of({}),
            cancelBooking: () => of({}),
            createStripeCheckout: () => of({ url: '', sessionId: '' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Client);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ChangeDetectorRef, Component, inject, OnInit, NgZone} from '@angular/core';
import { BookingService } from '../../../core/services/booking';
import { DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-client',
  imports: [DatePipe, RouterLink],
  templateUrl: './client.html',
  styleUrl: './client.scss',
})
export class Client implements OnInit {
  private bookingService = inject(BookingService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  bookings: any[] = [];
  paying = false;
  paymentMessage = '';

ngOnInit(): void {
  this.route.queryParams.subscribe((params) => {
    if (params['payment'] === 'success' && params['session_id']) {
      this.paymentMessage = 'Verifying payment...';
      this.bookingService.verifyStripeSession(params['session_id']).subscribe({
        next: () => {
          this.paymentMessage = 'Payment successful! Your booking is confirmed.';
          this.loadBookings();
        },
        error: () => {
          this.paymentMessage = 'Payment verification failed. Please contact support.';
        },
      });
    } else if (params['payment'] === 'cancelled') {
      this.paymentMessage = 'Payment was cancelled. You can try again.';
    }
  });
  this.loadBookings();
}

loadBookings(): void {
  this.bookingService.getMyBookings().subscribe({
    next: (res: any) => {
      this.bookings = res;
      this.cdr.detectChanges();
    },
    error: (err) => console.log(err)
  });
}
  cancelBooking(bookingId: string): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        const booking = this.bookings.find((b) => b._id === bookingId);
        if (booking) {
          booking.status = 'cancelled';
          if (booking.paymentStatus === 'paid') booking.paymentStatus = 'refunded';
        }
      },
      error: (err) => console.log(err),
    });
  }

  payNow(bookingId: string): void {
    if (this.paying) return;
    this.paying = true;
    this.paymentMessage = '';
    this.cdr.detectChanges();

    this.bookingService.createStripeCheckout(bookingId).pipe(
      finalize(() => {
        this.ngZone.run(() => {
          this.paying = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          window.location.href = res.url;
        });
      },
      error: (err) => {
        console.error('Stripe checkout error:', err);
        this.ngZone.run(() => {
          this.paymentMessage = 'Failed to create payment session. Please try again.';
          this.cdr.detectChanges();
        });
      },
    });
  }

get confirmedCount(): number {
  return this.bookings.filter(b => b.status === 'confirmed').length;
}

get pendingCount(): number {
  return this.bookings.filter(b => b.status === 'pending').length;
}
}

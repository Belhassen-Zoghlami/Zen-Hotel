import { Component, inject} from '@angular/core';
import { BookingService } from '../../../core/services/booking';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-client',
  imports: [DatePipe, RouterLink],
  templateUrl: './client.html',
  styleUrl: './client.scss',
})
export class Client {
  private bookingService = inject(BookingService);
  bookings: any[] = [];

  ngOnInit(): void {
    this.bookingService.getMyBookings().subscribe({
      next: (res: any) => {
        this.bookings = res;
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  cancelBooking(bookingId: string): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        const booking = this.bookings.find((b) => b._id === bookingId);
        if (booking) booking.status = 'cancelled';
      },
      error: (err) => console.log(err),
    });
  }
get confirmedCount(): number {
  return this.bookings.filter(b => b.status === 'confirmed').length;
}

get pendingCount(): number {
  return this.bookings.filter(b => b.status === 'pending').length;
}
}

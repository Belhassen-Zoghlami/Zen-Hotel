import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { HotelService } from '../../../core/services/hotel';
import { BookingService } from '../../../core/services/booking';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-owner',
  imports: [DatePipe],
  templateUrl: './owner.html',
  styleUrl: './owner.scss',
})
export class Owner implements OnInit {

  private hotelService = inject(HotelService);
  private bookingService = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);

  hotels: any[] = [];
  bookings: any[] = [];
  selectedHotelId: string = '';

  ngOnInit(): void {
    this.hotelService.getHotels().subscribe({
      next: (res: any) => {
        this.hotels = res;
        this.cdr.detectChanges();
        // Charge les réservations du premier hôtel automatiquement
        if (res.length > 0) {
          this.loadBookings(res[0]._id);
          this.selectedHotelId = res[0]._id;
        }
      },
      error: (err) => console.log(err)
    });
  }

  loadBookings(hotelId: string): void {
    this.selectedHotelId = hotelId;
    this.bookingService.getHotelBookings(hotelId).subscribe({
      next: (res: any) => {
        this.bookings = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  confirmBooking(bookingId: string): void {
    this.bookingService.confirmBooking(bookingId).subscribe({
      next: () => {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (booking) booking.status = 'confirmed';
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  cancelBooking(bookingId: string): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        const booking = this.bookings.find(b => b._id === bookingId);
        if (booking) booking.status = 'cancelled';
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  get confirmedCount(): number {
    return this.bookings.filter(b => b.status === 'confirmed').length;
  }

  get pendingCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }
}
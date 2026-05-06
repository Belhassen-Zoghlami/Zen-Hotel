import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HotelService } from '../../../core/services/hotel';
import { BookingService } from '../../../core/services/booking';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-owner',
  imports: [DatePipe, FormsModule],
  templateUrl: './owner.html',
  styleUrl: './owner.scss',
})
export class Owner implements OnInit {

  private hotelService = inject(HotelService);
  private bookingService = inject(BookingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  hotels: any[] = [];
  bookings: any[] = [];
  selectedHotelId: string = '';

  newHotel = {
    name: '',
    location: '',
    rating: '',
    description: '',
    images: [] as File[],
  };

  isCreatingHotel = false;
  hotelCreateError = '';
  showAddHotelForm = false;

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

  onHotelImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      this.newHotel.images = [];
      return;
    }
    this.newHotel.images = Array.from(input.files);
  }

  toggleHotelForm(): void {
    this.showAddHotelForm = !this.showAddHotelForm;
    this.hotelCreateError = '';
  }

  createHotel(): void {
    this.hotelCreateError = '';
    if (!this.newHotel.name || !this.newHotel.location || !this.newHotel.rating) {
      this.hotelCreateError = 'Name, location and rating are required.';
      return;
    }

    this.isCreatingHotel = true;
    const formData = new FormData();
    formData.append('name', this.newHotel.name);
    formData.append('location', this.newHotel.location);
    formData.append('rating', this.newHotel.rating);
    formData.append('description', this.newHotel.description || '');
    this.newHotel.images.forEach(file => formData.append('images', file));

    this.hotelService.createHotel(formData).subscribe({
      next: (res: any) => {
        const hotel = res?.hotel ?? res;
        if (hotel) {
          this.hotels.unshift(hotel);
          this.selectedHotelId = hotel._id;
          this.loadBookings(hotel._id);
        }
        this.newHotel = { name: '', location: '', rating: '', description: '', images: [] };
        this.showAddHotelForm = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.hotelCreateError = 'Unable to create hotel. Please check the fields and try again.';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isCreatingHotel = false;
      }
    });
  }

  deleteHotel(hotelId: string): void {
    if (confirm('Are you sure you want to delete this hotel? This will also delete all associated rooms.')) {
      this.hotelService.deleteHotel(hotelId).subscribe({
        next: () => {
          this.hotels = this.hotels.filter(h => h._id !== hotelId);
          if (this.selectedHotelId === hotelId) {
            this.selectedHotelId = this.hotels.length > 0 ? this.hotels[0]._id : '';
            this.bookings = [];
            if (this.selectedHotelId) {
              this.loadBookings(this.selectedHotelId);
            }
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting hotel:', err);
          alert('Failed to delete hotel. Please try again.');
        }
      });
    }
  }

  manageRooms(hotelId: string): void {
    this.router.navigate(['/hotels', hotelId, 'rooms']);
  }

  get confirmedCount(): number {
    return this.bookings.filter(b => b.status === 'confirmed').length;
  }

  get pendingCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }
}
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { HotelService } from '../../core/services/hotel';
import { BookingService } from '../../core/services/booking';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-hotel-detail',
  imports: [FormsModule],
  templateUrl: './hotel-detail.html',
  styleUrl: './hotel-detail.scss',
})
export class HotelDetail implements OnInit {

  private hotelService = inject(HotelService);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  hotel: any = null;
  rooms: any[] = [];
  selectedRoom: any = null;
  checkIn = '';
  checkOut = '';
  totalPrice = 0;
  nights = 0;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.hotelService.getHotel(id).subscribe({
        next: (res: any) => { this.hotel = res;
          this.cdr.detectChanges();
         },
        error: (err) => console.log(err)
      });

      this.hotelService.getRooms(id).subscribe({
        next: (res: any) => { this.rooms = res;
          this.cdr.detectChanges();
         },
        error: (err) => console.log(err)
      });
    }
  }

  onSelectRoom(room: any): void {
    // Vérifie si l'user est connecté
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedRoom = room;
    this.checkIn = '';
    this.checkOut = '';
    this.totalPrice = 0;
    this.nights = 0;
  }

  calculatePrice(): void {
  if (this.checkIn && this.checkOut) {
    const checkInDate = new Date(this.checkIn);
    const checkOutDate = new Date(this.checkOut);
    this.nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (this.nights > 0) {
      this.totalPrice = this.nights * this.getPrice(this.selectedRoom.pricePerNight);
    }
  }
}

  getPrice(price: any): number {
  if (!price) return 0;
  if (price['$numberDecimal']) return parseFloat(price['$numberDecimal']);
  return parseFloat(price.toString());
}

  onConfirmBooking(): void {
    if (this.nights <= 0) return;

    const bookingData = {
      roomId: this.selectedRoom._id,
      hotelId: this.hotel._id,
      checkIn: this.checkIn,
      checkOut: this.checkOut
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/client']);
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  onCloseBooking(): void {
    this.selectedRoom = null;
  }
}
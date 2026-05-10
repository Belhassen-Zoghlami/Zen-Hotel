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
  roomImageIndexes: Record<string, number> = {};
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
        next: (res: any) => {
          this.rooms = res;
          this.roomImageIndexes = {};
          this.rooms.forEach(room => {
            if (room.images?.length) {
              this.roomImageIndexes[room._id] = 0;
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => console.log(err)
      });
    }
  }

  getRoomImageIndex(roomId: string): number {
    return this.roomImageIndexes[roomId] ?? 0;
  }

  nextRoomImage(roomId: string, imageCount: number): void {
    const currentIndex = this.getRoomImageIndex(roomId);
    if (currentIndex < imageCount - 1) {
      this.roomImageIndexes[roomId] = currentIndex + 1;
    }
  }

  prevRoomImage(roomId: string): void {
    const currentIndex = this.getRoomImageIndex(roomId);
    if (currentIndex > 0) {
      this.roomImageIndexes[roomId] = currentIndex - 1;
    }
  }

  selectRoomImage(roomId: string, image: any): void {
    const room = this.rooms.find(r => r._id === roomId);
    if (!room?.images?.length) {
      return;
    }
    const selectedIndex = room.images.findIndex((item: any) => this.getImageUrl(item) === this.getImageUrl(image));
    if (selectedIndex >= 0) {
      this.roomImageIndexes[roomId] = selectedIndex;
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

  getImageUrl(storedPath?: string | { path?: string; url?: string }): string {
    if (!storedPath) {
      return '';
    }

    const pathValue = typeof storedPath === 'string'
      ? storedPath
      : storedPath.url || storedPath.path || '';

    if (!pathValue) {
      return '';
    }

    const normalized = pathValue.replace(/\\/g, '/').trim();
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }

    const trimmed = normalized.replace(/^\/+/, '').replace(/^images\//i, '');
    return `http://localhost:3000/images/${trimmed}`;
  }
}
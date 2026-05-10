import { ChangeDetectorRef, Component, inject, OnInit, NgZone } from '@angular/core';
import { HotelService } from '../../core/services/hotel';
import { BookingService } from '../../core/services/booking';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import * as L from 'leaflet';

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
  private ngZone = inject(NgZone);

  hotel: any = null;
  rooms: any[] = [];
  roomImageIndexes: Record<string, number> = {};
  selectedRoom: any = null;
  checkIn = '';
  checkOut = '';
  totalPrice = 0;
  nights = 0;
  map: any;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.hotelService.getHotel(id).subscribe({
        next: (res: any) => { this.hotel = res;
          this.cdr.detectChanges();
          this.initMap();
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

  initMap(): void {
    if (!this.hotel?.location) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        const mapElement = document.getElementById('hotel-map');
        if (mapElement && mapElement.offsetHeight === 0) {
          mapElement.style.height = '400px';
        }

        // Geocode the hotel location using OpenStreetMap Nominatim API
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.hotel.location)}`)
          .then(response => response.json())
          .then(data => {
            if (data.length > 0) {
              const result = data[0];
              const lat = parseFloat(result.lat);
              const lon = parseFloat(result.lon);

              this.ngZone.run(() => {
                // Initialize the map with OpenStreetMap tiles
                this.map = L.map('hotel-map').setView([lat, lon], 15);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '© OpenStreetMap contributors',
                  maxZoom: 19
                }).addTo(this.map);

                // Add marker for the hotel
                L.marker([lat, lon], {
                  title: this.hotel.name
                }).bindPopup(this.hotel.name).addTo(this.map);
              });
            } else {
              console.error('Location not found: ' + this.hotel.location);
            }
          })
          .catch(err => console.error('Geocoding error:', err));
      }, 100);
    });
  }
}
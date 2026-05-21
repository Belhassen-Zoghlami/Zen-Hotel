import { ChangeDetectorRef, Component, inject, OnInit, NgZone } from '@angular/core';
import { HotelService } from '../../core/services/hotel';
import { BookingService } from '../../core/services/booking';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import * as L from 'leaflet';

interface DayCell {
  date: Date;
  dayNum: number;
  isBooked: boolean;
  isPast: boolean;
  isToday: boolean;
  isOtherMonth: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  dateStr: string;
}

@Component({
  selector: 'app-hotel-detail',
  imports: [FormsModule, DatePipe],
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
  bookedRanges: any[] = [];
  dateError = '';
  today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();

  currentMonth: Date = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  weeks: DayCell[][] = [];
  selectedStart: Date | null = null;
  selectedEnd: Date | null = null;

  dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

  private getBookedSet(): Set<string> {
    const s = new Set<string>();
    for (const range of this.bookedRanges) {
      const start = new Date(range.checkIn);
      const end = new Date(range.checkOut);
      const cur = new Date(start);
      while (cur < end) {
        s.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return s;
  }

  buildMonthGrid(): void {
    const booked = this.getBookedSet();
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const weeks: DayCell[][] = [];
    let week: DayCell[] = [];

    const pushDay = (date: Date, isOtherMonth: boolean) => {
      const ds = date.toISOString().split('T')[0];
      week.push({
        date,
        dayNum: date.getDate(),
        isBooked: booked.has(ds) && !isOtherMonth,
        isPast: date < this.today,
        isToday: date.getTime() === this.today.getTime(),
        isOtherMonth,
        isStart: this.selectedStart && date.getTime() === this.selectedStart.getTime() || false,
        isEnd: this.selectedEnd && date.getTime() === this.selectedEnd.getTime() || false,
        isInRange: false,
        dateStr: ds,
      });
    };

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i);
      pushDay(d, true);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      pushDay(new Date(year, month, d), false);
    }
    const remaining = 7 - (week.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        pushDay(new Date(year, month + 1, d), true);
      }
    }

    for (let i = 0; i < week.length; i += 7) {
      weeks.push(week.slice(i, i + 7));
    }

    if (this.selectedStart && this.selectedEnd) {
      for (const row of weeks) {
        for (const cell of row) {
          if (!cell.isOtherMonth && cell.date > this.selectedStart && cell.date < this.selectedEnd) {
            cell.isInRange = true;
          }
        }
      }
    }

    this.weeks = weeks;
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildMonthGrid();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildMonthGrid();
  }

  selectDay(cell: DayCell): void {
    if (cell.isOtherMonth || cell.isPast || cell.isBooked) return;
    if (!this.selectedStart || (this.selectedStart && this.selectedEnd)) {
      this.selectedStart = new Date(cell.date);
      this.selectedEnd = null;
      this.checkIn = cell.dateStr;
      this.checkOut = '';
    } else {
      if (cell.date <= this.selectedStart) {
        this.selectedStart = new Date(cell.date);
        this.checkIn = cell.dateStr;
        this.checkOut = '';
      } else {
        this.selectedEnd = new Date(cell.date);
        this.checkOut = cell.dateStr;
      }
    }
    this.buildMonthGrid();
    this.calculatePrice();
  }

  onSelectRoom(room: any): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedRoom = room;
    this.selectedStart = null;
    this.selectedEnd = null;
    this.checkIn = '';
    this.checkOut = '';
    this.totalPrice = 0;
    this.nights = 0;
    this.dateError = '';
    this.bookedRanges = [];
    this.currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.bookingService.getRoomBookedDates(room._id).subscribe({
      next: (ranges) => {
        this.bookedRanges = ranges;
        this.buildMonthGrid();
        this.cdr.detectChanges();
      },
    });
  }

  calculatePrice(): void {
  this.dateError = '';
  this.nights = 0;
  this.totalPrice = 0;
  if (this.selectedStart && this.selectedEnd) {
    this.nights = Math.ceil((this.selectedEnd.getTime() - this.selectedStart.getTime()) / (1000 * 60 * 60 * 24));
    if (this.nights > 0) {
      for (const range of this.bookedRanges) {
        const bci = new Date(range.checkIn);
        const bco = new Date(range.checkOut);
        if (this.selectedStart < bco && this.selectedEnd > bci) {
          this.dateError = 'This room is already booked for these dates. Please choose different dates.';
          this.nights = 0;
          this.totalPrice = 0;
          this.selectedEnd = null;
          this.checkOut = '';
          return;
        }
      }
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
    if (this.nights <= 0 || !this.checkIn || !this.checkOut) return;

    const bookingData = {
      roomId: this.selectedRoom._id,
      hotelId: this.hotel._id,
      checkIn: this.checkIn,
      checkOut: this.checkOut,
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
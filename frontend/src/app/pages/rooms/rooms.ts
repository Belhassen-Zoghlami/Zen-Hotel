import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HotelService } from '../../core/services/hotel';
import { RoomService } from '../../core/services/room';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-rooms',
  imports: [FormsModule],
  templateUrl: './rooms.html',
  styleUrl: './rooms.scss',
})
export class Rooms implements OnInit {
  private hotelService = inject(HotelService);
  private roomService = inject(RoomService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  hotel: any = null;
  rooms: any[] = [];
  isLoading = true;
  isCreatingRoom = false;
  roomCreateError = '';

  newRoom = {
    roomNumber: '',
    type: 'single',
    capacity: 1,
    pricePerNight: '',
    amenities: [] as string[],
    description: '',
    isAvailable: true,
    images: [] as File[],
  };

  roomTypes = ['single', 'double', 'suite'];
  amenitiesOptions = ['Wifi', 'AC', 'Heating', 'TV', 'Mini_bar', 'Room_service', 'Sea_view', 'Balcony'];

  ngOnInit(): void {
    const hotelId = this.route.snapshot.paramMap.get('id');
    if (!hotelId) {
      this.router.navigate(['/hotels']);
      return;
    }

    this.loadHotel(hotelId);
    this.loadRooms(hotelId);
  }

  loadHotel(hotelId: string): void {
    this.hotelService.getHotel(hotelId).subscribe({
      next: (res: any) => {
        this.hotel = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  loadRooms(hotelId: string): void {
    this.isLoading = true;
    this.roomService.getRooms(hotelId).subscribe({
      next: (res: any) => {
        this.rooms = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  onRoomImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      this.newRoom.images = [];
      return;
    }

    this.newRoom.images = Array.from(input.files);
  }

  toggleAmenity(amenity: string): void {
    const index = this.newRoom.amenities.indexOf(amenity);
    if (index === -1) {
      this.newRoom.amenities.push(amenity);
    } else {
      this.newRoom.amenities.splice(index, 1);
    }
  }

  isAmenitySelected(amenity: string): boolean {
    return this.newRoom.amenities.includes(amenity);
  }

  createRoom(): void {
    if (!this.hotel) return;
    this.roomCreateError = '';

    if (!this.newRoom.roomNumber || !this.newRoom.type || !this.newRoom.capacity || !this.newRoom.pricePerNight) {
      this.roomCreateError = 'Room number, type, capacity and price are required.';
      return;
    }

    this.isCreatingRoom = true;
    const formData = new FormData();
    formData.append('roomNumber', this.newRoom.roomNumber);
    formData.append('type', this.newRoom.type);
    formData.append('capacity', this.newRoom.capacity.toString());
    formData.append('pricePerNight', this.newRoom.pricePerNight.toString());
    formData.append('isAvailable', String(this.newRoom.isAvailable));
    formData.append('description', this.newRoom.description || '');
    this.newRoom.amenities.forEach(item => formData.append('amenities', item));
    this.newRoom.images.forEach(file => formData.append('images', file));

    this.roomService.createRoom(this.hotel._id, formData).subscribe({
      next: (res: any) => {
        const room = res?.room ?? res;
        if (room) {
          this.rooms.unshift(room);
        }
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.roomCreateError = 'Unable to create room. Please check fields and try again.';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isCreatingRoom = false;
      }
    });
  }

  resetForm(): void {
    this.newRoom = {
      roomNumber: '',
      type: 'single',
      capacity: 1,
      pricePerNight: '',
      amenities: [],
      description: '',
      isAvailable: true,
      images: [] as File[],
    };
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

  canManageRooms(): boolean {
    return this.authService.isLoggedIn && this.authService.currentUser?.role === 'owner';
  }
}

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
  roomImageIndexes: Record<string, number> = {};
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

  editingRoomId: string | null = null;
  editRoom = {
    roomNumber: '',
    type: 'single',
    capacity: 1,
    pricePerNight: '',
    amenities: [] as string[],
    description: '',
    isAvailable: true,
    images: [] as File[],
  };

  isEditingRoom = false;

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
        this.roomImageIndexes = {};
        this.rooms.forEach(room => {
          if (room.images?.length) {
            this.roomImageIndexes[room._id] = 0;
          }
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
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
          this.roomImageIndexes[room._id] = 0;
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

  startEditRoom(room: any): void {
    this.editingRoomId = room._id;
    this.editRoom = {
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight['$numberDecimal'] || room.pricePerNight.toString(),
      amenities: [...room.amenities],
      description: room.description,
      isAvailable: room.isAvailable,
      images: []
    };
  }

  cancelEditRoom(): void {
    this.editingRoomId = null;
    this.editRoom = {
      roomNumber: '',
      type: 'single',
      capacity: 1,
      pricePerNight: '',
      amenities: [],
      description: '',
      isAvailable: true,
      images: []
    };
  }

  toggleEditAmenity(amenity: string): void {
    const index = this.editRoom.amenities.indexOf(amenity);
    if (index === -1) {
      this.editRoom.amenities.push(amenity);
    } else {
      this.editRoom.amenities.splice(index, 1);
    }
  }

  isEditAmenitySelected(amenity: string): boolean {
    return this.editRoom.amenities.includes(amenity);
  }

  onEditRoomImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      this.editRoom.images = [];
      return;
    }
    this.editRoom.images = Array.from(input.files);
  }

  updateRoom(): void {
    if (!this.hotel || !this.editingRoomId) return;

    if (!this.editRoom.roomNumber || !this.editRoom.type || !this.editRoom.capacity || !this.editRoom.pricePerNight) {
      alert('Room number, type, capacity and price are required.');
      return;
    }

    this.isEditingRoom = true;
    const formData = new FormData();
    formData.append('roomNumber', this.editRoom.roomNumber);
    formData.append('type', this.editRoom.type);
    formData.append('capacity', this.editRoom.capacity.toString());
    formData.append('pricePerNight', this.editRoom.pricePerNight.toString());
    formData.append('isAvailable', String(this.editRoom.isAvailable));
    formData.append('description', this.editRoom.description || '');
    this.editRoom.amenities.forEach(item => formData.append('amenities', item));
    this.editRoom.images.forEach(file => formData.append('images', file));

    this.roomService.updateRoom(this.hotel._id, this.editingRoomId, formData).subscribe({
      next: () => {
        const idx = this.rooms.findIndex(r => r._id === this.editingRoomId);
        if (idx !== -1) {
          this.rooms[idx] = {
            ...this.rooms[idx],
            roomNumber: this.editRoom.roomNumber,
            type: this.editRoom.type,
            capacity: this.editRoom.capacity,
            pricePerNight: this.editRoom.pricePerNight,
            amenities: this.editRoom.amenities,
            description: this.editRoom.description,
            isAvailable: this.editRoom.isAvailable
          };
        }
        this.cancelEditRoom();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to update room.');
      },
      complete: () => {
        this.isEditingRoom = false;
      }
    });
  }

  deleteRoom(roomId: string): void {
    if (!this.hotel || !roomId) return;
    if (!confirm('Are you sure you want to delete this room?')) return;

    this.roomService.deleteRoom(this.hotel._id, roomId).subscribe({
      next: () => {
        this.rooms = this.rooms.filter(room => room._id !== roomId);
        delete this.roomImageIndexes[roomId];
        if (this.editingRoomId === roomId) {
          this.cancelEditRoom();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete room.');
      }
    });
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

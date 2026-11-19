import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HotelService } from '../../../core/services/hotel';
import { BookingService } from '../../../core/services/booking';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MapPickerComponent } from '../../../shared/map-picker/map-picker.component';

@Component({
  selector: 'app-owner',
  imports: [DatePipe, FormsModule, MapPickerComponent],
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
  tags: any[] = [];
  selectedHotelId = '';
  bookingFilterStatus = '';

  newHotel = {
    name: '', location: '', rating: '', description: '', status: 'published', tags: [] as string[], images: [] as File[],
    coordinates: { latitude: null as number | null, longitude: null as number | null }
  };

  editingHotelId: string | null = null;
  editHotel = {
    name: '', location: '', rating: '', description: '', status: 'published', tags: [] as string[], images: [] as File[],
    coordinates: { latitude: null as number | null, longitude: null as number | null }
  };

  isCreatingHotel = false;
  hotelCreateError = '';
  showAddHotelForm = false;

  ngOnInit(): void {
    this.loadHotels();
    this.loadTags();
  }

  loadHotels(): void {
    this.hotelService.getHotels().subscribe({
      next: (res: any) => {
        this.hotels = Array.isArray(res) ? res : (res.items || []);
        this.cdr.detectChanges();
        if (this.hotels.length > 0 && !this.selectedHotelId) {
          this.selectedHotelId = this.hotels[0]._id;
          this.loadBookings(this.hotels[0]._id);
        } else if (this.selectedHotelId) {
          this.loadBookings(this.selectedHotelId);
        }
      },
      error: (err) => console.log(err)
    });
  }

  loadTags(): void {
    this.hotelService.getTags().subscribe({ next: (res: any) => { this.tags = Array.isArray(res) ? res : (res.items || []); this.cdr.detectChanges(); }, error: () => {} });
  }

  loadBookings(hotelId: string): void {
    this.selectedHotelId = hotelId;
    const params: any = {};
    if (this.bookingFilterStatus) params.status = this.bookingFilterStatus;
    this.bookingService.getHotelBookings(hotelId, params).subscribe({
      next: (res: any) => { this.bookings = Array.isArray(res) ? res : (res.items || []); this.cdr.detectChanges(); },
      error: (err) => console.log(err)
    });
  }

  confirmBooking(bookingId: string): void {
    this.bookingService.confirmBooking(bookingId).subscribe({
      next: () => { const b = this.bookings.find(x => x._id === bookingId); if (b) b.status = 'confirmed'; this.cdr.detectChanges(); },
      error: (err) => { console.log(err); alert(err?.error?.message || 'Failed to confirm booking'); }
    });
  }

  completeBooking(bookingId: string): void {
    this.bookingService.completeBooking(bookingId).subscribe({
      next: () => { const b = this.bookings.find(x => x._id === bookingId); if (b) b.status = 'completed'; this.cdr.detectChanges(); },
      error: (err) => { console.log(err); alert(err?.error?.message || 'Failed to complete booking'); }
    });
  }

  cancelBooking(bookingId: string): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => { const b = this.bookings.find(x => x._id === bookingId); if (b) b.status = 'cancelled'; this.cdr.detectChanges(); },
      error: (err) => { console.log(err); alert(err?.error?.message || 'Failed to cancel booking'); }
    });
  }

  onHotelImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newHotel.images = input.files ? Array.from(input.files) : [];
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
    formData.append('rating', String(this.newHotel.rating));
    formData.append('description', this.newHotel.description || '');
    formData.append('status', this.newHotel.status || 'published');
    if (this.newHotel.tags.length) formData.append('tags', JSON.stringify(this.newHotel.tags));
    if (this.newHotel.coordinates.latitude !== null && this.newHotel.coordinates.longitude !== null) {
      formData.append('latitude', String(this.newHotel.coordinates.latitude));
      formData.append('longitude', String(this.newHotel.coordinates.longitude));
    }
    this.newHotel.images.forEach(file => formData.append('images', file));
    this.hotelService.createHotel(formData).subscribe({
      next: (res: any) => {
        const hotel = res?.hotel ?? res;
        if (hotel) {
          this.hotels.unshift(hotel);
          this.selectedHotelId = hotel._id;
          this.loadBookings(hotel._id);
        }
        this.newHotel = { name: '', location: '', rating: '', description: '', status: 'published', tags: [], images: [], coordinates: { latitude: null, longitude: null } };
        this.showAddHotelForm = false;
        this.loadHotels();
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); this.hotelCreateError = err?.error?.message || 'Unable to create hotel.'; this.cdr.detectChanges(); },
      complete: () => { this.isCreatingHotel = false; }
    });
  }

  deleteHotel(hotelId: string): void {
    if (!confirm('Delete this hotel and its rooms?')) return;
    this.hotelService.deleteHotel(hotelId).subscribe({
      next: () => {
        this.hotels = this.hotels.filter(h => h._id !== hotelId);
        if (this.selectedHotelId === hotelId) {
          this.selectedHotelId = this.hotels[0]?._id || '';
          this.bookings = [];
          if (this.selectedHotelId) this.loadBookings(this.selectedHotelId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); alert(err?.error?.message || 'Failed to delete hotel.'); }
    });
  }

  manageRooms(hotelId: string): void { this.router.navigate(['/hotels', hotelId, 'rooms']); }

  startEditHotel(hotel: any): void {
    this.editingHotelId = hotel._id;
    this.editHotel = {
      name: hotel.name, location: hotel.location, rating: String(hotel.rating ?? ''),
      description: hotel.description || '', status: hotel.status || 'published',
      tags: (hotel.tags || []).map((t: any) => t?._id || t),
      images: [], coordinates: hotel.coordinates || { latitude: null, longitude: null }
    };
  }

  cancelEditHotel(): void {
    this.editingHotelId = null;
    this.editHotel = { name: '', location: '', rating: '', description: '', status: 'published', tags: [], images: [], coordinates: { latitude: null, longitude: null } };
  }

  toggleNewTag(tagId: string): void {
    const i = this.newHotel.tags.indexOf(tagId);
    if (i >= 0) this.newHotel.tags.splice(i, 1); else this.newHotel.tags.push(tagId);
  }

  toggleEditTag(tagId: string): void {
    const i = this.editHotel.tags.indexOf(tagId);
    if (i >= 0) this.editHotel.tags.splice(i, 1); else this.editHotel.tags.push(tagId);
  }

  onEditHotelImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editHotel.images = input.files ? Array.from(input.files) : [];
  }

  updateHotel(): void {
    if (!this.editingHotelId) return;
    if (!this.editHotel.name || !this.editHotel.location || !this.editHotel.rating) { alert('Name, location and rating are required.'); return; }
    const formData = new FormData();
    formData.append('name', this.editHotel.name);
    formData.append('location', this.editHotel.location);
    formData.append('rating', String(this.editHotel.rating));
    formData.append('description', this.editHotel.description || '');
    formData.append('status', this.editHotel.status || 'published');
    formData.append('tags', JSON.stringify(this.editHotel.tags || []));
    if (this.editHotel.coordinates.latitude !== null && this.editHotel.coordinates.longitude !== null) {
      formData.append('latitude', String(this.editHotel.coordinates.latitude));
      formData.append('longitude', String(this.editHotel.coordinates.longitude));
    }
    this.editHotel.images.forEach(file => formData.append('images', file));
    this.hotelService.updateHotel(this.editingHotelId, formData).subscribe({
      next: (res: any) => {
        const updated = res?.hotel || res;
        const idx = this.hotels.findIndex(h => h._id === this.editingHotelId);
        if (idx !== -1) this.hotels[idx] = { ...this.hotels[idx], ...(updated?._id ? updated : { name: this.editHotel.name, location: this.editHotel.location, rating: Number(this.editHotel.rating), description: this.editHotel.description, status: this.editHotel.status, tags: this.editHotel.tags }) };
        this.cancelEditHotel();
        this.loadHotels();
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); alert(err?.error?.message || 'Failed to update hotel.'); }
    });
  }

  get confirmedCount(): number { return this.bookings.filter(b => b.status === 'confirmed').length; }
  get pendingCount(): number { return this.bookings.filter(b => b.status === 'pending').length; }
  get completedCount(): number { return this.bookings.filter(b => b.status === 'completed').length; }

  onNewHotelLocationSelected(location: { latitude: number; longitude: number; address: string }): void {
    this.newHotel.coordinates.latitude = location.latitude;
    this.newHotel.coordinates.longitude = location.longitude;
    if (location.address) this.newHotel.location = location.address.split(',')[0].trim();
  }

  onEditHotelLocationSelected(location: { latitude: number; longitude: number; address: string }): void {
    this.editHotel.coordinates.latitude = location.latitude;
    this.editHotel.coordinates.longitude = location.longitude;
    if (location.address) this.editHotel.location = location.address.split(',')[0].trim();
  }
}

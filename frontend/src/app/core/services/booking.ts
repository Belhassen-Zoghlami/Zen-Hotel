import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/bookings';

  // Create booking (client)
  createBooking(data: any) {
    return this.http.post(this.apiUrl, data, 
      { withCredentials: true }
    );
  }

  // Get my bookings (client)
  getMyBookings() {
    return this.http.get(`${this.apiUrl}/my`, 
      { withCredentials: true }
    );
  }

  // Get hotel bookings (owner)
  getHotelBookings(hotelId: string) {
    return this.http.get(`${this.apiUrl}/hotel/${hotelId}`, 
      { withCredentials: true }
    );
  }

  // Get all bookings (admin)
  getAllBookings() {
    return this.http.get(`${this.apiUrl}/all`, 
      { withCredentials: true }
    );
  }

  // Confirm booking (owner)
  confirmBooking(bookingId: string) {
    return this.http.patch(`${this.apiUrl}/${bookingId}/confirm`, {}, 
      { withCredentials: true }
    );
  }

  // Cancel booking
  cancelBooking(bookingId: string, reason?: string) {
    return this.http.patch(`${this.apiUrl}/${bookingId}/cancel`, 
      { cancelReason: reason }, 
      { withCredentials: true }
    );
  }
}

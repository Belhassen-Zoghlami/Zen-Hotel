import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/bookings';

  // Get booked date ranges for a room (no auth)
  getRoomBookedDates(roomId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/room/${roomId}/booked-dates`);
  }

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

  // ── Payment (Stripe) ──────────────────────────────────────────────────────

  private paymentUrl = 'http://localhost:3000/api/payments';

  createStripeCheckout(bookingId: string) {
    return this.http.post<{ url: string; sessionId: string }>(`${this.paymentUrl}/create-checkout`,
      { bookingId },
      { withCredentials: true }
    );
  }

  verifyStripeSession(sessionId: string) {
    return this.http.post<any>(`${this.paymentUrl}/verify-session`,
      { sessionId },
      { withCredentials: true }
    );
  }

  refundPayment(bookingId: string) {
    return this.http.post<any>(`${this.paymentUrl}/refund`,
      { bookingId },
      { withCredentials: true }
    );
  }
}

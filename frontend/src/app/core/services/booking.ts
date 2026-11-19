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

  getMyBookings(params: any = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
    const q = qs.toString();
    return this.http.get(`${this.apiUrl}/my${q ? '?' + q : ''}`, { withCredentials: true });
  }

  getHotelBookings(hotelId: string, params: any = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
    const q = qs.toString();
    return this.http.get(`${this.apiUrl}/hotel/${hotelId}${q ? '?' + q : ''}`, { withCredentials: true });
  }

  getAllBookings(params: any = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
    const q = qs.toString();
    return this.http.get(`${this.apiUrl}/all${q ? '?' + q : ''}`, { withCredentials: true });
  }

  confirmBooking(bookingId: string) {
    return this.http.patch(`${this.apiUrl}/${bookingId}/confirm`, {}, { withCredentials: true });
  }

  completeBooking(bookingId: string) {
    return this.http.patch(`${this.apiUrl}/${bookingId}/complete`, {}, { withCredentials: true });
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

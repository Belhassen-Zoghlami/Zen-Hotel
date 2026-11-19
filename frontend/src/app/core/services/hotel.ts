import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/Hotel';

  getHotels(filters?: any): Observable<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      });
    }
    const qs = params.toString();
    return this.http.get(`${this.apiUrl}${qs ? '?' + qs : ''}`, { withCredentials: true });
  }

  getHotel(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  createHotel(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, { withCredentials: true });
  }

  updateHotel(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data, { withCredentials: true });
  }

  deleteHotel(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  getRooms(hotelId: string): Observable<any> {
    return this.http.get(`http://localhost:3000/api/Room/${hotelId}`, { withCredentials: true });
  }

  getTags(): Observable<any> {
    return this.http.get('http://localhost:3000/api/tags', { withCredentials: true });
  }

  createTag(data: { name: string; description?: string }): Observable<any> {
    return this.http.post('http://localhost:3000/api/tags', data, { withCredentials: true });
  }
}
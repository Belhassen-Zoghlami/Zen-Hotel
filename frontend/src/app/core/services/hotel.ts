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
    let query = '';
    if (filters?.city) query += `?city=${filters.city}`;
    if (filters?.rating) query += `${query ? '&' : '?'}rating=${filters.rating}`;
    return this.http.get(`${this.apiUrl}${query}`, 
      { withCredentials: true }
    );
  }

  getHotel(id: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${id}`, 
    { withCredentials: true }
  );
}

  createHotel(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, 
      { withCredentials: true }
    );
  }

  updateHotel(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data, 
      { withCredentials: true }
    );
  }

  deleteHotel(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, 
      { withCredentials: true }
    );
  }

  getRooms(hotelId: string): Observable<any> {
    return this.http.get(`http://localhost:3000/api/Room/${hotelId}`, 
      { withCredentials: true }
    );
  }
}
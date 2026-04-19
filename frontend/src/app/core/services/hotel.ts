import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HotelService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/Hotel';


  getHotels(filters?: any){
    let query = '';
    if (filters?.city) query += `?city=${filters.city}`;
    if (filters?.rating) query+= `${query ? '&' : '?'}rating=${filters.rating}`;
    return this.http.get(`${this.apiUrl}${query}`),
    { withCredentials: true}
  }

  // Get hotel by id
  getHotel(id: string) {
    return this.http.get(`${this.apiUrl}/${id}`, 
      { withCredentials: true }
    );
  }

  // Create hotel (owner)
  createHotel(data: any) {
    return this.http.post(this.apiUrl, data, 
      { withCredentials: true }
    );
  }
   // Update hotel (owner/admin)
  updateHotel(id: string, data: any) {
    return this.http.patch(`${this.apiUrl}/${id}`, data, 
      { withCredentials: true }
    );
  }

  // Delete hotel (owner/admin)
  deleteHotel(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, 
      { withCredentials: true }
    );
  }
   // Get rooms of a hotel
  getRooms(hotelId: string) {
    return this.http.get(`http://localhost:3000/api/Room/${hotelId}`, 
      { withCredentials: true }
    )
}
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/Room';

  getRooms(hotelId: string) {
    return this.http.get(`${this.apiUrl}/${hotelId}`, {
      withCredentials: true,
    });
  }

  getRoom(hotelId: string, roomId: string) {
    return this.http.get(`${this.apiUrl}/${hotelId}/${roomId}`, {
      withCredentials: true,
    });
  }

  createRoom(hotelId: string, data: FormData) {
    return this.http.post(`${this.apiUrl}/${hotelId}`, data, {
      withCredentials: true,
    });
  }

  updateRoom(hotelId: string, roomId: string, data: FormData) {
    return this.http.patch(`${this.apiUrl}/${hotelId}/${roomId}`, data, {
      withCredentials: true,
    });
  }

  deleteRoom(hotelId: string, roomId: string) {
    return this.http.delete(`${this.apiUrl}/${hotelId}/${roomId}`, {
      withCredentials: true,
    });
  }
}

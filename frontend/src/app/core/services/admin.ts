import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/admin';

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, 
      { withCredentials: true }
    );
  }

  validateOwner(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/validate-owner/${userId}`, {},
      { withCredentials: true }
    );
  }

  toggleUserStatus(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/toggle-user/${userId}`, {},
      { withCredentials: true }
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`,
      { withCredentials: true }
    );
  }
}
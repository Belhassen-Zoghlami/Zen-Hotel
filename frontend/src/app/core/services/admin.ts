import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/admin';

  getAllUsers(params: any = {}): Observable<any> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
    const q = qs.toString();
    return this.http.get(`${this.apiUrl}/users${q ? '?' + q : ''}`, { withCredentials: true });
  }

  getMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metrics`, { withCredentials: true });
  }

  getAuditLogs(params: any = {}): Observable<any> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
    const q = qs.toString();
    return this.http.get(`http://localhost:3000/api/audit-logs${q ? '?' + q : ''}`, { withCredentials: true });
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
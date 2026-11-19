import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    if (typeof localStorage !== 'undefined') {
      const savedUser = localStorage.getItem('zenUser');
      if (savedUser) {
        try {
          this.currentUserSubject.next(JSON.parse(savedUser));
        } catch {
          this.currentUserSubject.next(null);
        }
      }
    }
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data, { withCredentials: true }).pipe(
      tap(() => {
        this.fetchCurrentUser();
      }),
    );
  }

  fetchCurrentUser() {
    this.http.get<any>('http://localhost:3000/api/home', { withCredentials: true }).subscribe({
      next: (res) => {
        this.currentUserSubject.next(res);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('zenUser', JSON.stringify(res));
        }
      },
      error: () => {
        this.currentUserSubject.next(null);
      },
    });
  }

  logout() {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('zenUser');
        }
        this.router.navigate(['/login']);
      }),
    );
  }

  verifyEmail(token: string) {
    return this.http.get(`${this.apiUrl}/verify-email`, { params: { token } });
  }

  resendVerification(email: string) {
    return this.http.post(`${this.apiUrl}/resend-verification`, { email });
  }

  get currentUser() {
    return this.currentUserSubject.value;
  }

  get isLoggedIn() {
    return this.currentUserSubject.value !== null;
  }
}

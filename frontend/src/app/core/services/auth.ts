import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth';

  // BehaviorSubject → stocke l'user courant (null = non connecté)
  private currentUserSubject = new BehaviorSubject<any>(null);
  
  // Observable public que les composants peuvent écouter
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Récupère l'user depuis localStorage au démarrage
    const savedUser = localStorage.getItem('zenUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data, 
      { withCredentials: true }
    ).pipe(
      tap((res: any) => {
        // Appelle /home pour récupérer les infos de l'user
        this.fetchCurrentUser();
      })
    );
  }

  fetchCurrentUser() {
    this.http.get(`${this.apiUrl.replace('/auth', '')}/home`, 
      { withCredentials: true }
    ).subscribe({
      next: (res: any) => {
        localStorage.setItem('zenUser', JSON.stringify(res));
        this.currentUserSubject.next(res);
      }
    });
  }

  logout() {
    return this.http.post(`${this.apiUrl}/logout`, {}, 
      { withCredentials: true }
    ).pipe(
      tap(() => {
        localStorage.removeItem('zenUser');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }

  // Getter pratique
  get currentUser() {
    return this.currentUserSubject.value;
  }

  get isLoggedIn() {
    return this.currentUserSubject.value !== null;
  }
}
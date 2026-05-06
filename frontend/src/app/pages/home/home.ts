import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { HotelService } from '../../core/services/hotel';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, AsyncPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  featuredHotels: any[] = [];
  isLoading = true;

  searchCity = '';
  searchCheckIn = '';
  searchCheckOut = '';
  today = new Date().toISOString().split('T')[0];

  currentUser$!: Observable<any>;

  constructor(
    private hotelService: HotelService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.hotelService.getHotels().subscribe({
      next: (res: any) => {
        this.featuredHotels = res.slice(0, 3);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // Stored path may be "hotel/filename.jpg", "/images/hotel/filename.jpg", or a full URL.
  getImageUrl(storedPath?: string | { path?: string; url?: string }): string {
    if (!storedPath) {
      return '';
    }

    const pathValue = typeof storedPath === 'string'
      ? storedPath
      : storedPath.url || storedPath.path || '';

    if (!pathValue) {
      return '';
    }

    const normalized = pathValue.replace(/\\/g, '/').trim();
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }

    const trimmed = normalized.replace(/^\/+/, '').replace(/^images\//i, '');
    return `http://localhost:3000/images/${trimmed}`;
  }

  onSearch(): void {
    const params: any = {};
    if (this.searchCity.trim()) params['city'] = this.searchCity.trim();
    this.router.navigate(['/hotels'], { queryParams: params });
  }

  goToHotel(id: string): void {
    this.router.navigate(['/hotels', id]);
  }
}
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { HotelService } from '../../core/services/hotel';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-hotels',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './hotels.html',
  styleUrl: './hotels.scss',
})
export class Hotels implements OnInit {
  private hotelService = inject(HotelService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  hotels: any[] = [];
  cityFilter = '';
  ratingFilter = '';
  q = '';
  searchCheckIn = '';
  searchCheckOut = '';
  page = 1;
  limit = 9;
  total = 0;
  pages = 1;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.cityFilter = params['city'] || '';
      this.searchCheckIn = params['checkIn'] || '';
      this.searchCheckOut = params['checkOut'] || '';
      this.page = 1;
      this.loadHotels();
    });
  }

  loadHotels(): void {
    const filters: any = { page: this.page, limit: this.limit };
    if (this.cityFilter.trim()) filters.city = this.cityFilter.trim();
    if (this.ratingFilter) filters.rating = this.ratingFilter;
    if (this.q.trim()) filters.q = this.q.trim();
    this.hotelService.getHotels(filters).subscribe({
      next: (res: any) => {
        this.hotels = Array.isArray(res) ? res : (res.items || []);
        this.total = res.total ?? this.hotels.length;
        this.pages = res.pages ?? 1;
        this.page = res.page ?? this.page;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  onFilter(): void { this.page = 1; this.loadHotels(); }
  goToHotel(id: string): void { this.router.navigate(['/hotels', id]); }
  nextPage(): void { if (this.page < this.pages) { this.page++; this.loadHotels(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.loadHotels(); } }

  getImageUrl(storedPath?: string | { path?: string; url?: string }): string {
    if (!storedPath) return '';
    const pathValue = typeof storedPath === 'string' ? storedPath : storedPath.url || storedPath.path || '';
    if (!pathValue) return '';
    const normalized = pathValue.replace(/\\/g, '/').trim();
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const trimmed = normalized.replace(/^\/+/, '').replace(/^images\//i, '');
    return `http://localhost:3000/images/${trimmed}`;
  }
}
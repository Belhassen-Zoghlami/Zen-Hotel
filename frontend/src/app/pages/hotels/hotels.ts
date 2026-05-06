import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { HotelService } from '../../core/services/hotel';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hotels',
  imports: [FormsModule],
  templateUrl: './hotels.html',
  styleUrl: './hotels.scss',
})
export class Hotels implements OnInit {

  private hotelService = inject(HotelService);
  private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);


  hotels: any[] = [];
  cityFilter = '';
  ratingFilter = '';

  ngOnInit(): void {
    this.loadHotels();
  }

  loadHotels(): void {
    this.hotelService.getHotels().subscribe({
      next: (res: any) => {
        this.hotels = res;
        this.cdr.detectChanges();

      },
      error: (err) => console.log(err)
    });
  }

onFilter(): void {
  const filters: any = {};
  if (this.cityFilter.trim()) filters.city = this.cityFilter.trim();
  if (this.ratingFilter) filters.rating = this.ratingFilter;
  
  this.hotelService.getHotels(filters).subscribe({
    next: (res: any) => {
      this.hotels = res;
      this.cdr.detectChanges();

    },
    error: (err) => console.log(err)
  });
}

  goToHotel(id: string): void {
    this.router.navigate(['/hotels', id]);
  }
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
  }}
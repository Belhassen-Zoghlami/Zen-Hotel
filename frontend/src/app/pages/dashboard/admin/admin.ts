import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AdminService } from '../../../core/services/admin';
import { BookingService } from '../../../core/services/booking';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  imports: [DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {

  private adminService = inject(AdminService);
  private bookingService = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);

  users: any[] = [];
  bookings: any[] = [];
  activeTab = 'users';

  ngOnInit(): void {
    this.loadUsers();
    this.loadBookings();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe({
      next: (res: any) => {
        this.users = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  loadBookings(): void {
    this.bookingService.getAllBookings().subscribe({
      next: (res: any) => {
        this.bookings = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  validateOwner(userId: string): void {
    this.adminService.validateOwner(userId).subscribe({
      next: () => {
        const user = this.users.find(u => u._id === userId);
        if (user) user.isValidated = true;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  toggleStatus(userId: string): void {
    this.adminService.toggleUserStatus(userId).subscribe({
      next: () => {
        const user = this.users.find(u => u._id === userId);
        if (user) user.isActive = !user.isActive;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  deleteUser(userId: string): void {
    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== userId);
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err)
    });
  }

  get totalRevenue(): number {
    return this.bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalPrice, 0);
  }

  get ownersCount(): number {
    return this.users.filter(u => u.role === 'owner').length;
  }

  get clientsCount(): number {
    return this.users.filter(u => u.role === 'client').length;
  }
}
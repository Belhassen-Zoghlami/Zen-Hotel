import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AdminService } from '../../../core/services/admin';
import { BookingService } from '../../../core/services/booking';
import { HotelService } from '../../../core/services/hotel';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  imports: [DatePipe, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  private adminService = inject(AdminService);
  private bookingService = inject(BookingService);
  private hotelService = inject(HotelService);
  private cdr = inject(ChangeDetectorRef);

  users: any[] = [];
  bookings: any[] = [];
  auditLogs: any[] = [];
  tags: any[] = [];
  metrics: any = null;
  activeTab = 'users';
  newTag = { name: '', description: '' };

  userFilters = { q: '', role: '', isActive: '', isValidated: '' };
  bookingFilters = { status: '', from: '', to: '' };
  auditFilters = { entity: '', action: '' };

  ngOnInit(): void {
    this.loadUsers();
    this.loadBookings();
    this.loadMetrics();
    this.loadAuditLogs();
    this.loadTags();
  }

  loadUsers(): void {
    this.adminService.getAllUsers(this.userFilters).subscribe({
      next: (res: any) => { this.users = res.items || res || []; this.cdr.detectChanges(); },
      error: (err) => console.log(err)
    });
  }

  loadBookings(): void {
    this.bookingService.getAllBookings(this.bookingFilters).subscribe({
      next: (res: any) => { this.bookings = res.items || res || []; this.cdr.detectChanges(); },
      error: (err) => console.log(err)
    });
  }

  loadMetrics(): void {
    this.adminService.getMetrics().subscribe({ next: (res: any) => { this.metrics = res; this.cdr.detectChanges(); }, error: () => {} });
  }

  loadAuditLogs(): void {
    this.adminService.getAuditLogs(this.auditFilters).subscribe({ next: (res: any) => { this.auditLogs = res.items || []; this.cdr.detectChanges(); }, error: () => {} });
  }

  loadTags(): void {
    this.hotelService.getTags().subscribe({ next: (res: any) => { this.tags = Array.isArray(res) ? res : (res.items || []); this.cdr.detectChanges(); }, error: () => {} });
  }

  createTag(): void {
    if (!this.newTag.name.trim()) return;
    this.hotelService.createTag({ name: this.newTag.name.trim(), description: this.newTag.description || '' }).subscribe({
      next: () => { this.newTag = { name: '', description: '' }; this.loadTags(); this.loadAuditLogs(); },
      error: (err) => alert(err?.error?.message || 'Failed to create tag')
    });
  }

  validateOwner(userId: string): void {
    this.adminService.validateOwner(userId).subscribe({
      next: () => { const user = this.users.find(u => u._id === userId); if (user) user.isValidated = true; this.cdr.detectChanges(); this.loadMetrics(); this.loadAuditLogs(); },
      error: (err) => console.log(err)
    });
  }

  toggleStatus(userId: string): void {
    this.adminService.toggleUserStatus(userId).subscribe({
      next: () => { const user = this.users.find(u => u._id === userId); if (user) user.isActive = !user.isActive; this.cdr.detectChanges(); this.loadMetrics(); this.loadAuditLogs(); },
      error: (err) => console.log(err)
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Delete this user and related data?')) return;
    this.adminService.deleteUser(userId).subscribe({
      next: () => { this.users = this.users.filter(u => u._id !== userId); this.cdr.detectChanges(); this.loadMetrics(); this.loadAuditLogs(); },
      error: (err) => console.log(err)
    });
  }

  get totalRevenue(): number {
    if (this.metrics?.totals?.revenue !== undefined) return this.metrics.totals.revenue;
    return this.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + b.totalPrice, 0);
  }
  get ownersCount(): number { return this.metrics?.usersByRole?.owner ?? this.users.filter(u => u.role === 'owner').length; }
  get clientsCount(): number { return this.metrics?.usersByRole?.client ?? this.users.filter(u => u.role === 'client').length; }
}
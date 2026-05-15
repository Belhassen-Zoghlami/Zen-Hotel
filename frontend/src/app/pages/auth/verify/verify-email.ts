import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  status: 'success' | 'error' | 'loading' = 'loading';
  reason = '';

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const s = params['status'];
      if (s === 'success') {
        this.status = 'success';
      } else if (s === 'error') {
        this.status = 'error';
        this.reason =
          params['reason'] || 'Verification failed. The link may be invalid or expired.';
      } else {
        this.status = 'error';
        this.reason = 'No verification status found.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
  goToResend() {
    this.router.navigate(['/resend-verification']);
  }
}

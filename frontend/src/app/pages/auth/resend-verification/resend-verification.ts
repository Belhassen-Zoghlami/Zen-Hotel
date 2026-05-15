import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-resend-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './resend-verification.html',
  styleUrl: './resend-verification.scss',
})
export class ResendVerification implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  resendForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.resendForm.patchValue({ email: params['email'] });
      }
    });
  }

  onSubmit() {
    if (this.resendForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.successMessage = '';
      this.errorMessage = '';

      this.authService.resendVerification(this.resendForm.value.email!).subscribe({
        next: () => {
          this.successMessage = 'Verification email sent! Please check your inbox.';
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to resend. Please try again.';
          this.isLoading = false;
        },
      });
    }
  }
}

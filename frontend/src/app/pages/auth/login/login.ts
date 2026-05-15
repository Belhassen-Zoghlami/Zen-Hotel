import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  errorMessage = '';
  unverifiedEmail = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.unverifiedEmail = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          if (err.error?.code === 'EMAIL_NOT_VERIFIED') {
            this.unverifiedEmail = err.error.email || '';
            this.router.navigate(['/resend-verification'], {
              queryParams: { email: err.error.email },
            });
          } else {
            this.errorMessage = err.error?.message || 'Login failed';
          }
        },
      });
    }
  }
}

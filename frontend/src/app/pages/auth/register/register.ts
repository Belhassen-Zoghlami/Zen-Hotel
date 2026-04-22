import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule , Validators} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule,RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {

  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = '';
  successMessage = '';


  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    role: new FormControl('client', [Validators.required])
  })

  onSubmit() : void{
    if (this.registerForm.valid){
      this.authService.register(this.registerForm.value).subscribe({
        next: (res: any) => {
          if (this.registerForm.value.role === 'owner'){
            this.successMessage = 'Account created! Waiting for admin approval.';
          } else{
            this.router.navigate(['/login'])
          }
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Registration failed';
        }
      })
    }
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ResendVerification } from './resend-verification';
import { AuthService } from '../../../core/services/auth';

describe('ResendVerification', () => {
  let component: ResendVerification;
  let fixture: ComponentFixture<ResendVerification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResendVerification],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: AuthService, useValue: { resendVerification: () => of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResendVerification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  success: boolean;
  message: string;
  recommendations?: any[];
  preferences?: any;
  usingAI?: boolean;
}

export interface RateLimitStatus {
  ipDailyUsed: number;
  ipDailyLimit: number;
  ipMinuteUsed: number;
  ipMinuteLimit: number;
  globalDailyUsed: number;
  globalDailyLimit: number;
  globalMinuteUsed: number;
  globalMinuteLimit: number;
  resetTime: string;
  // Gemini circuit-breaker state (from health endpoint)
  backingOff?: boolean;
  backoffUntil?: string | null;
  backoffReason?: 'minute' | 'daily' | null;
}

@Injectable({
  providedIn: 'root',
})
export class AIService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/ai';

  getRecommendations(message: string, conversationHistory?: ChatMessage[]): Observable<AIResponse> {
    return this.http.post<AIResponse>(
      `${this.apiUrl}/recommendations`,
      {
        message,
        conversationHistory,
      },
      { withCredentials: true },
    );
  }

  healthCheck(): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/health`, {
      withCredentials: true,
    });
  }

  getRateLimitStatus(): Observable<RateLimitStatus> {
    return this.http.get<RateLimitStatus>(`${this.apiUrl}/rate-limit-status`, {
      withCredentials: true,
    });
  }
}

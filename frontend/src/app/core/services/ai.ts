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
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/ai';

  getRecommendations(message: string, conversationHistory?: ChatMessage[]): Observable<AIResponse> {
    return this.http.post<AIResponse>(`${this.apiUrl}/recommendations`, {
      message,
      conversationHistory
    }, { withCredentials: true });
  }

  healthCheck(): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/health`, {
      withCredentials: true
    });
  }
}

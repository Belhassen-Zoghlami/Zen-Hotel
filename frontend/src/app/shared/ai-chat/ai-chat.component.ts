import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, ChatMessage, AIResponse, RateLimitStatus } from '../../core/services/ai';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent {
  private aiService = inject(AIService);

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content:
        'Hello! I\'m your AI hotel assistant. Tell me what you\'re looking for in a hotel, and I\'ll help you find the perfect match. For example, you can say "I want a luxury hotel in Paris with 5 stars" or "I need a budget-friendly hotel near the beach."',
      timestamp: new Date(),
    },
  ];

  userInput: string = '';
  isLoading: boolean = false;
  showChat: boolean = false;
  currentRecommendations: any[] = [];
  rateLimitStatus: RateLimitStatus | null = null;
  usingAI: boolean = false;
  isRateLimited: boolean = false;
  rateLimitMessage: string = '';

  toggleChat() {
    if (!this.showChat) {
      this.loadRateLimitStatus();
    }
    this.showChat = !this.showChat;
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date(),
    };
    this.messages.push(userMessage);

    const messageToSend = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    // Get AI response
    this.aiService.getRecommendations(messageToSend, this.messages).subscribe({
      next: (response: AIResponse) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };
        this.messages.push(assistantMessage);

        if (response.recommendations) {
          this.currentRecommendations = response.recommendations;
        }

        this.usingAI = response.usingAI ?? false;
        this.isLoading = false;

        // Refresh rate-limit counters after each successful call
        this.loadRateLimitStatus();
      },
      error: (error) => {
        console.error('AI Error:', error);
        this.isLoading = false;

        if (error.status === 429) {
          const body = error.error ?? {};
          const retryAfter: number = body.retryAfter ?? 60;
          this.rateLimitMessage =
            body.message ??
            `You've reached the request limit. Please wait ${retryAfter} seconds before trying again.`;
          this.isRateLimited = true;
          // Refresh status so the bars reflect the current state
          this.loadRateLimitStatus();
        } else {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again or contact support.',
            timestamp: new Date(),
          };
          this.messages.push(errorMessage);
        }
      },
    });
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.messages = [
      {
        role: 'assistant',
        content:
          "Hello! I'm your AI hotel assistant. Tell me what you're looking for in a hotel, and I'll help you find the perfect match.",
        timestamp: new Date(),
      },
    ];
    this.currentRecommendations = [];
  }

  viewHotelDetails(hotelId: string) {
    // Navigate to hotel details page
    // This will be handled by the router in the template
  }

  formatMessage(content: string): string {
    // Convert markdown-like syntax to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  }

  autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  loadRateLimitStatus() {
    this.aiService.getRateLimitStatus().subscribe({
      next: (status: RateLimitStatus) => {
        this.rateLimitStatus = status;
        // Show backoff banner if Gemini's circuit breaker is open
        if (status.backingOff && status.backoffUntil) {
          const until = new Date(status.backoffUntil);
          const secsLeft = Math.ceil((until.getTime() - Date.now()) / 1000);
          if (secsLeft > 0) {
            const reason =
              status.backoffReason === 'daily'
                ? 'The daily AI quota has been reached. Responses will use the built-in engine until tomorrow.'
                : `The AI service is cooling down. It will resume in ${secsLeft}s.`;
            this.isRateLimited = true;
            this.rateLimitMessage = reason;
          } else {
            this.isRateLimited = false;
          }
        }
      },
      error: (err) => {
        // Non-critical — silently ignore if the endpoint is unavailable
        console.warn('Could not load rate-limit status:', err);
      },
    });
  }

  getRateLimitBarWidth(used: number, limit: number): string {
    if (!limit || limit === 0) return '0%';
    const pct = Math.min(Math.round((used / limit) * 100), 100);
    return `${pct}%`;
  }

  roundScore(score: number): number {
    return Math.round(score);
  }
}

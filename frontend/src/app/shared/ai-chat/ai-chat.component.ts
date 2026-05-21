import { Component, inject, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, ChatMessage, AIResponse, RateLimitStatus } from '../../core/services/ai';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent implements OnDestroy {
  private aiService = inject(AIService);
  private destroy$ = new Subject<void>();

  @ViewChild('messageContainer') private messageContainer?: ElementRef<HTMLElement>;

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content:
        'Hello! I\'m your AI hotel assistant. Tell me what you\'re looking for in a hotel, and I\'ll help you find the perfect match. For example, you can say "I want a luxury hotel in Paris with 5 stars" or "I need a budget-friendly hotel near the beach."',
      timestamp: new Date(),
    },
  ];

  userInput = '';
  isLoading = false;
  showChat = false;
  currentRecommendations: any[] = [];
  rateLimitStatus: RateLimitStatus | null = null;
  usingAI = false;
  isRateLimited = false;
  rateLimitMessage = '';

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat() {
    if (!this.showChat) {
      this.loadRateLimitStatus();
    }
    this.showChat = !this.showChat;
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date(),
    };
    this.messages.push(userMessage);

    const messageToSend = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    this.aiService.getRecommendations(messageToSend, this.messages)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AIResponse) => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            recommendations: response.recommendations,
          };
          this.messages.push(assistantMessage);

          if (response.recommendations) {
            this.currentRecommendations = response.recommendations;
          }

          this.usingAI = response.usingAI ?? false;
          this.isLoading = false;

          this.loadRateLimitStatus();
          this.scrollToBottom();
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
            this.loadRateLimitStatus();
          } else {
            const errorMessage: ChatMessage = {
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again or contact support.',
              timestamp: new Date(),
            };
            this.messages.push(errorMessage);
            this.scrollToBottom();
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

  formatMessage(content: string): string {
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped
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
    this.aiService.getRateLimitStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status: RateLimitStatus) => {
          this.rateLimitStatus = status;
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
        error: () => {},
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

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}

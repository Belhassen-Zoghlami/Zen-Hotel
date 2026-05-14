import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, ChatMessage, AIResponse } from '../../core/services/ai';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent {
  private aiService = inject(AIService);

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI hotel assistant. Tell me what you\'re looking for in a hotel, and I\'ll help you find the perfect match. For example, you can say "I want a luxury hotel in Paris with 5 stars" or "I need a budget-friendly hotel near the beach."',
      timestamp: new Date()
    }
  ];
  
  userInput: string = '';
  isLoading: boolean = false;
  showChat: boolean = false;
  currentRecommendations: any[] = [];

  toggleChat() {
    this.showChat = !this.showChat;
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date()
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
          timestamp: new Date()
        };
        this.messages.push(assistantMessage);
        
        if (response.recommendations) {
          this.currentRecommendations = response.recommendations;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('AI Error:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again or contact support.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
      }
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
        content: 'Hello! I\'m your AI hotel assistant. Tell me what you\'re looking for in a hotel, and I\'ll help you find the perfect match.',
        timestamp: new Date()
      }
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

  roundScore(score: number): number {
    return Math.round(score);
  }
}

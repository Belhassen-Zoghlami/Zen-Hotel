import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/footer/footer';
import { NavbarComponent } from './shared/navbar/navbar';
import { AiChatComponent } from './shared/ai-chat/ai-chat.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavbarComponent,Footer,AiChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}

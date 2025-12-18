import { Component, signal, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/state/theme.service';
import { Toolbar } from './shared/components/toolbar/toolbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,Toolbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('CheofPizza_Front');

}

import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router'; // Añade Router aquí
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent], // Añade CommonModule
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // Inyectamos el router para preguntar la url
  public router = inject(Router);

  // Función para saber si NO estamos en el login
  shouldShowMenu(): boolean {
    return this.router.url !== '/login' && this.router.url !== '/';
  }
}
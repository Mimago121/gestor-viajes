import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  public router = inject(Router);

  // Función para saber si debemos mostrar el menú
  shouldShowMenu(): boolean {
    const currentUrl = this.router.url;
    
    // Lista de rutas donde NO queremos ver el menú (Login, Registro y Raíz)
    const hiddenRoutes = ['/login', '/register', '/'];

    // Si la URL actual está en la lista de ocultas, devolvemos false (no mostrar)
    // Si NO está en la lista, devolvemos true (mostrar)
    return !hiddenRoutes.includes(currentUrl);
  }
}
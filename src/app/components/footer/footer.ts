import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink], // Importamos esto por si usas rutas en el futuro
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class FooterComponent {
  // Calculamos el año actual automáticamente
  currentYear: number = new Date().getFullYear();
}
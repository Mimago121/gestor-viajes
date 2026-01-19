import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false; // Para mostrar un estado de carga
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true; // Activar spinner o bloquear botón
      const { email, password } = this.loginForm.value;
      
      try {
        await this.authService.login(email, password);
        // --- AQUÍ ESTÁ EL CAMBIO ---
        // Una vez logueado, nos vamos a la página de viajes
        this.router.navigate(['/trips']); 
      } catch (error) {
        console.error(error);
        alert('Credenciales incorrectas. Inténtalo de nuevo.');
      } finally {
        this.isLoading = false;
      }
    }
  }

  async onRegister() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      
      try {
        await this.authService.register(email, password);
        alert('¡Cuenta creada! Ahora iniciarás sesión automáticamente.');
        // Opcional: Loguearlo y redirigirlo directamente
        this.router.navigate(['/trips']);
      } catch (error) {
        console.error(error);
        alert('Error al crear cuenta. Puede que el correo ya exista.');
      } finally {
        this.isLoading = false;
      }
    }
  }
}
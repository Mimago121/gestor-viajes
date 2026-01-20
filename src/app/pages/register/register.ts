import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // RouterModule para poder volver al login
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, query, where, getDocs, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'], // Usaremos el mismo estilo que login
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);

  readonly defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  constructor() {
    this.registerForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          // ESTA ES LA REGLA NUEVA: Solo letras (a-z), números (0-9) y guiones bajos (_)
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password, username } = this.registerForm.value;
    const usernameLimpio = username.trim().toLowerCase();
    const usernameConArroba = '@' + usernameLimpio.replace('@', '');

    try {
      // 1. VERIFICAR SI EXISTE EL USUARIO EN FIREBASE
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('username', '==', usernameConArroba));

      // OJO AQUÍ: Si falla aquí, mira la consola del navegador (F12)
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert('❌ Ese nombre de usuario ya está ocupado.');
        this.isLoading = false;
        return;
      }

      // 2. CREAR CUENTA
      const credencial = await this.authService.register(email, password);
      const uid = credencial.user.uid;

      // 3. GUARDAR PERFIL
      const nuevoPerfil = {
        name: usernameLimpio,
        username: usernameConArroba,
        email: email,
        bio: '¡Hola! Soy nuevo en TripShare.',
        avatar: this.defaultAvatar,
        stats: { trips: 0, countries: 0, friends: 0 },
        nextTrip: { destination: 'Planificar viaje', date: 'Pronto' },
      };

      await setDoc(doc(this.firestore, 'users', uid), nuevoPerfil);

      alert('¡Cuenta creada! Bienvenido.');
      this.router.navigate(['/trips']);
    } catch (error: any) {
      console.error('ERROR REGISTRO:', error); // <--- IMPORTANTE MIRAR ESTO

      if (error.code === 'auth/email-already-in-use') {
        alert('Este correo ya está registrado.');
      } else if (error.message && error.message.includes('index')) {
        alert('Falta crear un índice en Firebase. Mira la consola (F12) y haz clic en el enlace.');
      } else {
        alert('Error al registrarse: ' + error.message);
      }
    } finally {
      this.isLoading = false;
    }
  }
}

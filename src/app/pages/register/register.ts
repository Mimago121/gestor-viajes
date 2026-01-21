import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// Importamos todo lo necesario de Firestore
import { Firestore, collection, query, where, getDocs, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'] // Asegúrate de tener el CSS que te pasé antes
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
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]], 
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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
    
    // Le ponemos la @ visualmente para guardarlo
    const usernameConArroba = '@' + usernameLimpio.replace('@', ''); 

    try {
      // 1. VERIFICAR SI YA EXISTE EL NOMBRE EN LA BASE DE DATOS
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('username', '==', usernameConArroba));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert('❌ Ese nombre de usuario ya está ocupado.');
        this.isLoading = false;
        return;
      }

      // 2. CREAR CUENTA EN AUTH (Email y Contraseña)
      const credencial = await this.authService.register(email, password);
      const uid = credencial.user.uid;

      // 3. ¡AQUÍ SE CREA LA COLECCIÓN! 
      // Guardamos el documento con el mismo ID que el usuario
      const nuevoPerfil = {
        uid: uid, // Guardamos también el ID dentro por si acaso
        name: usernameLimpio, 
        username: usernameConArroba,
        email: email,
        bio: '¡Hola! Soy nuevo en TripShare.',
        avatar: this.defaultAvatar,
        stats: { trips: 0, countries: 0, friends: 0 },
        nextTrip: { destination: 'Sin planificar', date: '' },
        createdAt: new Date()
      };

      // Esta línea crea la colección 'users' si no existe
      await setDoc(doc(this.firestore, 'users', uid), nuevoPerfil);

      alert('¡Cuenta creada! Bienvenido.');
      this.router.navigate(['/profile']); // Te mando al perfil para que lo veas

    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Ese correo ya está registrado.');
      } else {
        alert('Error al registrarse. Mira la consola.');
      }
    } finally {
      this.isLoading = false;
    }
  }
}
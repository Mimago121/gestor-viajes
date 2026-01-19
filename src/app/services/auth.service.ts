import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  // --- ESTA ES LA LÍNEA QUE FALTABA ---
  // Es un "Observable" (una antena) que emite el usuario cuando se conecta
  // y emite 'null' cuando se desconecta.
  readonly user$: Observable<User | null> = authState(this.auth);


  // Métodos que ya tenías:
  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  register(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }
}
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
// 1. IMPORTANTE: Importa el tipo 'User' aquí
import { User } from '@angular/fire/auth'; 

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);

  user: any = {
    name: 'Cargando...',
    username: '@...',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Bienvenido a TripShare',
    stats: { trips: 0, countries: 0, friends: 0 },
    nextTrip: { destination: 'Sin planificar', date: '--' }
  };

  async ngOnInit() {
    // 2. Especificamos que 'authUser' puede ser un 'User' o 'null'
    this.authService.user$.subscribe(async (authUser: User | null) => {
      if (authUser) {
        await this.loadUserProfile(authUser);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  // 3. Especificamos que aquí recibimos un 'User' de Firebase
  async loadUserProfile(authUser: User) {
    const userDocRef = doc(this.firestore, `users/${authUser.uid}`);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      this.user = {
        name: data['name'] || authUser.email?.split('@')[0],
        username: data['username'] || '@viajero',
        avatar: data['avatar'] || 'https://i.pravatar.cc/150?img=12',
        bio: data['bio'] || 'Sin biografía aún.',
        stats: data['stats'] || { trips: 0, countries: 0, friends: 0 },
        nextTrip: data['nextTrip'] || { destination: 'Añadir viaje', date: '' }
      };
    } else {
      const newProfile = {
        name: authUser.email?.split('@')[0],
        username: '@nuevo_usuario',
        bio: '¡Hola! Soy nuevo en TripShare.',
        avatar: 'https://i.pravatar.cc/150?img=12',
        stats: { trips: 0, countries: 0, friends: 0 },
        nextTrip: { destination: 'Planificar viaje', date: 'Pronto' }
      };
      
      await setDoc(userDocRef, newProfile);
      this.user = newProfile;
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  }
}
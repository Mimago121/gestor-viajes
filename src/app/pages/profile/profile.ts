import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Importamos Formularios Reactivos
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 

import { AuthService } from '../../services/auth.service';
// Importamos updateDoc para actualizar datos
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // ¡Importante importar ReactiveFormsModule!
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Variables para el modal
  isEditing = false;
  editForm: FormGroup;
  currentUserUid: string | null = null; // Guardamos el ID para saber qué documento actualizar

  user: any = {
    name: 'Cargando...',
    username: '@...',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: '...',
    stats: { trips: 0, countries: 0, friends: 0 },
    nextTrip: { destination: '--', date: '--' }
  };

  constructor() {
    // Inicializamos el formulario vacío
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      bio: ['']
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(async (authUser: User | null) => {
      if (authUser) {
        this.currentUserUid = authUser.uid; // Guardamos el ID
        await this.loadUserProfile(authUser);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

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
        nextTrip: data['nextTrip'] || { destination: 'Sin planes', date: '' }
      };
    } else {
      // (Tu lógica de crear perfil nuevo si no existe...)
      // Por brevedad, asumo que ya existe o se crea igual que antes
    }
  }

  // --- LÓGICA DEL MODAL ---

  openEditModal() {
    // 1. Rellenamos el formulario con los datos actuales
    this.editForm.patchValue({
      name: this.user.name,
      username: this.user.username,
      bio: this.user.bio
    });
    // 2. Mostramos el modal
    this.isEditing = true;
  }

  closeEditModal() {
    this.isEditing = false;
  }

  async saveProfile() {
    if (this.editForm.valid && this.currentUserUid) {
      const formValues = this.editForm.value;

      try {
        // 1. Referencia al documento en Firebase
        const userDocRef = doc(this.firestore, `users/${this.currentUserUid}`);
        
        // 2. Actualizamos SOLO los campos que han cambiado
        await updateDoc(userDocRef, {
          name: formValues.name,
          username: formValues.username,
          bio: formValues.bio
        });

        // 3. Actualizamos la vista localmente para que se vea rápido
        this.user.name = formValues.name;
        this.user.username = formValues.username;
        this.user.bio = formValues.bio;

        // 4. Cerramos modal
        this.isEditing = false;
        alert('¡Perfil actualizado!');

      } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar cambios');
      }
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
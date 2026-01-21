import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Imports de Firebase
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Estado del modal y carga
  isEditing = false;
  isSaving = false; // Para mostrar "Guardando..." en el botón
  editForm: FormGroup;
  currentUserUid: string | null = null;

  readonly defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  user: any = {
    name: 'Cargando...',
    username: '@...',
    bio: '...',
    avatar: this.defaultAvatar,
    stats: { trips: 0, countries: 0, friends: 0 },
    nextTrip: { destination: '--', date: '--' }
  };

  constructor() {
    // Inicializamos el formulario con validaciones
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      bio: ['', [Validators.maxLength(150)]] // Máximo 150 letras para la bio
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(async (authUser: User | null) => {
      if (authUser) {
        this.currentUserUid = authUser.uid;
        await this.loadUserProfile(authUser);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  async loadUserProfile(authUser: User) {
    const userDocRef = doc(this.firestore, `users/${authUser.uid}`);
    try {
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        this.user = {
          name: data['name'] || 'Viajero',
          username: data['username'] || '@usuario',
          bio: data['bio'] || 'Sin biografía',
          avatar: data['avatar'] || this.defaultAvatar,
          stats: data['stats'] || { trips: 0, countries: 0, friends: 0 },
          nextTrip: data['nextTrip'] || { destination: 'Sin planes', date: '' }
        };
      } else {
        // Auto-reparación si no existe documento
        const newProfile = {
          name: authUser.email?.split('@')[0] || 'Viajero',
          username: '@' + (authUser.email?.split('@')[0] || 'usuario'),
          bio: '¡Hola! Soy nuevo en TripShare.',
          avatar: this.defaultAvatar,
          stats: { trips: 0, countries: 0, friends: 0 },
          nextTrip: { destination: 'Planificar', date: '' }
        };
        await setDoc(userDocRef, newProfile);
        this.user = newProfile;
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  }

  // --- FUNCIONES DEL MODAL ---

  openEditModal() {
    // 1. Rellenamos el formulario con los datos actuales del usuario
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
    if (this.editForm.invalid) return;
    if (!this.currentUserUid) return;

    this.isSaving = true;
    const formValues = this.editForm.value;

    try {
      // 1. Referencia al documento en Firebase
      const userDocRef = doc(this.firestore, `users/${this.currentUserUid}`);

      // 2. Actualizamos SOLO los campos editados
      await updateDoc(userDocRef, {
        name: formValues.name,
        username: formValues.username,
        bio: formValues.bio
      });

      // 3. Actualizamos la vista local (para que se vea rápido sin recargar)
      this.user.name = formValues.name;
      this.user.username = formValues.username;
      this.user.bio = formValues.bio;

      // 4. Cerramos
      this.isEditing = false;
      
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Hubo un problema al guardar.');
    } finally {
      this.isSaving = false;
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
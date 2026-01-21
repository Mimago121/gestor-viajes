import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore'; // Añadido setDoc
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

  isEditing = false;
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
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      username: ['', Validators.required],
      bio: ['']
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
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists()) {
      // 1. SI EXISTE: CARGAMOS DATOS
      const data = userSnapshot.data();
      this.user = {
        name: data['name'] || 'Viajero',
        username: data['username'] || '@usuario',
        bio: data['bio'] || 'Sin biografía',
        avatar: data['avatar'] || this.defaultAvatar,
        stats: data['stats'] || { trips: 0, countries: 0, friends: 0 },
        nextTrip: data['nextTrip'] || { destination: 'Sin planes', date: '' }
      };
      // Actualizamos formulario
      this.editForm.patchValue({
        name: this.user.name,
        username: this.user.username,
        bio: this.user.bio
      });

    } else {
      // 2. SI NO EXISTE: LO CREAMOS AHORA MISMO (Auto-reparación)
      console.log("El perfil no existía en base de datos. Creándolo...");
      
      const newProfile = {
        name: authUser.email?.split('@')[0] || 'Viajero',
        username: '@' + (authUser.email?.split('@')[0] || 'usuario'),
        bio: '¡Hola! Soy nuevo en TripShare.',
        avatar: this.defaultAvatar,
        stats: { trips: 0, countries: 0, friends: 0 },
        nextTrip: { destination: 'Planificar viaje', date: 'Pronto' }
      };

      // Lo guardamos en Firebase para la próxima
      await setDoc(userDocRef, newProfile);
      
      // Lo mostramos en pantalla
      this.user = newProfile;
      this.editForm.patchValue({
        name: this.user.name,
        username: this.user.username,
        bio: this.user.bio
      });
    }
  }

  // ... (El resto de funciones openEditModal, saveProfile, logout IGUAL QUE ANTES)
  
  openEditModal() {
    this.editForm.patchValue({
      name: this.user.name,
      username: this.user.username,
      bio: this.user.bio
    });
    this.isEditing = true;
  }

  closeEditModal() {
    this.isEditing = false;
  }

  async saveProfile() {
    if (this.editForm.valid && this.currentUserUid) {
      const formValues = this.editForm.value;
      try {
        const userDocRef = doc(this.firestore, `users/${this.currentUserUid}`);
        await updateDoc(userDocRef, {
          name: formValues.name,
          username: formValues.username,
          bio: formValues.bio
        });
        this.user.name = formValues.name;
        this.user.username = formValues.username;
        this.user.bio = formValues.bio;
        this.isEditing = false;
      } catch (error) {
        console.error('Error al guardar:', error);
      }
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) { console.error(error); }
  }
}
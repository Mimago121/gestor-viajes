import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Imports de Firebase
import { AuthService } from '../../services/auth.service';
import { 
  Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit 
} from '@angular/fire/firestore';
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
  isSaving = false;
  editForm: FormGroup;
  currentUserUid: string | null = null;

  readonly defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  user: any = {
    name: 'Cargando...',
    username: '@...',
    bio: '...',
    avatar: this.defaultAvatar,
    stats: { trips: 0, countries: 0, friends: 0 },
    nextTrip: { destination: 'Sin planes', date: '' }
  };

  constructor() {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      bio: ['', [Validators.maxLength(150)]],
      avatar: ['', Validators.required] // Añadido campo avatar
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(async (authUser: User | null) => {
      if (authUser) {
        this.currentUserUid = authUser.uid;
        await this.loadUserProfile(authUser);
        await this.calculateRealStats(authUser.uid); // Calcular datos reales
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
          ...this.user, // Mantener defaults
          name: data['name'] || 'Viajero',
          username: data['username'] || '@usuario',
          bio: data['bio'] || 'Sin biografía',
          avatar: data['avatar'] || this.defaultAvatar,
          // stats se calculará aparte para ser real
        };
      } else {
        // Crear perfil si no existe
        const newProfile = {
          name: authUser.email?.split('@')[0] || 'Viajero',
          username: '@' + (authUser.email?.split('@')[0] || 'usuario'),
          bio: '¡Hola! Soy nuevo en TripShare.',
          avatar: this.defaultAvatar,
          friends: [] // Inicializar array amigos
        };
        await setDoc(userDocRef, newProfile);
        this.user = { ...this.user, ...newProfile };
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  }

  // --- CÁLCULO DE ESTADÍSTICAS REALES ---
  async calculateRealStats(uid: string) {
    try {
      // 1. Contar Amigos (Array en el documento de usuario)
      const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));
      const friends = userDoc.data()?.['friends'] || [];
      this.user.stats.friends = friends.length;

      // 2. Contar Viajes y buscar el Próximo
      // Buscamos viajes donde el usuario esté en el array 'members' (necesita un índice compuesto a veces, 
      // pero para empezar podemos buscar por creador o traer todos y filtrar si son pocos)
      // OPCIÓN SIMPLE: Traer todos los viajes (colección trips) y filtrar en memoria 
      // (En app real, usar 'array-contains' en query)
      
      const tripsRef = collection(this.firestore, 'trips');
      // Consulta: Viajes futuros ordenados por fecha
      const q = query(tripsRef, orderBy('startDate', 'asc')); 
      const querySnapshot = await getDocs(q);
      
      let myTripsCount = 0;
      let nextTripFound = false;
      const today = new Date().toISOString().split('T')[0];

      querySnapshot.forEach((doc) => {
        const tripData = doc.data();
        const members = tripData['members'] || [];
        
        // ¿Soy miembro de este viaje?
        const isMember = members.some((m: any) => m.id === uid);

        if (isMember) {
          myTripsCount++;

          // Buscar el viaje futuro más cercano
          if (!nextTripFound && tripData['startDate'] >= today) {
            this.user.nextTrip = {
              destination: tripData['destination'],
              date: tripData['startDate']
            };
            nextTripFound = true;
          }
        }
      });

      this.user.stats.trips = myTripsCount;
      // Países es difícil de calcular sin una API externa, lo dejamos manual o a 0
      
    } catch (e) {
      console.error("Error calculando stats", e);
    }
  }

  // --- FUNCIONES DEL MODAL ---

  openEditModal() {
    this.editForm.patchValue({
      name: this.user.name,
      username: this.user.username,
      bio: this.user.bio,
      avatar: this.user.avatar
    });
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
      const userDocRef = doc(this.firestore, `users/${this.currentUserUid}`);

      await updateDoc(userDocRef, {
        name: formValues.name,
        username: formValues.username,
        bio: formValues.bio,
        avatar: formValues.avatar
      });

      // Actualizar vista local
      this.user.name = formValues.name;
      this.user.username = formValues.username;
      this.user.bio = formValues.bio;
      this.user.avatar = formValues.avatar;

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
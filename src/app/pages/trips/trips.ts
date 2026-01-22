import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router, RouterModule } from '@angular/router'; 
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Trip } from '../../interfaces/Trip';
import { MemberMini } from '../../interfaces/MemberMini';
import { 
  Firestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, 
  doc, updateDoc, arrayUnion, arrayRemove // <--- AÑADIDOS para editar invitaciones
} from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-trips-page',
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule, RouterModule], 
  templateUrl: './trips.html',
  styleUrls: ['./trips.css'],
})
export class TripsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- CAMBIO: Listas separadas ---
  myTrips: Trip[] = [];
  pendingTrips: Trip[] = [];
  
  templates: any[] = []; 
  loading = true;
  errorMsg = '';
  
  isCreateOpen = false;
  showTemplateSelection = true; 

  submitting = false;
  tripForm!: FormGroup;
  currentUser: MemberMini | null = null;

  hasNotifications = false;
  notificationCount = 0;

  readonly defaultUserAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  readonly fallbackTripImg = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80';

  ngOnInit(): void {
    this.tripForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        origin: ['', [Validators.required, Validators.minLength(2)]],
        destination: ['', [Validators.required, Validators.minLength(2)]],
        startDate: ['', [Validators.required]],
        endDate: ['', [Validators.required]],
        imageUrl: [''],
      },
      { validators: [this.dateRangeValidator, this.originDestinationValidator] },
    );

    this.authService.user$.subscribe((user: User | null) => {
      if (user) {
        this.currentUser = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Viajero',
          avatarUrl: user.photoURL || this.defaultUserAvatar, 
        };
        
        this.loadTripsRealtime();
        this.listenForNotifications(user.uid);
        this.loadTemplates();
        
      } else {
        this.currentUser = null;
      }
    });
  }

  async loadTemplates() {
    try {
      const q = query(collection(this.firestore, 'trip_templates'));
      const snapshot = await getDocs(q);
      this.templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error cargando plantillas:", error);
    }
  }

  listenForNotifications(uid: string) {
    const requestsRef = collection(this.firestore, 'friend_requests');
    const q = query(requestsRef, where('toUid', '==', uid), where('status', '==', 'pending'));

    onSnapshot(q, (snapshot) => {
      this.notificationCount = snapshot.size;
      this.hasNotifications = this.notificationCount > 0;
    });
  }

  goToChats() {
    this.router.navigate(['/chats']); 
  }

  openCreate(): void {
    this.errorMsg = '';
    this.isCreateOpen = true;
    this.showTemplateSelection = true;
    this.tripForm.reset();
  }

  selectTemplate(template: any | null) {
    this.showTemplateSelection = false;
    if (template) {
      this.tripForm.patchValue({
        destination: template.destination,
        name: template.description || `Viaje a ${template.destination}`,
        imageUrl: template.imageUrl,
      });
    } else {
      this.tripForm.reset();
    }
  }

  closeCreate(): void {
    if (this.submitting) return;
    this.isCreateOpen = false;
  }

  onOverlayClick(evt: MouseEvent): void {
    const target = evt.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.closeCreate();
    }
  }

  // ---------- CARGA DE VIAJES MODIFICADA ----------
  loadTripsRealtime(): void {
    this.loading = true;
    const tripsRef = collection(this.firestore, 'trips');
    const q = query(tripsRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        const allTrips = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return { id: doc.id, ...data } as Trip;
        });

        // FILTRADO EN MEMORIA
        this.myTrips = [];
        this.pendingTrips = [];

        if (this.currentUser) {
          allTrips.forEach(trip => {
            // Buscamos si soy miembro
            const membership = trip.members?.find((m: any) => m.id === this.currentUser?.id);
            
            if (membership) {
              if (membership.status === 'pending') {
                this.pendingTrips.push(trip);
              } else {
                // Si es 'accepted' o no tiene status (creador/antiguo), es mío
                this.myTrips.push(trip);
              }
            }
          });
        }
        
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando viajes:', error);
        this.loading = false;
      },
    );
  }

  // ---------- NUEVAS FUNCIONES: ACEPTAR / RECHAZAR ----------
  async acceptInvite(trip: Trip) {
    if (!this.currentUser) return;
    const tripRef = doc(this.firestore, 'trips', trip.id!);
    
    // Buscar mi objeto "pending" antiguo
    const myMemberOld = trip.members?.find((m: any) => m.id === this.currentUser?.id);
    
    // Crear el nuevo con estado aceptado
    const myMemberNew = { ...myMemberOld, status: 'accepted' };

    try {
      // Borrar el viejo y poner el nuevo (Atomicity simulada)
      await updateDoc(tripRef, { members: arrayRemove(myMemberOld) });
      await updateDoc(tripRef, { members: arrayUnion(myMemberNew) });
      // El snapshot actualizará la UI automáticamente
    } catch (e) {
      console.error("Error al aceptar", e);
    }
  }

  async rejectInvite(trip: Trip) {
    if (!this.currentUser) return;
    if(!confirm(`¿Rechazar invitación a ${trip.destination}?`)) return;

    const tripRef = doc(this.firestore, 'trips', trip.id!);
    const myMember = trip.members?.find((m: any) => m.id === this.currentUser?.id);
    
    try {
      await updateDoc(tripRef, { members: arrayRemove(myMember) });
    } catch (e) {
      console.error("Error al rechazar", e);
    }
  }

  // ---------- CREACIÓN ----------
  async createTrip(): Promise<void> {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }
    if (!this.currentUser) return;

    this.submitting = true;
    const v = this.tripForm.value;

    try {
      const newTripData = {
        name: v.name.trim(),
        origin: v.origin.trim(),
        destination: v.destination.trim(),
        startDate: v.startDate,
        endDate: v.endDate,
        imageUrl: v.imageUrl?.trim() || null,
        creatorId: this.currentUser.id, // Guardamos quién creó el viaje
        members: [{ ...this.currentUser, status: 'accepted' }], // El creador entra aceptado
        createdAt: Date.now(), 
      };

      const tripsRef = collection(this.firestore, 'trips');
      await addDoc(tripsRef, newTripData);

      this.submitting = false;
      this.isCreateOpen = false;
      this.tripForm.reset();
    } catch (error) {
      console.error('Error creando viaje:', error);
      this.submitting = false;
    }
  }

  // ... (Tus helpers de formato e imágenes siguen igual) ...
  getTripImage(trip: Trip): string { return trip.imageUrl || this.fallbackTripImg; }
  formatDateRange(startIso: string, endIso: string): string {
    const s = this.formatIsoDate(startIso);
    const e = this.formatIsoDate(endIso);
    return `${s} - ${e}`;
  }
  private formatIsoDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  visibleMembers(trip: Trip): MemberMini[] { return trip.members ? trip.members.slice(0, 3) : []; }
  extraMembersCount(trip: Trip): number { return trip.members ? Math.max(0, trip.members.length - 3) : 0; }
  
  // Validadores
  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (!start || !end) return null;
    return end >= start ? null : { dateRange: true };
  }
  private originDestinationValidator(group: AbstractControl): ValidationErrors | null {
    const o = (group.get('origin')?.value || '').trim().toLowerCase();
    const d = (group.get('destination')?.value || '').trim().toLowerCase();
    if (!o || !d) return null;
    return o !== d ? null : { samePlace: true };
  }
}
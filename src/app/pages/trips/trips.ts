import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf y *ngFor
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Trip } from '../../interfaces/Trip';
import { MemberMini } from '../../interfaces/MemberMini';

// --- Imports de Firebase ---
import { Firestore, collection, addDoc, query, orderBy, onSnapshot, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-trips-page',
  standalone: true, // ¡Importante!
  imports: [CommonModule, ReactiveFormsModule], // ¡Importante!
  templateUrl: './trips.html',
  styleUrls: ['./trips.css'],
})
export class TripsComponent implements OnInit {
  
  // Inyecciones de dependencias
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  trips: Trip[] = [];
  loading = true; // Empezamos cargando
  errorMsg = '';

  isCreateOpen = false;
  submitting = false;

  tripForm!: FormGroup;

  // Usuario actual (datos reales de Firebase Auth)
  currentUser: MemberMini | null = null;

  // Imagen placeholder (si no hay)
  readonly fallbackImg =
    'https://images.unsplash.com/photo-1526481280695-3c687fd5432c?q=80&w=1200&auto=format&fit=crop';

  ngOnInit(): void {
    // 1. Inicializar formulario
    this.tripForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        origin: ['', [Validators.required, Validators.minLength(2)]],
        destination: ['', [Validators.required, Validators.minLength(2)]],
        startDate: ['', [Validators.required]],
        endDate: ['', [Validators.required]],
        imageUrl: [''],
      },
      { validators: [this.dateRangeValidator, this.originDestinationValidator] }
    );

    // 2. Obtener usuario real y luego cargar viajes
    this.authService.user$.subscribe((user: User | null) => {
      if (user) {
        // Construimos el objeto MemberMini con datos reales
        this.currentUser = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Viajero',
          avatarUrl: user.photoURL || 'https://i.pravatar.cc/150?img=12'
        };
        // Una vez tenemos usuario, cargamos los viajes
        this.loadTripsRealtime();
      } else {
        this.currentUser = null;
      }
    });
  }

  // ---------- UI actions ----------
  openCreate(): void {
    this.errorMsg = '';
    this.isCreateOpen = true;
    this.tripForm.reset();
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

  // ---------- Data (Firebase) ----------
  
  loadTripsRealtime(): void {
    this.loading = true;
    
    // Referencia a la colección 'trips'
    const tripsRef = collection(this.firestore, 'trips');
    
    // Query: Ordenados por fecha de creación (más nuevos primero)
    const q = query(tripsRef, orderBy('createdAt', 'desc'));

    // onSnapshot escucha cambios en tiempo real
    onSnapshot(q, (snapshot) => {
      this.trips = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id, // El ID viene del documento, no de la data
          ...data
        } as Trip;
      });
      this.loading = false;
    }, (error) => {
      console.error("Error cargando viajes:", error);
      this.errorMsg = 'Error al cargar los viajes.';
      this.loading = false;
    });
  }

  async createTrip(): Promise<void> {
    this.errorMsg = '';

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    if (!this.currentUser) {
      this.errorMsg = 'No estás autenticado.';
      return;
    }

    this.submitting = true;
    const v = this.tripForm.value;

    try {
      // Objeto a guardar en Firestore
      // Nota: No ponemos 'id' aquí, Firestore lo genera solo
      const newTripData = {
        name: v.name.trim(),
        origin: v.origin.trim(),
        destination: v.destination.trim(),
        startDate: v.startDate,
        endDate: v.endDate,
        imageUrl: v.imageUrl?.trim() || null,
        members: [this.currentUser], // Añadimos al creador como primer miembro
        createdAt: Date.now(), // Guardamos timestamp numérico para ordenar fácil
      };

      // Guardar en Firebase
      const tripsRef = collection(this.firestore, 'trips');
      await addDoc(tripsRef, newTripData);

      // Éxito
      this.submitting = false;
      this.isCreateOpen = false;
      this.tripForm.reset();

    } catch (error) {
      console.error("Error creando viaje:", error);
      this.errorMsg = 'Error al guardar en la nube.';
      this.submitting = false;
    }
  }

  // ---------- Helpers ----------
  getTripImage(trip: Trip): string {
    return trip.imageUrl || this.fallbackImg;
  }

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

  visibleMembers(trip: Trip): MemberMini[] {
    return trip.members ? trip.members.slice(0, 3) : [];
  }

  extraMembersCount(trip: Trip): number {
    return trip.members ? Math.max(0, trip.members.length - 3) : 0;
  }

  // ---------- Validators ----------
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
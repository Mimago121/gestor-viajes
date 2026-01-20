import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Trip } from '../../interfaces/Trip';
import { MemberMini } from '../../interfaces/MemberMini';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-trips-page',
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './trips.html',
  styleUrls: ['./trips.css'],
})
export class TripsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  trips: Trip[] = [];
  loading = true;
  errorMsg = '';
  isCreateOpen = false;
  submitting = false;
  tripForm!: FormGroup;
  currentUser: MemberMini | null = null;

  // URL FIJA PARA EL USUARIO POR DEFECTO
  readonly defaultUserAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  
  // URL FIJA PARA IMAGEN DE VIAJE (Placeholder)
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
          // <--- AQUÍ USAMOS LA URL:
          avatarUrl: user.photoURL || this.defaultUserAvatar, 
        };
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

  // ---------- Data ----------
  loadTripsRealtime(): void {
    this.loading = true;
    const tripsRef = collection(this.firestore, 'trips');
    const q = query(tripsRef, orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        this.trips = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
          } as Trip;
        });
        this.loading = false;
      },
      (error) => {
        console.error('Error cargando viajes:', error);
        this.loading = false;
      },
    );
  }

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
        members: [this.currentUser], 
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

  getTripImage(trip: Trip): string {
    return trip.imageUrl || this.fallbackTripImg;
  }

  // ... (El resto de helpers y validadores se quedan igual)
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
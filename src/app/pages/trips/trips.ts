import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Trip } from '../../interfaces/Trip';
import { MemberMini } from '../../interfaces/MemberMini';


@Component({
  selector: 'app-trips-page',
  templateUrl: './trips-page.component.html',
  styleUrls: ['./trips-page.component.css'], // opcional si ya tenéis css
})
export class TripsComponent implements OnInit {
  trips: Trip[] = [];
  loading = false;
  errorMsg = '';

  isCreateOpen = false;
  submitting = false;

  tripForm!: FormGroup;

  // Simulamos usuario logueado (en vuestra app vendrá de AuthService)
  currentUser: MemberMini = {
    id: 'u1',
    name: 'Tú',
    avatarUrl: 'https://i.pravatar.cc/100?img=3',
  };

  // Imagen placeholder (si no hay)
  readonly fallbackImg =
    'https://images.unsplash.com/photo-1526481280695-3c687fd5432c?q=80&w=1200&auto=format&fit=crop';

  constructor(private fb: FormBuilder) {}

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
      { validators: [this.dateRangeValidator, this.originDestinationValidator] }
    );

    this.loadTrips();
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

  // Click fuera del modal
  onOverlayClick(evt: MouseEvent): void {
    // Si el click es en el overlay (no dentro del modal), cerramos
    const target = evt.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.closeCreate();
    }
  }

  // ---------- Data ----------
  loadTrips(): void {
    this.loading = true;
    this.errorMsg = '';

    // MVP: mock local (luego esto se conecta a un TripsService real)
    setTimeout(() => {
      this.trips = [
        {
          id: 't1',
          name: 'Roma 2026',
          origin: 'Madrid',
          destination: 'Roma',
          startDate: '2026-03-12',
          endDate: '2026-03-16',
          imageUrl:
            'https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=1200&auto=format&fit=crop',
          members: [
            this.currentUser,
            { id: 'u2', name: 'Ana', avatarUrl: 'https://i.pravatar.cc/100?img=5' },
            { id: 'u3', name: 'Luis', avatarUrl: 'https://i.pravatar.cc/100?img=8' },
          ],
          createdAt: Date.now() - 100000,
        },
      ];
      this.loading = false;
    }, 500);
  }

  createTrip(): void {
    this.errorMsg = '';

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const v = this.tripForm.value;

    // Creamos el trip (en real: lo hace un servicio y devuelve el trip ya creado)
    const newTrip: Trip = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `t_${Date.now()}`,
      name: v.name.trim(),
      origin: v.origin.trim(),
      destination: v.destination.trim(),
      startDate: v.startDate,
      endDate: v.endDate,
      imageUrl: v.imageUrl?.trim() || undefined,
      members: [this.currentUser],
      createdAt: Date.now(),
    };

    // Simula request
    setTimeout(() => {
      this.trips = [newTrip, ...this.trips];
      this.submitting = false;
      this.isCreateOpen = false;
    }, 500);
  }

  // ---------- Helpers ----------
  getTripImage(trip: Trip): string {
    return trip.imageUrl || this.fallbackImg;
  }

  formatDateRange(startIso: string, endIso: string): string {
    // formato simple dd/mm/yyyy - dd/mm/yyyy
    const s = this.formatIsoDate(startIso);
    const e = this.formatIsoDate(endIso);
    return `${s} - ${e}`;
  }

  private formatIsoDate(iso: string): string {
    // iso: yyyy-mm-dd
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  visibleMembers(trip: Trip): MemberMini[] {
    return trip.members.slice(0, 3);
  }

  extraMembersCount(trip: Trip): number {
    return Math.max(0, trip.members.length - 3);
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

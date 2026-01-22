import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  Firestore, doc, updateDoc, arrayUnion, arrayRemove, collection, 
  addDoc, query, orderBy, onSnapshot, deleteDoc, getDoc 
} from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { GoogleMapsModule } from '@angular/google-maps';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, GoogleMapsModule],
  templateUrl: './trip-detail.html',
  styleUrls: ['./trip-detail.css']
})
export class TripDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  public router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  tripId: string = '';
  trip: any = null;
  loading = true;
  currentUser: any = null;
  isLeader: boolean = false; // <--- NUEVO: ¿Soy el líder?
  
  activeTab: 'itinerary' | 'expenses' | 'map' = 'itinerary';

  // MAPA
  mapCenter: google.maps.LatLngLiteral = { lat: 40.4168, lng: -3.7038 };
  mapZoom = 12;
  mapOptions: google.maps.MapOptions = { disableDefaultUI: false, zoomControl: true };
  markers: any[] = [];

  // DATOS
  activities: any[] = [];
  expenses: any[] = [];
  myFriends: any[] = [];
  daysArray: number[] = [];

  // FORMULARIOS
  activityForm: FormGroup;
  expenseForm: FormGroup;
  showActivityModal = false;
  showExpenseModal = false;
  showInviteModal = false;
  selectedDay: number = 1;

  constructor() {
    this.activityForm = this.fb.group({
      title: ['', Validators.required],
      time: ['', Validators.required],
      type: ['sightseeing'],
      description: ['']
    });

    this.expenseForm = this.fb.group({
      title: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      payerId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0]]
    });
  }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
      if (this.tripId) {
        this.loadTrip();
        this.loadActivities();
        this.loadExpenses();
        if (user) {
          this.loadMyFriends(user.uid);
          this.expenseForm.patchValue({ payerId: user.uid });
        }
      }
    });
  }

  // --- ARREGLO DE PESTAÑAS ---
  switchTab(tab: 'itinerary' | 'expenses' | 'map') {
    console.log("Cambiando pestaña a:", tab);
    this.activeTab = tab;
    
    // Forzamos la actualización de la vista y del mapa
    this.cdr.detectChanges(); 
    
    // Si vamos al mapa, intentamos recentrarlo si es necesario
    if (tab === 'map') {
      setTimeout(() => {
        // Un pequeño timeout ayuda a Google Maps a renderizarse bien
        window.dispatchEvent(new Event('resize')); 
      }, 100);
    }
  }

  async loadTrip() {
    const docRef = doc(this.firestore, 'trips', this.tripId);
    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        this.trip = { id: snap.id, ...snap.data() };
        
        // Determinar Líder (Si no hay creatorId, asumimos el primer miembro o nadie)
        const creatorId = this.trip.creatorId || (this.trip.members && this.trip.members[0]?.id);
        this.isLeader = this.currentUser && this.currentUser.uid === creatorId;

        this.calculateDays();
      } else {
        this.router.navigate(['/trips']);
      }
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  // --- LÓGICA DE MIEMBROS Y LÍDER ---

  openInviteModal() {
    this.showInviteModal = true;
    this.cdr.detectChanges();
  }

  async inviteFriend(friend: any) {
    if (!this.isLeader) {
      alert('Solo el líder puede invitar.');
      return;
    }

    // Verificar si ya está en el grupo
    const exists = this.trip.members.some((m: any) => m.id === friend.uid);
    if (exists) {
      alert('Este usuario ya está en el viaje.');
      return;
    }

    const tripRef = doc(this.firestore, 'trips', this.tripId);
    
    // Añadir como "PENDIENTE"
    const newMember = {
      id: friend.uid,
      name: friend.name,
      avatarUrl: friend.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      status: 'pending' // <--- CLAVE: Estado pendiente
    };

    await updateDoc(tripRef, { members: arrayUnion(newMember) });
    alert(`Invitación enviada a ${friend.name}`);
    this.showInviteModal = false;
  }

  async removeMember(member: any) {
    if (!confirm(`¿Expulsar a ${member.name}?`)) return;

    const tripRef = doc(this.firestore, 'trips', this.tripId);
    await updateDoc(tripRef, { members: arrayRemove(member) });
  }

  // --- RESTO DE FUNCIONES (Sin cambios importantes, solo copiadas para contexto) ---
  calculateDays() { /* ... tu código ... */ 
    if (!this.trip.startDate || !this.trip.endDate) return;
    const start = new Date(this.trip.startDate).getTime();
    const end = new Date(this.trip.endDate).getTime();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    this.daysArray = Array.from({length: diffDays}, (_, i) => i + 1);
  }
  loadActivities() { /* ... */ 
    const ref = collection(this.firestore, `trips/${this.tripId}/activities`);
    const q = query(ref, orderBy('time'));
    onSnapshot(q, (snap) => {
      this.activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.cdr.detectChanges();
    });
  }
  loadExpenses() { /* ... */ 
    const ref = collection(this.firestore, `trips/${this.tripId}/expenses`);
    const q = query(ref, orderBy('date', 'desc'));
    onSnapshot(q, (snap) => {
      this.expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.cdr.detectChanges();
    });
  }

  // Helpers para el HTML
  getActivitiesForDay(day: number) { return this.activities.filter(a => a.day === day); }
  getTotalExpenses() { return this.expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0); }
  getPayerName(payerId: string) { 
    const member = this.trip?.members?.find((m: any) => m.id === payerId);
    return member ? member.name : 'Desconocido';
  }

  // Funciones de modales
  openAddActivity(day: number) { this.selectedDay = day; this.showActivityModal = true; this.cdr.detectChanges(); }
  openAddExpense() { this.showExpenseModal = true; this.cdr.detectChanges(); }
  async saveActivity() { 
    if(this.activityForm.valid) {
        await addDoc(collection(this.firestore, `trips/${this.tripId}/activities`), { ...this.activityForm.value, day: this.selectedDay });
        this.showActivityModal = false; 
    }
  }
  async saveExpense() {
    if(this.expenseForm.valid) {
        await addDoc(collection(this.firestore, `trips/${this.tripId}/expenses`), { ...this.expenseForm.value, createdAt: Date.now() });
        this.showExpenseModal = false; 
    }
  }
  async deleteActivity(id: string) { await deleteDoc(doc(this.firestore, `trips/${this.tripId}/activities/${id}`)); }
  async deleteExpense(id: string) { await deleteDoc(doc(this.firestore, `trips/${this.tripId}/expenses/${id}`)); }
  async loadMyFriends(uid: string) {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      const friendIds = userDoc.data()?.['friends'] || [];
      const requests = friendIds.map((fid: string) => getDoc(doc(this.firestore, 'users', fid)));
      const snapshots = await Promise.all(requests);
      this.myFriends = snapshots.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() }));
      this.cdr.detectChanges();
    } catch (e) {}
  }
}
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  Firestore, doc, getDoc, updateDoc, arrayUnion, collection, 
  addDoc, query, orderBy, onSnapshot, deleteDoc 
} from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  
  // --- PESTAÑAS ---
  activeTab: 'itinerary' | 'expenses' = 'itinerary';

  // --- ITINERARIO ---
  activities: any[] = [];
  activityForm: FormGroup;
  showActivityModal = false;
  selectedDay: number = 1;

  // --- AMIGOS ---
  showInviteModal = false;
  myFriends: any[] = [];

  // --- GASTOS (NUEVO) ---
  expenses: any[] = [];
  expenseForm: FormGroup;
  showExpenseModal = false;

  constructor() {
    // Formulario Actividad
    this.activityForm = this.fb.group({
      title: ['', Validators.required],
      time: ['', Validators.required],
      type: ['sightseeing'],
      description: ['']
    });

    // Formulario Gasto
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
        this.loadExpenses(); // <--- Cargar gastos
        
        if (user) {
          this.loadMyFriends(user.uid);
          // Pre-seleccionar al usuario actual como pagador
          this.expenseForm.patchValue({ payerId: user.uid });
        }
      }
    });
  }

  async loadTrip() {
    const docRef = doc(this.firestore, 'trips', this.tripId);
    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        this.trip = { id: snap.id, ...snap.data() };
        this.calculateDays();
      } else {
        this.router.navigate(['/trips']);
      }
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  // --- NUEVA FUNCIÓN PARA ABRIR EL MODAL AMIGOS ---
  openInviteModal() {
    this.showInviteModal = true;
    this.cdr.detectChanges();
  }

  // --- ITINERARIO ---
  daysArray: number[] = [];
  calculateDays() {
    if (!this.trip.startDate || !this.trip.endDate) return;
    const start = new Date(this.trip.startDate).getTime();
    const end = new Date(this.trip.endDate).getTime();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    this.daysArray = Array.from({length: diffDays}, (_, i) => i + 1);
  }

  loadActivities() {
    const ref = collection(this.firestore, `trips/${this.tripId}/activities`);
    const q = query(ref, orderBy('time'));
    onSnapshot(q, (snap) => {
      this.activities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.cdr.detectChanges();
    });
  }

  getActivitiesForDay(day: number) {
    return this.activities.filter(a => a.day === day);
  }

  openAddActivity(day: number) {
    this.selectedDay = day;
    this.showActivityModal = true;
    this.activityForm.reset({ type: 'sightseeing', time: '09:00' });
    this.cdr.detectChanges();
  }

  async saveActivity() {
    if (this.activityForm.invalid) return;
    try {
      const ref = collection(this.firestore, `trips/${this.tripId}/activities`);
      await addDoc(ref, {
        ...this.activityForm.value,
        day: this.selectedDay,
        createdAt: Date.now()
      });
      this.showActivityModal = false;
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async deleteActivity(actId: string) {
    if(!confirm('¿Borrar actividad?')) return;
    await deleteDoc(doc(this.firestore, `trips/${this.tripId}/activities/${actId}`));
  }

  // --- GESTIÓN DE GASTOS (NUEVO) ---
  loadExpenses() {
    const ref = collection(this.firestore, `trips/${this.tripId}/expenses`);
    const q = query(ref, orderBy('date', 'desc'));
    onSnapshot(q, (snap) => {
      this.expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.cdr.detectChanges();
    });
  }

  openAddExpense() {
    this.showExpenseModal = true;
    this.expenseForm.reset({
      title: '',
      amount: '',
      payerId: this.currentUser?.uid || '',
      date: new Date().toISOString().split('T')[0]
    });
    this.cdr.detectChanges();
  }

  async saveExpense() {
    if (this.expenseForm.invalid) return;
    try {
      await addDoc(collection(this.firestore, `trips/${this.tripId}/expenses`), {
        ...this.expenseForm.value,
        createdAt: Date.now()
      });
      this.showExpenseModal = false;
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async deleteExpense(expId: string) {
    if(!confirm('¿Eliminar gasto?')) return;
    await deleteDoc(doc(this.firestore, `trips/${this.tripId}/expenses/${expId}`));
  }

  getTotalExpenses() {
    return this.expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }

  getPayerName(payerId: string): string {
    const member = this.trip?.members?.find((m: any) => m.id === payerId);
    return member ? member.name : 'Desconocido';
  }

  // --- AMIGOS ---
  async loadMyFriends(uid: string) {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      const friendIds = userDoc.data()?.['friends'] || [];
      
      const requests = friendIds.map((fid: string) => getDoc(doc(this.firestore, 'users', fid)));
      const snapshots = await Promise.all(requests);
      
      this.myFriends = snapshots
        .filter(s => s.exists())
        .map(s => ({ uid: s.id, ...s.data() }));
      
      this.cdr.detectChanges();
    } catch (error) { console.error(error); }
  }

  async inviteFriend(friend: any) {
    const tripRef = doc(this.firestore, 'trips', this.tripId);
    const newMember = {
      id: friend.uid,
      name: friend.name,
      avatarUrl: friend.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    };
    await updateDoc(tripRef, { members: arrayUnion(newMember) });
    alert(`${friend.name} añadido.`);
    this.showInviteModal = false;
    this.cdr.detectChanges();
  }
}
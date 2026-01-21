import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR
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
  private cdr = inject(ChangeDetectorRef); // <--- INYECTAR

  tripId: string = '';
  trip: any = null;
  loading = true;
  currentUser: any = null;

  activities: any[] = [];
  activityForm: FormGroup;
  showActivityModal = false;
  selectedDay: number = 1;

  showInviteModal = false;
  myFriends: any[] = [];

  constructor() {
    this.activityForm = this.fb.group({
      title: ['', Validators.required],
      time: ['', Validators.required],
      type: ['sightseeing'],
      description: ['']
    });
  }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
      if (this.tripId) {
        this.loadTrip();
        this.loadActivities();
        // Cargamos amigos si hay usuario
        if (user) this.loadMyFriends(user.uid);
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
      this.cdr.detectChanges(); // <--- FORZAR ACTUALIZACIÓN
    });
  }

  // --- NUEVA FUNCIÓN PARA ABRIR EL MODAL ---
  openInviteModal() {
    console.log("Abrir modal pulsado. Amigos disponibles:", this.myFriends.length);
    this.showInviteModal = true;
    this.cdr.detectChanges(); // <--- OBLIGAR A MOSTRAR EL MODAL
  }

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
      this.cdr.detectChanges(); // <--- FORZAR
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

  // --- CARGA DE AMIGOS OPTIMIZADA ---
  async loadMyFriends(uid: string) {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      const friendIds = userDoc.data()?.['friends'] || [];
      
      const requests = friendIds.map((fid: string) => getDoc(doc(this.firestore, 'users', fid)));
      const snapshots = await Promise.all(requests);
      
      this.myFriends = snapshots
        .filter(s => s.exists())
        .map(s => ({ uid: s.id, ...s.data() }));
      
      console.log("Amigos cargados:", this.myFriends);
      this.cdr.detectChanges(); // <--- IMPORTANTE

    } catch (error) {
      console.error("Error cargando amigos", error);
    }
  }

  async inviteFriend(friend: any) {
    const tripRef = doc(this.firestore, 'trips', this.tripId);
    
    const newMember = {
      id: friend.uid,
      name: friend.name,
      avatarUrl: friend.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    };

    await updateDoc(tripRef, {
      members: arrayUnion(newMember)
    });
    alert(`${friend.name} añadido.`);
    this.showInviteModal = false;
    this.cdr.detectChanges();
  }
}
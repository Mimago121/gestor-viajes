import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router'; // <--- IMPORTANTE: Importar esto
import { Firestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  // AÑADIR RouterModule AQUÍ ABAJO 👇
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  activeTab: 'users' | 'trips' = 'users'; 
  users: any[] = [];
  tripTemplates: any[] = [];
  
  tripTemplateForm: FormGroup;
  isCreatingTrip = false;

  constructor() {
    this.tripTemplateForm = this.fb.group({
      destination: ['', Validators.required],
      description: ['', Validators.required],
      durationDays: [3, Validators.required],
      imageUrl: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadTripTemplates();
  }

  // --- GESTIÓN DE USUARIOS ---
  async loadUsers() {
    const querySnapshot = await getDocs(collection(this.firestore, 'users'));
    this.users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async deleteUser(userId: string) {
    if(!confirm('¿Estás seguro de borrar este usuario de la base de datos?')) return;
    try {
      await deleteDoc(doc(this.firestore, 'users', userId));
      this.users = this.users.filter(u => u.id !== userId);
      alert('Usuario eliminado.');
    } catch (error) { console.error(error); }
  }

  async toggleAdminRole(user: any) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(this.firestore, 'users', user.id), { role: newRole });
      user.role = newRole; 
    } catch (error) { console.error(error); }
  }

  // --- GESTIÓN DE VIAJES SUGERIDOS ---
  async loadTripTemplates() {
    const querySnapshot = await getDocs(collection(this.firestore, 'trip_templates'));
    this.tripTemplates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createTripTemplate() {
    if (this.tripTemplateForm.invalid) return;
    const data = this.tripTemplateForm.value;
    try {
      const docRef = await addDoc(collection(this.firestore, 'trip_templates'), {
        ...data,
        createdAt: Date.now()
      });
      this.tripTemplates.push({ id: docRef.id, ...data });
      this.tripTemplateForm.reset();
      this.isCreatingTrip = false;
      alert('Plantilla creada.');
    } catch (error) { console.error(error); }
  }

  async deleteTemplate(id: string) {
    if(!confirm('¿Borrar esta plantilla?')) return;
    await deleteDoc(doc(this.firestore, 'trip_templates', id));
    this.tripTemplates = this.tripTemplates.filter(t => t.id !== id);
  }
}
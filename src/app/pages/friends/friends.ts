import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { 
  Firestore, collection, query, where, getDocs, getDoc, addDoc, 
  deleteDoc, doc, updateDoc, arrayUnion, onSnapshot, limit 
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';

interface UserProfile {
  uid?: string;
  username: string;
  name: string;
  avatar: string;
}

interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;      
  fromUsername: string;
  fromAvatar: string;
  toUid: string;
  status: 'pending';
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './friends.html',
  styleUrls: ['./friends.css']
})
export class FriendsComponent implements OnInit {
  
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <--- HERRAMIENTA CLAVE 🛠️

  currentUser: User | null = null;
  searchControl = new FormControl('');

  allUsersCache: UserProfile[] = []; 
  filteredUsers: UserProfile[] = []; 
  showDropdown = false; 

  receivedRequests: FriendRequest[] = [];
  myFriends: UserProfile[] = [];
  
  loadingSearch = false;

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      this.currentUser = user;
      if (user) {
        // Inicializamos los escuchadores en tiempo real
        this.listenToReceivedRequests();
        this.listenToMyFriends();
        
        // Carga de usuarios para búsqueda
        await this.loadAllUsersForSearch();
      }
    });

    this.searchControl.valueChanges.subscribe(value => {
      this.filterUsers(value || '');
    });
  }

  // --- 1. CARGA INICIAL (BÚSQUEDA) ---
  async loadAllUsersForSearch() {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, limit(100)); 
      const snapshot = await getDocs(q);
      
      this.allUsersCache = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.uid !== this.currentUser?.uid);
      
    } catch (error) {
      console.error("Error caché usuarios:", error);
    }
  }

  filterUsers(term: string) {
    if (!term || term.trim() === '') {
      this.showDropdown = false;
      this.filteredUsers = [];
      return;
    }
    const searchTerm = term.toLowerCase();
    this.showDropdown = true;
    this.filteredUsers = this.allUsersCache.filter(user => 
      user.username.toLowerCase().includes(searchTerm) || 
      user.name.toLowerCase().includes(searchTerm)
    );
  }

  // --- 2. SOLICITUDES EN TIEMPO REAL (ARREGLADO) ---
  listenToReceivedRequests() {
    if (!this.currentUser) return;

    const requestsRef = collection(this.firestore, 'friend_requests');
    const q = query(
      requestsRef, 
      where('toUid', '==', this.currentUser.uid), 
      where('status', '==', 'pending')
    );

    // onSnapshot escucha cambios en la BD y se dispara solo
    onSnapshot(q, (snapshot) => {
      this.receivedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];

      console.log("🔔 Solicitudes actualizadas:", this.receivedRequests.length);
      this.cdr.detectChanges(); // <--- OBLIGAMOS A ACTUALIZAR LA VISTA
    }, (error) => {
      console.error("Error escuchando solicitudes:", error);
    });
  }

  // --- 3. MIS AMIGOS EN TIEMPO REAL (ARREGLADO) ---
  listenToMyFriends() {
    if (!this.currentUser) return;
    
    // Escuchamos cambios en MI documento de usuario (por si añado/borro amigo)
    onSnapshot(doc(this.firestore, `users/${this.currentUser.uid}`), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const friendIds: string[] = data['friends'] || [];
        
        console.log("👥 IDs de amigos detectados:", friendIds);

        if (friendIds.length > 0) {
          // Si tengo amigos, cargo sus perfiles rápido
          await this.fetchFriendProfilesOptimized(friendIds);
        } else {
          this.myFriends = [];
          this.cdr.detectChanges();
        }
      }
    });
  }

  // Carga Paralela + Actualización de Vista
  async fetchFriendProfilesOptimized(ids: string[]) {
    try {
      const requests = ids.map(id => getDoc(doc(this.firestore, `users/${id}`)));
      const snapshots = await Promise.all(requests);
      
      this.myFriends = snapshots
        .filter(snap => snap.exists())
        .map(snap => {
          const d = snap.data();
          return {
            uid: snap.id,
            name: d['name'],
            username: d['username'],
            avatar: d['avatar']
          } as UserProfile;
        });

      console.log("✅ Perfiles de amigos cargados:", this.myFriends.length);
      this.cdr.detectChanges(); // <--- OBLIGAMOS A ACTUALIZAR LA VISTA

    } catch (error) {
      console.error("Error cargando amigos:", error);
    }
  }

  // --- 4. ACCIONES (ENVIAR/ACEPTAR/RECHAZAR) ---
  async sendRequest(targetUser: UserProfile) {
    if (!this.currentUser || !targetUser.uid) return;
    this.showDropdown = false;
    this.searchControl.setValue(''); 

    try {
      // Leemos datos actuales para asegurar foto/nombre correctos
      const mySnap = await getDoc(doc(this.firestore, `users/${this.currentUser.uid}`));
      if (!mySnap.exists()) return;
      const myData = mySnap.data();

      await addDoc(collection(this.firestore, 'friend_requests'), {
        fromUid: this.currentUser.uid,
        fromName: myData['name'] || 'Usuario',       
        fromUsername: myData['username'] || '@user', 
        fromAvatar: myData['avatar'] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        toUid: targetUser.uid,
        status: 'pending',
        createdAt: Date.now()
      });
      
      alert(`Solicitud enviada a ${targetUser.name}`);
    } catch (error) {
      console.error("Error enviando:", error);
    }
  }

  async acceptRequest(req: FriendRequest) {
    if (!this.currentUser) return;
    try {
      // Transacción atómica manual (paso a paso)
      await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), { friends: arrayUnion(req.fromUid) });
      await updateDoc(doc(this.firestore, `users/${req.fromUid}`), { friends: arrayUnion(this.currentUser.uid) });
      await deleteDoc(doc(this.firestore, 'friend_requests', req.id));
      
      // No hace falta alert, la lista se actualizará sola gracias al onSnapshot
    } catch (error) { console.error("Error aceptando:", error); }
  }

  async rejectRequest(reqId: string) {
    try { await deleteDoc(doc(this.firestore, 'friend_requests', reqId)); } catch (e) {}
  }

  openChat(friendUid: string) {
    this.router.navigate(['/chat', friendUid]);
  }
}
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Para navegar al chat
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

  // Variables de estado
  currentUser: User | null = null;
  searchControl = new FormControl('');

  // --- VARIABLES NUEVAS PARA BÚSQUEDA INSTANTÁNEA ---
  allUsersCache: UserProfile[] = []; // Todos los usuarios (limitado a 100)
  filteredUsers: UserProfile[] = []; // Los que coinciden con lo que escribes
  showDropdown = false; // Controla si se ve el desplegable

  receivedRequests: FriendRequest[] = [];
  myFriends: UserProfile[] = [];
  
  loadingSearch = false;

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      this.currentUser = user;
      if (user) {
        this.loadReceivedRequests();
        this.loadMyFriends();
        
        // Cargar usuarios al inicio para búsqueda rápida
        await this.loadAllUsersForSearch();
      }
    });

    // Escuchar cambios en el input para filtrar en tiempo real
    this.searchControl.valueChanges.subscribe(value => {
      this.filterUsers(value || '');
    });
  }

  // --- 1. CARGA INICIAL DE USUARIOS (Caché) ---
  async loadAllUsersForSearch() {
    try {
      const usersRef = collection(this.firestore, 'users');
      // Limitamos a 100 para optimizar lectura
      const q = query(usersRef, limit(100)); 
      
      const snapshot = await getDocs(q);
      
      this.allUsersCache = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.uid !== this.currentUser?.uid); // Excluirme a mí mismo

    } catch (error) {
      console.error("Error cargando caché de usuarios:", error);
    }
  }

  // --- 2. FILTRADO LOCAL ---
  filterUsers(term: string) {
    if (!term || term.trim() === '') {
      this.showDropdown = false;
      this.filteredUsers = [];
      return;
    }

    const searchTerm = term.toLowerCase();
    this.showDropdown = true;

    // Filtramos el array en memoria
    this.filteredUsers = this.allUsersCache.filter(user => 
      user.username.toLowerCase().includes(searchTerm) || 
      user.name.toLowerCase().includes(searchTerm)
    );
  }

  // --- 3. ENVIAR SOLICITUD ---
  async sendRequest(targetUser: UserProfile) {
    if (!this.currentUser || !targetUser.uid) return;

    // Ocultar dropdown y limpiar
    this.showDropdown = false;
    this.searchControl.setValue(''); 

    try {
      const requestsRef = collection(this.firestore, 'friend_requests');
      
      await addDoc(requestsRef, {
        fromUid: this.currentUser.uid,
        fromUsername: this.currentUser.displayName || '@usuario',
        fromAvatar: this.currentUser.photoURL,
        toUid: targetUser.uid,
        status: 'pending',
        createdAt: Date.now()
      });

      alert(`Solicitud enviada a ${targetUser.name}`);

    } catch (error) {
      console.error("Error enviando solicitud:", error);
      alert("Error al enviar solicitud.");
    }
  }

  // --- 4. CARGAR SOLICITUDES RECIBIDAS ---
  loadReceivedRequests() {
    if (!this.currentUser) return;

    const requestsRef = collection(this.firestore, 'friend_requests');
    const q = query(requestsRef, where('toUid', '==', this.currentUser.uid), where('status', '==', 'pending'));

    onSnapshot(q, (snapshot) => {
      this.receivedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
    });
  }

  // --- 5. ACEPTAR O RECHAZAR ---
  async acceptRequest(req: FriendRequest) {
    if (!this.currentUser) return;

    try {
      const myDocRef = doc(this.firestore, `users/${this.currentUser.uid}`);
      await updateDoc(myDocRef, { friends: arrayUnion(req.fromUid) });

      const senderDocRef = doc(this.firestore, `users/${req.fromUid}`);
      await updateDoc(senderDocRef, { friends: arrayUnion(this.currentUser.uid) });

      await deleteDoc(doc(this.firestore, 'friend_requests', req.id));

      alert(`¡Ahora eres amigo de ${req.fromUsername}!`);
      
    } catch (error) {
      console.error("Error aceptando:", error);
    }
  }

  async rejectRequest(reqId: string) {
    try {
      await deleteDoc(doc(this.firestore, 'friend_requests', reqId));
    } catch (error) {
      console.error("Error rechazando:", error);
    }
  }

  // --- 6. CARGAR MIS AMIGOS ---
  loadMyFriends() {
    if (!this.currentUser) return;
    
    const myDocRef = doc(this.firestore, `users/${this.currentUser.uid}`);
    
    onSnapshot(myDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const friendIds: string[] = data['friends'] || [];
        
        if (friendIds.length > 0) {
          this.fetchFriendProfiles(friendIds);
        } else {
          this.myFriends = [];
        }
      }
    });
  }

  async fetchFriendProfiles(ids: string[]) {
    const friendList: UserProfile[] = [];
    
    for (const id of ids) {
      const specificDoc = await getDoc(doc(this.firestore, 'users', id));
      if (specificDoc.exists()) {
        const d = specificDoc.data();
        friendList.push({
          uid: id,
          name: d['name'],
          username: d['username'],
          avatar: d['avatar']
        });
      }
    }
    this.myFriends = friendList;
  }

  openChat(friendUid: string) {
    // Redirigimos a la página de chats
    this.router.navigate(['/chats']);
  }
}
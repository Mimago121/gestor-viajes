import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './chats.html',
  styleUrls: ['./chats.css']
})
export class ChatsComponent implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  chats: any[] = [];
  loading = true;
  currentUserUid: string | null = null;

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.currentUserUid = user.uid;
        this.loadChats(user.uid);
      } else {
        this.loading = false;
      }
    });
  }

  loadChats(uid: string) {
    this.loading = true;
    const userDocRef = doc(this.firestore, `users/${uid}`);
    
    // Escuchamos cambios en tiempo real
    onSnapshot(userDocRef, async (docSnap) => {
      // 1. Si el usuario no existe en BD (raro, pero posible)
      if (!docSnap.exists()) {
        this.loading = false;
        return;
      }

      const data = docSnap.data();
      // 2. Leemos amigos. Si es undefined, usamos array vacío []
      const friendIds = data['friends'] || []; 

      // 3. Si no tiene amigos, paramos carga y limpiamos chats
      if (!Array.isArray(friendIds) || friendIds.length === 0) {
        this.chats = [];
        this.loading = false;
        return;
      }

      // 4. Si TIENE amigos, cargamos sus datos
      try {
        const loadedChats = [];
        for (const friendId of friendIds) {
          const fDoc = await getDoc(doc(this.firestore, `users/${friendId}`));
          if (fDoc.exists()) {
            const fData = fDoc.data();
            loadedChats.push({
              id: friendId,
              name: fData['name'] || 'Usuario',
              avatar: fData['avatar'] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              lastMessage: 'Haz clic para chatear...', 
              unread: false 
            });
          }
        }
        this.chats = loadedChats;
      } catch (error) {
        console.error("Error cargando chats:", error);
      } finally {
        // 5. Pase lo que pase, dejamos de cargar
        this.loading = false;
      }
    });
  }

  openChat(friendId: string) {
    alert(`Próximamente: Chat real con ${friendId}`);
  }
}